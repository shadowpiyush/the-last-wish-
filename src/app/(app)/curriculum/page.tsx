export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { CurriculumClient } from './CurriculumClient'
import { getCachedPrograms, getCachedBranches, getCachedSubjectsForBranch } from '@/lib/academic/cache'

export const metadata: Metadata = {
  title: 'Curriculum Roadmap',
  description: 'Semester-by-semester view of all subjects, credits, and lecture hours for HBTU academic programs.',
}

export default async function CurriculumPage() {
  // Use in-memory cached academic hierarchy
  const [programs, branches] = await Promise.all([
    getCachedPrograms(),
    getCachedBranches(),
  ])

  const progs = programs || []
  const btech = progs.find((p) => p.short_code === 'B.Tech') || progs[0]
  const defaultProgramId = btech?.id || ''

  const defaultBranches = (branches || []).filter((branch) => branch.program_id === defaultProgramId)
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
      const subs = await getCachedSubjectsForBranch(defaultBranchId)
      initialSubjects = subs.map((s) => ({
        id: s.id,
        subject_code: s.subject_code,
        subject_name: s.subject_name,
        credits: s.credits ?? 3,
        hours: s.hours ?? 40,
        category: s.category ?? 'Core',
        semester_number: s.semester_number,
        year_number: s.year_number,
      }))
    }
  }

  return (
    <div style={{ padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span className="badge badge-indigo" style={{ padding: '0.3rem 0.75rem', fontWeight: 700 }}>
            Academic Roadmap
          </span>
          <span className="badge badge-neutral">Curriculum Structure</span>
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.025em',
          marginBottom: 6,
        }}>
          Curriculum Roadmap
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Detailed semester-wise subject distribution, credits, and evaluation schemes.
        </p>
      </div>

      <CurriculumClient
        initialPrograms={progs}
        initialBranches={branches || []}
        initialProgramId={defaultProgramId}
        initialBranchId={defaultBranchId}
        initialSubjects={initialSubjects}
      />
    </div>
  )
}
