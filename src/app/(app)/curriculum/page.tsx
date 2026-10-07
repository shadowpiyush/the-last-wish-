export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { CurriculumClient } from './CurriculumClient'

export const metadata: Metadata = {
  title: 'Curriculum Roadmap',
  description: 'Semester-by-semester view of all subjects, credits, and lecture hours for HBTU academic programs.',
}

export default async function CurriculumPage() {
  const supabase = await createClient()

  // Branch metadata is small and public; loading it beside programs removes a
  // dependent network round trip before the curriculum can render.
  const [{ data: programs }, { data: branches }] = await Promise.all([
    supabase.from('programs')
      .select('id, name, short_code, total_semesters, duration_years')
      .order('name'),
    supabase.from('branches')
      .select('id, program_id, name, code')
      .order('name'),
  ])

  const progs = programs || []
  const btech = progs.find((p) => p.short_code === 'B.Tech') || progs[0]
  const defaultProgramId = btech?.id || ''

  const defaultBranches: Array<{ id: string; program_id: string; name: string; code: string }> =
    (branches || []).filter((branch) => branch.program_id === defaultProgramId)
  let defaultBranchId = ''
  let initialSubjects: Array<{
    id: string
    subject_code: string
    subject_name: string
    credits: number
    hours: number
    category: string
    semester_number: number
    year_number: number
  }> = []

  if (defaultProgramId) {
    const preferredBranch = defaultBranches.find((b) => b.code === 'CSE') || defaultBranches[0]
    defaultBranchId = preferredBranch?.id || ''

    if (defaultBranchId) {
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('id, subject_code, subject_name, credits, hours, category, semester_number, year_number')
        .eq('branch_id', defaultBranchId)
        .order('semester_number')
        .order('subject_code')

      initialSubjects = subjectData || []
    }
  }

  return (
    <div style={{ padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span className="badge badge-indigo" style={{ padding: '0.3rem 0.75rem', fontWeight: 700 }}>
            Curriculum Roadmap
          </span>
          <span className="badge badge-neutral">Canonical Academic Schema</span>
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.025em',
          marginBottom: 6,
        }}>
          Curriculum Overview
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Explore semester-by-semester roadmaps, credits, and subject breakdowns across all HBTU degree programs and technology branches.
        </p>
      </div>

      <CurriculumClient
        initialPrograms={progs}
        initialBranches={defaultBranches}
        initialProgramId={defaultProgramId}
        initialBranchId={defaultBranchId}
        initialSubjects={initialSubjects}
      />
    </div>
  )
}
