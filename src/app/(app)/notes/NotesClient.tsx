'use client'

import { useState, useEffect, useCallback, useMemo, useTransition } from 'react'
import Link from 'next/link'
import {
  Folder,
  FolderOpen,
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
  RotateCcw,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Layers,
  BookMarked,
  FileCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { FastPdfViewer } from '@/components/pdf/FastPdfViewer'

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
  duration_years?: number
  total_semesters?: number
}

export interface Branch {
  id: string
  program_id: string
  name: string
  code: string
}

export interface SubjectItem {
  id: string
  subject_code: string
  subject_name: string
  semester_number: number
  year_number: number
  branch_id: string
  program_id?: string
  credits?: number
  hours?: number
  category?: string
  notesCount?: number
}

export interface SyllabusUnitItem {
  id: string
  subject_id: string
  unit_number: number
  unit_title: string
  hours?: number
  description?: string
}

export interface BranchStats {
  subjectsCount: number
  notesCount: number
  yearStats: Record<number, { subjectsCount: number; notesCount: number }>
  semesterStats: Record<number, { subjectsCount: number; notesCount: number }>
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
  programs?: { id: string; name: string; short_code: string; duration_years?: number } | null
}

interface NotesClientProps {
  initialNotes: Note[]
  programs: Program[]
  branches: Branch[]
  branchStats: Record<string, BranchStats>
  userProfile?: UserProfile | null
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function NotesClient({
  initialNotes,
  programs,
  branches,
  branchStats,
  userProfile,
}: NotesClientProps) {
  const studentBranchId = userProfile?.branch_id
  const studentBranch = useMemo(() => branches.find((b) => b.id === studentBranchId), [branches, studentBranchId])
  const studentBranchCode = studentBranch?.code || userProfile?.branches?.code
  const studentBranchName = studentBranch?.name || userProfile?.branches?.name
  const studentProgramCode = userProfile?.programs?.short_code || 'B.Tech'
  const studentYear = userProfile?.current_year || 1
  const studentSemester = userProfile?.current_semester || 1
  const isAdmin = userProfile?.role === 'admin'

  // Map programs for quick lookup
  const programsMap = useMemo(() => {
    const map = new Map<string, Program>()
    programs.forEach((p) => map.set(p.id, p))
    return map
  }, [programs])

  // ──────────────── FOLDER EXPLORER STATE ────────────────
  // Hierarchy: Branch -> Year -> Semester -> Subject -> Notes
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(null)

  // Subject folders loaded dynamically for the selected semester
  const [semesterSubjects, setSemesterSubjects] = useState<SubjectItem[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [subjectFilterQuery, setSubjectFilterQuery] = useState('')

  // Inside Subject Folder: Notes & Syllabus Units
  const [subjectNotes, setSubjectNotes] = useState<Note[]>([])
  const [subjectUnits, setSubjectUnits] = useState<SyllabusUnitItem[]>([])
  const [loadingSubjectContent, setLoadingSubjectContent] = useState(false)

  // ──────────────── UNIVERSAL SEARCH STATE ────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Note[]>([])
  const [searching, setSearching] = useState(false)

  // ──────────────── SECURE PDF READER MODAL ────────────────
  const [loadingNoteId, setLoadingNoteId] = useState<string | null>(null)
  const [activeReadingNote, setActiveReadingNote] = useState<{ note: Note; url: string; streamUrl?: string } | null>(null)

  // Debounce universal search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Universal Search fetch
  useEffect(() => {
    if (!debouncedSearch) {
      setSearchResults([])
      setSearching(false)
      return
    }

    let isMounted = true
    const runSearch = async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/notes?q=${encodeURIComponent(debouncedSearch)}&limit=40`)
        const data = await res.json()
        if (isMounted && data.success) {
          setSearchResults(data.notes || [])
        }
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        if (isMounted) setSearching(false)
      }
    }

    runSearch()
    return () => {
      isMounted = false
    }
  }, [debouncedSearch])

  // ──────────────── DYNAMIC SUBJECT FETCHING (Level 4) ────────────────
  // When a branch and semester are selected, fetch canonical subjects from database
  useEffect(() => {
    if (!selectedBranch || !selectedSemester) {
      setSemesterSubjects([])
      return
    }

    let isMounted = true
    const fetchSubjects = async () => {
      setLoadingSubjects(true)
      try {
        const params = new URLSearchParams()
        params.set('branchId', selectedBranch.id)
        params.set('semester', selectedSemester.toString())
        if (selectedYear) {
          params.set('year', selectedYear.toString())
        }

        const res = await fetch(`/api/notes/subjects?${params.toString()}`)
        const data = await res.json()
        if (isMounted && data.success) {
          setSemesterSubjects(data.subjects || [])
        }
      } catch (err) {
        console.error('Failed to load canonical subjects for folder:', err)
      } finally {
        if (isMounted) setLoadingSubjects(false)
      }
    }

    fetchSubjects()
    return () => {
      isMounted = false
    }
  }, [selectedBranch, selectedSemester, selectedYear])

  // ──────────────── DYNAMIC NOTES & UNITS FETCHING (Level 5) ────────────────
  // When a subject is selected, fetch both its published notes and official syllabus units
  useEffect(() => {
    if (!selectedSubject) {
      setSubjectNotes([])
      setSubjectUnits([])
      return
    }

    let isMounted = true
    const fetchSubjectDetails = async () => {
      setLoadingSubjectContent(true)
      try {
        const [notesRes, unitsRes] = await Promise.all([
          fetch(`/api/notes?subjectId=${selectedSubject.id}&limit=50`),
          fetch(`/api/notes/units?subjectId=${selectedSubject.id}`),
        ])

        const [notesData, unitsData] = await Promise.all([notesRes.json(), unitsRes.json()])

        if (isMounted) {
          if (notesData.success) {
            setSubjectNotes(notesData.notes || [])
          }
          if (unitsData.success) {
            setSubjectUnits(unitsData.units || [])
          }
        }
      } catch (err) {
        console.error('Failed to load subject notes or units:', err)
      } finally {
        if (isMounted) setLoadingSubjectContent(false)
      }
    }

    fetchSubjectDetails()
    return () => {
      isMounted = false
    }
  }, [selectedSubject])

  // Prevent download and print keyboard shortcuts while reader is open
  useEffect(() => {
    if (!activeReadingNote) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 's' || e.key === 'p' || e.key === 'S' || e.key === 'P')
      ) {
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
      const res = await fetch(
        `/api/storage/view-url?bucket=notes&path=${encodeURIComponent(note.file_path)}`
      )
      const data = await res.json()
      const targetUrl = data.url || data.streamUrl || data.directUrl
      if (targetUrl) {
        setActiveReadingNote({
          note,
          url: targetUrl,
          streamUrl: data.streamUrl,
        })
      } else {
        alert(data.error || 'Failed to open note')
      }
    } catch {
      alert('Failed to connect to storage server.')
    } finally {
      setLoadingNoteId(null)
    }
  }

  // ──────────────── QUICK NAVIGATION ACTIONS ────────────────
  const handleOpenMyBranch = () => {
    if (!studentBranch) return
    setSelectedBranch(studentBranch)
    setSelectedYear(null)
    setSelectedSemester(null)
    setSelectedSubject(null)
    setSearchQuery('')
  }

  const handleJumpToMySemester = () => {
    if (!studentBranch) return
    setSelectedBranch(studentBranch)
    setSelectedYear(studentYear)
    setSelectedSemester(studentSemester)
    setSelectedSubject(null)
    setSearchQuery('')
  }

  const handleResetToRoot = () => {
    setSelectedBranch(null)
    setSelectedYear(null)
    setSelectedSemester(null)
    setSelectedSubject(null)
    setSearchQuery('')
  }

  // Quick jump directly to a note's subject folder from search
  const handleJumpToNoteSubject = (note: Note) => {
    const sub = note.subjects
    if (!sub) return
    const b = branches.find((br) => br.id === sub.branch_id)
    if (b) {
      setSelectedBranch(b)
      setSelectedYear(sub.year_number || Math.ceil((sub.semester_number || 1) / 2))
      setSelectedSemester(sub.semester_number || 1)
      setSelectedSubject({
        id: sub.id,
        subject_code: sub.subject_code,
        subject_name: sub.subject_name,
        semester_number: sub.semester_number || 1,
        year_number: sub.year_number || 1,
        branch_id: b.id,
      })
      setSearchQuery('')
    }
  }

  // ──────────────── GROUP NOTES BY SYLLABUS UNIT (Level 5) ────────────────
  const groupedNotes = useMemo(() => {
    const unitMap: Record<number, Note[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] }
    const otherNotes: Note[] = []

    for (const note of subjectNotes) {
      const text = `${note.title} ${note.description || ''}`.toLowerCase()
      let matched = false

      for (let u = 1; u <= 5; u++) {
        const patterns = [
          `unit ${u}`,
          `unit-${u}`,
          `unit${u}`,
          `u${u}:`,
          `u${u} `,
          `unit ${u}:`,
          `[unit ${u}]`,
        ]
        if (patterns.some((p) => text.includes(p))) {
          unitMap[u].push(note)
          matched = true
          break
        }
      }

      if (!matched) {
        otherNotes.push(note)
      }
    }

    return { unitMap, otherNotes }
  }, [subjectNotes])

  // Filter subjects within active semester
  const filteredSemesterSubjects = useMemo(() => {
    if (!subjectFilterQuery.trim()) return semesterSubjects
    const q = subjectFilterQuery.toLowerCase()
    return semesterSubjects.filter(
      (s) =>
        s.subject_code.toLowerCase().includes(q) ||
        s.subject_name.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q))
    )
  }, [semesterSubjects, subjectFilterQuery])

  // Compute duration years for selected branch
  const currentProgramDuration = useMemo(() => {
    if (!selectedBranch) return 4
    const prog = programsMap.get(selectedBranch.program_id)
    return prog?.duration_years || 4
  }, [selectedBranch, programsMap])

  return (
    <div>
      {/* ──────────────── 1. ACADEMIC CONTEXT BANNER ──────────────── */}
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
              HBTU Academic Curriculum
            </span>
            <span className="badge badge-purple" style={{ fontSize: '0.6875rem', fontWeight: 600 }}>
              Dynamic Folder Explorer
            </span>
            {isAdmin && <span className="badge badge-yellow" style={{ fontSize: '0.6875rem' }}>Admin Access</span>}
          </div>

          <h1
            style={{
              fontSize: '1.35rem',
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
                <span>My Academic Branch:</span>
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
              <span>Harcourt Butler Technical University — Study Notes Explorer</span>
            )}
          </h1>

          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
            Hierarchical curriculum file explorer: <strong>Branch → Year → Semester → Dynamic Subject → Notes by Unit</strong>.
            Folders are automatically derived from the official university syllabus and curriculum.
          </p>
        </div>

        {/* Quick Branch Actions */}
        {studentBranch && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleJumpToMySemester}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.8125rem',
                fontWeight: 700,
                padding: '0.5rem 0.85rem',
              }}
            >
              <Sparkles size={14} />
              Open My Current Semester (Sem {studentSemester})
            </button>

            {selectedBranch?.id !== studentBranch.id && (
              <button
                type="button"
                onClick={handleOpenMyBranch}
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  padding: '0.5rem 0.85rem',
                }}
              >
                <FolderOpen size={14} />
                Open My Branch ({studentBranchCode})
              </button>
            )}
          </div>
        )}
      </div>

      {/* ──────────────── 2. UNIVERSAL SEARCH BAR ──────────────── */}
      <div className="glass-card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative', width: '100%' }}>
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
            style={{
              paddingLeft: 42,
              paddingRight: searchQuery ? 40 : 14,
              height: 44,
              fontSize: '0.875rem',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
            }}
            placeholder="Search all study notes, subjects, or topics (e.g. Workshop Practice, NWS-102, Welding, Mathematics)..."
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
      </div>

      {/* ──────────────── 3. SEARCH RESULTS MODE ──────────────── */}
      {debouncedSearch ? (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={18} color="var(--color-accent)" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Search Results for &quot;{debouncedSearch}&quot;
              </h2>
              {searching ? (
                <span className="badge badge-yellow" style={{ fontSize: '0.6875rem' }}>Searching...</span>
              ) : (
                <span className="badge badge-purple" style={{ fontSize: '0.6875rem' }}>
                  {searchResults.length} {searchResults.length === 1 ? 'note' : 'notes'} found
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              <X size={13} style={{ marginRight: 4 }} /> Close Search
            </button>
          </div>

          {searchResults.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1rem',
              }}
            >
              {searchResults.map((note) => {
                const sub = note.subjects
                const branchObj = sub?.branches
                const progObj = sub?.programs

                return (
                  <div
                    key={note.id}
                    className="glass-card"
                    style={{
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--glass-border)',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <div>
                      {/* Academic Path Breadcrumb */}
                      <div
                        style={{
                          fontSize: '0.6875rem',
                          color: 'var(--color-accent)',
                          fontWeight: 700,
                          marginBottom: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>{progObj?.short_code || 'B.Tech'}</span>
                        <ChevronRight size={11} />
                        <span>{branchObj?.code || 'GEN'}</span>
                        <ChevronRight size={11} />
                        <span>Year {sub?.year_number || Math.ceil((sub?.semester_number || 1) / 2)}</span>
                        <ChevronRight size={11} />
                        <span>Sem {sub?.semester_number}</span>
                      </div>

                      <h3
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: 700,
                          lineHeight: 1.35,
                          marginBottom: 6,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {note.title}
                      </h3>

                      {note.description && (
                        <p
                          style={{
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.4,
                            marginBottom: 10,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {note.description}
                        </p>
                      )}

                      {/* Subject Badge */}
                      {sub && (
                        <div style={{ marginBottom: 10 }}>
                          <span
                            className="badge badge-indigo"
                            style={{ fontSize: '0.6875rem', fontWeight: 600 }}
                          >
                            <BookOpen size={11} style={{ marginRight: 4, display: 'inline' }} />
                            {sub.subject_code} — {sub.subject_name}
                          </span>
                        </div>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          fontSize: '0.75rem',
                          color: 'var(--text-tertiary)',
                          marginBottom: 12,
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <HardDrive size={13} /> {formatFileSize(note.file_size)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={13} /> {formatDate(note.created_at)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                      <button
                        type="button"
                        onClick={() => openNoteReader(note)}
                        disabled={loadingNoteId === note.id}
                        className="btn btn-primary"
                        style={{
                          flex: 1,
                          fontSize: '0.8125rem',
                          padding: '0.45rem 0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <Eye size={14} />
                        {loadingNoteId === note.id ? 'Opening...' : 'Read Note'}
                      </button>

                      {sub && (
                        <button
                          type="button"
                          onClick={() => handleJumpToNoteSubject(note)}
                          className="btn btn-secondary"
                          title="Open Subject Folder"
                          style={{
                            fontSize: '0.8125rem',
                            padding: '0.45rem 0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Folder size={14} />
                          Folder
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : !searching ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <FileText size={40} style={{ color: 'var(--text-tertiary)', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>
                No study notes found for &quot;{debouncedSearch}&quot;
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto' }}>
                Try searching by subject name (e.g. &quot;Workshop Practice&quot;), subject code (e.g. &quot;NWS-102&quot;),
                or browse through the branch folders below.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ──────────────── 4. HIERARCHICAL FOLDER BREADCRUMB BAR ──────────────── */}
      {!debouncedSearch && (
        <div
          className="glass-card"
          style={{
            padding: '0.75rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          {/* Breadcrumbs Trail */}
          <nav aria-label="Folder Navigation" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            {/* Root: Study Notes */}
            <button
              type="button"
              onClick={handleResetToRoot}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: !selectedBranch ? 'var(--color-accent-bg)' : 'transparent',
                color: !selectedBranch ? 'var(--color-accent)' : 'var(--text-secondary)',
                fontWeight: !selectedBranch ? 700 : 500,
                border: 'none',
                cursor: 'pointer',
                padding: '0.3rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                transition: 'all 0.15s ease',
              }}
            >
              <Folder size={15} color="var(--color-accent)" />
              <span>All Branches</span>
            </button>

            {/* Level 2: Branch */}
            {selectedBranch && (
              <>
                <ChevronRight size={13} style={{ color: 'var(--text-tertiary)' }} />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear(null)
                    setSelectedSemester(null)
                    setSelectedSubject(null)
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: selectedBranch && !selectedYear ? 'var(--color-accent-bg)' : 'transparent',
                    color: selectedBranch && !selectedYear ? 'var(--color-accent)' : 'var(--text-secondary)',
                    fontWeight: selectedBranch && !selectedYear ? 700 : 500,
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.3rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <FolderOpen size={14} />
                  <span>{selectedBranch.code} ({selectedBranch.name})</span>
                </button>
              </>
            )}

            {/* Level 3: Year */}
            {selectedYear && (
              <>
                <ChevronRight size={13} style={{ color: 'var(--text-tertiary)' }} />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSemester(null)
                    setSelectedSubject(null)
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: selectedYear && !selectedSemester ? 'var(--color-accent-bg)' : 'transparent',
                    color: selectedYear && !selectedSemester ? 'var(--color-accent)' : 'var(--text-secondary)',
                    fontWeight: selectedYear && !selectedSemester ? 700 : 500,
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.3rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Folder size={14} />
                  <span>Year {selectedYear}</span>
                </button>
              </>
            )}

            {/* Level 4: Semester */}
            {selectedSemester && (
              <>
                <ChevronRight size={13} style={{ color: 'var(--text-tertiary)' }} />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubject(null)
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: selectedSemester && !selectedSubject ? 'var(--color-accent-bg)' : 'transparent',
                    color: selectedSemester && !selectedSubject ? 'var(--color-accent)' : 'var(--text-secondary)',
                    fontWeight: selectedSemester && !selectedSubject ? 700 : 500,
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.3rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Layers size={14} />
                  <span>Semester {selectedSemester}</span>
                </button>
              </>
            )}

            {/* Level 5: Subject */}
            {selectedSubject && (
              <>
                <ChevronRight size={13} style={{ color: 'var(--text-tertiary)' }} />
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: 'var(--color-accent-bg)',
                    color: 'var(--color-accent)',
                    fontWeight: 700,
                    padding: '0.3rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <BookOpen size={14} />
                  <span>{selectedSubject.subject_code} — {selectedSubject.subject_name}</span>
                </span>
              </>
            )}
          </nav>

          {/* Quick Back Button */}
          {selectedSubject ? (
            <button
              type="button"
              onClick={() => setSelectedSubject(null)}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={13} /> Back to Subjects
            </button>
          ) : selectedSemester ? (
            <button
              type="button"
              onClick={() => setSelectedSemester(null)}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={13} /> Back to Semesters
            </button>
          ) : selectedYear ? (
            <button
              type="button"
              onClick={() => setSelectedYear(null)}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={13} /> Back to Years
            </button>
          ) : selectedBranch ? (
            <button
              type="button"
              onClick={() => setSelectedBranch(null)}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={13} /> Back to All Branches
            </button>
          ) : null}
        </div>
      )}

      {/* ──────────────── 5. MAIN EXPLORER VIEWS ──────────────── */}
      {!debouncedSearch && (
        <>
          {/* ════════════════ LEVEL 1: BRANCH FOLDERS ════════════════ */}
          {!selectedBranch && (
            <div>
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FolderOpen size={20} color="var(--color-accent)" />
                    Academic Department Branches
                  </h2>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    Select a branch folder to explore its academic years, curriculum subjects, and verified study notes.
                  </p>
                </div>
                <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                  {branches.length} Branches Available
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
                  gap: '1.25rem',
                }}
              >
                {branches.map((b) => {
                  const isMyBranch = Boolean(studentBranchId && b.id === studentBranchId)
                  const prog = programsMap.get(b.program_id)
                  const stats = branchStats[b.id] || { subjectsCount: 0, notesCount: 0 }

                  return (
                    <div
                      key={b.id}
                      onClick={() => {
                        setSelectedBranch(b)
                        setSelectedYear(null)
                        setSelectedSemester(null)
                        setSelectedSubject(null)
                      }}
                      className="glass-card"
                      style={{
                        padding: '1.35rem',
                        borderRadius: 'var(--radius-lg)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: isMyBranch
                          ? '2px solid var(--color-accent)'
                          : '1px solid var(--glass-border)',
                        background: isMyBranch
                          ? 'linear-gradient(135deg, rgba(118, 80, 245, 0.08), rgba(71, 139, 250, 0.08))'
                          : 'var(--glass-surface)',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)'
                        e.currentTarget.style.boxShadow = '0 10px 25px rgba(118, 80, 245, 0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div>
                        {/* Top Badge Row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 'var(--radius-md)',
                              background: isMyBranch
                                ? 'linear-gradient(135deg, rgba(118, 80, 245, 0.25), rgba(71, 139, 250, 0.25))'
                                : 'linear-gradient(135deg, rgba(169, 211, 255, 0.35), rgba(231, 201, 248, 0.35))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--color-accent)',
                            }}
                          >
                            <Folder size={24} />
                          </div>

                          <div style={{ display: 'flex', gap: 6 }}>
                            {isMyBranch && (
                              <span className="badge badge-purple" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                                ⭐ My Branch
                              </span>
                            )}
                            <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                              {prog?.short_code || 'B.Tech'}
                            </span>
                          </div>
                        </div>

                        {/* Branch Code & Name */}
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                          {b.code}
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.35, marginBottom: 14 }}>
                          {b.name}
                        </div>
                      </div>

                      {/* Bottom Metadata Stats */}
                      <div
                        style={{
                          paddingTop: 12,
                          borderTop: '1px solid var(--border-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        <span>{stats.subjectsCount} Subjects</span>
                        {stats.notesCount > 0 ? (
                          <span className="badge badge-green" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                            <FileText size={11} style={{ display: 'inline', marginRight: 3 }} />
                            {stats.notesCount} {stats.notesCount === 1 ? 'Note' : 'Notes'}
                          </span>
                        ) : (
                          <span>0 Notes</span>
                        )}
                        <ChevronRight size={14} style={{ color: 'var(--color-accent)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ════════════════ LEVEL 2: YEAR FOLDERS ════════════════ */}
          {selectedBranch && !selectedYear && (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FolderOpen size={20} color="var(--color-accent)" />
                  Academic Years · {selectedBranch.name} ({selectedBranch.code})
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Select an academic year to explore its semesters and official curriculum subject folders.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1.25rem',
                }}
              >
                {Array.from({ length: currentProgramDuration }, (_, idx) => idx + 1).map((yearNum) => {
                  const isCurrentYear = Boolean(
                    studentBranchId &&
                    selectedBranch.id === studentBranchId &&
                    studentYear === yearNum
                  )
                  const stats = branchStats[selectedBranch.id]?.yearStats?.[yearNum] || {
                    subjectsCount: 0,
                    notesCount: 0,
                  }
                  const semA = (yearNum - 1) * 2 + 1
                  const semB = (yearNum - 1) * 2 + 2

                  return (
                    <div
                      key={yearNum}
                      onClick={() => {
                        setSelectedYear(yearNum)
                        setSelectedSemester(null)
                        setSelectedSubject(null)
                      }}
                      className="glass-card"
                      style={{
                        padding: '1.5rem',
                        borderRadius: 'var(--radius-lg)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: isCurrentYear
                          ? '2px solid var(--color-accent)'
                          : '1px solid var(--glass-border)',
                        background: isCurrentYear
                          ? 'linear-gradient(135deg, rgba(118, 80, 245, 0.08), rgba(71, 139, 250, 0.08))'
                          : 'var(--glass-surface)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)'
                        e.currentTarget.style.boxShadow = '0 10px 25px rgba(118, 80, 245, 0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 'var(--radius-md)',
                            background: 'linear-gradient(135deg, rgba(169, 211, 255, 0.4), rgba(231, 201, 248, 0.4))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-accent)',
                          }}
                        >
                          <Folder size={24} />
                        </div>

                        {isCurrentYear && (
                          <span className="badge badge-purple" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                            ⭐ Current Year
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                        Academic Year {yearNum}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                        Semesters {semA} & {semB}
                      </div>

                      <div
                        style={{
                          paddingTop: 12,
                          borderTop: '1px solid var(--border-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        <span>{stats.subjectsCount} Subjects</span>
                        {stats.notesCount > 0 ? (
                          <span className="badge badge-green" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                            {stats.notesCount} {stats.notesCount === 1 ? 'Note' : 'Notes'}
                          </span>
                        ) : (
                          <span>0 Notes</span>
                        )}
                        <ChevronRight size={14} style={{ color: 'var(--color-accent)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ════════════════ LEVEL 3: SEMESTER FOLDERS ════════════════ */}
          {selectedBranch && selectedYear && !selectedSemester && (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={20} color="var(--color-accent)" />
                  Year {selectedYear} Semesters · {selectedBranch.name} ({selectedBranch.code})
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Select a semester to view dynamic subject folders synchronized from the university curriculum.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '1.25rem',
                }}
              >
                {[(selectedYear - 1) * 2 + 1, (selectedYear - 1) * 2 + 2].map((semNum) => {
                  const isCurrentSemester = Boolean(
                    studentBranchId &&
                    selectedBranch.id === studentBranchId &&
                    studentSemester === semNum
                  )
                  const stats = branchStats[selectedBranch.id]?.semesterStats?.[semNum] || {
                    subjectsCount: 0,
                    notesCount: 0,
                  }

                  return (
                    <div
                      key={semNum}
                      onClick={() => {
                        setSelectedSemester(semNum)
                        setSelectedSubject(null)
                      }}
                      className="glass-card"
                      style={{
                        padding: '1.5rem',
                        borderRadius: 'var(--radius-lg)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: isCurrentSemester
                          ? '2px solid var(--color-accent)'
                          : '1px solid var(--glass-border)',
                        background: isCurrentSemester
                          ? 'linear-gradient(135deg, rgba(118, 80, 245, 0.08), rgba(71, 139, 250, 0.08))'
                          : 'var(--glass-surface)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)'
                        e.currentTarget.style.boxShadow = '0 10px 25px rgba(118, 80, 245, 0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 'var(--radius-md)',
                            background: 'linear-gradient(135deg, rgba(169, 211, 255, 0.45), rgba(231, 201, 248, 0.45))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-accent)',
                          }}
                        >
                          <Folder size={24} />
                        </div>

                        {isCurrentSemester && (
                          <span className="badge badge-purple" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                            ⭐ Current Semester
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                        Semester {semNum}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                        Academic Year {selectedYear} · {selectedBranch.code}
                      </div>

                      <div
                        style={{
                          paddingTop: 12,
                          borderTop: '1px solid var(--border-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        <span>{stats.subjectsCount} Subjects</span>
                        {stats.notesCount > 0 ? (
                          <span className="badge badge-green" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                            {stats.notesCount} {stats.notesCount === 1 ? 'Note' : 'Notes'}
                          </span>
                        ) : (
                          <span>0 Notes</span>
                        )}
                        <ChevronRight size={14} style={{ color: 'var(--color-accent)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ════════════════ LEVEL 4: SUBJECT FOLDERS (DYNAMIC FROM SYLLABUS/CURRICULUM) ════════════════ */}
          {selectedBranch && selectedYear && selectedSemester && !selectedSubject && (
            <div>
              {/* Header and In-Semester Filter */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BookOpen size={20} color="var(--color-accent)" />
                    Semester {selectedSemester} Subjects · {selectedBranch.name} ({selectedBranch.code})
                  </h2>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    Folders are automatically generated from official Syllabus & Curriculum records in the database.
                  </p>
                </div>

                {/* Filter Subjects Input */}
                <div style={{ minWidth: 240 }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ height: 38, fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
                    placeholder="Filter subjects by name or code..."
                    value={subjectFilterQuery}
                    onChange={(e) => setSubjectFilterQuery(e.target.value)}
                  />
                </div>
              </div>

              {loadingSubjects ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Loading canonical subjects for Semester {selectedSemester}...
                  </p>
                </div>
              ) : filteredSemesterSubjects.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1.25rem',
                  }}
                >
                  {filteredSemesterSubjects.map((s) => {
                    const notesCount = s.notesCount || 0

                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedSubject(s)}
                        className="glass-card"
                        style={{
                          padding: '1.35rem',
                          borderRadius: 'var(--radius-lg)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          border: notesCount > 0 ? '1px solid rgba(118, 80, 245, 0.35)' : '1px solid var(--glass-border)',
                          background: 'var(--glass-surface)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-3px)'
                          e.currentTarget.style.boxShadow = '0 10px 25px rgba(118, 80, 245, 0.15)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        <div>
                          {/* Top Badges */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 'var(--radius-md)',
                                background: 'linear-gradient(135deg, rgba(118, 80, 245, 0.15), rgba(71, 139, 250, 0.15))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--color-accent)',
                              }}
                            >
                              <Folder size={22} />
                            </div>

                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {s.category && (
                                <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                                  {s.category}
                                </span>
                              )}
                              {typeof s.credits === 'number' && (
                                <span className="badge badge-purple" style={{ fontSize: '0.6875rem', fontWeight: 600 }}>
                                  {s.credits} Credits
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Subject Code & Name */}
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                            {s.subject_code}
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.35, marginBottom: 12 }}>
                            {s.subject_name}
                          </div>
                        </div>

                        {/* Bottom Row */}
                        <div
                          style={{
                            paddingTop: 10,
                            borderTop: '1px solid var(--border-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.75rem',
                          }}
                        >
                          {notesCount > 0 ? (
                            <span className="badge badge-green" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                              <FileText size={11} style={{ display: 'inline', marginRight: 3 }} />
                              {notesCount} {notesCount === 1 ? 'Note Available' : 'Notes Available'}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)' }}>No notes uploaded yet</span>
                          )}

                          <span style={{ color: 'var(--color-accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                            Open Folder <ChevronRight size={14} />
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <BookOpen size={40} style={{ color: 'var(--text-tertiary)', marginBottom: '0.75rem' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>
                    No subjects found for Semester {selectedSemester}
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {subjectFilterQuery ? 'Try clearing your filter search.' : 'No curriculum subjects mapped in database for this semester.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ════════════════ LEVEL 5: INSIDE SUBJECT FOLDER (NOTES BY UNIT) ════════════════ */}
          {selectedSubject && (
            <div>
              {/* Subject Header Card */}
              <div
                className="glass-card"
                style={{
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                  borderLeft: '4px solid var(--color-accent)',
                  background: 'linear-gradient(135deg, rgba(118, 80, 245, 0.06), rgba(71, 139, 250, 0.06))',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span className="badge badge-purple" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                        {selectedSubject.subject_code}
                      </span>
                      {selectedSubject.category && (
                        <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                          {selectedSubject.category}
                        </span>
                      )}
                      {typeof selectedSubject.credits === 'number' && (
                        <span className="badge badge-indigo" style={{ fontSize: '0.6875rem' }}>
                          {selectedSubject.credits} Credits
                        </span>
                      )}
                      {typeof selectedSubject.hours === 'number' && (
                        <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                          {selectedSubject.hours} Teaching Hours
                        </span>
                      )}
                    </div>

                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '4px 0 8px 0', color: 'var(--text-primary)' }}>
                      {selectedSubject.subject_name}
                    </h2>

                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Official curriculum subject for <strong>{selectedBranch?.name} ({selectedBranch?.code})</strong> · Semester {selectedSubject.semester_number}.
                      Notes are organized by official syllabus units and practical workbooks.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link
                      href={`/syllabus?branch=${selectedBranch?.id || ''}&semester=${selectedSubject.semester_number}`}
                      className="btn btn-secondary"
                      style={{
                        fontSize: '0.8125rem',
                        padding: '0.5rem 0.85rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <BookOpen size={14} />
                      View Full Syllabus
                    </Link>

                    <span className="badge badge-green" style={{ fontSize: '0.8125rem', fontWeight: 700, padding: '0.4rem 0.75rem' }}>
                      <FileCheck size={14} style={{ display: 'inline', marginRight: 4 }} />
                      {subjectNotes.length} {subjectNotes.length === 1 ? 'Note Available' : 'Notes Available'}
                    </span>
                  </div>
                </div>
              </div>

              {loadingSubjectContent ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Loading syllabus units and notes for {selectedSubject.subject_code}...
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Render 5 Syllabus Units */}
                  {[1, 2, 3, 4, 5].map((uNum) => {
                    const unitMeta = subjectUnits.find((u) => u.unit_number === uNum)
                    const notesInUnit = groupedNotes.unitMap[uNum] || []

                    return (
                      <div
                        key={uNum}
                        className="glass-card"
                        style={{
                          padding: '1.5rem',
                          borderRadius: 'var(--radius-lg)',
                          border: notesInUnit.length > 0 ? '1px solid rgba(118, 80, 245, 0.3)' : '1px solid var(--glass-border)',
                        }}
                      >
                        {/* Unit Section Title */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '1rem',
                            paddingBottom: '0.75rem',
                            borderBottom: '1px solid var(--border-light)',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 'var(--radius-sm)',
                                background: 'linear-gradient(135deg, rgba(118, 80, 245, 0.15), rgba(71, 139, 250, 0.15))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--color-accent)',
                                fontWeight: 800,
                                fontSize: '0.875rem',
                              }}
                            >
                              U{uNum}
                            </div>
                            <div>
                              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                                Unit {uNum}{unitMeta?.unit_title ? `: ${unitMeta.unit_title}` : ''}
                              </h3>
                              {unitMeta?.description && (
                                <p
                                  style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-secondary)',
                                    margin: '2px 0 0 0',
                                    lineHeight: 1.35,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                  title={unitMeta.description}
                                >
                                  {unitMeta.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <span
                            className={notesInUnit.length > 0 ? 'badge badge-green' : 'badge badge-neutral'}
                            style={{ fontSize: '0.6875rem', fontWeight: 600 }}
                          >
                            {notesInUnit.length} {notesInUnit.length === 1 ? 'Note' : 'Notes'}
                          </span>
                        </div>

                        {/* Unit Notes Cards */}
                        {notesInUnit.length > 0 ? (
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
                              gap: '1rem',
                            }}
                          >
                            {notesInUnit.map((note) => (
                              <NoteCard
                                key={note.id}
                                note={note}
                                loading={loadingNoteId === note.id}
                                onRead={() => openNoteReader(note)}
                              />
                            ))}
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: '1.25rem',
                              textAlign: 'center',
                              borderRadius: 'var(--radius-md)',
                              background: 'rgba(255, 255, 255, 0.4)',
                              border: '1px dashed var(--border-light)',
                            }}
                          >
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', margin: 0 }}>
                              No notes uploaded for Unit {uNum} yet. Faculty and verified admin notes will appear here.
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Section: Other Resources, Lab Manuals & Question Banks */}
                  {groupedNotes.otherNotes.length > 0 && (
                    <div
                      className="glass-card"
                      style={{
                        padding: '1.5rem',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.04), rgba(71, 139, 250, 0.04))',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '1rem',
                          paddingBottom: '0.75rem',
                          borderBottom: '1px solid var(--border-light)',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 'var(--radius-sm)',
                              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(71, 139, 250, 0.2))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#10b981',
                            }}
                          >
                            <BookMarked size={18} />
                          </div>
                          <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                              Laboratory Workbooks, Manuals & Additional Resources
                            </h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                              Practical manuals, important question banks, and complete course materials.
                            </p>
                          </div>
                        </div>

                        <span className="badge badge-green" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                          {groupedNotes.otherNotes.length} {groupedNotes.otherNotes.length === 1 ? 'Resource' : 'Resources'}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
                          gap: '1rem',
                        }}
                      >
                        {groupedNotes.otherNotes.map((note) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            loading={loadingNoteId === note.id}
                            onRead={() => openNoteReader(note)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ──────────────── 6. ULTRA-FAST PROGRESSIVE PDF READER MODAL ──────────────── */}
      {activeReadingNote && (
        <FastPdfViewer
          url={activeReadingNote.url}
          streamUrl={activeReadingNote.streamUrl}
          title={activeReadingNote.note.title}
          fileSize={activeReadingNote.note.file_size}
          onClose={() => setActiveReadingNote(null)}
          onRefreshUrl={async () => {
            try {
              const res = await fetch(
                `/api/storage/view-url?bucket=notes&path=${encodeURIComponent(activeReadingNote.note.file_path!)}`
              )
              const data = await res.json()
              return data.url || data.streamUrl || data.directUrl || null
            } catch {
              return null
            }
          }}
        />
      )}
    </div>
  )
}

// ──────────────── NOTE CARD COMPONENT ────────────────
interface NoteCardProps {
  note: Note
  loading: boolean
  onRead: () => void
}

function NoteCard({ note, loading, onRead }: NoteCardProps) {
  return (
    <div
      className="glass-card"
      style={{
        padding: '1.25rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--glass-border)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'var(--glass-surface)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(118, 80, 245, 0.12)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="badge badge-green" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
            📄 Verified PDF
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <HardDrive size={12} /> {formatFileSize(note.file_size)}
          </span>
        </div>

        <h4
          style={{
            fontSize: '0.9375rem',
            fontWeight: 700,
            lineHeight: 1.35,
            color: 'var(--text-primary)',
            marginBottom: 6,
          }}
        >
          {note.title}
        </h4>

        {note.description && (
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
              marginBottom: 12,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {note.description}
          </p>
        )}
      </div>

      <div style={{ paddingTop: 10, borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={12} /> {formatDate(note.created_at)}
        </span>

        <button
          type="button"
          onClick={onRead}
          disabled={loading}
          className="btn btn-primary"
          style={{
            fontSize: '0.8125rem',
            padding: '0.4rem 0.85rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 700,
          }}
        >
          <Eye size={14} />
          {loading ? 'Opening...' : 'Read Note'}
        </button>
      </div>
    </div>
  )
}
