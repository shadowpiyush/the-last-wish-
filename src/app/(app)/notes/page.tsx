export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import {
  NotesClient,
  type Note,
  type Branch,
  type Program,
  type SubjectItem,
  type BranchStats,
} from './NotesClient'
import { getCachedPrograms, getCachedBranches } from '@/lib/academic/cache'

export const metadata: Metadata = {
  title: 'Study Notes — Harcourtian Study Hub',
  description: 'Explore verified academic curriculum study notes arranged in a dynamic folder hierarchy by branch, year, semester, subject, and syllabus unit.',
}

function getFirst<T>(item: T | T[] | null | undefined): T | null {
  if (!item) return null
  return Array.isArray(item) ? item[0] ?? null : item
}

export default async function NotesPage() {
  const supabase = await createClient()

  // 1. Fetch user auth, cached programs, cached branches, and database metadata concurrently
  const [userRes, programs, branches, subjectsRes, notesRes] = await Promise.all([
    supabase.auth.getUser(),
    getCachedPrograms(),
    getCachedBranches(),
    supabase.from('subjects').select('id, branch_id, year_number, semester_number'),
    supabase
      .from('notes')
      .select(`
        id, title, description, file_path, file_type, file_size, view_count, created_at, status,
        subjects!inner (
          id, subject_code, subject_name, semester_number, year_number, branch_id, program_id,
          branches (id, name, code),
          programs (id, name, short_code)
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false }),
  ])

  const user = userRes.data.user
  let profile = null

  if (user) {
    const { data: p } = await supabase
      .from('profiles')
      .select(`
        id, full_name, role, program_id, branch_id, current_year, current_semester,
        programs(id, name, short_code, duration_years),
        branches(id, name, code)
      `)
      .eq('id', user.id)
      .maybeSingle()
    profile = p
  }

  const studentBranchId = profile?.branch_id
  const profileBranch = getFirst(profile?.branches)
  const profileProgram = getFirst(profile?.programs)

  // 2. Pre-calculate branch stats (subjects count, published notes count, yearStats, semesterStats)
  const branchStatsMap: Record<string, BranchStats> = {}
  for (const b of (branches || [])) {
    branchStatsMap[b.id] = {
      subjectsCount: 0,
      notesCount: 0,
      yearStats: {},
      semesterStats: {},
    }
  }

  for (const s of (subjectsRes.data || [])) {
    const stats = branchStatsMap[s.branch_id]
    if (stats) {
      stats.subjectsCount++
      if (s.year_number) {
        if (!stats.yearStats[s.year_number]) {
          stats.yearStats[s.year_number] = { subjectsCount: 0, notesCount: 0 }
        }
        stats.yearStats[s.year_number].subjectsCount++
      }
      if (s.semester_number) {
        if (!stats.semesterStats[s.semester_number]) {
          stats.semesterStats[s.semester_number] = { subjectsCount: 0, notesCount: 0 }
        }
        stats.semesterStats[s.semester_number].subjectsCount++
      }
    }
  }

  const rawNotes = notesRes.data || []
  for (const n of rawNotes) {
    const sub = getFirst(n.subjects)
    if (sub && sub.branch_id) {
      const stats = branchStatsMap[sub.branch_id]
      if (stats) {
        stats.notesCount++
        if (sub.year_number && stats.yearStats[sub.year_number]) {
          stats.yearStats[sub.year_number].notesCount++
        }
        if (sub.semester_number && stats.semesterStats[sub.semester_number]) {
          stats.semesterStats[sub.semester_number].notesCount++
        }
      }
    }
  }

  // 3. Format initial published notes
  const initialNotes: Note[] = rawNotes.map((n) => {
    const sub = getFirst(n.subjects)
    const isMyBranch = Boolean(studentBranchId && sub?.branch_id === studentBranchId)
    const isMySemester = Boolean(
      isMyBranch && profile?.current_semester && sub?.semester_number === profile.current_semester
    )

    return {
      id: n.id,
      title: n.title,
      description: n.description,
      file_path: n.file_path,
      file_type: n.file_type,
      file_size: n.file_size,
      view_count: n.view_count,
      created_at: n.created_at,
      status: n.status,
      subjects: sub
        ? {
            id: sub.id,
            subject_code: sub.subject_code,
            subject_name: sub.subject_name,
            semester_number: sub.semester_number,
            year_number: sub.year_number,
            branch_id: sub.branch_id,
            program_id: sub.program_id,
            branches: getFirst(sub.branches),
            programs: getFirst(sub.programs),
          }
        : null,
      isMyBranch,
      isMySemester,
    }
  })

  const userProfileProp = profile
    ? {
        id: profile.id,
        full_name: profile.full_name,
        role: profile.role,
        program_id: profile.program_id,
        branch_id: profile.branch_id,
        current_year: profile.current_year,
        current_semester: profile.current_semester,
        branches: profileBranch,
        programs: profileProgram,
      }
    : null

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      <NotesClient
        initialNotes={initialNotes}
        programs={(programs as Program[]) || []}
        branches={(branches as Branch[]) || []}
        branchStats={branchStatsMap}
        userProfile={userProfileProp}
      />
    </div>
  )
}
