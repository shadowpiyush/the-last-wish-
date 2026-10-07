export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SyllabusClient } from '@/components/syllabus/SyllabusClient'

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
  const supabase = await createClient()

  // Both lookup tables are small and public; fetch them together so the first
  // render doesn't wait through a programs-then-branches waterfall.
  const [{ data: programs }, { data: branches }] = await Promise.all([
    supabase.from('programs')
      .select('id, name, short_code, duration_years, total_semesters')
      .order('name'),
    supabase.from('branches')
      .select('id, program_id, name, code')
      .order('name'),
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
          Academic Course Syllabus
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Hierarchical course breakdown: Program → Branch → Year → Semester → Subject → Units →
          Topics
        </p>
      </div>

      {/* Interactive island (client component) */}
      <SyllabusClient
        initialPrograms={allPrograms}
        initialBranches={branchList}
        defaultProgram={defaultProgram}
        defaultBranch={defaultBranch}
        defaultSemester={1}
      />
    </div>
  )
}
