export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { NotesClient, type Note, type Branch, type Program, type SubjectOption } from './NotesClient'
import { getCachedPrograms, getCachedBranches, getCachedSubjectsForBranch } from '@/lib/academic/cache'

export const metadata: Metadata = {
  title: 'Study Notes — Harcourtian Study Hub',
  description: 'Access verified curriculum study notes for your branch and explore notes across all Harcourt Butler Technical University branches.',
}

function getFirst<T>(item: T | T[] | null | undefined): T | null {
  if (!item) return null
  return Array.isArray(item) ? item[0] ?? null : item
}

export default async function NotesPage() {
  const supabase = await createClient()

  // 1. Fetch user auth session and cached programs & branches concurrently
  const [userRes, programs, branches] = await Promise.all([
    supabase.auth.getUser(),
    getCachedPrograms(),
    getCachedBranches(),
  ])

  const user = userRes.data.user
  let profile = null

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
    profile = p
  }

  const isAdmin = profile?.role === 'admin'
  const studentBranchId = profile?.branch_id
  const profileBranch = getFirst(profile?.branches)
  const profileProgram = getFirst(profile?.programs)

  // 2. Fetch initial subjects from academic cache
  const targetInitialBranchId = studentBranchId || branches?.[0]?.id
  let initialSubjects: SubjectOption[] = []
  if (targetInitialBranchId) {
    const cachedSubs = await getCachedSubjectsForBranch(targetInitialBranchId)
    initialSubjects = cachedSubs.map((s) => ({
      id: s.id,
      subject_code: s.subject_code,
      subject_name: s.subject_name,
      semester_number: s.semester_number,
      year_number: s.year_number,
      branch_id: s.branch_id,
      program_id: s.program_id,
    }))
  }

  // 3. Initial Notes Query:
  // By default, if the student has a branch, load notes for their branch first.
  let notesQuery = supabase
    .from('notes')
    .select(`
      id, title, description, file_path, file_type, file_size, view_count, created_at, status,
      subjects!inner (
        id, subject_code, subject_name, semester_number, year_number, branch_id, program_id,
        branches (id, name, code),
        programs (id, name, short_code)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!isAdmin) {
    notesQuery = notesQuery.eq('status', 'published')
  }

  if (studentBranchId) {
    notesQuery = notesQuery.eq('subjects.branch_id', studentBranchId)
  }

  const { data: rawNotes } = await notesQuery

  const initialNotes: Note[] = (rawNotes || []).map((n) => {
    const sub = getFirst(n.subjects)
    const isMyBranch = Boolean(studentBranchId && sub?.branch_id === studentBranchId)
    const isMySemester = Boolean(isMyBranch && profile?.current_semester && sub?.semester_number === profile.current_semester)

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
      subjects: sub ? {
        id: sub.id,
        subject_code: sub.subject_code,
        subject_name: sub.subject_name,
        semester_number: sub.semester_number,
        year_number: sub.year_number,
        branch_id: sub.branch_id,
        program_id: sub.program_id,
        branches: getFirst(sub.branches),
        programs: getFirst(sub.programs),
      } : null,
      isMyBranch,
      isMySemester,
    }
  })

  const userProfileProp = profile ? {
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role,
    program_id: profile.program_id,
    branch_id: profile.branch_id,
    current_year: profile.current_year,
    current_semester: profile.current_semester,
    branches: profileBranch,
    programs: profileProgram,
  } : null

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      <NotesClient
        initialNotes={initialNotes}
        programs={(programs as Program[]) || []}
        branches={(branches as Branch[]) || []}
        initialSubjects={initialSubjects}
        userProfile={userProfileProp}
      />
    </div>
  )
}
