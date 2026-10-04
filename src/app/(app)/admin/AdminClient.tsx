'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Shield,
  Users,
  FileText,
  Library,
  FileCheck,
  Activity,
  AlertTriangle,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ExternalLink,
  BookOpen,
  Image as ImageIcon,
  HardDrive,
  Calendar,
  Layers,
  Sparkles,
  Copy,
  Plus,
  X,
  SlidersHorizontal,
  Globe,
  XCircle,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Building2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB (Supabase Cloud Storage limit for notes)
const MAX_EBOOK_FILE_SIZE = 500 * 1024 * 1024 // 500 MB (Cloudflare R2 Direct Multipart Upload limit)

interface ProfileRow {
  id: string
  full_name: string
  role: string
  status: string
  created_at: string
}

interface AuditRow {
  id: string
  action: string
  target_type: string
  target_id: string
  created_at: string
}

interface ProgramItem {
  id: string
  name: string
  short_code: string
  duration_years: number
  total_semesters: number
}

interface BranchItem {
  id: string
  program_id: string
  name: string
  code: string
}

interface SubjectItem {
  id: string
  subject_code: string
  subject_name: string
  program_id: string
  branch_id: string
  semester_number: number
}

interface NoteItem {
  id: string
  title: string
  description?: string
  file_path: string
  file_type: string
  file_size: number
  status: string
  created_at: string
  subjects?: {
    id: string
    subject_code: string
    subject_name: string
  }
}

export interface AcademicMappingRecord {
  id?: string
  book_id?: string
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

export interface AcademicMappingGroup {
  id: string
  programId: string
  branchIds: string[]
  year: number | null
  semesters: number[]
  subjectIds: string[]
  category: string
}

export interface BookItem {
  id: string
  title: string
  subtitle?: string
  author: string
  cover_image_url?: string
  ebook_file_path?: string
  ebook_status: string
  total_pages?: number
  created_at: string
  subjects?: {
    id: string
    subject_code: string
    subject_name: string
  }
  academic_mappings?: AcademicMappingRecord[]
}

interface AdminClientProps {
  stats: Array<{ key: string; label: string; value: number; color: string }>
  recentUsers: ProfileRow[]
  recentAudit: AuditRow[]
  recentBooks?: BookItem[]
}

const STAT_ICONS: Record<string, React.ComponentType<{ size?: number | string; color?: string; style?: React.CSSProperties }>> = {
  users: Users,
  notes: FileText,
  pending: AlertTriangle,
  books: Library,
  pyqs: FileCheck,
  subjects: Activity,
}

type AdminTab = 'overview' | 'users' | 'upload_notes' | 'upload_ebook' | 'manage_content'

export interface AdminUserItem {
  id: string
  full_name: string
  email: string | null
  mobile_number: string | null
  profile_picture_url: string | null
  role: string
  status: string
  branch_id: string | null
  branch_name: string | null
  branch_code: string | null
  program_id: string | null
  program_name: string | null
  current_year: number
  current_semester: number
  created_at: string
  updated_at: string
  last_sign_in_at: string | null
}

// Helper to group database mappings into editable UI groups
function groupDbMappingsToUi(mappings?: AcademicMappingRecord[], defaultProgramId?: string): AcademicMappingGroup[] {
  if (!mappings || mappings.length === 0) return []

  const groupMap: Record<string, AcademicMappingGroup> = {}

  mappings.forEach((m) => {
    const key = `${m.program_id || 'none'}-${m.year_number || 'none'}-${m.academic_category || 'Textbook'}`
    if (!groupMap[key]) {
      groupMap[key] = {
        id: Math.random().toString(36).substring(2, 9),
        programId: m.program_id || defaultProgramId || '',
        branchIds: [],
        year: m.year_number || 1,
        semesters: [],
        subjectIds: [],
        category: m.academic_category || 'Textbook',
      }
    }
    const grp = groupMap[key]
    if (m.branch_id && !grp.branchIds.includes(m.branch_id)) {
      grp.branchIds.push(m.branch_id)
    }
    if (m.semester_number && !grp.semesters.includes(m.semester_number)) {
      grp.semesters.push(m.semester_number)
    }
    if (m.subject_id && !grp.subjectIds.includes(m.subject_id)) {
      grp.subjectIds.push(m.subject_id)
    }
  })

  return Object.values(groupMap)
}

function AcademicMappingEditor({
  mappings,
  setMappings,
  programs,
  branches,
  subjects,
}: {
  mappings: AcademicMappingGroup[]
  setMappings: React.Dispatch<React.SetStateAction<AcademicMappingGroup[]>>
  programs: ProgramItem[]
  branches: BranchItem[]
  subjects: SubjectItem[]
}) {
  const [subjectSearch, setSubjectSearch] = useState<Record<string, string>>({})

  const addGroup = () => {
    setMappings((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        programId: programs[0]?.id || '',
        branchIds: [],
        year: 1,
        semesters: [1],
        subjectIds: [],
        category: 'Textbook',
      },
    ])
  }

  const duplicateGroup = (idx: number) => {
    setMappings((prev) => {
      const clone = {
        ...prev[idx],
        id: Math.random().toString(36).substring(2, 9),
        branchIds: [...prev[idx].branchIds],
        semesters: [...prev[idx].semesters],
        subjectIds: [...prev[idx].subjectIds],
      }
      return [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)]
    })
  }

  const removeGroup = (idx: number) => {
    setMappings((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateGroupField = (idx: number, field: keyof AcademicMappingGroup, val: any) => {
    setMappings((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: val }
      return next
    })
  }

  const toggleBranch = (idx: number, bId: string) => {
    setMappings((prev) => {
      const next = [...prev]
      const cur = next[idx].branchIds
      const updated = cur.includes(bId) ? cur.filter((id) => id !== bId) : [...cur, bId]
      next[idx] = { ...next[idx], branchIds: updated }
      return next
    })
  }

  const toggleSemester = (idx: number, sem: number) => {
    setMappings((prev) => {
      const next = [...prev]
      const cur = next[idx].semesters
      const updated = cur.includes(sem) ? cur.filter((s) => s !== sem) : [...cur, sem].sort((a, b) => a - b)
      next[idx] = { ...next[idx], semesters: updated }
      return next
    })
  }

  const toggleSubject = (idx: number, subId: string) => {
    setMappings((prev) => {
      const next = [...prev]
      const cur = next[idx].subjectIds
      const updated = cur.includes(subId) ? cur.filter((id) => id !== subId) : [...cur, subId]
      next[idx] = { ...next[idx], subjectIds: updated }
      return next
    })
  }

  const selectAllBranches = (idx: number, branchList: BranchItem[]) => {
    setMappings((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], branchIds: branchList.map((b) => b.id) }
      return next
    })
  }

  const clearBranches = (idx: number) => {
    setMappings((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], branchIds: [], subjectIds: [] }
      return next
    })
  }

  const selectAllSemesters = (idx: number) => {
    setMappings((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], semesters: [1, 2, 3, 4, 5, 6, 7, 8] }
      return next
    })
  }

  const clearSemesters = (idx: number) => {
    setMappings((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], semesters: [] }
      return next
    })
  }

  const selectAllSubjects = (idx: number, subjectIdsList: string[]) => {
    setMappings((prev) => {
      const next = [...prev]
      const merged = Array.from(new Set([...next[idx].subjectIds, ...subjectIdsList]))
      next[idx] = { ...next[idx], subjectIds: merged }
      return next
    })
  }

  const clearSubjects = (idx: number) => {
    setMappings((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], subjectIds: [] }
      return next
    })
  }

  if (mappings.length === 0) {
    return (
      <div style={{
        padding: '1.25rem',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(99, 102, 241, 0.05)',
        border: '1px dashed rgba(99, 102, 241, 0.3)',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6366f1',
            flexShrink: 0,
          }}>
            <Globe size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              General Library eBook
              <span className="badge badge-neutral" style={{ fontSize: '0.625rem' }}>Optional</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
              No academic mapping configured. This eBook will be published as a general library resource accessible to all students across the university.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={addGroup}
          className="btn btn-secondary"
          style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
        >
          <Plus size={14} color="#6366f1" /> + Add Academic Mapping
        </button>
      </div>
    )
  }

  return (
    <div style={{
      padding: '1.25rem',
      borderRadius: 'var(--radius-md)',
      background: 'rgba(245, 158, 11, 0.03)',
      border: '1px solid rgba(245, 158, 11, 0.25)',
      marginBottom: '1.25rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={16} /> Academic Mapping & Category
            <span className="badge badge-yellow" style={{ fontSize: '0.625rem' }}>Optional</span>
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Assign this eBook to multiple branches, semesters, and subjects without creating duplicate files.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => setMappings([])}
            className="btn btn-secondary"
            style={{ fontSize: '0.6875rem', padding: '0.3rem 0.6rem', color: '#e11d48' }}
          >
            Clear All (Make General Library)
          </button>
          <button
            type="button"
            onClick={addGroup}
            className="btn btn-secondary"
            style={{ fontSize: '0.6875rem', padding: '0.3rem 0.6rem', color: '#f59e0b' }}
          >
            <Plus size={12} /> + Add Another Mapping Group
          </button>
        </div>
      </div>

      {/* Mapping Groups List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {mappings.map((grp, idx) => {
          const progBranches = branches.filter((b) => b.program_id === grp.programId)
          const prog = programs.find((p) => p.id === grp.programId)

          // Filter database subjects strictly by selected program, selected branches, and selected semesters
          const term = (subjectSearch[grp.id] || '').toLowerCase()
          const validSubjects = subjects.filter((s) => {
            const progMatch = !grp.programId || s.program_id === grp.programId
            const branchMatch = grp.branchIds.length === 0 || grp.branchIds.includes(s.branch_id)
            const semMatch = grp.semesters.length === 0 || grp.semesters.includes(s.semester_number)
            const searchMatch = !term ||
              s.subject_name.toLowerCase().includes(term) ||
              s.subject_code.toLowerCase().includes(term)
            return progMatch && branchMatch && semMatch && searchMatch
          })

          const selectedBranchNames = progBranches.filter((b) => grp.branchIds.includes(b.id)).map((b) => b.code)
          const selectedSubjectNames = subjects.filter((s) => grp.subjectIds.includes(s.id)).map((s) => s.subject_code)

          return (
            <div
              key={grp.id}
              style={{
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
                padding: '1rem',
              }}
            >
              {/* Group Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="badge badge-maroon" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                    Mapping #{idx + 1}
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: '0.625rem' }}>
                    {grp.category}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => duplicateGroup(idx)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.625rem', padding: '0.2rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    title="Duplicate this mapping group"
                  >
                    <Copy size={11} /> Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => removeGroup(idx)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.625rem', padding: '0.2rem 0.5rem', color: '#e11d48', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    title="Remove this mapping group"
                  >
                    <Trash2 size={11} /> Remove
                  </button>
                </div>
              </div>

              {/* Row 1: Program, Year, Category */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                    Degree Program
                  </label>
                  <select
                    className="form-select"
                    value={grp.programId}
                    onChange={(e) => {
                      updateGroupField(idx, 'programId', e.target.value)
                      const newProgBranches = branches.filter((b) => b.program_id === e.target.value)
                      const validBranchIds = grp.branchIds.filter((id) => newProgBranches.some((b) => b.id === id))
                      updateGroupField(idx, 'branchIds', validBranchIds)
                    }}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>{p.short_code} — {p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                    Academic Year
                  </label>
                  <select
                    className="form-select"
                    value={grp.year ?? 1}
                    onChange={(e) => updateGroupField(idx, 'year', Number(e.target.value))}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                    Academic Category
                  </label>
                  <select
                    className="form-select"
                    value={grp.category}
                    onChange={(e) => updateGroupField(idx, 'category', e.target.value)}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                  >
                    <option value="Textbook">Textbook</option>
                    <option value="Reference Manual">Reference Manual</option>
                    <option value="Question Bank">Question Bank</option>
                    <option value="Lab Manual">Lab Manual</option>
                    <option value="Handout">Handout</option>
                    <option value="Monograph">Monograph</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Multi-Branch Selector */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Branches (Multi-Select · Single File Reused):
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => selectAllBranches(idx, progBranches)}
                      className="tab-item"
                      style={{ fontSize: '0.625rem', padding: '0.15rem 0.4rem' }}
                    >
                      Select All ({progBranches.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => clearBranches(idx)}
                      className="tab-item"
                      style={{ fontSize: '0.625rem', padding: '0.15rem 0.4rem' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {progBranches.map((b) => {
                    const isSelected = grp.branchIds.includes(b.id)
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggleBranch(idx, b.id)}
                        className={`tab-item ${isSelected ? 'tab-item-active' : ''}`}
                        style={{
                          fontSize: '0.6875rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          borderColor: isSelected ? 'var(--color-primary)' : undefined,
                        }}
                      >
                        {isSelected && <CheckCircle2 size={11} color="var(--color-primary)" />}
                        [{b.code}] {b.name}
                      </button>
                    )
                  })}
                </div>
                {grp.branchIds.length === 0 && (
                  <div style={{ fontSize: '0.6875rem', color: '#f59e0b', marginTop: 3 }}>
                    ⚠️ Please select at least one branch for this mapping group.
                  </div>
                )}
              </div>

              {/* Row 3: Multi-Semester Selector */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Semesters (Multi-Select):
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => selectAllSemesters(idx)}
                      className="tab-item"
                      style={{ fontSize: '0.625rem', padding: '0.15rem 0.4rem' }}
                    >
                      All Semesters (1-8)
                    </button>
                    <button
                      type="button"
                      onClick={() => clearSemesters(idx)}
                      className="tab-item"
                      style={{ fontSize: '0.625rem', padding: '0.15rem 0.4rem' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
                    const isSelected = grp.semesters.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSemester(idx, s)}
                        className={`tab-item ${isSelected ? 'tab-item-active' : ''}`}
                        style={{
                          fontSize: '0.6875rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                        }}
                      >
                        {isSelected ? '✓ ' : ''}Semester {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Row 4: Database-Driven Multi-Subject Selector */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Subjects (Multi-Select · Database Driven):
                  </label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {validSubjects.length > 5 && (
                      <input
                        type="text"
                        placeholder="Search subjects..."
                        value={subjectSearch[grp.id] || ''}
                        onChange={(e) => setSubjectSearch({ ...subjectSearch, [grp.id]: e.target.value })}
                        style={{
                          fontSize: '0.6875rem',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border-light)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          width: 130,
                        }}
                      />
                    )}
                    {validSubjects.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => selectAllSubjects(idx, validSubjects.map((s) => s.id))}
                          className="tab-item"
                          style={{ fontSize: '0.625rem', padding: '0.15rem 0.4rem' }}
                        >
                          Select All ({validSubjects.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => clearSubjects(idx)}
                          className="tab-item"
                          style={{ fontSize: '0.625rem', padding: '0.15rem 0.4rem' }}
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {grp.branchIds.length === 0 ? (
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '0.35rem 0' }}>
                    ℹ️ Select one or more branches above to see available subjects.
                  </div>
                ) : validSubjects.length > 0 ? (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 4,
                    maxHeight: 140,
                    overflowY: 'auto',
                    padding: '0.35rem',
                    background: 'var(--bg-primary)',
                    borderRadius: '4px',
                    border: '1px solid var(--border-light)',
                  }}>
                    {validSubjects.map((s) => {
                      const isSelected = grp.subjectIds.includes(s.id)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSubject(idx, s.id)}
                          className={`tab-item ${isSelected ? 'tab-item-active' : ''}`}
                          style={{
                            fontSize: '0.625rem',
                            padding: '0.2rem 0.45rem',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            textAlign: 'left',
                          }}
                        >
                          {isSelected && <CheckCircle2 size={10} color="var(--color-primary)" />}
                          [{s.subject_code}] {s.subject_name}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '0.35rem 0' }}>
                    No subjects in database match the selected branch and semester filters.
                  </div>
                )}
              </div>

              {/* Row 5: Compact Availability Tree Preview */}
              <div style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '4px',
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.15)',
                fontSize: '0.6875rem',
                color: 'var(--text-secondary)',
              }}>
                <div style={{ fontWeight: 700, color: '#6366f1', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Sparkles size={11} /> Mapping #{idx + 1} Target Scope:
                </div>
                <div>
                  <strong>{prog?.short_code || 'Program'}</strong> &rarr;{' '}
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {selectedBranchNames.length > 0 ? selectedBranchNames.join(', ') : '(No branch selected)'}
                  </span>{' '}
                  &bull; Year {grp.year}{' '}
                  &bull; {grp.semesters.length > 0 ? grp.semesters.map((s) => `Sem ${s}`).join(', ') : '(All sems)'}{' '}
                  &bull;{' '}
                  <span style={{ color: '#10b981' }}>
                    {selectedSubjectNames.length > 0 ? `${selectedSubjectNames.length} subject(s) (${selectedSubjectNames.slice(0, 3).join(', ')}${selectedSubjectNames.length > 3 ? '...' : ''})` : 'All subjects in scope'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AdminClient({ stats, recentUsers, recentAudit, recentBooks = [] }: AdminClientProps) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')

  // Academic data for selectors
  const [programs, setPrograms] = useState<ProgramItem[]>([])
  const [branches, setBranches] = useState<BranchItem[]>([])
  const [subjects, setSubjects] = useState<SubjectItem[]>([])

  // Notes Upload State
  const [noteProgramId, setNoteProgramId] = useState('')
  const [noteBranchId, setNoteBranchId] = useState('')
  const [noteSemester, setNoteSemester] = useState(1)
  const [noteSubjectId, setNoteSubjectId] = useState('')
  const [noteTitle, setNoteTitle] = useState('')
  const [noteDescription, setNoteDescription] = useState('')
  const [noteFile, setNoteFile] = useState<File | null>(null)
  const [noteUploading, setNoteUploading] = useState(false)
  const [noteProgress, setNoteProgress] = useState(0)
  const [noteMessage, setNoteMessage] = useState('')
  const [noteSuccessLink, setNoteSuccessLink] = useState('')

  // Ebook Upload State (Academic Mapping is 100% Optional)
  const [bookTitle, setBookTitle] = useState('')
  const [bookSubtitle, setBookSubtitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  const [bookPublisher, setBookPublisher] = useState('')
  const [bookEdition, setBookEdition] = useState('')
  const [bookYear, setBookYear] = useState(new Date().getFullYear())
  const [bookPages, setBookPages] = useState(250)
  const [bookType, setBookType] = useState('Textbook')
  const [bookDescription, setBookDescription] = useState('')
  const [bookPdfFile, setBookPdfFile] = useState<File | null>(null)
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [bookUploading, setBookUploading] = useState(false)
  const [bookProgress, setBookProgress] = useState(0)
  const [bookStatusText, setBookStatusText] = useState('')
  const [bookMessage, setBookMessage] = useState('')
  const [bookSuccessId, setBookSuccessId] = useState('')
  const [academicMappings, setAcademicMappings] = useState<AcademicMappingGroup[]>([])
  const bookAbortControllerRef = useRef<AbortController | null>(null)
  const activeUploadRef = useRef<{ uploadId: string; fileKey: string } | null>(null)

  // Cancel in-progress R2 multipart upload
  const handleCancelBookUpload = async () => {
    if (bookAbortControllerRef.current) {
      bookAbortControllerRef.current.abort()
    }
    if (activeUploadRef.current) {
      const { uploadId, fileKey } = activeUploadRef.current
      try {
        await fetch('/api/admin/ebooks/upload/abort', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId, fileKey }),
        })
      } catch (err) {
        console.warn('Failed to abort multipart upload:', err)
      }
      activeUploadRef.current = null
    }
    setBookUploading(false)
    setBookStatusText('Upload cancelled by user.')
    setBookMessage('eBook upload was cancelled.')
  }

  // Manage Content State
  const [uploadedNotes, setUploadedNotes] = useState<NoteItem[]>([])
  const [uploadedBooks, setUploadedBooks] = useState<BookItem[]>([])
  const [contentLoading, setContentLoading] = useState(false)

  // User Management State
  const [usersList, setUsersList] = useState<AdminUserItem[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersSearch, setUsersSearch] = useState('')
  const [usersBranchFilter, setUsersBranchFilter] = useState('all')
  const [usersRoleFilter, setUsersRoleFilter] = useState('all')
  const [usersStatusFilter, setUsersStatusFilter] = useState('all')
  const [usersPage, setUsersPage] = useState(1)
  const [usersTotalCount, setUsersTotalCount] = useState(0)
  const [usersTotalPages, setUsersTotalPages] = useState(1)
  const [selectedUserDetail, setSelectedUserDetail] = useState<AdminUserItem | null>(null)
  const [updatingUserStatus, setUpdatingUserStatus] = useState(false)

  // Fetch Users Function
  const fetchUsers = async (page = 1, searchQuery = usersSearch) => {
    setUsersLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '10',
        search: searchQuery.trim(),
        branchId: usersBranchFilter,
        role: usersRoleFilter,
        status: usersStatusFilter,
      })
      const res = await fetch(`/api/admin/users?${params.toString()}`)
      const data = await res.json()
      if (res.ok && data.users) {
        setUsersList(data.users)
        setUsersTotalCount(data.pagination.totalCount)
        setUsersTotalPages(data.pagination.totalPages)
        setUsersPage(data.pagination.page)
      }
    } catch (err) {
      console.error('Failed to load admin users:', err)
    } finally {
      setUsersLoading(false)
    }
  }

  // Trigger user fetch when tab is opened or filters change
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers(1, usersSearch)
    }
  }, [activeTab, usersBranchFilter, usersRoleFilter, usersStatusFilter])

  // Handle Search submit
  const handleUserSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUsers(1, usersSearch)
  }

  // Handle User Status toggle (Active <-> Blocked)
  const handleToggleUserStatus = async (user: AdminUserItem) => {
    const newStatus = user.status === 'active' ? 'blocked' : 'active'
    if (!confirm(`Are you sure you want to change status of ${user.full_name} to ${newStatus}?`)) return
    setUpdatingUserStatus(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, status: newStatus }),
      })
      const data = await res.json()
      if (res.ok) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
        )
        if (selectedUserDetail && selectedUserDetail.id === user.id) {
          setSelectedUserDetail({ ...selectedUserDetail, status: newStatus })
        }
      } else {
        alert(data.error || 'Failed to update user status.')
      }
    } catch (e) {
      alert('Error updating user status.')
    } finally {
      setUpdatingUserStatus(false)
    }
  }

  // Edit Existing eBook Mappings Modal State
  const [editingBook, setEditingBook] = useState<BookItem | null>(null)
  const [editingMappings, setEditingMappings] = useState<AcademicMappingGroup[]>([])
  const [editingSaving, setEditingSaving] = useState(false)
  const [editingMessage, setEditingMessage] = useState('')

  // Load programs, branches, subjects
  useEffect(() => {
    async function loadAcademicHierarchy() {
      const { data: progs } = await supabase.from('programs').select('*').order('name')
      const { data: brs } = await supabase.from('branches').select('*').order('name')
      const { data: subs } = await supabase.from('subjects').select('*').order('subject_code')

      if (progs) {
        setPrograms(progs as ProgramItem[])
        const btech = (progs as ProgramItem[]).find((p: ProgramItem) => p.short_code === 'B.Tech') || progs[0]
        if (btech) {
          setNoteProgramId(btech.id)
        }
      }
      if (brs) setBranches(brs)
      if (subs) setSubjects(subs)
    }
    loadAcademicHierarchy()
  }, [])

  // Sync branches when selected note program changes
  useEffect(() => {
    if (noteProgramId && branches.length > 0) {
      const match = branches.filter((b) => b.program_id === noteProgramId)
      if (match.length > 0 && !match.some((b) => b.id === noteBranchId)) {
        setNoteBranchId(match[0].id)
      }
    }
  }, [noteProgramId, branches])

  // Filter subjects for Note
  const availableNoteSubjects = subjects.filter(
    (s) => s.branch_id === noteBranchId && s.semester_number === Number(noteSemester)
  )

  useEffect(() => {
    if (availableNoteSubjects.length > 0) {
      setNoteSubjectId(availableNoteSubjects[0].id)
    } else {
      setNoteSubjectId('')
    }
  }, [noteBranchId, noteSemester, subjects])

  // Load uploaded notes and books when Manage tab is active
  const loadContent = async () => {
    setContentLoading(true)
    try {
      const [resNotes, resBooks] = await Promise.all([
        fetch('/api/admin/notes').then((r) => r.json()),
        fetch('/api/admin/ebooks').then((r) => r.json()),
      ])
      if (resNotes?.notes) setUploadedNotes(resNotes.notes)
      if (resBooks?.books) setUploadedBooks(resBooks.books)
    } catch (e) {
      console.error('Failed to load uploaded content:', e)
    } finally {
      setContentLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'manage_content') {
      loadContent()
    }
  }, [activeTab])

  // Cover image preview handler
  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, WebP) for the eBook cover.')
      return
    }
    setCoverImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCoverPreview(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Upload Note Handler (PDF up to 250MB)
  const handleUploadNote = async (e: React.FormEvent) => {
    e.preventDefault()
    setNoteMessage('')
    setNoteSuccessLink('')

    if (!noteFile) {
      setNoteMessage('Error: Please select a PDF file to upload.')
      return
    }
    if (noteFile.type !== 'application/pdf' && !noteFile.name.toLowerCase().endsWith('.pdf')) {
      setNoteMessage('Error: Only PDF documents are allowed.')
      return
    }
    if (noteFile.size > MAX_FILE_SIZE) {
      setNoteMessage(`Error: File size exceeds the maximum 50 MB limit (${(noteFile.size / (1024 * 1024)).toFixed(1)} MB). Please select a file under 50 MB.`)
      return
    }
    if (!noteSubjectId) {
      setNoteMessage('Error: Please select a valid subject for this note.')
      return
    }

    setNoteUploading(true)
    setNoteProgress(10)

    try {
      // 1. Get signed upload URL
      const signRes = await fetch('/api/admin/storage/signed-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket: 'notes',
          fileName: noteFile.name,
          contentType: 'application/pdf',
          fileSize: noteFile.size,
        }),
      })

      const signData = await signRes.json()
      if (!signRes.ok) throw new Error(signData.error || 'Failed to initialize upload')

      setNoteProgress(30)

      // 2. Direct upload to Supabase Storage via official SDK uploadToSignedUrl
      const supabase = createClient()
      const { error: uploadError } = await supabase.storage
        .from('notes')
        .uploadToSignedUrl(signData.path, signData.token, noteFile, {
          upsert: true,
        })

      if (uploadError) {
        throw new Error(`Upload to storage failed: ${uploadError.message}`)
      }

      setNoteProgress(75)

      // 3. Insert published note record in database
      const saveRes = await fetch('/api/admin/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle.trim(),
          description: noteDescription.trim() || null,
          subjectId: noteSubjectId,
          filePath: signData.path,
          fileSize: noteFile.size,
          fileType: 'application/pdf',
        }),
      })

      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save note record')

      setNoteProgress(100)
      setNoteMessage('✅ Notes uploaded and published successfully!')
      setNoteSuccessLink(`/api/storage/view-url?bucket=notes&path=${encodeURIComponent(signData.path)}`)

      // Reset form
      setNoteTitle('')
      setNoteDescription('')
      setNoteFile(null)
    } catch (err: unknown) {
      setNoteMessage(`Error: ${err instanceof Error ? err.message : 'Upload failed'}`)
    } finally {
      setNoteUploading(false)
    }
  }

  // Upload eBook Handler (Direct Browser -> Cloudflare R2 Multipart Upload, Supports 145 MB+ PDFs)
  const handleUploadEbook = async (e: React.FormEvent) => {
    e.preventDefault()
    setBookMessage('')
    setBookSuccessId('')

    if (!bookPdfFile) {
      setBookMessage('Error: Please select an eBook PDF file.')
      return
    }
    if (bookPdfFile.type !== 'application/pdf' && !bookPdfFile.name.toLowerCase().endsWith('.pdf')) {
      setBookMessage('Error: eBook must be a PDF document.')
      return
    }
    if (bookPdfFile.size === 0) {
      setBookMessage('Error: Selected eBook PDF is empty (0 bytes).')
      return
    }
    if (bookPdfFile.size > MAX_EBOOK_FILE_SIZE) {
      setBookMessage(
        `Error: eBook PDF exceeds ${(MAX_EBOOK_FILE_SIZE / (1024 * 1024)).toFixed(0)} MB limit (${(
          bookPdfFile.size /
          (1024 * 1024)
        ).toFixed(1)} MB).`
      )
      return
    }

    const abortController = new AbortController()
    bookAbortControllerRef.current = abortController

    setBookUploading(true)
    setBookProgress(3)
    setBookStatusText('Initializing eBook upload...')

    try {
      let coverImageUrl: string | null = null

      // 1. Upload Cover Thumbnail if provided (lightweight image stored in Supabase covers bucket)
      if (coverImageFile) {
        setBookStatusText('Uploading cover thumbnail...')
        try {
          const coverSignRes = await fetch('/api/admin/storage/signed-upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bucket: 'covers',
              fileName: coverImageFile.name,
              contentType: coverImageFile.type || 'image/jpeg',
              fileSize: coverImageFile.size,
            }),
            signal: abortController.signal,
          })
          const coverSignData = await coverSignRes.json()
          if (coverSignRes.ok) {
            const supabase = createClient()
            const { error: coverUploadError } = await supabase.storage
              .from('covers')
              .uploadToSignedUrl(coverSignData.path, coverSignData.token, coverImageFile, {
                upsert: true,
              })
            if (!coverUploadError) {
              coverImageUrl = coverSignData.publicUrl
            }
          }
        } catch (coverErr) {
          console.warn('Cover upload warning:', coverErr)
        }
      }

      setBookProgress(6)
      setBookStatusText('Initiating Cloudflare R2 multipart upload...')

      // 2. Initiate Cloudflare R2 Multipart Upload via server
      const initRes = await fetch('/api/admin/ebooks/upload/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bookTitle.trim(),
          author: bookAuthor.trim(),
          fileName: bookPdfFile.name,
          fileSize: bookPdfFile.size,
          contentType: 'application/pdf',
          description: bookDescription.trim() || undefined,
        }),
        signal: abortController.signal,
      })

      const initData = await initRes.json()
      if (!initRes.ok) {
        throw new Error(initData.error || 'Failed to initiate Cloudflare R2 multipart upload.')
      }

      const { uploadId, fileKey, partSize, totalParts } = initData
      activeUploadRef.current = { uploadId, fileKey }

      // 3. Batch sign upload parts (presigned URLs directly to R2)
      setBookProgress(10)
      setBookStatusText(`Signing ${totalParts} upload chunks...`)

      const partNumbers = Array.from({ length: totalParts }, (_, i) => i + 1)
      const signedPartsMap = new Map<number, string>()

      for (let i = 0; i < partNumbers.length; i += 40) {
        const batch = partNumbers.slice(i, i + 40)
        const signRes = await fetch('/api/admin/ebooks/upload/sign-part', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId,
            fileKey,
            partNumbers: batch,
          }),
          signal: abortController.signal,
        })
        const signData = await signRes.json()
        if (!signRes.ok || !signData.parts) {
          throw new Error(signData.error || 'Failed to generate signed URLs for eBook parts.')
        }
        for (const item of signData.parts) {
          signedPartsMap.set(item.partNumber, item.presignedUrl)
        }
      }

      // 4. Upload chunks directly from browser to Cloudflare R2 with concurrency = 2
      const completedParts: { PartNumber: number; ETag: string }[] = []
      let uploadedBytes = 0
      const totalBytes = bookPdfFile.size
      const concurrency = Math.min(2, totalParts)
      let nextIndex = 0

      const uploadWorker = async () => {
        while (nextIndex < totalParts) {
          if (abortController.signal.aborted) throw new Error('Upload cancelled')
          const currentIndex = nextIndex++
          const partNumber = currentIndex + 1
          const start = currentIndex * partSize
          const end = Math.min(start + partSize, totalBytes)
          const chunkBlob = bookPdfFile.slice(start, end)
          const chunkSize = end - start
          const presignedUrl = signedPartsMap.get(partNumber)

          if (!presignedUrl) {
            throw new Error(`Missing presigned URL for part ${partNumber}`)
          }

          setBookStatusText(
            `Uploading chunk ${partNumber} of ${totalParts} (${((uploadedBytes / totalBytes) * 100).toFixed(0)}%)...`
          )

          let etag: string | null = null
          let directSuccess = false

          // Attempt 1: Direct browser-to-R2 upload via presigned URL
          try {
            const chunkRes = await fetch(presignedUrl, {
              method: 'PUT',
              body: chunkBlob,
              signal: abortController.signal,
            })

            if (chunkRes.ok) {
              etag = chunkRes.headers.get('ETag') || chunkRes.headers.get('etag')
              if (etag) {
                directSuccess = true
              }
            }
          } catch (netErr: any) {
            if (abortController.signal.aborted) throw new Error('Upload cancelled')
            console.warn(`Direct R2 upload for chunk ${partNumber} failed (likely CORS preflight). Using server-side chunk stream fallback:`, netErr)
          }

          // Attempt 2: Resilient fallback via server chunk proxy if R2 CORS is not configured
          if (!directSuccess || !etag) {
            setBookStatusText(
              `Streaming chunk ${partNumber} of ${totalParts} to R2 (${((uploadedBytes / totalBytes) * 100).toFixed(0)}%)...`
            )
            const fallbackUrl = `/api/admin/ebooks/upload/chunk?uploadId=${encodeURIComponent(uploadId)}&fileKey=${encodeURIComponent(fileKey)}&partNumber=${partNumber}`

            const fallbackRes = await fetch(fallbackUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
              },
              body: chunkBlob,
              signal: abortController.signal,
            })

            const fallbackData = await fallbackRes.json()
            if (!fallbackRes.ok || !fallbackData.etag) {
              throw new Error(
                fallbackData.error ||
                `Failed to upload chunk ${partNumber} to Cloudflare R2 (HTTP ${fallbackRes.status})`
              )
            }
            etag = fallbackData.etag
          }

          if (!etag) {
            throw new Error(`Cloudflare R2 ETag missing for chunk ${partNumber}`)
          }

          completedParts.push({ PartNumber: partNumber, ETag: etag })
          uploadedBytes += chunkSize
          const progressPercent = Math.min(90, Math.round((uploadedBytes / totalBytes) * 80) + 10)
          setBookProgress(progressPercent)
        }
      }

      const workers = Array.from({ length: concurrency }, () => uploadWorker())
      await Promise.all(workers)

      setBookProgress(93)
      setBookStatusText('Finalizing multipart upload in Cloudflare R2...')

      // 5. Complete multipart upload in R2 and save metadata in Supabase
      const compRes = await fetch('/api/admin/ebooks/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          fileKey,
          parts: completedParts,
          title: bookTitle.trim(),
          subtitle: bookSubtitle.trim() || null,
          author: bookAuthor.trim(),
          publisher: bookPublisher.trim() || 'HBTU Digital Press',
          edition: bookEdition.trim() || null,
          publicationYear: Number(bookYear),
          totalPages: Number(bookPages),
          description: bookDescription.trim() || null,
          coverImageUrl,
          fileName: bookPdfFile.name,
          fileSize: bookPdfFile.size,
          mappings: academicMappings.map((g) => ({
            programId: g.programId || null,
            branchIds: g.branchIds || [],
            year: g.year ? Number(g.year) : null,
            semesters: g.semesters || [],
            subjectIds: g.subjectIds || [],
            category: g.category || 'Textbook',
          })),
        }),
        signal: abortController.signal,
      })

      const compData = await compRes.json()
      if (!compRes.ok) {
        throw new Error(compData.error || 'Failed to complete eBook upload in R2 / Supabase.')
      }

      activeUploadRef.current = null
      setBookProgress(100)
      setBookStatusText('Upload completed!')
      const mappingSummary =
        academicMappings.length > 0
          ? `with ${academicMappings.length} academic mapping combination(s)`
          : 'as a General Library resource'
      setBookMessage(`✅ eBook uploaded directly to Cloudflare R2 and published successfully ${mappingSummary}!`)
      setBookSuccessId(compData.ebook?.id || compData.libraryBook?.id || '')

      // Reset form
      setBookTitle('')
      setBookSubtitle('')
      setBookAuthor('')
      setBookPublisher('')
      setBookEdition('')
      setBookDescription('')
      setBookPdfFile(null)
      setCoverImageFile(null)
      setCoverPreview(null)
      setAcademicMappings([])
      loadContent()
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        setBookMessage('eBook upload was cancelled.')
      } else {
        setBookMessage(`Error: ${err instanceof Error ? err.message : 'eBook upload failed'}`)
      }
    } finally {
      setBookUploading(false)
      bookAbortControllerRef.current = null
    }
  }

  // Update existing eBook academic mappings in modal
  const handleSaveEditedMappings = async () => {
    if (!editingBook) return
    setEditingSaving(true)
    setEditingMessage('')

    try {
      const res = await fetch('/api/admin/ebooks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBook.id,
          title: editingBook.title,
          author: editingBook.author,
          mappings: editingMappings.map((g) => ({
            programId: g.programId || null,
            branchIds: g.branchIds || [],
            year: g.year ? Number(g.year) : null,
            semesters: g.semesters || [],
            subjectIds: g.subjectIds || [],
            category: g.category || 'Textbook',
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update academic mappings')

      await loadContent()
      setEditingMessage('✅ Academic mappings updated successfully!')
      setTimeout(() => {
        setEditingBook(null)
        setEditingMessage('')
      }, 1000)
    } catch (err: unknown) {
      setEditingMessage(`Error: ${err instanceof Error ? err.message : 'Failed to update mappings'}`)
    } finally {
      setEditingSaving(false)
    }
  }

  // Delete note
  const handleDeleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note and its PDF file?')) return
    try {
      const res = await fetch(`/api/admin/notes?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setUploadedNotes((prev) => prev.filter((n) => n.id !== id))
      }
    } catch (e) {
      console.error('Failed to delete note:', e)
    }
  }

  // Delete ebook
  const handleDeleteBook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this eBook and its files?')) return
    try {
      const res = await fetch(`/api/admin/ebooks?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setUploadedBooks((prev) => prev.filter((b) => b.id !== id))
      }
    } catch (e) {
      console.error('Failed to delete ebook:', e)
    }
  }

  // View PDF link
  const openFileUrl = async (bucket: string, path: string) => {
    try {
      const res = await fetch(`/api/storage/view-url?bucket=${bucket}&path=${encodeURIComponent(path)}`)
      const data = await res.json()
      if (data.url) {
        window.open(data.url, '_blank')
      } else {
        alert('Unable to generate document viewing URL.')
      }
    } catch (e) {
      alert('Error fetching file URL.')
    }
  }

  return (
    <div>
      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        borderBottom: '1px solid var(--border-light)',
        paddingBottom: '0.75rem',
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`btn ${activeTab === 'overview' ? 'maroon-texture' : 'btn-secondary'}`}
          style={{
            fontSize: '0.8125rem',
            padding: '0.5rem 1rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Activity size={15} /> Overview & Analytics
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`btn ${activeTab === 'users' ? 'maroon-texture' : 'btn-secondary'}`}
          style={{
            fontSize: '0.8125rem',
            padding: '0.5rem 1rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Users size={15} /> Users ({usersTotalCount || stats.find((s) => s.key === 'users')?.value || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upload_notes')}
          className={`btn ${activeTab === 'upload_notes' ? 'maroon-texture' : 'btn-secondary'}`}
          style={{
            fontSize: '0.8125rem',
            padding: '0.5rem 1rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <FileText size={15} /> Upload Notes (PDF · 50MB)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upload_ebook')}
          className={`btn ${activeTab === 'upload_ebook' ? 'maroon-texture' : 'btn-secondary'}`}
          style={{
            fontSize: '0.8125rem',
            padding: '0.5rem 1rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <BookOpen size={15} color="#10b981" /> Upload eBook (Cloudflare R2 · 145MB+)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('manage_content')}
          className={`btn ${activeTab === 'manage_content' ? 'maroon-texture' : 'btn-secondary'}`}
          style={{
            fontSize: '0.8125rem',
            padding: '0.5rem 1rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Layers size={15} /> Manage Content
        </button>
      </div>

      {/* ──────────────── TAB 1: OVERVIEW ──────────────── */}
      {activeTab === 'overview' && (
        <>
          {/* Stats grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}>
            {stats.map((s) => {
              const Icon = STAT_ICONS[s.key] || Activity
              return (
                <div key={s.label} className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                  <Icon size={22} color={s.color} style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Recent Users */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={18} color="#4f46e5" /> Recent Users
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-accent, #6366f1)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  View All Directory →
                </button>
              </div>
              {recentUsers && recentUsers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {recentUsers.map((u: ProfileRow) => (
                    <div key={u.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.625rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-light)',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{u.full_name}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                          {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <span className={`badge ${u.role === 'admin' ? 'badge-indigo' : 'badge-green'}`} style={{ fontSize: '0.5625rem' }}>
                          {u.role}
                        </span>
                        <span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-maroon'}`} style={{ fontSize: '0.5625rem' }}>
                          {u.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem 0' }}>
                  No users registered yet.
                </p>
              )}
            </div>

            {/* Audit Log */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={18} color="#e11d48" /> Audit Log
              </h2>
              {recentAudit && recentAudit.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {recentAudit.map((log: AuditRow) => (
                    <div key={log.id} style={{
                      padding: '0.625rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-light)',
                    }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{log.action}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'flex', gap: '0.5rem', marginTop: 2 }}>
                        <span>{log.target_type}</span>
                        <span>·</span>
                        <span>{new Date(log.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem 0' }}>
                  No audit entries yet. Actions will appear here.
                </p>
              )}
            </div>

            {/* Recent eBooks */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={18} color="#e11d48" /> Recent eBooks ({recentBooks.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('manage_content')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-accent, #6366f1)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Manage All →
                </button>
              </div>
              {recentBooks && recentBooks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {recentBooks.map((b) => (
                    <div
                      key={b.id}
                      style={{
                        padding: '0.625rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ overflow: 'hidden', paddingRight: '0.5rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {b.title}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                          {b.author}
                        </div>
                      </div>
                      <span className="badge badge-green" style={{ fontSize: '0.5625rem', flexShrink: 0 }}>
                        {b.ebook_status || 'available'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem 0' }}>
                  No eBooks uploaded yet.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ──────────────── TAB: USER DIRECTORY & MANAGEMENT ──────────────── */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top Header Card */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={20} color="#4f46e5" /> User Directory & Account Governance
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Browse registered students and staff, verify branch affiliations, search by mobile/email, and inspect account status.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-indigo" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                  Total: {usersTotalCount} Registered
                </span>
                <button
                  type="button"
                  onClick={() => fetchUsers(usersPage, usersSearch)}
                  className="btn btn-secondary"
                  disabled={usersLoading}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)' }}
                >
                  {usersLoading ? <Loader2 size={13} className="animate-spin" /> : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Search & Filter Toolbar */}
            <form onSubmit={handleUserSearchSubmit} style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Search User</label>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                      className="form-input"
                      style={{ paddingLeft: 30, fontSize: '0.8125rem' }}
                      placeholder="Name, email, mobile number..."
                      value={usersSearch}
                      onChange={(e) => setUsersSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Branch</label>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.8125rem' }}
                    value={usersBranchFilter}
                    onChange={(e) => setUsersBranchFilter(e.target.value)}
                  >
                    <option value="all">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Role</label>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.8125rem' }}
                    value={usersRoleFilter}
                    onChange={(e) => setUsersRoleFilter(e.target.value)}
                  >
                    <option value="all">All Roles</option>
                    <option value="student">Student</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Status</label>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.8125rem' }}
                    value={usersStatusFilter}
                    onChange={(e) => setUsersStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8125rem' }}>
                    <Search size={14} /> Filter
                  </button>
                  {(usersSearch || usersBranchFilter !== 'all' || usersRoleFilter !== 'all' || usersStatusFilter !== 'all') && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem' }}
                      onClick={() => {
                        setUsersSearch('')
                        setUsersBranchFilter('all')
                        setUsersRoleFilter('all')
                        setUsersStatusFilter('all')
                        fetchUsers(1, '')
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* User Table Card */}
          <div className="glass-card" style={{ padding: '1.25rem', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>User / Identity</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Branch & Academic</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Contact Number</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Role</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Registered</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-tertiary)' }}>
                        <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                        <div>Loading registered users...</div>
                      </td>
                    </tr>
                  ) : usersList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-tertiary)' }}>
                        <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                        <div style={{ fontWeight: 600 }}>No users found</div>
                        <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Try clearing search keywords or changing filters.</div>
                      </td>
                    </tr>
                  ) : (
                    usersList.map((user) => (
                      <tr
                        key={user.id}
                        style={{
                          borderBottom: '1px solid var(--border-light)',
                          transition: 'background 150ms ease',
                        }}
                      >
                        {/* User Identity */}
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                background: user.role === 'admin' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: user.role === 'admin' ? '#6366f1' : '#10b981',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.8125rem',
                                flexShrink: 0,
                              }}
                            >
                              {user.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.full_name}</div>
                              <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 1 }}>
                                {user.email || 'No email attached'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Branch & Program */}
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ fontWeight: 600 }}>{user.branch_name || 'General Student'}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 1 }}>
                            {user.program_name ? `${user.program_name} · ` : ''}Year {user.current_year}, Sem {user.current_semester}
                          </div>
                        </td>

                        {/* Mobile Number */}
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          {user.mobile_number ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, color: 'var(--text-primary)' }}>
                              <Phone size={12} color="#10b981" /> {user.mobile_number}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                              Legacy (Not set)
                            </span>
                          )}
                        </td>

                        {/* Role Badge */}
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span
                            className={`badge ${user.role === 'admin' ? 'badge-indigo' : 'badge-green'}`}
                            style={{ fontSize: '0.625rem', textTransform: 'capitalize' }}
                          >
                            {user.role}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span
                            className={`badge ${user.status === 'active' ? 'badge-green' : 'badge-maroon'}`}
                            style={{ fontSize: '0.625rem', textTransform: 'capitalize' }}
                          >
                            {user.status}
                          </span>
                        </td>

                        {/* Registration Date */}
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {new Date(user.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedUserDetail(user)}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.3rem 0.65rem',
                              fontSize: '0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Eye size={13} /> View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {!usersLoading && usersTotalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1.25rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-light)',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <div>
                  Showing {usersList.length > 0 ? (usersPage - 1) * 10 + 1 : 0} to{' '}
                  {Math.min(usersPage * 10, usersTotalCount)} of {usersTotalCount} users
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    disabled={usersPage <= 1}
                    onClick={() => fetchUsers(usersPage - 1, usersSearch)}
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <span style={{ fontWeight: 600 }}>
                    Page {usersPage} of {usersTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={usersPage >= usersTotalPages}
                    onClick={() => fetchUsers(usersPage + 1, usersSearch)}
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────── USER DETAIL MODAL ──────────────── */}
      {selectedUserDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setSelectedUserDetail(null)}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: 580,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              background: 'var(--bg-primary, #0f172a)',
              border: '1px solid var(--border-medium)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              borderRadius: 'var(--radius-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: selectedUserDetail.role === 'admin' ? 'rgba(79, 70, 229, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: selectedUserDetail.role === 'admin' ? '#6366f1' : '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.125rem',
                  }}
                >
                  {selectedUserDetail.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selectedUserDetail.full_name}
                  </h3>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                    <span
                      className={`badge ${selectedUserDetail.role === 'admin' ? 'badge-indigo' : 'badge-green'}`}
                      style={{ fontSize: '0.625rem' }}
                    >
                      {selectedUserDetail.role}
                    </span>
                    <span
                      className={`badge ${selectedUserDetail.status === 'active' ? 'badge-green' : 'badge-maroon'}`}
                      style={{ fontSize: '0.625rem' }}
                    >
                      {selectedUserDetail.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Fields Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>EMAIL ADDRESS</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: 3, wordBreak: 'break-all' }}>
                  {selectedUserDetail.email || 'Not available'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>MOBILE NUMBER (MANDATORY)</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: 3 }}>
                  {selectedUserDetail.mobile_number ? (
                    <a
                      href={`tel:${selectedUserDetail.mobile_number}`}
                      style={{ color: '#10b981', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <Phone size={13} /> {selectedUserDetail.mobile_number}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Not registered (Legacy account)</span>
                  )}
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>BRANCH</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: 3 }}>
                  {selectedUserDetail.branch_name || 'General Student'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>PROGRAM & ACADEMIC YEAR</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: 3 }}>
                  {selectedUserDetail.program_name || 'B.Tech'} · Year {selectedUserDetail.current_year}, Sem {selectedUserDetail.current_semester}
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>ACCOUNT REGISTRATION</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: 3 }}>
                  {new Date(selectedUserDetail.created_at).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>LAST SIGN-IN / ACTIVE</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: 3 }}>
                  {selectedUserDetail.last_sign_in_at
                    ? new Date(selectedUserDetail.last_sign_in_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    : 'No session timestamp recorded'}
                </div>
              </div>
            </div>

            {/* User ID Field with Copy */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>USER UUID</div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {selectedUserDetail.id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(selectedUserDetail.id)
                  alert('User UUID copied to clipboard.')
                }}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Copy size={12} /> Copy
              </button>
            </div>

            {/* Account Status Governance Controls */}
            <div
              style={{
                padding: '0.875rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                background: 'rgba(255,255,255,0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Account Status: {selectedUserDetail.status}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {selectedUserDetail.status === 'active'
                    ? 'User has normal platform access to study hub resources.'
                    : 'User is blocked from accessing protected resources.'}
                </div>
              </div>
              <button
                type="button"
                disabled={updatingUserStatus}
                onClick={() => handleToggleUserStatus(selectedUserDetail)}
                className={`btn ${selectedUserDetail.status === 'active' ? 'btn-danger' : 'btn-primary'}`}
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
              >
                {updatingUserStatus ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : selectedUserDetail.status === 'active' ? (
                  'Block User'
                ) : (
                  'Unblock User'
                )}
              </button>
            </div>

            {/* Privacy & Security Guarantee */}
            <div
              style={{
                fontSize: '0.6875rem',
                color: 'var(--text-tertiary)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.5rem 0',
                borderTop: '1px solid var(--border-light)',
              }}
            >
              <Shield size={14} color="#10b981" />
              <span>
                Passwords, hash tokens, and session secrets are encrypted at rest and never exposed.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 2: UPLOAD NOTES (PDF · 250MB) ──────────────── */}
      {activeTab === 'upload_notes' && (
        <div className="glass-card" style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={20} color="#10b981" /> Upload Verified Notes
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Upload canonical lecture and study notes in PDF format. Files are automatically approved and published.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="badge badge-green" style={{ fontSize: '0.6875rem' }}>📄 PDF Only</span>
              <span className="badge badge-indigo" style={{ fontSize: '0.6875rem' }}>⚡ Up to 50 MB</span>
            </div>
          </div>

          {noteMessage && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: noteMessage.includes('Error') ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
              color: noteMessage.includes('Error') ? 'var(--color-danger)' : 'var(--color-success)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {noteMessage.includes('Error') ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                {noteMessage}
              </div>
              {noteSuccessLink && (
                <a
                  href={noteSuccessLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: 'currentColor',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ExternalLink size={13} /> View PDF
                </a>
              )}
            </div>
          )}

          <form onSubmit={handleUploadNote}>
            {/* Cascading Subject Hierarchy */}
            <div style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(79, 70, 229, 0.05)',
              border: '1px solid rgba(79, 70, 229, 0.15)',
              marginBottom: '1.25rem',
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', marginBottom: '0.75rem' }}>
                Course & Subject Classification
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Degree Program</label>
                  <select
                    className="form-select"
                    value={noteProgramId}
                    onChange={(e) => setNoteProgramId(e.target.value)}
                    style={{ fontSize: '0.8125rem' }}
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>{p.short_code} — {p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Branch</label>
                  <select
                    className="form-select"
                    value={noteBranchId}
                    onChange={(e) => setNoteBranchId(e.target.value)}
                    style={{ fontSize: '0.8125rem' }}
                  >
                    {branches
                      .filter((b) => b.program_id === noteProgramId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>[{b.code}] {b.name}</option>
                      ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Semester</label>
                  <select
                    className="form-select"
                    value={noteSemester}
                    onChange={(e) => setNoteSemester(Number(e.target.value))}
                    style={{ fontSize: '0.8125rem' }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Subject</label>
                  <select
                    className="form-select"
                    value={noteSubjectId}
                    onChange={(e) => setNoteSubjectId(e.target.value)}
                    style={{ fontSize: '0.8125rem' }}
                    required
                  >
                    {availableNoteSubjects.length > 0 ? (
                      availableNoteSubjects.map((s) => (
                        <option key={s.id} value={s.id}>[{s.subject_code}] {s.subject_name}</option>
                      ))
                    ) : (
                      <option value="">No subjects found for this semester</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Note Title & Description */}
            <div className="form-group">
              <label className="form-label">Note Title</label>
              <input
                className="form-input"
                placeholder="e.g., Unit 1 & 2 Complete Handwriting Lecture Notes"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description / Topics Covered</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Brief summary of concepts, formulas, and diagrams included..."
                value={noteDescription}
                onChange={(e) => setNoteDescription(e.target.value)}
              />
            </div>

            {/* File Upload Zone */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Upload PDF Document</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Max 50 MB</span>
              </label>
              <div
                style={{
                  border: '2px dashed var(--border-medium)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  background: noteFile ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 200ms ease',
                }}
                onClick={() => document.getElementById('noteFileInput')?.click()}
              >
                <input
                  id="noteFileInput"
                  type="file"
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setNoteFile(f)
                  }}
                />
                <Upload size={32} color={noteFile ? '#10b981' : 'var(--text-tertiary)'} style={{ margin: '0 auto 8px' }} />
                {noteFile ? (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#10b981' }}>{noteFile.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                      {(noteFile.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>
                      Click to choose or drag & drop Note PDF
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Supports high-resolution scans and typed notes up to 50 MB
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Progress Bar */}
            {noteUploading && (
              <div style={{ margin: '1.25rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                  <span>Uploading to Storage...</span>
                  <span style={{ fontWeight: 700 }}>{noteProgress}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${noteProgress}%`,
                      background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                      transition: 'width 200ms ease',
                    }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={noteUploading || !noteFile}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                marginTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {noteUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Uploading ({noteProgress}%)...
                </>
              ) : (
                <>
                  <Upload size={16} /> Publish Notes (Max 50MB)
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ──────────────── TAB 3: UPLOAD EBOOK (PDF + THUMBNAIL · 250MB) ──────────────── */}
      {activeTab === 'upload_ebook' && (
        <div className="glass-card" style={{ padding: '2rem', maxWidth: 840, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Library size={20} color="#f59e0b" /> Upload eBook to Digital Library
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Add standard textbooks, handbooks, and reference manuals with cover thumbnails and full PDF attachments.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="badge badge-yellow" style={{ fontSize: '0.6875rem' }}>🖼 Thumbnail + PDF</span>
              <span className="badge badge-indigo" style={{ fontSize: '0.6875rem' }}>⚡ Up to 50 MB</span>
            </div>
          </div>

          {bookMessage && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: bookMessage.includes('Error') ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
              color: bookMessage.includes('Error') ? 'var(--color-danger)' : 'var(--color-success)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {bookMessage.includes('Error') ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                {bookMessage}
              </div>
              {bookSuccessId && (
                <a
                  href="/library"
                  style={{
                    color: 'currentColor',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ExternalLink size={13} /> Open Library
                </a>
              )}
            </div>
          )}

          <form onSubmit={handleUploadEbook}>
            {/* Academic Mapping & Category (100% Optional) */}
            <AcademicMappingEditor
              mappings={academicMappings}
              setMappings={setAcademicMappings}
              programs={programs}
              branches={branches}
              subjects={subjects}
            />

            {/* Book Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Book Title</label>
                <input
                  className="form-input"
                  placeholder="e.g., Higher Engineering Mathematics"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subtitle (Optional)</label>
                <input
                  className="form-input"
                  placeholder="e.g., Theory, Solved Problems & Applications"
                  value={bookSubtitle}
                  onChange={(e) => setBookSubtitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Author(s)</label>
                <input
                  className="form-input"
                  placeholder="e.g., Dr. B.S. Grewal"
                  value={bookAuthor}
                  onChange={(e) => setBookAuthor(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Publisher / Press</label>
                <input
                  className="form-input"
                  placeholder="e.g., Khanna Publishers"
                  value={bookPublisher}
                  onChange={(e) => setBookPublisher(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Edition</label>
                <input
                  className="form-input"
                  placeholder="e.g., 44th Edition"
                  value={bookEdition}
                  onChange={(e) => setBookEdition(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <input
                    type="number"
                    className="form-input"
                    value={bookYear}
                    onChange={(e) => setBookYear(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Est. Pages</label>
                  <input
                    type="number"
                    className="form-input"
                    value={bookPages}
                    onChange={(e) => setBookPages(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description / Summary</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Overview of topics and relevance to HBTU curriculum..."
                value={bookDescription}
                onChange={(e) => setBookDescription(e.target.value)}
              />
            </div>

            {/* Dual Upload Section: Cover Thumbnail & eBook PDF */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.25rem', margin: '1.25rem 0' }}>
              {/* Cover Thumbnail Upload */}
              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ImageIcon size={14} color="#f59e0b" /> Cover Thumbnail
                </label>
                <div
                  style={{
                    border: '2px dashed var(--border-medium)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1rem',
                    textAlign: 'center',
                    background: coverPreview ? 'transparent' : 'var(--bg-secondary)',
                    minHeight: 180,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => document.getElementById('coverInput')?.click()}
                >
                  <input
                    id="coverInput"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleCoverSelect}
                  />
                  {coverPreview ? (
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      <img
                        src={coverPreview}
                        alt="Cover Preview"
                        style={{
                          width: 100,
                          height: 140,
                          objectFit: 'cover',
                          borderRadius: 'var(--radius-sm)',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                          margin: '0 auto 6px',
                        }}
                      />
                      <div style={{ fontSize: '0.6875rem', color: '#10b981', fontWeight: 600 }}>Click to change thumbnail</div>
                    </div>
                  ) : (
                    <div>
                      <ImageIcon size={30} color="var(--text-tertiary)" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Select Thumbnail</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 2 }}>JPG, PNG or WebP</div>
                    </div>
                  )}
                </div>
              </div>

              {/* eBook PDF Upload */}
              <div>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <BookOpen size={14} color="#10b981" /> eBook PDF File (Cloudflare R2 Direct)
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: '#10b981', fontWeight: 600 }}>Supports 145 MB+ (Max 500 MB)</span>
                </label>
                <div
                  style={{
                    border: '2px dashed var(--border-medium)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem',
                    textAlign: 'center',
                    background: bookPdfFile ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-secondary)',
                    minHeight: 180,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => document.getElementById('bookPdfInput')?.click()}
                >
                  <input
                    id="bookPdfInput"
                    type="file"
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) setBookPdfFile(f)
                    }}
                  />
                  <Upload size={32} color={bookPdfFile ? '#10b981' : 'var(--text-tertiary)'} style={{ margin: '0 auto 8px' }} />
                  {bookPdfFile ? (
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#10b981' }}>{bookPdfFile.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                        {(bookPdfFile.size / (1024 * 1024)).toFixed(2)} MB · Attached for Direct R2 Multipart Upload
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>Choose eBook PDF file</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        Complete textbook or monograph (Target: 145 MB+ supported)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Upload Progress Bar and Cancellation */}
            {bookUploading && (
              <div
                style={{
                  margin: '1.25rem 0',
                  padding: '1rem',
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {bookStatusText || 'Uploading directly to Cloudflare R2...'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, color: '#10b981' }}>{bookProgress}%</span>
                    <button
                      type="button"
                      onClick={handleCancelBookUpload}
                      style={{
                        background: 'transparent',
                        border: '1px solid #ef4444',
                        color: '#ef4444',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '0.6875rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <XCircle size={12} /> Cancel Upload
                    </button>
                  </div>
                </div>
                <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${bookProgress}%`,
                      background: 'linear-gradient(90deg, #f59e0b, #10b981)',
                      transition: 'width 250ms ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 6 }}>
                  Direct browser-to-R2 upload in progress. Please don't close this page.
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={bookUploading || !bookPdfFile}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                marginTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {bookUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Uploading to R2 ({bookProgress}%)...
                </>
              ) : (
                <>
                  <Upload size={16} /> Publish eBook via Cloudflare R2 (145 MB+ Direct Upload)
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ──────────────── TAB 4: MANAGE CONTENT ──────────────── */}
      {activeTab === 'manage_content' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Notes Management */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={18} color="#10b981" /> Published Study Notes ({uploadedNotes.length})
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('upload_notes')}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
              >
                + Upload New Note
              </button>
            </div>

            {contentLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 size={24} className="animate-spin" /></div>
            ) : uploadedNotes.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-tertiary)' }}>Title</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-tertiary)' }}>Subject</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--text-tertiary)' }}>Size</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--text-tertiary)' }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--text-tertiary)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedNotes.map((note) => (
                      <tr key={note.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{note.title}</td>
                        <td style={{ padding: '0.6rem 0.5rem' }}>
                          <span className="badge badge-maroon" style={{ fontSize: '0.625rem' }}>
                            {note.subjects?.subject_code}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                          {(note.file_size / (1024 * 1024)).toFixed(1)} MB
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                          <span className="badge badge-green" style={{ fontSize: '0.5625rem' }}>{note.status}</span>
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => openFileUrl('notes', note.file_path)}
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.6875rem' }}
                            >
                              <ExternalLink size={12} /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(note.id)}
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.6875rem', color: '#e11d48' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem 0' }}>No notes uploaded yet.</p>
            )}
          </div>

          {/* eBooks Management */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Library size={18} color="#f59e0b" /> Digital Library eBooks ({uploadedBooks.length})
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('upload_ebook')}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
              >
                + Upload New eBook
              </button>
            </div>

            {uploadedBooks.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
              }}>
                {uploadedBooks.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-light)',
                      display: 'flex',
                      gap: '0.75rem',
                    }}
                  >
                    {b.cover_image_url ? (
                      <img
                        src={b.cover_image_url}
                        alt={b.title}
                        style={{
                          width: 50,
                          height: 70,
                          objectFit: 'cover',
                          borderRadius: 'var(--radius-sm)',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 50,
                        height: 70,
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(245, 158, 11, 0.1)',
                        color: '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <BookOpen size={20} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8125rem', lineHeight: 1.3, marginBottom: 2 }}>{b.title}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>by {b.author}</div>

                      {/* Academic Mapping Badges or General Library Badge */}
                      {(() => {
                        const mappings = b.academic_mappings || []
                        const isGeneral = mappings.length === 0
                        const branchCodes = Array.from(new Set(mappings.map((m) => m.branches?.code).filter(Boolean)))
                        const semesters = Array.from(new Set(mappings.map((m) => m.semester_number).filter(Boolean))).sort((a, b) => (a as number) - (b as number))

                        if (isGeneral) {
                          return (
                            <span className="badge badge-neutral" style={{ fontSize: '0.5625rem', width: 'fit-content', marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <Globe size={9} /> General Library
                            </span>
                          )
                        }
                        return (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                            {branchCodes.length > 0 && (
                              <span className="badge badge-maroon" style={{ fontSize: '0.5625rem' }}>
                                {branchCodes.join(', ')}
                              </span>
                            )}
                            {semesters.length > 0 && (
                              <span className="badge badge-yellow" style={{ fontSize: '0.5625rem' }}>
                                {semesters.map((s) => `Sem ${s}`).join(', ')}
                              </span>
                            )}
                          </div>
                        )
                      })()}

                      <div style={{ marginTop: 'auto', display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBook(b)
                            setEditingMappings(groupDbMappingsToUi(b.academic_mappings, programs[0]?.id))
                            setEditingMessage('')
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title="Edit academic mapping combinations"
                        >
                          <SlidersHorizontal size={11} /> Mappings
                        </button>
                        {b.ebook_file_path && (
                          <button
                            type="button"
                            onClick={() => openFileUrl('ebooks', b.ebook_file_path!)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem' }}
                          >
                            <ExternalLink size={12} /> Read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteBook(b.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem', color: '#e11d48' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem 0' }}>No eBooks in library yet.</p>
            )}
          </div>

          {/* ──────────────── EDIT EBOOK ACADEMIC MAPPINGS MODAL ──────────────── */}
          {editingBook && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(6px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
              }}
              onClick={() => setEditingBook(null)}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '860px',
                  maxHeight: '90vh',
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
                {/* Modal Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem 1.5rem',
                  borderBottom: '1px solid var(--border-light)',
                  background: 'rgba(255, 255, 255, 0.02)',
                }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <SlidersHorizontal size={18} color="#f59e0b" /> Edit Academic Mappings
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      {editingBook.title} &bull; by {editingBook.author}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingBook(null)}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                  {editingMessage && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      background: editingMessage.includes('Error') ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
                      color: editingMessage.includes('Error') ? 'var(--color-danger)' : 'var(--color-success)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      marginBottom: '1rem',
                    }}>
                      {editingMessage}
                    </div>
                  )}

                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Configure the academic scopes where this eBook will be accessible. Removing all mappings converts this eBook into a <strong>General Library eBook</strong> without deleting the file.
                  </p>

                  <AcademicMappingEditor
                    mappings={editingMappings}
                    setMappings={setEditingMappings}
                    programs={programs}
                    branches={branches}
                    subjects={subjects}
                  />
                </div>

                {/* Modal Footer */}
                <div style={{
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.02)',
                }}>
                  <button
                    type="button"
                    onClick={() => setEditingMappings([])}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', color: '#e11d48' }}
                  >
                    Clear All Mappings
                  </button>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setEditingBook(null)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditedMappings}
                      disabled={editingSaving}
                      className="btn btn-primary"
                      style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {editingSaving ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> Saving...
                        </>
                      ) : (
                        'Save Academic Mappings'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
