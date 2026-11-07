'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'

export interface NoteSubject {
  id: string
  subject_code: string
  subject_name: string
  semester_number?: number
  year_number?: number
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
  subjects: NoteSubject | NoteSubject[] | null
}

interface Program {
  id: string
  name: string
  short_code: string
}

interface Branch {
  id: string
  program_id: string
  name: string
  code: string
}

interface UserProfile {
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
  branches?: Branch[]
  userProfile?: UserProfile | null
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function NotesClient({ initialNotes, programs, branches = [], userProfile }: NotesClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [loadingNoteId, setLoadingNoteId] = useState<string | null>(null)
  const [activeReadingNote, setActiveReadingNote] = useState<{ note: Note; url: string } | null>(null)

  const isAdmin = userProfile?.role === 'admin'

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

  const filteredNotes = initialNotes.filter((note) => {
    const subject = Array.isArray(note.subjects) ? note.subjects[0] : note.subjects
    const branchCode = subject?.branches?.code

    if (isAdmin && selectedBranch !== 'all' && branchCode !== selectedBranch) {
      return false
    }

    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      note.title.toLowerCase().includes(q) ||
      note.description?.toLowerCase().includes(q) ||
      subject?.subject_code.toLowerCase().includes(q) ||
      subject?.subject_name.toLowerCase().includes(q) ||
      branchCode?.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      {/* Search & Filter bar */}
      <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 38 }}
            placeholder="Search notes by title, subject code, or subject name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isAdmin && branches.length > 0 && (
          <div style={{ minWidth: 180 }}>
            <select
              className="form-input"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="all">All Branches ({initialNotes.length})</option>
              {branches.map(b => (
                <option key={b.id} value={b.code}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Notes grid */}
      {filteredNotes.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1rem',
        }}>
          {filteredNotes.map((note) => {
            const subject = Array.isArray(note.subjects) ? note.subjects[0] : note.subjects
            const branchCode = subject?.branches?.code
            const progCode = subject?.programs?.short_code

            return (
              <div key={note.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <FileText size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 2, lineHeight: 1.3 }}>{note.title}</h3>
                    {subject && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        <span className="badge badge-maroon" style={{ fontSize: '0.625rem' }}>{subject.subject_code}</span>
                        <span className="badge badge-neutral" style={{ fontSize: '0.625rem' }}>{subject.subject_name}</span>
                        {branchCode && (
                          <span className="badge badge-blue" style={{ fontSize: '0.625rem' }}>
                            {progCode ? `${progCode} ` : ''}{branchCode}
                          </span>
                        )}
                        {subject.semester_number && (
                          <span className="badge badge-yellow" style={{ fontSize: '0.625rem' }}>
                            Sem {subject.semester_number}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {note.description && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {note.description.slice(0, 140)}{note.description.length > 140 ? '...' : ''}
                  </p>
                )}

                {note.file_path && (
                  <div style={{ marginTop: '0.5rem', marginBottom: '0.25rem' }}>
                    {/* Read Online Only - No Download Option */}
                    <button
                      type="button"
                      onClick={() => openNoteReader(note)}
                      disabled={loadingNoteId === note.id}
                      className="btn btn-primary"
                      style={{
                        padding: '0.45rem 1rem',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        width: '100%',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #10b981, #06b6d4)',
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

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  fontSize: '0.6875rem',
                  color: 'var(--text-tertiary)',
                  borderTop: '1px solid var(--border-light)',
                  paddingTop: '0.75rem',
                  marginTop: 'auto',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Eye size={12} /> {note.view_count}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <HardDrive size={12} /> {formatFileSize(note.file_size)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Calendar size={12} /> {new Date(note.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="badge badge-green" style={{ fontSize: '0.5625rem', marginLeft: 'auto' }}>
                    READ ONLY
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <FileText size={40} color="var(--text-tertiary)" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {searchQuery || (isAdmin && selectedBranch !== 'all') ? 'No Notes Found' : 'No Notes Published for Your Branch'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
            {searchQuery ? 'Try a different search term.' : 'Study notes for your curriculum subjects will appear here as soon as they are published.'}
          </p>
        </div>
      )}

      {/* Online Document Reader Modal (Strict Read-Only Mode) */}
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
              maxWidth: '960px',
              height: '92vh',
              backgroundColor: '#0f172a',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{
              padding: '0.75rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-light)',
              background: '#1e293b',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span className="badge badge-green" style={{ fontSize: '0.625rem', padding: '0.2rem 0.5rem' }}>
                  <Lock size={10} style={{ display: 'inline', marginRight: 3 }} /> Secure Reader
                </span>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: '#f8fafc',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
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
