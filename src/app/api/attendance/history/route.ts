import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { fetchStudentRecords } from '@/lib/attendance/repository'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Active user session required.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20))
    const offset = (page - 1) * limit

    const subjectId = searchParams.get('subjectId') || undefined
    const statusParam = searchParams.get('status')?.toLowerCase()
    const status = statusParam === 'present' || statusParam === 'absent' || statusParam === 'no_class' ? statusParam : undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminDb =
      (supabaseUrl && serviceKey
        ? createAdminClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        : null) || supabase
    // 1. If filtering by subjectId, validate academic context and authorization
    if (subjectId) {
      const { data: profile } = await adminDb
        .from('profiles')
        .select('branch_id, current_semester, role')
        .eq('id', user.id)
        .maybeSingle()

      const { data: sub } = await adminDb
        .from('subjects')
        .select('id, branch_id, semester_number')
        .eq('id', subjectId)
        .maybeSingle()

      if (!sub) {
        return NextResponse.json({ error: 'Subject not found.' }, { status: 404 })
      }

      if (profile?.branch_id && profile?.current_semester && profile.role !== 'admin') {
        const isBranchMatch = !sub.branch_id || sub.branch_id === profile.branch_id
        const isSemMatch = sub.semester_number === profile.current_semester
        if (!isBranchMatch || !isSemMatch) {
          return NextResponse.json(
            { error: 'Subject is not assigned to your academic profile.' },
            { status: 403 }
          )
        }
      }
    }

    // 2. Fetch raw records via resilient repository
    const allRecords = await fetchStudentRecords(user.id, {
      subjectId,
      status,
      startDate,
      endDate,
    })

    // 2. Fetch subject details
    const subjectIds = Array.from(new Set(allRecords.map((r) => r.subject_id)))
    const subjectsMap = new Map<
      string,
      { id: string; subject_name: string; subject_code: string; credits?: number; category?: string }
    >()

    if (subjectIds.length > 0) {
      const { data: subjectsData } = await adminDb
        .from('subjects')
        .select('id, subject_name, subject_code, credits, category')
        .in('id', subjectIds)

      for (const s of subjectsData || []) {
        subjectsMap.set(s.id, s)
      }
    }

    const total = allRecords.length
    const totalPages = Math.ceil(total / limit) || 1
    const pagedRecords = allRecords.slice(offset, offset + limit)

    const formattedRecords = pagedRecords.map((item) => {
      const subjectInfo = subjectsMap.get(item.subject_id)
      return {
        id: item.id,
        subjectId: item.subject_id,
        subjectName: subjectInfo?.subject_name || 'Subject',
        subjectCode: subjectInfo?.subject_code || '',
        credits: subjectInfo?.credits || 0,
        category: subjectInfo?.category || '',
        date: item.date,
        status: item.status,
        classNumber: item.class_number,
        notes: item.notes,
        createdAt: item.created_at || item.date,
      }
    })

    return NextResponse.json({
      records: formattedRecords,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    })
  } catch (err) {
    console.error('GET /api/attendance/history unhandled error:', err)
    return NextResponse.json(
      { error: 'Internal server error while loading history.' },
      { status: 500 }
    )
  }
}

