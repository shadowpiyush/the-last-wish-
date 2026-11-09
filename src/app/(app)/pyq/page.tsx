export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Calendar, FileCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Previous Year Questions',
  description: 'Access previous year question papers (PYQs) for all HBTU subjects — Mid-Sem, End-Sem, Class Tests, and Carry-Over exams.',
}

interface PyqItem {
  id: string
  title: string
  exam_year: number
  exam_type: string
  file_path: string
  file_type: string
  subjects: { id: string; subject_code: string; subject_name: string } | null
}

let pyqCache: { data: PyqItem[]; timestamp: number } = { data: [], timestamp: 0 }
const PYQ_TTL = 60 * 1000

export default async function PYQPage() {
  let pyqs: PyqItem[] = []
  const now = Date.now()

  if (pyqCache.data.length > 0 && now - pyqCache.timestamp < PYQ_TTL) {
    pyqs = pyqCache.data
  } else {
    try {
      const supabase = await createClient()
      const { data } = await supabase
        .from('pyqs')
        .select(`
          id, title, exam_year, exam_type, file_path, file_type,
          subjects (id, subject_code, subject_name)
        `)
        .eq('status', 'published')
        .order('exam_year', { ascending: false })
        .limit(50)

      pyqs = (data || []) as unknown as PyqItem[]
      pyqCache = { data: pyqs, timestamp: now }
    } catch {
      pyqs = pyqCache.data
    }
  }

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

            return (
              <div
                key={pyq.id}
                className="glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: `${typeColors[pyq.exam_type] || '#4f46e5'}20`,
                      color: typeColors[pyq.exam_type] || '#4f46e5',
                      fontWeight: 700,
                    }}
                  >
                    {pyq.exam_type}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={13} /> {pyq.exam_year}
                  </span>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>
                    {pyq.title}
                  </h3>
                  {subject && (
                    <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                      {subject.subject_code} · {subject.subject_name}
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <a
                    href={`/api/storage/stream?bucket=pyqs&path=${encodeURIComponent(pyq.file_path)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                      padding: '0.4rem 0.875rem',
                      fontSize: '0.8125rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <FileCheck size={14} /> View Paper
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', margin: 0 }}>
            No question papers found for the selected criteria. Papers are being scanned and uploaded by departments.
          </p>
        </div>
      )}
    </div>
  )
}
