export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { NotesClient, type Note } from './NotesClient'

export const metadata: Metadata = {
  title: 'Study Notes',
  description: 'Access verified handwritten and typed study notes for all subjects. Upload and share your own notes with fellow students.',
}

function getFirst<T>(item: T | T[] | null | undefined): T | null {
  if (!item) return null
  return Array.isArray(item) ? item[0] ?? null : item
}

export default async function NotesPage() {
  const supabase = await createClient()

  // 1. Resolve authenticated user and academic profile
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null

  if (user) {
    const { data: p } = await supabase
      .from('profiles')
      .select('id, full_name, role, program_id, branch_id, current_year, current_semester, programs(id, name, short_code), branches(id, name, code)')
      .eq('id', user.id)
      .maybeSingle()
    profile = p
  }

  const isAdmin = profile?.role === 'admin'
  const studentBranchId = profile?.branch_id
  const profileBranch = getFirst(profile?.branches)
  const profileProgram = getFirst(profile?.programs)

  // 2. Fetch programs and branches for filtering
  const [{ data: programs }, { data: branches }] = await Promise.all([
    supabase.from('programs').select('id, name, short_code').order('name'),
    supabase.from('branches').select('id, program_id, name, code').order('code'),
  ])

  // 3. Backend-authorized query for study notes:
  // If user is a verified student with a branch_id, restrict notes strictly to their branch curriculum
  let notesQuery = supabase
    .from('notes')
    .select(`
      id, title, description, file_path, file_type, file_size, view_count, created_at, status,
      subjects!inner (
        id, subject_code, subject_name, semester_number, year_number, branch_id,
        branches (id, name, code),
        programs (id, name, short_code)
      )
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(100)

  if (!isAdmin && studentBranchId) {
    notesQuery = notesQuery.eq('subjects.branch_id', studentBranchId)
  }

  const { data: notes } = await notesQuery

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
    <div style={{ padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span className="badge badge-green" style={{ padding: '0.3rem 0.75rem', fontWeight: 700 }}>
            Verified Notes
          </span>
          {profileBranch && !isAdmin && (
            <span className="badge badge-maroon">
              {profileProgram?.short_code || 'B.Tech'} · {profileBranch.code} · Sem {profile?.current_semester}
            </span>
          )}
          {isAdmin && (
            <span className="badge badge-yellow">Admin View · All Branches</span>
          )}
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.025em',
          marginBottom: 6,
        }}>
          Study Notes
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          {profileBranch && !isAdmin
            ? `Curriculum study notes authorized for your branch: ${profileBranch.name} (${profileBranch.code}).`
            : 'Verified handwritten and typed study notes contributed by faculty and fellow students.'}
        </p>
      </div>

      <NotesClient
        initialNotes={(notes as unknown as Note[]) ?? []}
        programs={programs ?? []}
        branches={branches ?? []}
        userProfile={userProfileProp}
      />
    </div>
  )
}
