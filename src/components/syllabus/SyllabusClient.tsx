'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  FileCheck,
  Library,
  Layers,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Program {
  id: string
  name: string
  short_code: string
  duration_years: number
  total_semesters: number
}

interface Branch {
  id: string
  program_id: string
  name: string
  code: string
}

interface Subject {
  id: string
  subject_code: string
  subject_name: string
  credits: number
  hours: number
  category: string
}

interface SyllabusTopic {
  id: string
  topic_order: number
  title: string
  details: string | null
}

interface SyllabusUnit {
  id: string
  unit_number: number
  unit_title: string
  hours: number | null
  description: string | null
  topics: SyllabusTopic[]
}

interface RelatedNote {
  id: string
  title: string
  view_count: number
}

interface RelatedPYQ {
  id: string
  title: string
  exam_type: string
  exam_year: number
}

interface RelatedBook {
  id: string
  title: string
  ebook_status: string
}

interface SyllabusDetail {
  subject: Subject
  units: SyllabusUnit[]
  related: {
    notes: RelatedNote[]
    pyqs: RelatedPYQ[]
    books: RelatedBook[]
  }
}

// ─── Props (initial SSR data passed from Server Component) ───────────────────
interface SyllabusClientProps {
  initialPrograms: Program[]
  initialBranches?: Branch[]
  defaultProgram: string
  defaultBranch: string
  defaultSemester: number
}

export function SyllabusClient({
  initialPrograms,
  initialBranches = [],
  defaultProgram,
  defaultBranch,
  defaultSemester,
}: SyllabusClientProps) {
  const supabase = createClient()

  const [programs] = useState<Program[]>(initialPrograms)
  const [branches, setBranches] = useState<Branch[]>(initialBranches)
  const [selectedProgram, setSelectedProgram] = useState(defaultProgram)
  const [selectedBranch, setSelectedBranch] = useState(defaultBranch)
  const [selectedSemester, setSelectedSemester] = useState(defaultSemester)

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [syllabusDetail, setSyllabusDetail] = useState<SyllabusDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({})

  const currentProg = programs.find((p) => p.id === selectedProgram)
  const totalSems = currentProg?.total_semesters || 8
  const isBtech = currentProg?.short_code === 'B.Tech'

  // Fetch branches when program changes
  useEffect(() => {
    if (!selectedProgram) return
    if (currentProg && selectedSemester > currentProg.total_semesters) {
      setSelectedSemester(1)
    }
    supabase
      .from('branches')
      .select('*')
      .eq('program_id', selectedProgram)
      .order('name')
      .then(({ data }: { data: Branch[] | null }) => {
        const list = data || []
        setBranches(list)
        if (list.length > 0 && !list.some((b: Branch) => b.id === selectedBranch)) {
          setSelectedBranch(list[0].id)
        }
      })
  }, [selectedProgram]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch subjects when branch/semester changes
  useEffect(() => {
    if (!selectedBranch || !selectedSemester) return
    setLoading(true)
    setSyllabusDetail(null)

    supabase
      .from('subjects')
      .select('id, subject_code, subject_name, credits, hours, category')
      .eq('branch_id', selectedBranch)
      .eq('semester_number', selectedSemester)
      .order('subject_code')
      .then(({ data }: { data: Subject[] | null }) => {
        const list = data || []
        setSubjects(list)
        setSelectedSubjectId(list[0]?.id ?? null)
        setLoading(false)
      })
  }, [selectedBranch, selectedSemester]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch syllabus detail when subject changes
  const fetchSyllabus = useCallback(
    async (subjectId: string) => {
      // Fetch units
      const { data: units } = await supabase
        .from('syllabus_units')
        .select(`
          id, unit_number, unit_title, hours, description,
          syllabus_topics (id, topic_order, title, details)
        `)
        .eq('subject_id', subjectId)
        .order('unit_number')

      if (!units || units.length === 0) {
        setSyllabusDetail(null)
        return
      }

      // Sort topics within each unit
      const formattedUnits: SyllabusUnit[] = (units as any[]).map((u: any) => ({
        ...u,
        topics: [...(u.syllabus_topics || [])].sort((a: any, b: any) => a.topic_order - b.topic_order),
      }))

      // Fetch subject info
      const { data: subject } = await supabase
        .from('subjects')
        .select('id, subject_code, subject_name, credits, hours, category')
        .eq('id', subjectId)
        .single()

      // Fetch related notes (published only)
      const { data: notes } = await supabase
        .from('notes')
        .select('id, title, view_count')
        .eq('subject_id', subjectId)
        .eq('status', 'published')
        .limit(3)

      // Fetch related PYQs
      const { data: pyqs } = await supabase
        .from('pyqs')
        .select('id, title, exam_type, exam_year')
        .eq('subject_id', subjectId)
        .eq('status', 'published')
        .order('exam_year', { ascending: false })
        .limit(3)

      // Fetch related books
      const { data: books } = await supabase
        .from('library_books')
        .select('id, title, ebook_status')
        .eq('subject_id', subjectId)
        .limit(3)

      if (subject) {
        setSyllabusDetail({
          subject,
          units: formattedUnits,
          related: {
            notes: notes || [],
            pyqs: pyqs || [],
            books: books || [],
          },
        })
        // Auto-expand first unit
        if (formattedUnits.length > 0) {
          setExpandedUnits({ [formattedUnits[0].id]: true })
        }
      }
    },
    [supabase]
  )

  useEffect(() => {
    if (selectedSubjectId) {
      fetchSyllabus(selectedSubjectId)
    }
  }, [selectedSubjectId, fetchSyllabus])

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }))
  }

  return (
    <div>
      {/* Program Category Quick Switch Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {programs.map((p) => {
          const isSelected = selectedProgram === p.id
          let label = p.short_code
          if (p.short_code === 'B.Tech') label = 'B.Tech (Engineering & Tech)'
          else if (p.short_code === 'BS-MS') label = 'BS-MS (Dual Degree · 5 Yrs)'
          else if (p.short_code === 'B.Pharm') label = 'B.Pharm'
          else if (p.short_code === 'BBA') label = 'BBA'
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedProgram(p.id)}
              className={`btn ${isSelected ? 'maroon-texture' : 'btn-secondary'}`}
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-full)',
                border: isSelected ? '1px solid rgba(244, 63, 94, 0.4)' : undefined,
                boxShadow: isSelected ? '0 2px 10px rgba(244, 63, 94, 0.25)' : undefined,
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Filter bar */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.75rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            alignItems: 'flex-end',
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Degree Program</label>
            <select
              className="form-select"
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.short_code} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Branch / Department</label>
            <select
              className="form-select"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  [{b.code}] {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Semester</label>
            <select
              className="form-select"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(Number(e.target.value))}
            >
              {Array.from({ length: totalSems }, (_, i) => i + 1).map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Subject list + Syllabus detail */}
      {loading ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="skeleton" style={{ height: 28, width: '40%', margin: '0 auto 1rem auto' }} />
          <div className="skeleton" style={{ height: 80, width: '90%', margin: '0 auto' }} />
        </div>
      ) : subjects.length > 0 ? (
        <>
          {/* Subject tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSubjectId(s.id)}
                className={`btn ${selectedSubjectId === s.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '0.4rem 0.875rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {s.subject_code}
              </button>
            ))}
          </div>

          {syllabusDetail && syllabusDetail.subject ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2.5fr 1fr',
                gap: '2rem',
              }}
            >
              {/* Left: Subject header + Units accordion */}
              <div>
                {/* Subject overview card */}
                <div
                  className="glass-card"
                  style={{
                    padding: '1.75rem',
                    marginBottom: '1.5rem',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background: 'linear-gradient(90deg, #70101e, #8b1e32, #fda4af)',
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 4,
                        }}
                      >
                        <span
                          className="badge badge-maroon maroon-texture"
                          style={{ fontWeight: 700 }}
                        >
                          {syllabusDetail.subject.subject_code}
                        </span>
                        <span className="badge badge-neutral">
                          {syllabusDetail.subject.category}
                        </span>
                      </div>
                      <h2
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: 700,
                          letterSpacing: '-0.02em',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {syllabusDetail.subject.subject_name}
                      </h2>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '1rem',
                        background: 'var(--bg-secondary)',
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '0.6875rem',
                            color: 'var(--text-tertiary)',
                            textTransform: 'uppercase',
                          }}
                        >
                          Credits
                        </div>
                        <div
                          style={{
                            fontSize: '1.125rem',
                            fontWeight: 700,
                            color: '#9b1c31',
                          }}
                        >
                          {syllabusDetail.subject.credits}
                        </div>
                      </div>
                      <div style={{ width: 1, background: 'var(--border-light)' }} />
                      <div>
                        <div
                          style={{
                            fontSize: '0.6875rem',
                            color: 'var(--text-tertiary)',
                            textTransform: 'uppercase',
                          }}
                        >
                          Lectures
                        </div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                          {syllabusDetail.subject.hours} hrs
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Units & Topics Accordion */}
                <h3
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Layers size={18} color="#9b1c31" />
                  <span>Syllabus Units & Topics</span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {syllabusDetail.units.map((unit) => {
                    const isExpanded = !!expandedUnits[unit.id]
                    return (
                      <div key={unit.id} className="glass-card" style={{ padding: 0 }}>
                        <button
                          onClick={() => toggleUnit(unit.id)}
                          style={{
                            width: '100%',
                            padding: '1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            userSelect: 'none',
                            background: 'none',
                            border: 'none',
                            color: 'inherit',
                            font: 'inherit',
                            textAlign: 'left',
                          }}
                          aria-expanded={isExpanded}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.875rem',
                            }}
                          >
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(128, 0, 32, 0.12)',
                                color: '#9b1c31',
                                border: '1px solid rgba(155, 28, 49, 0.25)',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {unit.unit_number}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                                Unit {unit.unit_number}: {unit.unit_title}
                              </div>
                              {unit.hours && (
                                <div
                                  style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-tertiary)',
                                  }}
                                >
                                  Approx. {unit.hours} lecture hours
                                </div>
                              )}
                            </div>
                          </div>
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>

                        {isExpanded && (
                          <div
                            style={{
                              padding: '0 1.25rem 1.25rem 1.25rem',
                              borderTop: '1px solid var(--border-light)',
                              background: 'var(--bg-secondary)',
                            }}
                          >
                            {unit.description && (
                              <p
                                style={{
                                  fontSize: '0.8125rem',
                                  color: 'var(--text-secondary)',
                                  padding: '0.75rem 0',
                                  fontStyle: 'italic',
                                }}
                              >
                                {unit.description}
                              </p>
                            )}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                                marginTop: 4,
                              }}
                            >
                              {unit.topics.map((t) => (
                                <div
                                  key={t.id}
                                  style={{
                                    background: 'var(--bg-card)',
                                    padding: '0.625rem 0.875rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-light)',
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: '0.8125rem',
                                      fontWeight: 600,
                                      color: 'var(--text-primary)',
                                    }}
                                  >
                                    {t.topic_order}. {t.title}
                                  </div>
                                  {t.details && (
                                    <div
                                      style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-tertiary)',
                                        marginTop: 2,
                                      }}
                                    >
                                      {t.details}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right: Connected Resources */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
                  Connected Resources
                </h3>

                {/* Related Notes */}
                <div className="glass-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <FileText size={16} color="var(--color-success)" />
                    <span>Related Study Notes</span>
                  </div>
                  {syllabusDetail.related.notes.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {syllabusDetail.related.notes.map((note) => (
                        <Link
                          key={note.id}
                          href="/notes"
                          style={{
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            fontSize: '0.75rem',
                            display: 'block',
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{note.title}</div>
                          <span style={{ color: 'var(--text-tertiary)' }}>
                            {note.view_count} reads
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      No notes uploaded for this course yet.
                    </p>
                  )}
                </div>

                {/* Related PYQs */}
                <div className="glass-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <FileCheck size={16} color="var(--color-indigo)" />
                    <span>Previous Year Papers (PYQ)</span>
                  </div>
                  {syllabusDetail.related.pyqs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {syllabusDetail.related.pyqs.map((q) => (
                        <Link
                          key={q.id}
                          href="/pyq"
                          style={{
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            fontSize: '0.75rem',
                            display: 'block',
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{q.title}</div>
                          <span style={{ color: 'var(--text-tertiary)' }}>
                            {q.exam_type} {q.exam_year}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      No PYQ papers logged yet.
                    </p>
                  )}
                </div>

                {/* Related Books */}
                <div className="glass-card" style={{ padding: '1rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <Library size={16} color="var(--color-warning)" />
                    <span>Textbooks & Manuals</span>
                  </div>
                  {syllabusDetail.related.books.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {syllabusDetail.related.books.map((b) => (
                        <Link
                          key={b.id}
                          href="/library"
                          style={{
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            fontSize: '0.75rem',
                            display: 'block',
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{b.title}</div>
                          <span
                            className={`badge ${b.ebook_status === 'available' ? 'badge-green' : 'badge-yellow'}`}
                            style={{ fontSize: '0.625rem', marginTop: 4, display: 'inline-block' }}
                          >
                            {b.ebook_status === 'available' ? 'Read Ebook' : 'Request Ebook'}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      No digital textbooks mapped.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Curriculum not available — Section 19 mandate */
            <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <BookOpen
                size={40}
                color="var(--text-tertiary)"
                style={{ margin: '0 auto 1rem auto' }}
              />
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '0.5rem',
                }}
              >
                Curriculum not available.
              </h2>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-tertiary)',
                  maxWidth: 460,
                  margin: '0 auto',
                }}
              >
                Syllabus data for this specific branch and semester has not been officially
                registered in the hub database yet.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <BookOpen
            size={40}
            color="var(--text-tertiary)"
            style={{ margin: '0 auto 1rem auto' }}
          />
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            Curriculum not available.
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-tertiary)',
              maxWidth: 460,
              margin: '0 auto',
            }}
          >
            Syllabus data for this specific branch and semester has not been officially registered
            in the hub database yet.
          </p>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 2.5fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
