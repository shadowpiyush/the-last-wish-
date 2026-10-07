'use client'

import { useState, useEffect } from 'react'
import {
  Library,
  BookOpen,
  Search,
  CheckCircle2,
  X,
  Lock,
  GraduationCap,
  Globe,
  Plus,
  Loader2,
  Maximize2,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'

interface AcademicMappingItem {
  id: string
  program_id: string | null
  branch_id: string | null
  year_number: number | null
  semester_number: number | null
  subject_id: string | null
  academic_category: string | null
  branches?: { id: string; name: string; code: string } | null
  subjects?: { id: string; subject_code: string; subject_name: string } | null
  programs?: { id: string; name: string; short_code: string } | null
}

export interface BookItem {
  id: string
  title: string
  subtitle?: string
  author: string
  isbn?: string
  edition?: string
  publisher?: string
  publication_year?: number
  language?: string
  description?: string
  cover_image_url?: string
  book_type?: string
  ebook_status: string
  ebook_file_path?: string
  total_pages?: number
  subjects?:
    | {
        id: string
        subject_code: string
        subject_name: string
      }
    | {
        id: string
        subject_code: string
        subject_name: string
      }[]
    | null
  ebook_academic_mappings?: AcademicMappingItem[]
}

interface ProgramOption {
  id: string
  name: string
  short_code: string
}

interface BranchOption {
  id: string
  program_id: string
  name: string
  code: string
}

interface LibraryClientProps {
  initialBooks: BookItem[]
  programs?: ProgramOption[]
  branches?: BranchOption[]
}

export function LibraryClient({ initialBooks, programs = [], branches = [] }: LibraryClientProps) {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [books] = useState<BookItem[]>(initialBooks)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [scopeFilter, setScopeFilter] = useState<'all' | 'course_only' | 'general_only'>('all')
  const [selectedProgram, setSelectedProgram] = useState<string>('all')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [selectedSemester, setSelectedSemester] = useState<string>('all')
  const [readingLoading, setReadingLoading] = useState<string | null>(null)
  const [activeReadingBook, setActiveReadingBook] = useState<{ book: BookItem; url: string } | null>(null)
  const [readerIframeLoading, setReaderIframeLoading] = useState(true)

  // Prevent download and print keyboard shortcuts while reader is open
  useEffect(() => {
    if (!activeReadingBook) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'S' || e.key === 'P')) {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeReadingBook])

  // Filter branches according to selected program
  const availableBranches = selectedProgram === 'all'
    ? branches
    : branches.filter((b) => b.program_id === selectedProgram)

  // Academic matching & deduplication filter
  const filteredBooks = books.filter((b) => {
    // 1. Book type filter
    if (filterType !== 'All' && b.book_type !== filterType) return false

    const mappings = b.ebook_academic_mappings || []
    const isGeneral = mappings.length === 0

    // 2. Scope filter (All / Course Specific / General Library)
    if (scopeFilter === 'general_only' && !isGeneral) return false
    if (scopeFilter === 'course_only' && isGeneral) return false

    // 3. Academic Hierarchy Filter
    const hasAcademicFilter = selectedProgram !== 'all' || selectedBranch !== 'all' || selectedSemester !== 'all'

    if (hasAcademicFilter) {
      if (isGeneral) {
        // If user specifically picked "course_only", general books are hidden.
        // Otherwise, General Library eBooks remain discoverable as general resources.
        if (scopeFilter === 'course_only') return false
      } else {
        const matchesHierarchy = mappings.some((m) => {
          const matchProg = selectedProgram === 'all' || !m.program_id || m.program_id === selectedProgram
          const matchBranch = selectedBranch === 'all' || !m.branch_id || m.branch_id === selectedBranch
          const matchSem = selectedSemester === 'all' || !m.semester_number || m.semester_number === Number(selectedSemester)
          return matchProg && matchBranch && matchSem
        })
        if (!matchesHierarchy) return false
      }
    }

    // 4. Text Search
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const sub = Array.isArray(b.subjects) ? b.subjects[0] : b.subjects
    const matchesMappings = mappings.some(
      (m) =>
        m.branches?.name?.toLowerCase().includes(q) ||
        m.branches?.code?.toLowerCase().includes(q) ||
        m.subjects?.subject_code?.toLowerCase().includes(q) ||
        m.subjects?.subject_name?.toLowerCase().includes(q) ||
        m.academic_category?.toLowerCase().includes(q)
    )

    return (
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.subtitle?.toLowerCase().includes(q) ||
      b.publisher?.toLowerCase().includes(q) ||
      sub?.subject_code.toLowerCase().includes(q) ||
      sub?.subject_name.toLowerCase().includes(q) ||
      matchesMappings
    )
  })

  // Open in-app online reader (strictly read-only)
  const openBookReader = async (book: BookItem) => {
    if (!book.ebook_file_path) {
      alert('PDF for this eBook is not available in digital storage yet.')
      return
    }
    setReadingLoading(book.id)
    try {
      const res = await fetch(`/api/storage/view-url?bucket=ebooks&path=${encodeURIComponent(book.ebook_file_path)}`)
      const data = await res.json()
      if (data.url) {
        setReaderIframeLoading(true)
        setActiveReadingBook({ book, url: data.url })
      } else {
        alert(data.error || 'Failed to open eBook')
      }
    } catch {
      alert('Failed to connect to digital storage.')
    } finally {
      setReadingLoading(null)
    }
  }

  const bookTypes = ['All', 'Textbook', 'Reference Manual', 'Handout', 'Monograph']

  return (
    <div>
      {/* Search & Academic Filters Bar */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.75rem' }}>
        {/* Top Search Input & Scope Buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem',
          alignItems: 'center',
          marginBottom: '1rem',
        }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 38 }}
              placeholder="Search by title, author, branch (e.g. CSE), or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Scope Filter Tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', marginRight: 4 }}>Scope:</span>
            <button
              type="button"
              onClick={() => setScopeFilter('all')}
              className={`tab-item ${scopeFilter === 'all' ? 'tab-item-active' : ''}`}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              All Resources
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('course_only')}
              className={`tab-item ${scopeFilter === 'course_only' ? 'tab-item-active' : ''}`}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              <GraduationCap size={13} style={{ marginRight: 4 }} /> Course Mapped
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('general_only')}
              className={`tab-item ${scopeFilter === 'general_only' ? 'tab-item-active' : ''}`}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              <Globe size={13} style={{ marginRight: 4 }} /> General Library
            </button>
          </div>
        </div>

        {/* Academic Hierarchy Filters (Program, Branch, Semester) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-light)',
          alignItems: 'center',
        }}>
          <div>
            <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 3 }}>
              Degree Program
            </label>
            <select
              className="form-select"
              value={selectedProgram}
              onChange={(e) => {
                setSelectedProgram(e.target.value)
                setSelectedBranch('all')
              }}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
            >
              <option value="all">All Programs</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.short_code} — {p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 3 }}>
              Branch
            </label>
            <select
              className="form-select"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
            >
              <option value="all">All Branches</option>
              {availableBranches.map((b) => (
                <option key={b.id} value={b.id}>[{b.code}] {b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 3 }}>
              Semester
            </label>
            <select
              className="form-select"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
            >
              <option value="all">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 3 }}>
              Category
            </label>
            <select
              className="form-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
            >
              {bookTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {(selectedProgram !== 'all' || selectedBranch !== 'all' || selectedSemester !== 'all' || filterType !== 'All' || scopeFilter !== 'all' || searchQuery) && (
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', paddingBottom: 2 }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedProgram('all')
                  setSelectedBranch('all')
                  setSelectedSemester('all')
                  setFilterType('All')
                  setScopeFilter('all')
                  setSearchQuery('')
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.6875rem', padding: '0.4rem 0.75rem', width: '100%' }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Books Grid with Thumbnails */}
      {filteredBooks.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}>
          {filteredBooks.map((book) => {
            const subject = Array.isArray(book.subjects) ? book.subjects[0] : book.subjects
            const mappings = book.ebook_academic_mappings || []
            const isGeneral = mappings.length === 0

            // Extract distinct branches, semesters, and subjects
            const distinctBranchCodes = Array.from(
              new Set(mappings.map((m) => m.branches?.code).filter(Boolean))
            )
            const distinctSemesters = Array.from(
              new Set(mappings.map((m) => m.semester_number).filter(Boolean))
            ).sort((a, b) => (a as number) - (b as number))
            const distinctSubjects = Array.from(
              new Set(mappings.map((m) => m.subjects?.subject_code).filter(Boolean))
            )

            return (
              <div
                key={book.id}
                className="glass-card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'stretch',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                {/* Book Cover Thumbnail */}
                <div style={{
                  width: 95,
                  minWidth: 95,
                  height: 135,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-color)',
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '0.5rem',
                  flexShrink: 0,
                }}>
                  {book.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.cover_image_url}
                      alt={book.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        position: 'absolute',
                        inset: 0,
                      }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <>
                      <BookOpen size={24} color="#6366f1" style={{ marginBottom: 6 }} />
                      <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-secondary)', lineHeight: 1.2 }}>
                        {book.title.slice(0, 30)}
                      </div>
                    </>
                  )}
                </div>

                {/* Book Details */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span className="badge badge-indigo" style={{ fontSize: '0.625rem' }}>
                      {book.book_type || 'Textbook'}
                    </span>
                    {book.ebook_file_path && (
                      <span className="badge badge-green" style={{ fontSize: '0.625rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <CheckCircle2 size={10} /> Online eBook
                      </span>
                    )}
                  </div>

                  <h3 style={{
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    marginBottom: 2,
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {book.title}
                  </h3>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                    by <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{book.author}</span>
                  </div>

                  {/* Academic Mapping Badges OR General Library Badge */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                    {isGeneral ? (
                      <span className="badge badge-neutral" style={{ fontSize: '0.625rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Globe size={11} color="var(--text-tertiary)" /> General Library Resource
                      </span>
                    ) : (
                      <>
                        {distinctBranchCodes.length > 0 && (
                          <span className="badge badge-maroon" style={{ fontSize: '0.5625rem' }}>
                            {distinctBranchCodes.join(', ')}
                          </span>
                        )}
                        {distinctSemesters.length > 0 && (
                          <span className="badge badge-yellow" style={{ fontSize: '0.5625rem' }}>
                            {distinctSemesters.map((s) => `Sem ${s}`).join(', ')}
                          </span>
                        )}
                        {distinctSubjects.length > 0 && (
                          <span className="badge badge-neutral" style={{ fontSize: '0.5625rem' }}>
                            {distinctSubjects.join(', ')}
                          </span>
                        )}
                      </>
                    )}
                    {subject && !isGeneral && distinctSubjects.length === 0 && (
                      <span className="badge badge-neutral" style={{ fontSize: '0.5625rem' }}>
                        {subject.subject_code}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 'auto', marginBottom: 8 }}>
                    {book.edition && <span>{book.edition}</span>}
                    {book.publication_year && <span>• {book.publication_year}</span>}
                    {book.total_pages && (
                      <span className="badge badge-neutral" style={{ fontSize: '0.625rem' }}>
                        {book.total_pages} pages
                      </span>
                    )}
                  </div>

                  {/* Actions - Strictly Read Online; No Download Option */}
                  <div style={{ marginTop: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {book.ebook_file_path ? (
                      <button
                        type="button"
                        onClick={() => openBookReader(book)}
                        disabled={readingLoading === book.id}
                        className="btn btn-primary"
                        style={{
                          padding: '0.4rem 0.85rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                        }}
                      >
                        {readingLoading === book.id ? (
                          'Opening...'
                        ) : (
                          <>
                            <BookOpen size={13} /> Read Online
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="badge badge-yellow" style={{ fontSize: '0.625rem' }}>
                        Physical Only
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Library size={44} color="var(--text-tertiary)" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {searchQuery ? 'No eBooks Found' : 'Digital Library Ready'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', maxWidth: 460, margin: '0 auto 1.5rem auto' }}>
            {searchQuery
              ? 'Try searching with another keyword or subject code.'
              : 'Textbooks, reference manuals, and eBooks up to 50MB with high-resolution thumbnails can be added via the Admin section.'}
          </p>
          {isAdmin && (
            <Link href="/admin" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} /> Open Admin Upload Center
            </Link>
          )}
        </div>
      )}

      {/* Online eBook Reader Modal (Strict Read-Only Mode) */}
      {activeReadingBook && (
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
          onClick={() => setActiveReadingBook(null)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '1100px',
              height: '92vh',
              background: '#0d1117',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.875rem 1.25rem',
                borderBottom: '1px solid var(--border-color)',
                background: 'rgba(255, 255, 255, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <BookOpen size={18} color="#6366f1" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeReadingBook.book.title}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                    by {activeReadingBook.book.author} &bull; Read-Only Digital Reader (Downloading Disabled)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a
                  href={activeReadingBook.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  title="Open in new full screen tab"
                >
                  <Maximize2 size={13} /> Full Screen
                </a>
                <span
                  className="badge badge-neutral"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.6875rem', padding: '0.25rem 0.6rem' }}
                >
                  <Lock size={12} color="#6366f1" /> Read Only
                </span>
                <button
                  type="button"
                  onClick={() => setActiveReadingBook(null)}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <X size={14} /> Close
                </button>
              </div>
            </div>

            {/* Embedded PDF iframe with toolbar disabled */}
            <div style={{ flex: 1, position: 'relative', background: '#161b22' }}>
              {readerIframeLoading && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    background: '#0d1117',
                    zIndex: 2,
                  }}
                >
                  <Loader2 size={32} className="animate-spin" style={{ color: '#10b981' }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Streaming eBook via Cloudflare R2...
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    High-speed byte-range partial stream active
                  </div>
                </div>
              )}
              <iframe
                src={`${activeReadingBook.url}#toolbar=0&navpanes=0&scrollbar=1`}
                onLoad={() => setReaderIframeLoading(false)}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                title={activeReadingBook.book.title}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
