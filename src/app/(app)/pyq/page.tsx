export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { FileCheck, Calendar } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Previous Year Questions',
  description: 'Access previous year question papers (PYQs) for all HBTU subjects — Mid-Sem, End-Sem, Class Tests, and Carry-Over exams.',
}

export default async function PYQPage() {
  const supabase = await createClient()

  const { data: pyqs } = await supabase
    .from('pyqs')
    .select(`
      id, title, exam_year, exam_type, file_path, file_type,
      subjects (id, subject_code, subject_name)
    `)
    .eq('status', 'published')
    .order('exam_year', { ascending: false })
    .limit(50)

  const examTypes = ['All', 'Mid-Sem', 'End-Sem', 'Class Test', 'Carry-Over']

  return (
    <div style={{ padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span className="badge badge-indigo" style={{ padding: '0.3rem 0.75rem', fontWeight: 700 }}>
            Question Papers
          </span>
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.025em',
          marginBottom: 6,
        }}>
          Previous Year Questions (PYQ)
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Access question papers from past Mid-Sem, End-Sem, and other examinations.
        </p>
      </div>

      {pyqs && pyqs.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1rem',
        }}>
          {pyqs.map((pyq) => {
            const subject = Array.isArray(pyq.subjects) ? pyq.subjects[0] : pyq.subjects
            const typeColors: Record<string, string> = {
              'Mid-Sem': '#f59e0b',
              'End-Sem': '#e11d48',
              'Class Test': '#10b981',
              'Carry-Over': '#6366f1',
            }
            const color = typeColors[pyq.exam_type] || '#6b7280'

            return (
              <div key={pyq.id} className="glass-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-sm)',
                    background: `${color}15`,
                    color: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <FileCheck size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>{pyq.title}</h3>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {subject && (
                        <span className="badge badge-maroon" style={{ fontSize: '0.625rem' }}>
                          {(subject as { subject_code: string }).subject_code}
                        </span>
                      )}
                      <span className="badge" style={{ fontSize: '0.625rem', background: `${color}15`, color, border: `1px solid ${color}30` }}>
                        {pyq.exam_type}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: 'var(--text-tertiary)',
                  borderTop: '1px solid var(--border-light)',
                  paddingTop: '0.75rem',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={13} /> {pyq.exam_year}
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: '0.625rem' }}>
                    PDF
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <FileCheck size={40} color="var(--text-tertiary)" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No PYQs Available Yet</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
            Previous year question papers will be added here as they become available.
          </p>
        </div>
      )}
    </div>
  )
}
