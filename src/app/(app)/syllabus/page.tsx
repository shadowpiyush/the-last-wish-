export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { SyllabusClient } from '@/components/syllabus/SyllabusClient'
import { getCachedPrograms, getCachedBranches } from '@/lib/academic/cache'

export const metadata: Metadata = {
  title: 'Academic Syllabus',
  description:
    'Explore the complete academic syllabus for all HBTU engineering and management programs — unit-wise topic breakdowns, credits, lecture hours, and linked study resources for every subject.',
  openGraph: {
    title: 'Academic Course Syllabus | Harcoutian Study Hub',
    description:
      'Hierarchical course breakdown: Program → Branch → Semester → Subject → Units → Topics for all HBTU programs.',
  },
}

export default async function SyllabusPage() {
  // Fetch academic metadata using high-performance server-side cache
  const [programs, branches] = await Promise.all([
    getCachedPrograms(),
    getCachedBranches(),
  ])

  const allPrograms = programs || []
  const btechProgram = allPrograms.find((p) => p.short_code === 'B.Tech')
  const defaultProgram = btechProgram?.id ?? allPrograms[0]?.id ?? ''

  const branchList = (branches ?? []).filter((branch) => branch.program_id === defaultProgram)
  const defaultBranch = branchList[0]?.id ?? ''

  return (
    <div style={{ padding: '2rem 1rem' }}>
      {/* Page header (rendered on server — great for SEO) */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span
            className="badge badge-maroon maroon-texture"
            style={{ padding: '0.3rem 0.75rem', fontWeight: 700, letterSpacing: '0.04em' }}
          >
            Curriculum Archive
          </span>
          <span className="badge badge-neutral">Autonomous Framework</span>
        </div>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.025em',
            marginBottom: 6,
            color: 'var(--text-primary)',
          }}
        >
          Curriculum & Syllabus Directory
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Autonomous syllabus roadmaps, unit-wise topic breakdowns, credits, and reference materials.
        </p>
      </div>

      {/* Interactive client component */}
      <SyllabusClient
        initialPrograms={allPrograms}
        initialBranches={branches ?? []}
        defaultProgram={defaultProgram}
        defaultBranch={defaultBranch}
        defaultSemester={1}
      />
    </div>
  )
}
