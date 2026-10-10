'use client'

import { useState, useEffect } from 'react'
import {
  GraduationCap,
  BookOpen,
  Clock,
  Award,
  Search,
  Filter,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Layers,
  Info,
} from 'lucide-react'
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

// Category badge styling helper
function getCategoryColor(category: string) {
  const cat = (category || '').toLowerCase()
  if (cat.includes('basic science') || cat.includes('bsc')) {
    return { bg: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', border: 'rgba(59, 130, 246, 0.25)' }
  }
  if (cat.includes('engineering science') || cat.includes('esc')) {
    return { bg: 'rgba(139, 92, 246, 0.1)', color: '#7c3aed', border: 'rgba(139, 92, 246, 0.25)' }
  }
  if (cat.includes('skill enhancement') || cat.includes('sec')) {
    return { bg: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: 'rgba(16, 185, 129, 0.25)' }
  }
  if (cat.includes('humanities') || cat.includes('hmsc')) {
    return { bg: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: 'rgba(245, 158, 11, 0.25)' }
  }
  if (cat.includes('marketing')) {
    return { bg: 'rgba(225, 29, 72, 0.1)', color: '#e11d48', border: 'rgba(225, 29, 72, 0.25)' }
  }
  if (cat.includes('finance')) {
    return { bg: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: 'rgba(16, 185, 129, 0.25)' }
  }
  if (cat.includes('hr') || cat.includes('human resource')) {
    return { bg: 'rgba(147, 51, 234, 0.1)', color: '#9333ea', border: 'rgba(147, 51, 234, 0.25)' }
  }
  if (cat.includes('analytics')) {
    return { bg: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: 'rgba(245, 158, 11, 0.25)' }
  }
  if (cat.includes('project') || cat.includes('internship') || cat.includes('research')) {
    return { bg: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5', border: 'rgba(79, 70, 229, 0.25)' }
  }
  if (cat.includes('ability enhancement')) {
    return { bg: 'rgba(6, 182, 212, 0.1)', color: '#0891b2', border: 'rgba(6, 182, 212, 0.25)' }
  }
  if (cat.includes('program core') || cat.includes('pcc') || cat === 'core') {
    return { bg: 'rgba(155, 28, 49, 0.1)', color: '#9b1c31', border: 'rgba(155, 28, 49, 0.25)' }
  }
  if (cat.includes('program elective') || cat.includes('pec')) {
    return { bg: 'rgba(6, 182, 212, 0.1)', color: '#0891b2', border: 'rgba(6, 182, 212, 0.25)' }
  }
  if (cat.includes('open elective') || cat.includes('oec')) {
    return { bg: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', border: 'rgba(99, 102, 241, 0.25)' }
  }
  if (cat.includes('mandatory') || cat.includes('mc')) {
    return { bg: 'rgba(107, 114, 128, 0.1)', color: '#4b5563', border: 'rgba(107, 114, 128, 0.25)' }
  }
  return { bg: 'rgba(107, 114, 128, 0.08)', color: 'var(--text-secondary)', border: 'var(--border-light)' }
}

// Parse elective subject name and its options
function parseSubjectName(name: string) {
  const match = name.match(/^(.*?)\s*\((.*?)\)$/)
  if (match && match[2].includes('/')) {
    const mainTitle = match[1].trim()
    const options = match[2].split('/').map((s) => s.trim()).filter(Boolean)
    return { mainTitle, options }
  }
  return { mainTitle: name, options: [] }
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
  const [showNepBreakdown, setShowNepBreakdown] = useState(false)
  const [showBsmsExitBreakdown, setShowBsmsExitBreakdown] = useState(false)
  const [bbaTrackFilter, setBbaTrackFilter] = useState<'ALL' | 'CORE' | 'MARKETING' | 'FINANCE' | 'HR' | 'ANALYTICS'>('ALL')

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
          // Prioritize CSE for B.Tech, MDS for BS-MS, or BBA for BBA
          const preferred = list.find((b) => b.code === 'CSE') || list.find((b) => b.code === 'MDS') || list.find((b) => b.code === 'BBA') || list[0]
          setSelectedBranch(preferred.id)
        }
      })
  }, [selectedProgram]) // eslint-disable-line react-hooks/exhaustive-deps

  // When selectedBranch changes, fetch subjects
  useEffect(() => {
    if (!selectedBranch) {
      return
    }
    void Promise.resolve().then(() => {
      setLoading(true)
      return supabase
      .from('subjects')
      .select('id, subject_code, subject_name, credits, hours, category, semester_number, year_number')
      .eq('branch_id', selectedBranch)
      .order('semester_number')
      .order('subject_code')
      .then(({ data }: { data: Subject[] | null }) => {
        setSubjects(data || [])
        setLoading(false)
      })
    })
  }, [selectedBranch]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentProg = programs.find((p) => p.id === selectedProgram)
  const currentBranch = branches.find((b) => b.id === selectedBranch)
  const branchDisplayName = currentBranch ? `[${currentBranch.code}] ${currentBranch.name}` : ''

  const isNep2020Branch = currentBranch?.code === 'CSE' || currentBranch?.code === 'AIML'
  const isLftBranch = currentBranch?.code === 'LFT'
  const isBbaProgram = currentProg?.short_code === 'BBA'
  const isBsmsMds = currentBranch?.code === 'MDS' || (currentProg?.short_code === 'BS-MS' && (!currentBranch || currentBranch.code === 'MDS'))
  const isCheBranch = currentBranch?.code === 'CHE'
  const isCeBranch = currentBranch?.code === 'CE'
  const isBcBranch = currentBranch?.code === 'BC'

  // Filter subjects by search and BBA Track
  const filteredSubjects = subjects.filter((s) => {
    // BBA specialization track filtering
    if (isBbaProgram && bbaTrackFilter !== 'ALL') {
      const cat = (s.category || '').toLowerCase()
      if (bbaTrackFilter === 'CORE' && !cat.includes('core') && !cat.includes('skill') && !cat.includes('humanities') && !cat.includes('ability') && !cat.includes('project') && !cat.includes('internship') && !cat.includes('research')) {
        return false
      }
      if (bbaTrackFilter === 'MARKETING' && !cat.includes('marketing') && !cat.includes('core') && !cat.includes('project') && !cat.includes('internship') && !cat.includes('research')) {
        return false
      }
      if (bbaTrackFilter === 'FINANCE' && !cat.includes('finance') && !cat.includes('core') && !cat.includes('project') && !cat.includes('internship') && !cat.includes('research')) {
        return false
      }
      if (bbaTrackFilter === 'HR' && !cat.includes('hr') && !cat.includes('human resource') && !cat.includes('core') && !cat.includes('project') && !cat.includes('internship') && !cat.includes('research')) {
        return false
      }
      if (bbaTrackFilter === 'ANALYTICS' && !cat.includes('analytics') && !cat.includes('core') && !cat.includes('project') && !cat.includes('internship') && !cat.includes('research')) {
        return false
      }
    }

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
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
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

      {/* Quick Branch Selector Pills */}
      {branches.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6, letterSpacing: '0.05em' }}>
            Select Branch / Specialization:
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {branches.map((b) => {
              const isSelected = selectedBranch === b.id
              const isOfficialCurriculum =
                b.code === 'CSE' ||
                b.code === 'AIML' ||
                b.code === 'LFT' ||
                b.code === 'BBA' ||
                b.code === 'MDS' ||
                b.code === 'CHE' ||
                b.code === 'CE' ||
                b.code === 'BC'

              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBranch(b.id)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: 'var(--radius-md)',
                    border: isSelected
                      ? '1px solid #9b1c31'
                      : isOfficialCurriculum
                      ? '1px solid rgba(79, 70, 229, 0.25)'
                      : '1px solid var(--border-light)',
                    background: isSelected
                      ? '#9b1c31'
                      : isOfficialCurriculum
                      ? 'rgba(79, 70, 229, 0.05)'
                      : 'var(--bg-card)',
                    color: isSelected ? '#ffffff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>[{b.code}] {b.name}</span>
                  {isOfficialCurriculum && (
                    <span
                      style={{
                        fontSize: '0.625rem',
                        padding: '1px 5px',
                        borderRadius: 'var(--radius-full)',
                        background: isSelected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(79, 70, 229, 0.15)',
                        color: isSelected ? '#ffffff' : '#4f46e5',
                        fontWeight: 700,
                      }}
                    >
                      {b.code === 'LFT'
                        ? '2025-26'
                        : b.code === 'BBA'
                        ? '2024-25'
                        : b.code === 'MDS'
                        ? '2023-24'
                        : b.code === 'CE'
                        ? '2022-23 / 23-24'
                        : (b.code === 'CHE' || b.code === 'BC')
                        ? '2022-23'
                        : 'NEP 2020'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Official Curriculum Banner for CSE & AIML (NEP 2020) */}
      {isNep2020Branch && (
        <div
          className="glass-card"
          style={{
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            borderLeft: '4px solid #4f46e5',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.06) 0%, rgba(155, 28, 49, 0.04) 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span className="badge badge-indigo" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                  <Sparkles size={11} style={{ display: 'inline', marginRight: 3 }} />
                  Official HBTU NEP 2020 Curriculum
                </span>
                <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                  Academic Session: 2026-27
                </span>
              </div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>
                Department of Computer Science & Engineering
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0 }}>
                Course Curriculum for <strong style={{ color: 'var(--text-primary)' }}>B. Tech. {currentBranch?.name}</strong> · Total: 172 Credits · 214 Contact Hours
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowNepBreakdown(!showNepBreakdown)}
              className="btn btn-secondary"
              style={{
                fontSize: '0.75rem',
                padding: '0.4rem 0.8rem',
                gap: 5,
                borderRadius: 'var(--radius-md)',
              }}
            >
              <Layers size={14} />
              {showNepBreakdown ? 'Hide Course Components' : 'View Course Components (Page 2)'}
              {showNepBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* NEP 2020 Course Component Breakdown Table */}
          {showNepBreakdown && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={14} color="#4f46e5" />
                Curriculum Content & Credit Distribution (NEP 2020):
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.02)' }}>
                      <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem', color: 'var(--text-tertiary)' }}>Sr.</th>
                      <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem', color: 'var(--text-tertiary)' }}>Course Component</th>
                      <th style={{ textAlign: 'center', padding: '0.4rem 0.6rem', color: 'var(--text-tertiary)' }}>% of Total Credits</th>
                      <th style={{ textAlign: 'center', padding: '0.4rem 0.6rem', color: 'var(--text-tertiary)' }}>Contact Hours</th>
                      <th style={{ textAlign: 'center', padding: '0.4rem 0.6rem', color: 'var(--text-tertiary)' }}>Total Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { sr: 1, name: 'Basic Sciences (BSC)', pct: '11.62%', hours: 21, credits: 20 },
                      { sr: 2, name: 'Engineering Sciences (ESC)', pct: '10.46%', hours: '05', credits: 18 },
                      { sr: 3, name: 'Skill Enhancement (SEC)', pct: '2.32%', hours: '08', credits: '04' },
                      { sr: 4, name: 'Humanities and Social Sciences (HMSC)', pct: '5.23%', hours: 11, credits: 9 },
                      { sr: 5, name: 'Program Core (PCC)', pct: '59.88%', hours: 135, credits: 103 },
                      { sr: 6, name: 'Mandatory Course (MC)', pct: '0.00%', hours: '00', credits: '00' },
                      { sr: 7, name: 'Program Electives (PEC)', pct: '6.98%', hours: 12, credits: 12 },
                      { sr: 8, name: 'Open Electives (OEC)', pct: '3.49%', hours: '06', credits: '06' },
                    ].map((row) => (
                      <tr key={row.sr} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '0.35rem 0.6rem', color: 'var(--text-tertiary)' }}>{row.sr}</td>
                        <td style={{ padding: '0.35rem 0.6rem', fontWeight: 600 }}>{row.name}</td>
                        <td style={{ padding: '0.35rem 0.6rem', textAlign: 'center' }}>{row.pct}</td>
                        <td style={{ padding: '0.35rem 0.6rem', textAlign: 'center' }}>{row.hours}</td>
                        <td style={{ padding: '0.35rem 0.6rem', textAlign: 'center', fontWeight: 700, color: '#9b1c31' }}>{row.credits}</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'rgba(79, 70, 229, 0.08)', fontWeight: 800 }}>
                      <td colSpan={2} style={{ padding: '0.5rem 0.6rem' }}>Total</td>
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>100.00%</td>
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>214</td>
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: '#9b1c31' }}>172</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Official Curriculum Banner for LFT (Session 2025-26) */}
      {isLftBranch && (
        <div
          className="glass-card"
          style={{
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            borderLeft: '4px solid #9b1c31',
            background: 'linear-gradient(135deg, rgba(155, 28, 49, 0.06) 0%, rgba(245, 158, 11, 0.04) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span className="badge badge-maroon" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
              Official Evaluation Scheme
            </span>
            <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
              Applicable from Session 2025-26
            </span>
          </div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>
            Department of Leather and Fashion Technology
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0 }}>
            B. Tech. Chemical Technology - Leather and Fashion Technology · Semester Wise Course Structure & Evaluation Scheme · Total: 178 Credits
          </p>
        </div>
      )}

      {/* Official Curriculum Banner for BBA (Session 2024-25) */}
      {isBbaProgram && (
        <div
          className="glass-card"
          style={{
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            borderLeft: '4px solid #f59e0b',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06) 0%, rgba(79, 70, 229, 0.04) 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span className="badge badge-amber" style={{ fontSize: '0.6875rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}>
                  <Sparkles size={11} style={{ display: 'inline', marginRight: 3 }} />
                  Official Study & Evaluation Scheme with Syllabus
                </span>
                <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                  Academic Session: 2024-25
                </span>
              </div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>
                Department of Management Studies · School of Entrepreneurship & Management
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0 }}>
                Bachelor of Business Administration (BBA) · 3 Years / 6 Semesters · Specializations in Marketing, Finance, HR & Business Analytics
              </p>
            </div>
          </div>

          {/* BBA Specialization Track Filter Pills */}
          <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6, letterSpacing: '0.05em' }}>
              Filter by Specialization Track (Semesters V & VI):
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'All Subjects (Complete Overview)' },
                { id: 'CORE', label: 'Core & Projects Only' },
                { id: 'MARKETING', label: '🎯 Marketing Specialization' },
                { id: 'FINANCE', label: '💰 Finance Specialization' },
                { id: 'HR', label: '👥 Human Resource (HR)' },
                { id: 'ANALYTICS', label: '📊 Business Analytics' },
              ].map((trk) => {
                const isSelected = bbaTrackFilter === trk.id
                return (
                  <button
                    key={trk.id}
                    type="button"
                    onClick={() => setBbaTrackFilter(trk.id as typeof bbaTrackFilter)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 700 : 500,
                      borderRadius: 'var(--radius-full)',
                      border: isSelected ? '1px solid #d97706' : '1px solid var(--border-light)',
                      background: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-card)',
                      color: isSelected ? '#b45309' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {trk.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Official Curriculum Banner for BS-MS (Mathematics and Data Science) */}
      {isBsmsMds && (
        <div
          className="glass-card"
          style={{
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            borderLeft: '4px solid #0284c7',
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.06) 0%, rgba(99, 102, 241, 0.04) 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span className="badge badge-sky" style={{ fontSize: '0.6875rem', fontWeight: 700, background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7' }}>
                  <Sparkles size={11} style={{ display: 'inline', marginRight: 3 }} />
                  Official Study & Evaluation Scheme (HBTU)
                </span>
                <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                  With effect from Session 2023-2024
                </span>
              </div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>
                School of Basic and Applied Sciences · Department of Mathematics
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0 }}>
                B. S. Program / BS-MS Dual Degree in <strong style={{ color: 'var(--text-primary)' }}>Mathematics and Data Science</strong> · Approved by Dr. Ram Autar, Prof. & Head of Department
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowBsmsExitBreakdown(!showBsmsExitBreakdown)}
              className="btn btn-secondary"
              style={{
                fontSize: '0.75rem',
                padding: '0.4rem 0.8rem',
                gap: 5,
                borderRadius: 'var(--radius-md)',
              }}
            >
              <Layers size={14} />
              {showBsmsExitBreakdown ? 'Hide NEP Exit Options' : 'View NEP 2020 Multi-Exit Awards'}
              {showBsmsExitBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* NEP 2020 Exit Criteria Breakdown */}
          {showBsmsExitBreakdown && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={14} color="#0284c7" />
                NEP 2020 Stage-Wise Exit Awards & Credit Framework:
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.02)' }}>
                      <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem', color: 'var(--text-tertiary)' }}>Study Period</th>
                      <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem', color: 'var(--text-tertiary)' }}>Award / Degree Title</th>
                      <th style={{ textAlign: 'center', padding: '0.4rem 0.6rem', color: 'var(--text-tertiary)' }}>Core Course Credits</th>
                      <th style={{ textAlign: 'center', padding: '0.4rem 0.6rem', color: 'var(--text-tertiary)' }}>Exit Credits (Skill + Internship)</th>
                      <th style={{ textAlign: 'center', padding: '0.4rem 0.6rem', color: 'var(--text-tertiary)' }}>Total Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { period: '1 Year (Sems I & II)', title: 'Certificate in Mathematics and Data Science', core: 44, exit: '10 (4 Skill + 6 Summer Internship)', total: 54 },
                      { period: '2 Years (Sems I to IV)', title: 'Diploma in Mathematics and Data Science', core: 92, exit: '10 (4 Skill + 6 Summer Internship)', total: 102 },
                      { period: '3 Years (Sems I to VI)', title: 'B.Sc. Degree in Mathematics and Data Science', core: 136, exit: '10 (4 Skill + 6 Summer Internship)', total: 146 },
                      { period: '4 Years (Sems I to VIII)', title: 'B. S. (Honors) / B. S. (Honors with Research)', core: 180, exit: 'Completed via BS Project-II Thesis', total: 180 },
                      { period: '5 Years (Sems I to X)', title: 'BS-MS Post Graduate Dual Degree (MDS)', core: 224, exit: 'Master\'s Dissertation (MS Project-I & II)', total: 224 },
                    ].map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '0.35rem 0.6rem', fontWeight: 600 }}>{row.period}</td>
                        <td style={{ padding: '0.35rem 0.6rem' }}>{row.title}</td>
                        <td style={{ padding: '0.35rem 0.6rem', textAlign: 'center' }}>{row.core}</td>
                        <td style={{ padding: '0.35rem 0.6rem', textAlign: 'center', color: '#0284c7' }}>{row.exit}</td>
                        <td style={{ padding: '0.35rem 0.6rem', textAlign: 'center', fontWeight: 700, color: '#9b1c31' }}>{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Official Curriculum Banner for Chemical Engineering (CHE) */}
      {isCheBranch && (
        <div
          className="glass-card"
          style={{
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            borderLeft: '4px solid #059669',
            background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.06) 0%, rgba(79, 70, 229, 0.04) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span className="badge badge-emerald" style={{ fontSize: '0.6875rem', fontWeight: 700, background: 'rgba(5, 150, 105, 0.15)', color: '#059669' }}>
              <Sparkles size={11} style={{ display: 'inline', marginRight: 3 }} />
              Official Course Structure & Evaluation Scheme
            </span>
            <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
              Effective from Session 2022-23 for new entrants
            </span>
          </div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>
            Department of Chemical Engineering · School of Chemical Technology
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0 }}>
            B. Tech. Degree Programme in <strong style={{ color: 'var(--text-primary)' }}>Chemical Engineering</strong> · Semesters I to VIII · Total: 178 Credits · 47 Core & Elective Subjects
          </p>
        </div>
      )}

      {/* Official Curriculum Banner for Civil Engineering (CE) */}
      {isCeBranch && (
        <div
          className="glass-card"
          style={{
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            borderLeft: '4px solid #2563eb',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.06) 0%, rgba(155, 28, 49, 0.04) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span className="badge badge-blue" style={{ fontSize: '0.6875rem', fontWeight: 700, background: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' }}>
              <Sparkles size={11} style={{ display: 'inline', marginRight: 3 }} />
              Official Scheme of Evaluation & Syllabus
            </span>
            <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
              Effective from Session 2022-23 / 2023-24 onwards
            </span>
          </div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>
            Department of Civil Engineering · School of Engineering
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0 }}>
            B. Tech. Degree Programme in <strong style={{ color: 'var(--text-primary)' }}>Civil Engineering</strong> · Approved by Dr. Deepesh Singh, Prof. & Head of Department · Total: 178 Credits · 49 Subjects
          </p>
        </div>
      )}

      {/* Official Curriculum Banner for Biochemical Engineering (BC) */}
      {isBcBranch && (
        <div
          className="glass-card"
          style={{
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            borderLeft: '4px solid #7c3aed',
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.06) 0%, rgba(5, 150, 105, 0.04) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span className="badge badge-purple" style={{ fontSize: '0.6875rem', fontWeight: 700, background: 'rgba(124, 58, 237, 0.15)', color: '#7c3aed' }}>
              <Sparkles size={11} style={{ display: 'inline', marginRight: 3 }} />
              Official Course Structure & Evaluation Scheme
            </span>
            <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
              Effective from Session 2022-23 for new entrants
            </span>
          </div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>
            Department of Biochemical Engineering · School of Chemical Technology
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0 }}>
            B. Tech. Chemical Technology - <strong style={{ color: 'var(--text-primary)' }}>Biochemical Engineering</strong> · Semesters I to VIII · Total: 180 Credits · 50 Subjects
          </p>
        </div>
      )}

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
                          <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', width: '110px' }}>Code</th>
                          <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase' }}>Subject Name & Elective Options</th>
                          <th style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', width: '70px' }}>Credits</th>
                          <th style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', width: '70px' }}>Hours</th>
                          <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', width: '160px' }}>Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {semSubjects.map((sub) => {
                          const { mainTitle, options } = parseSubjectName(sub.subject_name)
                          const catColor = getCategoryColor(sub.category)

                          return (
                            <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                              <td style={{ padding: '0.625rem 0.5rem', verticalAlign: 'top' }}>
                                <span className="badge badge-maroon" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                                  {sub.subject_code}
                                </span>
                              </td>
                              <td style={{ padding: '0.625rem 0.5rem', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{mainTitle}</div>
                                {options.length > 0 && (
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                                    {options.map((opt, i) => (
                                      <span
                                        key={i}
                                        style={{
                                          fontSize: '0.6875rem',
                                          padding: '2px 7px',
                                          borderRadius: 'var(--radius-sm)',
                                          background: 'rgba(79, 70, 229, 0.07)',
                                          border: '1px solid rgba(79, 70, 229, 0.18)',
                                          color: 'var(--text-secondary)',
                                        }}
                                      >
                                        {opt}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '0.625rem 0.5rem', textAlign: 'center', fontWeight: 700, color: '#9b1c31', verticalAlign: 'top' }}>
                                {sub.credits}
                              </td>
                              <td style={{ padding: '0.625rem 0.5rem', textAlign: 'center', verticalAlign: 'top' }}>
                                {sub.hours}
                              </td>
                              <td style={{ padding: '0.625rem 0.5rem', verticalAlign: 'top' }}>
                                <span
                                  style={{
                                    fontSize: '0.6875rem',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: catColor.bg,
                                    color: catColor.color,
                                    border: `1px solid ${catColor.border}`,
                                    display: 'inline-block',
                                  }}
                                >
                                  {sub.category}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
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
