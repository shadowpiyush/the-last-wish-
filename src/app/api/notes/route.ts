import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getFirst<T>(item: T | T[] | null | undefined): T | null {
  if (!item) return null
  return Array.isArray(item) ? item[0] ?? null : item
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const mode = searchParams.get('mode') || 'all' // 'my' | 'explore' | 'all'
    const branchId = searchParams.get('branchId') || ''
    const programId = searchParams.get('programId') || ''
    const year = searchParams.get('year') || ''
    const semester = searchParams.get('semester') || ''
    const subjectId = searchParams.get('subjectId') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    const supabase = await createClient()

    // 1. Resolve authenticated user and academic profile
    const { data: { user } } = await supabase.auth.getUser()
    let profile: {
      id: string
      full_name: string
      role: string
      program_id: string | null
      branch_id: string | null
      current_year: number | null
      current_semester: number | null
      programs?: { id: string; name: string; short_code: string } | null
      branches?: { id: string; name: string; code: string } | null
    } | null = null

    if (user) {
      const { data: p } = await supabase
        .from('profiles')
        .select(`
          id, full_name, role, program_id, branch_id, current_year, current_semester,
          programs(id, name, short_code),
          branches(id, name, code)
        `)
        .eq('id', user.id)
        .maybeSingle()

      if (p) {
        profile = {
          id: p.id,
          full_name: p.full_name,
          role: p.role,
          program_id: p.program_id,
          branch_id: p.branch_id,
          current_year: p.current_year,
          current_semester: p.current_semester,
          programs: getFirst(p.programs),
          branches: getFirst(p.branches),
        }
      }
    }

    const isAdmin = profile?.role === 'admin'
    const studentBranchId = profile?.branch_id

    // Determine target branch
    let targetBranchId: string | null = null
    if (mode === 'my' && studentBranchId) {
      targetBranchId = studentBranchId
    } else if (branchId && branchId !== 'all') {
      targetBranchId = branchId
    }

    // 2. Multi-field search handling
    let matchingSubjectIds: string[] | null = null
    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean)
      const matchedSubIdSet = new Set<string>()

      for (const token of tokens) {
        const sanitized = token.replace(/[%_,]/g, '')
        if (!sanitized) continue

        // Check subject code or name
        const { data: matchedSubs } = await supabase
          .from('subjects')
          .select('id')
          .or(`subject_code.ilike.%${sanitized}%,subject_name.ilike.%${sanitized}%`)
          .limit(100)

        if (matchedSubs) {
          matchedSubs.forEach((s) => matchedSubIdSet.add(s.id))
        }

        // Check branch code or name
        const { data: matchedBranches } = await supabase
          .from('branches')
          .select('id')
          .or(`code.ilike.%${sanitized}%,name.ilike.%${sanitized}%`)
          .limit(20)

        if (matchedBranches && matchedBranches.length > 0) {
          const branchIds = matchedBranches.map((b) => b.id)
          const { data: branchSubs } = await supabase
            .from('subjects')
            .select('id')
            .in('branch_id', branchIds)
            .limit(100)
          if (branchSubs) {
            branchSubs.forEach((s) => matchedSubIdSet.add(s.id))
          }
        }
      }

      matchingSubjectIds = Array.from(matchedSubIdSet)
    }

    // 3. Build main notes query
    let query = supabase
      .from('notes')
      .select(`
        id, title, description, file_path, file_type, file_size, view_count, created_at, status,
        subjects!inner (
          id, subject_code, subject_name, semester_number, year_number, branch_id, program_id,
          branches (id, name, code),
          programs (id, name, short_code)
        )
      `, { count: 'exact' })

    if (!isAdmin) {
      query = query.eq('status', 'published')
    }

    if (targetBranchId) {
      query = query.eq('subjects.branch_id', targetBranchId)
    }

    if (programId && programId !== 'all') {
      query = query.eq('subjects.program_id', programId)
    }

    if (year && year !== 'all') {
      query = query.eq('subjects.year_number', Number(year))
    }

    if (semester && semester !== 'all') {
      query = query.eq('subjects.semester_number', Number(semester))
    }

    if (subjectId && subjectId !== 'all') {
      query = query.eq('subject_id', subjectId)
    }

    if (q) {
      const sanitized = q.replace(/[%_,]/g, '')
      const orClauses: string[] = [
        `title.ilike.%${sanitized}%`,
        `description.ilike.%${sanitized}%`,
      ]
      if (matchingSubjectIds && matchingSubjectIds.length > 0) {
        orClauses.push(`subject_id.in.(${matchingSubjectIds.slice(0, 60).join(',')})`)
      }
      query = query.or(orClauses.join(','))
    }

    const { data: notes, count, error } = await query

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    const noteList = (notes || []).map((n) => {
      const sub = getFirst(n.subjects)
      return {
        ...n,
        subjects: sub ? {
          ...sub,
          branches: getFirst(sub.branches),
          programs: getFirst(sub.programs),
        } : null,
      }
    })

    // 4. Default result priority scoring:
    // 1: Exact match: student's program, branch, year, semester
    // 2: Same branch, other semesters
    // 3: Same program, other branches
    // 4: Other programs
    const scored = noteList.map((note) => {
      const sub = note.subjects
      let score = 1
      let isMyBranch = false
      let isMySemester = false

      if (profile?.branch_id && sub?.branch_id === profile.branch_id) {
        isMyBranch = true
        if (profile.current_semester && sub?.semester_number === profile.current_semester) {
          score = 4
          isMySemester = true
        } else {
          score = 3
        }
      } else if (profile?.program_id && sub?.program_id === profile.program_id) {
        score = 2
      } else {
        score = 1
      }

      return {
        ...note,
        _score: score,
        isMyBranch,
        isMySemester,
      }
    })

    // Sort by score DESC, then created_at DESC
    scored.sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    const totalCount = count ?? scored.length
    const totalPages = Math.ceil(totalCount / limit) || 1
    const from = (page - 1) * limit
    const paginatedNotes = scored.slice(from, from + limit)

    return NextResponse.json({
      success: true,
      notes: paginatedNotes,
      totalCount,
      page,
      limit,
      totalPages,
      appliedFilters: {
        mode,
        branchId: targetBranchId || 'all',
        programId: programId || 'all',
        year: year || 'all',
        semester: semester || 'all',
        subjectId: subjectId || 'all',
        q,
      },
      userContext: profile ? {
        programId: profile.program_id,
        programCode: profile.programs?.short_code || 'B.Tech',
        branchId: profile.branch_id,
        branchCode: profile.branches?.code || 'N/A',
        branchName: profile.branches?.name || 'N/A',
        currentYear: profile.current_year,
        currentSemester: profile.current_semester,
        isAdmin,
      } : null,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=60',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

