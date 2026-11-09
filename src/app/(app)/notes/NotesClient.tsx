'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import {
  FileText,
  Search,
  Eye,
  Calendar,
  HardDrive,
  BookOpen,
  X,
  Lock,
  Maximize2,
  GraduationCap,
  Globe,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronRight,
  BookMarked,
} from 'lucide-react'

export interface NoteSubject {
  id: string
  subject_code: string
  subject_name: string
  semester_number?: number
  year_number?: number
  branch_id?: string
  program_id?: string
  branches?: { id: string; name: string; code: string } | null
  programs?: { id: string; name: string; short_code: string } | null
}

export interface Note {
  id: string
  title: string
  description: string | null
  file_path?: string
  file_type: string
  file_size: number
  view_count: number
  created_at: string
  status?: string
  subjects: NoteSubject | null
  isMyBranch?: boolean
  isMySemester?: boolean
}

export interface Program {
  id: string
  name: string
  short_code: string
}

export interface Branch {
  id: string
  program_id: string
  name: string
  code: string
}

export interface SubjectOption {
  id: string
  subject_code: string
  subject_name: string
  semester_number?: number
  year_number?: number
  branch_id?: string
  program_id?: string
}

export interface UserProfile {
  id: string
  full_name: string
  role: string
  program_id?: string | null
  branch_id?: string | null
  current_year?: number | null
  current_semester?: number | null
  branches?: { id: string; name: string; code: string } | null
  programs?: { id: string; name: string; short_code: string } | null
}

interface NotesClientProps {
  initialNotes: Note[]
  programs: Program[]
  branches: Branch[]
  initialSubjects?: SubjectOption[]
  userProfile?: UserProfile | null
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function NotesClient({
  initialNotes,
  programs,
  branches,
  initialSubjects = [],
  userProfile,
}: NotesClientProps) {
  const studentBranchId = userProfile?.branch_id
  const studentBranchCode = userProfile?.branches?.code
  const studentBranchName = userProfile?.branches?.name
  const studentProgramCode = userProfile?.programs?.short_code || 'B.Tech'
  const studentYear = userProfile?.current_year || 1
  const studentSemester = userProfile?.current_semester || 1
  const isAdmin = userProfile?.role === 'admin'

  // View Mode: 'my_branch' (default if student has branch) vs 'explore'
  const [viewMode, setViewMode] = useState<'my_branch' | 'explore'>(
    studentBranchId && !isAdmin ? 'my_branch' : 'explore'
  )

  // Filter States
  const [selectedBranch, setSelectedBranch] = useState<string>(studentBranchId || 'all')
  const [selectedProgram, setSelectedProgram] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [selectedSemester, setSelectedSemester] = useState<string>('all')
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Academic subjects for cascading dropdown
  const [availableSubjects, setAvailableSubjects] = useState<SubjectOption[]>(initialSubjects)
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  // Notes data state
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [totalCount, setTotalCount] = useState<number>(initialNotes.length)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [, startTransition] = useTransition()

  // Reader Modal State
  const [loadingNoteId, setLoadingNoteId] = useState<string | null>(null)
  const [activeReadingNote, setActiveReadingNote] = useState<{ note: Note; url: string } | null>(null)

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Reset to "My Branch" view
  const handleReturnToMyBranch = () => {
    setViewMode('my_branch')
    setSelectedBranch(studentBranchId || 'all')
    setSelectedProgram('all')
    setSelectedYear('all')
    setSelectedSemester('all')
    setSelectedSubject('all')
    setSearchQuery('')
    setDebouncedQuery('')
    setPage(1)
  }

  // Fetch subjects dynamically when branch or semester changes
  useEffect(() => {
    let isMounted = true
    const fetchBranchSubjects = async () => {
      if (!selectedBranch || selectedBranch === 'all') {
        setAvailableSubjects([])
        return
      }

      setLoadingSubjects(true)
      try {
        const params = new URLSearchParams()
        params.set('branchId', selectedBranch)
        if (selectedSemester !== 'all') {
          params.set('semester', selectedSemester)
        }
        if (selectedYear !== 'all') {
          params.set('year', selectedYear)
        }

        const res = await fetch(`/api/notes/subjects?${params.toString()}`)
        const data = await res.json()
        if (isMounted && data.success) {
          setAvailableSubjects(data.subjects || [])
        }
      } catch (err) {
        console.error('Failed to load branch subjects:', err)
      } finally {
        if (isMounted) setLoadingSubjects(false)
      }
    }

    fetchBranchSubjects()
    return () => {
      isMounted = false
    }
  }, [selectedBranch, selectedSemester, selectedYear])

  // Fetch Notes from API when filters, search, or page change
  const fetchNotes = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('mode', viewMode === 'my_branch' ? 'my' : 'explore')
      params.set('page', page.toString())
      params.set('limit', '24')

      if (viewMode === 'my_branch') {
        if (studentBranchId) {
          params.set('branchId', studentBranchId)
        }
        if (selectedSemester !== 'all') {
          params.set('semester', selectedSemester)
        }
      } else {
        if (selectedBranch !== 'all') params.set('branchId', selectedBranch)
        if (selectedProgram !== 'all') params.set('programId', selectedProgram)
        if (selectedYear !== 'all') params.set('year', selectedYear)
        if (selectedSemester !== 'all') params.set('semester', selectedSemester)
        if (selectedSubject !== 'all') params.set('subjectId', selectedSubject)
      }

      if (debouncedQuery) {
        params.set('q', debouncedQuery)
      }

      const res = await fetch(`/api/notes?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        startTransition(() => {
          setNotes(data.notes || [])
          setTotalCount(data.totalCount || 0)
          setTotalPages(data.totalPages || 1)
        })
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err)
    } finally {
      setIsLoading(false)
    }
  }, [
    viewMode,
    page,
    studentBranchId,
    selectedBranch,
    selectedProgram,
    selectedYear,
    selectedSemester,
    selectedSubject,
    debouncedQuery,
  ])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  // Prevent download and print keyboard shortcuts while reader is open
  useEffect(() => {
    if (!activeReadingNote) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'S' || e.key === 'P')) {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeReadingNote])

  // Open in-app online reader (strictly read-only)
  const openNoteReader = async (note: Note) => {
    if (!note.file_path) {
      alert('Note PDF file path not found.')
      return
    }
    setLoadingNoteId(note.id)
    try {
      const res = await fetch(`/api/storage/view-url?bucket=notes&path=${encodeURIComponent(note.file_path)}`)
      const data = await res.json()
      if (data.url) {
        setActiveReadingNote({ note, url: data.url })
      } else {
        alert(data.error || 'Failed to open note')
      }
    } catch {
      alert('Failed to connect to storage server.')
    } finally {
      setLoadingNoteId(null)
    }
  }

  const isDivergedFromMyBranch =
    viewMode === 'explore' ||
    (studentBranchId && selectedBranch !== studentBranchId) ||
    Boolean(debouncedQuery)

  return (
    <div>
      {/* 1. ACADEMIC CONTEXT BANNER */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          borderLeft: '4px solid var(--color-accent)',
          background: 'linear-gradient(135deg, rgba(118, 80, 245, 0.08), rgba(71, 139, 250, 0.08))',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span className="badge badge-green" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
              <GraduationCap size={13} style={{ display: 'inline', marginRight: 4 }} />
              Academic Curriculum
            </span>
            {isAdmin && <span className="badge badge-yellow" style={{ fontSize: '0.6875rem' }}>Admin Access</span>}
          </div>

          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.015em',
              margin: '0.25rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {userProfile?.branch_id ? (
              <>
                <span>My Study Notes:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {studentProgramCode}
                </span>
                <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                  {studentBranchName} ({studentBranchCode})
                </span>
                <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                  Year {studentYear} · Sem {studentSemester}
                </span>
              </>
            ) : (
              <span>University Study Notes · All Branches</span>
            )}
          </h2>

          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
            {viewMode === 'my_branch'
              ? `Showing published notes tailored to ${studentBranchName}. Switch to "Explore Other Branches" to discover cross-branch study materials.`
              : 'Discovering verified study notes across all engineering and technology departments of HBTU.'}
          </p>
        </div>

        {/* 1-Click Return to My Branch Button */}
        {studentBranchId && isDivergedFromMyBranch && (
          <button
            type="button"
            onClick={handleReturnToMyBranch}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.8125rem',
              fontWeight: 700,
              padding: '0.55rem 1rem',
              borderColor: 'var(--color-accent)',
              color: 'var(--color-accent)',
              backgroundColor: 'var(--color-accent-bg)',
            }}
          >
            <RotateCcw size={14} />
            Return to My Branch ({studentBranchCode})
          </button>
        )}
      </div>

      {/* 2. MODE SELECTOR & SEARCH BAR */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--border-light)',
          }}
        >
          {/* Dual Exploration Mode Tabs */}
          <div style={{ display: 'inline-flex', gap: 6, background: 'var(--bg-secondary)', padding: 4, borderRadius: 'var(--radius-md)' }}>
            {studentBranchId && (
              <button
                type="button"
                onClick={() => {
                  setViewMode('my_branch')
                  setSelectedBranch(studentBranchId)
                  setPage(1)
                }}
                style={{
                  padding: '0.45rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                  background: viewMode === 'my_branch' ? 'var(--bg-card)' : 'transparent',
                  color: viewMode === 'my_branch' ? 'var(--color-accent)' : 'var(--text-secondary)',
                  boxShadow: viewMode === 'my_branch' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <GraduationCap size={15} />
                My Branch ({studentBranchCode})
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setViewMode('explore')
                setPage(1)
              }}
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
                background: viewMode === 'explore' ? 'var(--bg-card)' : 'transparent',
                color: viewMode === 'explore' ? 'var(--color-accent)' : 'var(--text-secondary)',
                boxShadow: viewMode === 'explore' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <Globe size={15} />
              Explore Other Branches
            </button>
          </div>

          {/* Quick Stats Indicator */}
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>
              Showing <strong>{notes.length}</strong> of <strong>{totalCount}</strong> published notes
            </span>
            {isLoading && (
              <span className="badge badge-yellow" style={{ fontSize: '0.6875rem' }}>
                Updating...
              </span>
            )}
          </div>
        </div>

        {/* Global Search Input */}
        <div style={{ position: 'relative', width: '100%', marginBottom: '1rem' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
            }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 42, paddingRight: searchQuery ? 40 : 14, height: 44, fontSize: '0.875rem' }}
            placeholder={
              viewMode === 'my_branch'
                ? `Search within ${studentBranchName || 'your branch'} notes by title, subject code, or keyword...`
                : 'Search notes across all branches: title, subject name (e.g. Workshop Practice), subject code (NWS-102), branch...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: 4,
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* 3. BRANCH-SPECIFIC OR EXPLORATORY FILTERS */}
        {viewMode === 'my_branch' ? (
          /* My Branch Quick Semester Tabs */
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', marginRight: 4 }}>
              FILTER SEMESTER:
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedSemester('all')
                setPage(1)
              }}
              className={`badge ${selectedSemester === 'all' ? 'badge-green' : 'badge-neutral'}`}
              style={{ cursor: 'pointer', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600 }}
            >
              All Semesters
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
              const isSelected = selectedSemester === sem.toString()
              const isCurrent = studentSemester === sem
              return (
                <button
                  key={sem}
                  type="button"
                  onClick={() => {
                    setSelectedSemester(sem.toString())
                    setPage(1)
                  }}
                  className={`badge ${isSelected ? 'badge-green' : isCurrent ? 'badge-yellow' : 'badge-neutral'}`}
                  style={{
                    cursor: 'pointer',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: isSelected || isCurrent ? 700 : 500,
                  }}
                >
                  Sem {sem} {isCurrent && '(Current)'}
                </button>
              )
            })}
          </div>
        ) : (
          /* Explore Mode: Cascading Filters Grid */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              alignItems: 'flex-end',
            }}
          >
            {/* Branch Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                BRANCH
              </label>
              <select
                className="form-input"
                style={{ height: 38, fontSize: '0.8125rem' }}
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value)
                  setSelectedSubject('all') // Reset subject when branch changes
                  setPage(1)
                }}
              >
                <option value="all">All Branches (21)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.name} {b.id === studentBranchId ? '⭐ (Your Branch)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Program Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                PROGRAM
              </label>
              <select
                className="form-input"
                style={{ height: 38, fontSize: '0.8125rem' }}
                value={selectedProgram}
                onChange={(e) => {
                  setSelectedProgram(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">All Programs</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.short_code} ({p.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                ACADEMIC YEAR
              </label>
              <select
                className="form-input"
                style={{ height: 38, fontSize: '0.8125rem' }}
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">All Years</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
            </div>

            {/* Semester Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                SEMESTER
              </label>
              <select
                className="form-input"
                style={{ height: 38, fontSize: '0.8125rem' }}
                value={selectedSemester}
                onChange={(e) => {
                  setSelectedSemester(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s.toString()}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selector (Dynamically populated) */}
            <div style={{ gridColumn: 'span 1' }}>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                SUBJECT {loadingSubjects && '(Loading...)'}
              </label>
              <select
                className="form-input"
                style={{ height: 38, fontSize: '0.8125rem' }}
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">
                  {selectedBranch === 'all'
                    ? 'All Subjects (Select Branch first)'
                    : `All Subjects (${availableSubjects.length})`}
                </option>
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject_code} — {s.subject_name} (Sem {s.semester_number})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 4. NOTES GRID */}
      {notes.length > 0 ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2rem',
            }}
          >
            {notes.map((note) => {
              const sub = note.subjects
              const branchCode = sub?.branches?.code
              const branchName = sub?.branches?.name
              const progCode = sub?.programs?.short_code
              const isBelongingToStudent =
                note.isMyBranch || (studentBranchId && sub?.branch_id === studentBranchId)

              return (
                <div
                  key={note.id}
                  className="glass-card"
                  style={{
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    position: 'relative',
                    border: isBelongingToStudent ? '1px solid rgba(16, 185, 129, 0.4)' : undefined,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  {/* Top Branch Attribution Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    {isBelongingToStudent ? (
                      <span
                        className="badge badge-green"
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <GraduationCap size={12} />
                        My Branch · {branchCode || 'LFT'}
                      </span>
                    ) : (
                      <span
                        className="badge badge-blue"
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Globe size={12} />
                        Other Branch · {branchCode || 'All'}
                      </span>
                    )}

                    {sub?.semester_number && (
                      <span className="badge badge-yellow" style={{ fontSize: '0.625rem' }}>
                        Sem {sub.semester_number}
                      </span>
                    )}
                  </div>

                  {/* Subject and Title */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: 2 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 'var(--radius-sm)',
                        background: isBelongingToStudent ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                        color: isBelongingToStudent ? '#10b981' : '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <FileText size={22} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: 700,
                          marginBottom: 4,
                          lineHeight: 1.35,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {note.title}
                      </h3>

                      {sub && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <span className="badge badge-maroon" style={{ fontSize: '0.625rem' }}>
                            {sub.subject_code}
                          </span>
                          <span className="badge badge-neutral" style={{ fontSize: '0.625rem' }}>
                            {sub.subject_name}
                          </span>
                          {branchName && (
                            <span className="badge badge-neutral" style={{ fontSize: '0.625rem' }}>
                              {progCode ? `${progCode} ` : ''}
                              {branchName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {note.description && (
                    <p
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      {note.description.length > 140
                        ? `${note.description.slice(0, 140)}...`
                        : note.description}
                    </p>
                  )}

                  {/* Read Online Button (Strict Read-Only Viewer) */}
                  {note.file_path && (
                    <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => openNoteReader(note)}
                        disabled={loadingNoteId === note.id}
                        className="btn btn-primary"
                        style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 7,
                          width: '100%',
                          justifyContent: 'center',
                          background: isBelongingToStudent
                            ? 'linear-gradient(135deg, #10b981, #06b6d4)'
                            : 'linear-gradient(135deg, #2563eb, #0284c7)',
                        }}
                      >
                        {loadingNoteId === note.id ? (
                          'Opening Reader...'
                        ) : (
                          <>
                            <BookOpen size={14} /> Read Online
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Card Footer Metadata */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.875rem',
                      fontSize: '0.6875rem',
                      color: 'var(--text-tertiary)',
                      borderTop: '1px solid var(--border-light)',
                      paddingTop: '0.65rem',
                      marginTop: '0.25rem',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Eye size={12} /> {note.view_count}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <HardDrive size={12} /> {formatFileSize(note.file_size)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Calendar size={12} />{' '}
                      {new Date(note.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span
                      className="badge badge-green"
                      style={{ fontSize: '0.5625rem', marginLeft: 'auto', padding: '0.15rem 0.45rem' }}
                    >
                      READ ONLY
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                marginTop: '1.5rem',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ fontSize: '0.8125rem' }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ fontSize: '0.8125rem' }}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        /* 5. EMPTY STATES */
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <FileText size={48} color="var(--text-tertiary)" style={{ margin: '0 auto 1.25rem auto' }} />

          {viewMode === 'my_branch' ? (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                {selectedSemester !== 'all'
                  ? `No Notes Published for Semester ${selectedSemester} Yet`
                  : `No Notes Published for ${studentBranchName || 'Your Branch'} Yet`}
              </h2>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  maxWidth: 520,
                  margin: '0 auto 1.5rem auto',
                  lineHeight: 1.5,
                }}
              >
                Study notes for your curriculum are published regularly. You can view other semesters in your branch or explore shared curriculum resources from other branches.
              </p>
              <div style={{ display: 'inline-flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                {selectedSemester !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedSemester('all')}
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}
                  >
                    <Layers size={14} />
                    View All Semesters in My Branch
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('explore')
                    setSelectedBranch('all')
                    setSelectedSemester('all')
                    setSearchQuery('')
                  }}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}
                >
                  <Globe size={14} />
                  Explore Other Branches
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                No Notes Found
              </h2>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  maxWidth: 480,
                  margin: '0 auto 1.5rem auto',
                }}
              >
                No study notes matched your current search and filter combination. Try clearing some filters or searching with a different term.
              </p>
              <div style={{ display: 'inline-flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBranch('all')
                    setSelectedProgram('all')
                    setSelectedYear('all')
                    setSelectedSemester('all')
                    setSelectedSubject('all')
                    setSearchQuery('')
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8125rem' }}
                >
                  Clear All Filters
                </button>
                {studentBranchId && (
                  <button
                    type="button"
                    onClick={handleReturnToMyBranch}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}
                  >
                    <RotateCcw size={14} />
                    Return to My Branch
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. ONLINE DOCUMENT READER MODAL (STRICT READ-ONLY MODE) */}
      {activeReadingNote && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setActiveReadingNote(null)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '980px',
              height: '92vh',
              backgroundColor: 'var(--bg-elevated)',
              backdropFilter: 'blur(28px) saturate(160%)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-glass)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-modal)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--divider)',
                background: 'var(--bg-glass-card)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span className="badge badge-green" style={{ fontSize: '0.625rem', padding: '0.2rem 0.5rem' }}>
                  <Lock size={10} style={{ display: 'inline', marginRight: 3 }} /> Secure Reader
                </span>
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activeReadingNote.note.title}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    const iframe = document.getElementById('note-viewer-frame') as HTMLIFrameElement
                    if (iframe?.requestFullscreen) iframe.requestFullscreen()
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#94a3b8' }}
                  title="Full Screen"
                >
                  <Maximize2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReadingNote(null)}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#94a3b8' }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Embedded PDF Viewer with download/print controls suppressed */}
            <iframe
              id="note-viewer-frame"
              src={`${activeReadingNote.url}#toolbar=0&navpanes=0&scrollbar=1`}
              title={activeReadingNote.note.title}
              style={{
                width: '100%',
                flex: 1,
                border: 'none',
                background: '#334155',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
