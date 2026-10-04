'use client'

import { useState, useEffect } from 'react'
import { GraduationCap, BookOpen, Clock, Award, Search, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Program {
  id: string
  name: string
  short_code: string
  total_semesters: number
  duration_years: number
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
  semester_number: number
  year_number: number
}

interface CurriculumClientProps {
  initialPrograms: Program[]
  initialBranches: Branch[]
  initialProgramId: string
  initialBranchId: string
  initialSubjects: Subject[]
}

export function CurriculumClient({
  initialPrograms,
  initialBranches,
  initialProgramId,
  initialBranchId,
  initialSubjects,
}: CurriculumClientProps) {
  const supabase = createClient()

  const [programs] = useState<Program[]>(initialPrograms)
  const [selectedProgram, setSelectedProgram] = useState(initialProgramId)
  const [branches, setBranches] = useState<Branch[]>(initialBranches)
  const [selectedBranch, setSelectedBranch] = useState(initialBranchId)
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // When selectedProgram changes, fetch its branches
  useEffect(() => {
    if (!selectedProgram) return
    supabase
      .from('branches')
      .select('id, program_id, name, code')
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

  // When selectedBranch changes, fetch subjects
  useEffect(() => {
    if (!selectedBranch) {
      setSubjects([])
      return
    }
    setLoading(true)
    supabase
      .from('subjects')
      .select('id, subject_code, subject_name, credits, hours, category, semester_number, year_number')
      .eq('branch_id', selectedBranch)
      .order('semester_number')
      .order('subject_code')
      .then(({ data }: { data: Subject[] | null }) => {
        setSubjects(data || [])
        setLoading(false)
      })
  }, [selectedBranch]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentProg = programs.find((p) => p.id === selectedProgram)
  const currentBranch = branches.find((b) => b.id === selectedBranch)
  const branchDisplayName = currentBranch ? `[${currentBranch.code}] ${currentBranch.name}` : ''

  // Filter subjects by search
  const filteredSubjects = subjects.filter((s) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      s.subject_code.toLowerCase().includes(q) ||
      s.subject_name.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q)
    )
  })

  // Group by semester
  const bySemester = filteredSubjects.reduce<Record<number, Subject[]>>((acc, s) => {
    if (!acc[s.semester_number]) acc[s.semester_number] = []
    acc[s.semester_number].push(s)
    return acc
  }, {})

  const totalCredits = filteredSubjects.reduce((sum, s) => sum + s.credits, 0)
  const totalHours = filteredSubjects.reduce((sum, s) => sum + s.hours, 0)
  const totalSemesters = Object.keys(bySemester).length

  return (
    <div>
      {/* Program Quick-Switch Tabs */}
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

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.75rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          alignItems: 'flex-end',
        }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Filter size={13} /> Degree Program
            </label>
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
            <label className="form-label">Branch / Specialization</label>
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
            <label className="form-label">Search Subjects</label>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 36, height: 38 }}
                placeholder="Search subject code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
          <BookOpen size={20} color="#4f46e5" style={{ margin: '0 auto 4px' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{filteredSubjects.length}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Total Subjects</div>
        </div>
        <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
          <Award size={20} color="#e11d48" style={{ margin: '0 auto 4px' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{totalCredits}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Total Credits</div>
        </div>
        <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
          <GraduationCap size={20} color="#10b981" style={{ margin: '0 auto 4px' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{totalSemesters}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Semesters</div>
        </div>
        <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
          <Clock size={20} color="#f59e0b" style={{ margin: '0 auto 4px' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{totalHours}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Total Hours</div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="skeleton" style={{ height: 28, width: '40%', margin: '0 auto 1rem auto' }} />
          <div className="skeleton" style={{ height: 80, width: '90%', margin: '0 auto' }} />
        </div>
      ) : Object.keys(bySemester).length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {Object.entries(bySemester)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([sem, semSubjects]) => {
              const semCredits = semSubjects.reduce((s, sub) => s + sub.credits, 0)
              return (
                <div key={sem} className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 28,
                        height: 28,
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(79, 70, 229, 0.1)',
                        color: '#4f46e5',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.8125rem',
                      }}>
                        {sem}
                      </span>
                      Semester {sem}
                    </h2>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                        {semSubjects.length} subjects · {semCredits} credits
                      </span>
                      <span className="badge badge-maroon" style={{ fontSize: '0.6875rem' }}>
                        {branchDisplayName}
                      </span>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase' }}>Code</th>
                          <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase' }}>Subject Name</th>
                          <th style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase' }}>Credits</th>
                          <th style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase' }}>Hours</th>
                          <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase' }}>Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {semSubjects.map((sub) => (
                          <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '0.625rem 0.5rem' }}>
                              <span className="badge badge-maroon" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>{sub.subject_code}</span>
                            </td>
                            <td style={{ padding: '0.625rem 0.5rem', fontWeight: 600 }}>{sub.subject_name}</td>
                            <td style={{ padding: '0.625rem 0.5rem', textAlign: 'center', fontWeight: 700, color: '#9b1c31' }}>{sub.credits}</td>
                            <td style={{ padding: '0.625rem 0.5rem', textAlign: 'center' }}>{sub.hours}</td>
                            <td style={{ padding: '0.625rem 0.5rem' }}>
                              <span className="badge badge-neutral" style={{ fontSize: '0.625rem' }}>{sub.category}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <GraduationCap size={40} color="var(--text-tertiary)" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Subjects Configured Yet</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
            Subjects for {branchDisplayName || 'this branch'} will appear here as they are added to the academic curriculum.
          </p>
        </div>
      )}
    </div>
  )
}
