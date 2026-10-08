'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Calendar as CalendarIcon,
  BarChart3,
  CheckSquare,
  ArrowLeft,
  BookOpen,
  Download,
  MoreVertical,
  Plus,
  Check,
  X,
  Minus,
  Trash2,
  Edit3,
  AlertTriangle,
  TrendingUp,
  Target,
  Clock,
  Sparkles,
  RefreshCw,
  FileText,
  ChevronLeft,
  ChevronRight,
  Info,
  Sliders,
  HelpCircle,
  Undo2,
  Folder,
  FolderOpen,
  Search,
  Filter,
} from 'lucide-react'
import {
  computeAttendanceMetrics,
  aggregateMonthlyAttendance,
  formatMonthYearLabel,
  normalizeAttendanceDate,
  type RawAttendanceRecord,
  type SubjectAttendanceSummary,
  type OverallAttendanceSummary,
  type MonthlyAttendanceSummary,
  type AttendanceRecordStatus,
} from '@/lib/attendance/calculations'

interface SummaryResponse {
  summary: OverallAttendanceSummary
  subjects: SubjectAttendanceSummary[]
  monthly: MonthlyAttendanceSummary[]
  recentRecords: RawAttendanceRecord[]
  target: number
  academicContext: {
    semester: number | null
    year: number | null
    branchId: string | null
    programId: string | null
    branchName?: string | null
    programName?: string | null
  }
}

interface UndoAction {
  type: 'create' | 'update' | 'delete'
  recordId: string
  subjectId: string
  date: string
  periodNumber: number
  previousStatus?: AttendanceRecordStatus
  newStatus?: AttendanceRecordStatus
  deletedRecord?: RawAttendanceRecord
  timestamp: number
}

function triggerHaptic(duration = 15) {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(duration)
    } catch {
      // Haptics not allowed or supported
    }
  }
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '—'
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const day = parseInt(parts[2], 10)
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    const mName = months[month - 1] || ''
    return `${day} ${mName} ${year}`
  }
  return dateStr
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '—'
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const month = parseInt(parts[1], 10)
    const day = parseInt(parts[2], 10)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${day} ${months[month - 1]}`
  }
  return dateStr
}

// Gesture Controller Component for Individual Calendar Cells (Stable Top-Level Component)
const CalendarDayCell = React.memo(function CalendarDayCell({
  day,
  activeSubjectId,
  records,
  isSelected,
  onSingleTap,
  onDoubleTap,
  onLongPress,
  onSelectDate,
}: {
  day: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }
  activeSubjectId: string
  records: RawAttendanceRecord[]
  isSelected: boolean
  onSingleTap: (date: string) => void
  onDoubleTap: (date: string) => void
  onLongPress: (date: string) => void
  onSelectDate: (date: string) => void
}) {
  const dayRecords = useMemo(
    () => records.filter((r) => r.subject_id === activeSubjectId && r.date === day.dateStr),
    [records, activeSubjectId, day.dateStr]
  )

  // Gesture state refs
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const isDragRef = useRef(false)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastTouchTimeRef = useRef(0)

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    }
  }, [])

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    isDragRef.current = false

    // Start long-press detection (480ms)
    longPressTimerRef.current = setTimeout(() => {
      if (!isDragRef.current) {
        triggerHaptic(30)
        onLongPress(day.dateStr)
      }
    }, 480)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y
    if (Math.hypot(dx, dy) > 10) {
      // Finger is scrolling! Cancel tap & long-press immediately
      isDragRef.current = true
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    lastTouchTimeRef.current = Date.now()
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    if (isDragRef.current || !touchStartRef.current) return

    const duration = Date.now() - touchStartRef.current.time
    if (duration >= 480) {
      // Already handled by long-press
      return
    }

    onSelectDate(day.dateStr)

    // Prevent default browser double-tap zoom
    e.preventDefault()

    tapCountRef.current += 1

    if (tapCountRef.current === 1) {
      tapTimerRef.current = setTimeout(() => {
        if (tapCountRef.current === 1) {
          onSingleTap(day.dateStr)
        }
        tapCountRef.current = 0
      }, 240)
    } else if (tapCountRef.current === 2) {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
      tapTimerRef.current = setTimeout(() => {
        if (tapCountRef.current === 2) {
          onDoubleTap(day.dateStr)
        }
        tapCountRef.current = 0
      }, 180)
    } else if (tapCountRef.current >= 3) {
      // Triple-tap quick action
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
      tapCountRef.current = 0
      onLongPress(day.dateStr)
    }
  }

  // Desktop Mouse Handler with Disambiguation (ignores synthetic clicks after touch)
  const handleClick = (e: React.MouseEvent) => {
    if (Date.now() - lastTouchTimeRef.current < 450) {
      return
    }
    onSelectDate(day.dateStr)
    if (e.detail <= 1) {
      tapTimerRef.current = setTimeout(() => {
        onSingleTap(day.dateStr)
      }, 240)
    } else if (e.detail === 2) {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
      onDoubleTap(day.dateStr)
    } else if (e.detail >= 3) {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
      onLongPress(day.dateStr)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onSelectDate(day.dateStr)
    onLongPress(day.dateStr)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSingleTap(day.dateStr)
    } else if (e.key === ' ') {
      e.preventDefault()
      onDoubleTap(day.dateStr)
    } else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'Enter')) {
      e.preventDefault()
      onLongPress(day.dateStr)
    }
  }

  // Accessible description
  const ariaLabel = useMemo(() => {
    const dateText = formatDateDisplay(day.dateStr)
    if (dayRecords.length === 0) return `${dateText}, No attendance recorded. Single tap to mark Present, double tap to mark Absent.`
    if (dayRecords.length === 1) {
      const r = dayRecords[0]
      return `${dateText}, Period ${r.class_number}, ${r.status}. Notes: ${r.notes || 'none'}`
    }
    return `${dateText}, ${dayRecords.length} class periods: ${dayRecords
      .map((r) => `Period ${r.class_number} ${r.status}`)
      .join(', ')}`
  }, [day.dateStr, dayRecords])

  const hasNotes = dayRecords.some((r) => !!r.notes)
  const isSingle = dayRecords.length === 1
  const singleRecord = isSingle ? dayRecords[0] : null

  return (
    <button
      type="button"
      role="gridcell"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-selected={isSelected}
      className={`cal-day-cell ${day.isCurrentMonth ? 'in-month' : 'out-month'} ${day.isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
    >
      <div className="cal-day-header">
        <span className="cal-day-number">{day.dayNum}</span>
        {hasNotes && (
          <span className="cal-note-dot" title="Has notes">
            <FileText size={10} />
          </span>
        )}
      </div>

      <div className="cal-day-content">
        {dayRecords.length === 0 ? (
          <div className="cal-empty-slot" />
        ) : isSingle && singleRecord ? (
          <div
            className={`cal-status-chip status-${singleRecord.status}`}
            title={`Period ${singleRecord.class_number}: ${singleRecord.status}`}
          >
            {singleRecord.status === 'present' && <Check size={11} strokeWidth={3} />}
            {singleRecord.status === 'absent' && <X size={11} strokeWidth={3} />}
            {singleRecord.status === 'no_class' && <Minus size={11} strokeWidth={3} />}
            <span className="chip-label">
              {singleRecord.status === 'present' ? 'P' : singleRecord.status === 'absent' ? 'A' : 'NC'}
            </span>
          </div>
        ) : (
          <div className="cal-multi-periods">
            <div className="multi-dots">
              {dayRecords.slice(0, 4).map((r) => (
                <span
                  key={r.id}
                  className={`dot-indicator dot-${r.status}`}
                  title={`P${r.class_number}: ${r.status}`}
                />
              ))}
            </div>
            <span className="multi-count">{dayRecords.length}P</span>
          </div>
        )}
      </div>
    </button>
  )
})

export function AttendanceClient() {
  // Core Data State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null)
  const [allRecords, setAllRecords] = useState<RawAttendanceRecord[]>([])

  // Active Navigation & Subject (Folder System)
  const [activeTab, setActiveTab] = useState<'calendar' | 'statistics' | 'tasks'>('calendar')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      return p.get('subjectId') || null
    }
    return null
  })

  // Subject Folder Grid Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_track' | 'needs_attention' | 'no_records'>('all')

  // Listen to browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const p = new URLSearchParams(window.location.search)
        const sid = p.get('subjectId')
        setSelectedSubjectId(sid || null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Navigation handlers between Folders Overview and Subject Workspace
  const handleSelectSubject = useCallback((subjectId: string) => {
    triggerHaptic(15)
    setSelectedSubjectId(subjectId)
    setActiveTab('calendar')
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('subjectId', subjectId)
      window.history.pushState({ subjectId }, '', url.toString())
    }
  }, [])

  const handleBackToFolders = useCallback(() => {
    triggerHaptic(10)
    setSelectedSubjectId(null)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('subjectId')
      window.history.pushState({}, '', url.toString())
    }
  }, [])

  // Calendar View State
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1) // 1..12
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })

  // Modals & Bottom Sheets
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false)
  const [isAddPeriodOpen, setIsAddPeriodOpen] = useState(false)
  const [isEditPeriodOpen, setIsEditPeriodOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isSubjectSwitcherOpen, setIsSubjectSwitcherOpen] = useState(false)
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false)
  const [isGestureGuideOpen, setIsGestureGuideOpen] = useState(false)
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false)
  const [selectedMonthModal, setSelectedMonthModal] = useState<MonthlyAttendanceSummary | null>(null)

  // Target Settings
  const [tempTarget, setTempTarget] = useState(75)
  const [targetSubmitting, setTargetSubmitting] = useState(false)

  // Form State for Add / Edit
  const [formDate, setFormDate] = useState('')
  const [formPeriod, setFormPeriod] = useState(1)
  const [formStatus, setFormStatus] = useState<AttendanceRecordStatus>('present')
  const [formNotes, setFormNotes] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [editingRecord, setEditingRecord] = useState<RawAttendanceRecord | null>(null)
  const [deletingRecord, setDeletingRecord] = useState<RawAttendanceRecord | null>(null)

  // Undo Toast State
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null)
  const [undoToastMessage, setUndoToastMessage] = useState<string | null>(null)
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null)
  const inFlightMutationsRef = useRef<Set<string>>(new Set())

  // General Toast Feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)
  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }, [])

  // Tasks Tab State (Persisted in localStorage)
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({})

  // Load completed tasks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('harcourtian_attendance_tasks_v3')
      if (saved) {
        setCompletedTaskIds(JSON.parse(saved))
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  const toggleTask = (taskId: string) => {
    setCompletedTaskIds((prev) => {
      const next = { ...prev, [taskId]: !prev[taskId] }
      try {
        localStorage.setItem('harcourtian_attendance_tasks_v3', JSON.stringify(next))
      } catch {
        // Ignore
      }
      return next
    })
    triggerHaptic(10)
  }

  // Fetch initial summary & all attendance records
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [summaryRes, recordsRes] = await Promise.all([
        fetch('/api/attendance/summary'),
        fetch('/api/attendance'),
      ])

      if (!summaryRes.ok) {
        const errJson = await summaryRes.json().catch(() => ({}))
        throw new Error(errJson.error || 'Failed to load attendance summary.')
      }

      const summaryJson: SummaryResponse = await summaryRes.json()
      setSummaryData(summaryJson)
      setTempTarget(summaryJson.target || 75)

      // Sync active subject with URL query parameter or keep existing selection
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const paramSubjectId = urlParams?.get('subjectId')
      if (paramSubjectId && summaryJson.subjects.some((s) => s.subjectId === paramSubjectId)) {
        setSelectedSubjectId(paramSubjectId)
      } else {
        setSelectedSubjectId((prev) => {
          if (prev && summaryJson.subjects.some((s) => s.subjectId === prev)) {
            return prev
          }
          return null
        })
      }

      if (recordsRes.ok) {
        const recordsJson = await recordsRes.json()
        if (Array.isArray(recordsJson.records)) {
          setAllRecords(recordsJson.records)
        }
      }
    } catch (err) {
      console.error('AttendanceClient load error:', err)
      setError(err instanceof Error ? err.message : 'Unable to connect to attendance service.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Get active subject summary and details
  const activeSubject = useMemo(() => {
    if (!selectedSubjectId || !summaryData?.subjects || summaryData.subjects.length === 0) return null
    return (
      summaryData.subjects.find((s) => s.subjectId === selectedSubjectId) ||
      null
    )
  }, [summaryData, selectedSubjectId])

  // Live computed metrics for each subject folder card (Reactivity across all assigned subjects)
  const liveSubjectCards = useMemo(() => {
    if (!summaryData?.subjects) return []
    const target = summaryData.target || 75
    return summaryData.subjects.map((sub) => {
      const records = allRecords.filter((r) => r.subject_id === sub.subjectId)
      let attended = 0
      let missed = 0
      let noClass = 0
      for (const r of records) {
        if (r.status === 'present') attended += 1
        else if (r.status === 'absent') missed += 1
        else if (r.status === 'no_class') noClass += 1
      }
      const conducted = attended + missed
      const metrics = computeAttendanceMetrics(attended, conducted, target, noClass)
      return {
        ...sub,
        ...metrics,
        liveAttended: attended,
        liveMissed: missed,
        liveConducted: conducted,
        liveNoClass: noClass,
      }
    })
  }, [summaryData, allRecords])

  const filteredSubjects = useMemo(() => {
    return liveSubjectCards.filter((sub) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = sub.subjectName.toLowerCase().includes(q)
        const matchCode = sub.subjectCode.toLowerCase().includes(q)
        if (!matchName && !matchCode) return false
      }
      if (statusFilter === 'on_track') {
        return sub.status === 'at_target'
      } else if (statusFilter === 'needs_attention') {
        return sub.status === 'below_target' || sub.status === 'critical'
      } else if (statusFilter === 'no_records') {
        return sub.status === 'no_records' || !sub.hasRecords
      }
      return true
    })
  }, [liveSubjectCards, searchQuery, statusFilter])

  const statusFilterCounts = useMemo(() => {
    let onTrack = 0
    let needsAttention = 0
    let noRecords = 0
    for (const s of liveSubjectCards) {
      if (s.status === 'at_target') onTrack += 1
      else if (s.status === 'below_target' || s.status === 'critical') needsAttention += 1
      else if (s.status === 'no_records' || !s.hasRecords) noRecords += 1
    }
    return {
      all: liveSubjectCards.length,
      onTrack,
      needsAttention,
      noRecords,
    }
  }, [liveSubjectCards])

  // Compute live subject metrics based on local records in memory (Real-time reactivity!)
  const liveSubjectMetrics = useMemo(() => {
    if (!activeSubject) return null
    const target = summaryData?.target || 75
    const subjectRecords = allRecords.filter((r) => r.subject_id === activeSubject.subjectId)

    let attended = 0
    let missed = 0
    let noClass = 0

    for (const r of subjectRecords) {
      if (r.status === 'present') attended += 1
      else if (r.status === 'absent') missed += 1
      else if (r.status === 'no_class') noClass += 1
    }

    const conducted = attended + missed
    return computeAttendanceMetrics(attended, conducted, target, noClass)
  }, [activeSubject, allRecords, summaryData?.target])

  // Compute live monthly summaries for active subject
  const liveMonthlySummaries = useMemo(() => {
    if (!activeSubject || !summaryData?.subjects) return []
    const target = summaryData?.target || 75
    const subjectRecords = allRecords.filter((r) => r.subject_id === activeSubject.subjectId)

    const subjectsMap = new Map<string, { id: string; subject_name: string; subject_code: string }>()
    summaryData.subjects.forEach((s) => {
      subjectsMap.set(s.subjectId, {
        id: s.subjectId,
        subject_name: s.subjectName,
        subject_code: s.subjectCode,
      })
    })

    return aggregateMonthlyAttendance(subjectRecords, subjectsMap, target)
  }, [activeSubject, allRecords, summaryData])

  // Trigger Undo
  const triggerUndo = async () => {
    if (!undoAction) return
    triggerHaptic(20)

    const action = undoAction
    setUndoAction(null)
    setUndoToastMessage(null)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)

    try {
      if (action.type === 'create') {
        // Revert created record -> Delete from server & memory
        setAllRecords((prev) => prev.filter((r) => r.id !== action.recordId))
        await fetch(`/api/attendance/${action.recordId}`, { method: 'DELETE' })
        showToast('Creation undone.', 'info')
      } else if (action.type === 'update' && action.previousStatus) {
        // Revert status update -> PATCH previous status
        setAllRecords((prev) =>
          prev.map((r) =>
            r.id === action.recordId ? { ...r, status: action.previousStatus! } : r
          )
        )
        await fetch(`/api/attendance/${action.recordId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action.previousStatus }),
        })
        showToast('Update undone.', 'info')
      } else if (action.type === 'delete' && action.deletedRecord) {
        // Revert deletion -> re-insert record
        const rec = action.deletedRecord
        setAllRecords((prev) => [...prev, rec])
        await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectId: rec.subject_id,
            date: rec.date,
            status: rec.status,
            classNumber: rec.class_number,
            notes: rec.notes,
          }),
        })
        showToast('Deletion undone.', 'info')
      }
    } catch (err) {
      console.error('Undo error:', err)
      showToast('Could not undo action. Refreshing data...', 'error')
      void loadData()
    }
  }

  // Set Undo Action with 5 second timeout
  const scheduleUndo = (action: UndoAction, message: string) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoAction(action)
    setUndoToastMessage(message)
    undoTimerRef.current = setTimeout(() => {
      setUndoAction(null)
      setUndoToastMessage(null)
    }, 5000)
  }

  // Optimistic Quick Mark (Single tap -> Present, Double tap -> Absent)
  const handleQuickMark = async (date: string, targetStatus: AttendanceRecordStatus) => {
    if (!activeSubject) return

    // Prevent duplicate concurrent requests for the same date & subject
    const mutationKey = `${activeSubject.subjectId}_${date}`
    if (inFlightMutationsRef.current.has(mutationKey)) {
      return
    }

    triggerHaptic(15)

    const subjectId = activeSubject.subjectId
    const dayRecords = allRecords.filter((r) => r.subject_id === subjectId && r.date === date)

    if (dayRecords.length > 1) {
      // Multiple periods exist on this date! Open day detail sheet so user can pick period
      setSelectedDate(date)
      setIsDayDetailOpen(true)
      return
    }

    inFlightMutationsRef.current.add(mutationKey)

    if (dayRecords.length === 1) {
      // Exactly 1 period exists. Toggle / update status!
      const existing = dayRecords[0]
      if (existing.status === targetStatus) {
        // Already this status! Provide quick feedback
        showToast(`Period ${existing.class_number} is already marked ${targetStatus}.`, 'info')
        inFlightMutationsRef.current.delete(mutationKey)
        return
      }

      const prevStatus = existing.status
      // Optimistic update
      setAllRecords((prev) =>
        prev.map((r) => (r.id === existing.id ? { ...r, status: targetStatus } : r))
      )

      scheduleUndo(
        {
          type: 'update',
          recordId: existing.id,
          subjectId,
          date,
          periodNumber: existing.class_number,
          previousStatus: prevStatus,
          newStatus: targetStatus,
          timestamp: Date.now(),
        },
        `${targetStatus === 'present' ? '✓ Present' : targetStatus === 'absent' ? '✕ Absent' : '— No Class'} recorded for ${formatShortDate(date)} (P${existing.class_number})`
      )

      try {
        let res: Response
        // If this record has a temp ID that was just created optimistically, use POST upsert
        if (existing.id.startsWith('temp_')) {
          res = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subjectId,
              date,
              status: targetStatus,
              classNumber: existing.class_number,
              allowUpdate: true,
            }),
          })
        } else {
          res = await fetch(`/api/attendance/${existing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: targetStatus }),
          })
        }

        const resData = await res.json().catch(() => ({}))
        if (!res.ok) {
          // Rollback
          setAllRecords((prev) =>
            prev.map((r) => (r.id === existing.id ? { ...r, status: prevStatus } : r))
          )
          showToast(resData.error || "Couldn't save attendance. Try again.", 'error')
        } else {
          // Sync real DB record if returned
          const saved = resData.record || (resData.attendance ? {
            id: resData.attendance.id,
            subject_id: resData.attendance.subjectId,
            date: resData.attendance.date,
            status: resData.attendance.status,
            class_number: resData.attendance.period || existing.class_number,
            notes: resData.attendance.notes || null,
            created_at: new Date().toISOString(),
          } : null)

          if (saved && saved.id) {
            setAllRecords((prev) =>
              prev.map((r) => (r.id === existing.id ? { ...r, id: saved.id, status: saved.status } : r))
            )
            setUndoAction((prev) =>
              prev && prev.recordId === existing.id ? { ...prev, recordId: saved.id } : prev
            )
          }
        }
      } catch {
        // Rollback on network error
        setAllRecords((prev) =>
          prev.map((r) => (r.id === existing.id ? { ...r, status: prevStatus } : r))
        )
        showToast("Couldn't save attendance. Check your connection.", 'error')
      } finally {
        inFlightMutationsRef.current.delete(mutationKey)
      }
    } else {
      // No records on this date yet. Create Period 1 optimistically!
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      const optimisticRecord: RawAttendanceRecord = {
        id: tempId,
        subject_id: subjectId,
        date,
        status: targetStatus,
        class_number: 1,
        notes: null,
        created_at: new Date().toISOString(),
      }

      setAllRecords((prev) => [...prev, optimisticRecord])

      scheduleUndo(
        {
          type: 'create',
          recordId: tempId,
          subjectId,
          date,
          periodNumber: 1,
          newStatus: targetStatus,
          timestamp: Date.now(),
        },
        `${targetStatus === 'present' ? '✓ Present' : targetStatus === 'absent' ? '✕ Absent' : '— No Class'} recorded for ${formatShortDate(date)} (Period 1)`
      )

      try {
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectId,
            date,
            status: targetStatus,
            classNumber: 1,
            allowUpdate: true,
          }),
        })

        const resData = await res.json().catch(() => ({}))
        const saved = resData.record || (resData.attendance ? {
          id: resData.attendance.id,
          subject_id: resData.attendance.subjectId,
          date: resData.attendance.date,
          status: resData.attendance.status,
          class_number: resData.attendance.period || 1,
          notes: resData.attendance.notes || null,
          created_at: new Date().toISOString(),
        } : null)

        if (res.ok && saved && saved.id) {
          // Replace temp ID with real ID from database
          setAllRecords((prev) =>
            prev.map((r) => (r.id === tempId ? { ...r, id: saved.id, status: saved.status } : r))
          )
          setUndoAction((prev) =>
            prev && prev.recordId === tempId ? { ...prev, recordId: saved.id } : prev
          )
        } else {
          // Rollback
          setAllRecords((prev) => prev.filter((r) => r.id !== tempId))
          showToast(resData.error || "Couldn't save attendance. Try again.", 'error')
        }
      } catch {
        // Rollback
        setAllRecords((prev) => prev.filter((r) => r.id !== tempId))
        showToast("Couldn't save attendance. Check your connection.", 'error')
      } finally {
        inFlightMutationsRef.current.delete(mutationKey)
      }
    }
  }

  // Fast status update for an existing record with rollback & error handling
  const handleUpdateRecordStatus = async (
    record: RawAttendanceRecord,
    targetStatus: AttendanceRecordStatus
  ) => {
    if (record.status === targetStatus) return
    triggerHaptic(10)
    const prevStatus = record.status

    // Optimistic UI update
    setAllRecords((prev) =>
      prev.map((rec) => (rec.id === record.id ? { ...rec, status: targetStatus } : rec))
    )

    try {
      let res: Response
      if (record.id.startsWith('temp_')) {
        res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectId: record.subject_id,
            date: record.date,
            status: targetStatus,
            classNumber: record.class_number,
            allowUpdate: true,
          }),
        })
      } else {
        res = await fetch(`/api/attendance/${record.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetStatus }),
        })
      }

      const resData = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Rollback
        setAllRecords((prev) =>
          prev.map((rec) => (rec.id === record.id ? { ...rec, status: prevStatus } : rec))
        )
        showToast(resData.error || "Couldn't save attendance. Try again.", 'error')
        return
      }

      const saved = resData.record || (resData.attendance ? {
        id: resData.attendance.id,
        subject_id: resData.attendance.subjectId,
        date: resData.attendance.date,
        status: resData.attendance.status,
        class_number: resData.attendance.period || record.class_number,
        notes: resData.attendance.notes || null,
        created_at: new Date().toISOString(),
      } : null)

      if (saved && saved.id) {
        setAllRecords((prev) =>
          prev.map((rec) => (rec.id === record.id ? { ...rec, id: saved.id, status: saved.status } : rec))
        )
      }

      showToast(
        `Period ${record.class_number} marked ${
          targetStatus === 'present' ? 'Present' : targetStatus === 'absent' ? 'Absent' : 'No Class'
        }`,
        'success'
      )
    } catch {
      // Rollback
      setAllRecords((prev) =>
        prev.map((rec) => (rec.id === record.id ? { ...rec, status: prevStatus } : rec))
      )
      showToast("Couldn't save attendance. Check your connection.", 'error')
    }
  }

  // Open Day Detail Bottom Sheet / Context Menu
  const handleOpenDayOptions = (date: string) => {
    triggerHaptic(25)
    setSelectedDate(date)
    setIsDayDetailOpen(true)
  }

  // Add Period Submit
  const handleAddPeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSubject) return
    setFormError(null)
    setFormSubmitting(true)
    triggerHaptic(15)

    const subjectId = activeSubject.subjectId
    const cleanDate = normalizeAttendanceDate(formDate) || formDate
    const periodNum = formPeriod

    // Duplicate check client-side
    const duplicate = allRecords.some(
      (r) => r.subject_id === subjectId && r.date === cleanDate && r.class_number === periodNum
    )
    if (duplicate) {
      setFormError(`Period ${periodNum} is already recorded for this date.`)
      setFormSubmitting(false)
      return
    }

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          date: cleanDate,
          status: formStatus,
          classNumber: periodNum,
          notes: formNotes || undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error || 'Failed to add period.')
        return
      }

      const saved = data.record || (data.attendance ? {
        id: data.attendance.id,
        subject_id: data.attendance.subjectId,
        date: data.attendance.date,
        status: data.attendance.status,
        class_number: data.attendance.period || periodNum,
        notes: data.attendance.notes || null,
        created_at: new Date().toISOString(),
      } : null)

      if (saved) {
        setAllRecords((prev) => [...prev.filter((r) => r.id !== saved.id), saved])
      }
      showToast(`Period ${periodNum} added successfully!`, 'success')
      setIsAddPeriodOpen(false)
      setFormNotes('')
    } catch {
      setFormError('Unable to connect to server. Please try again.')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Edit Period Submit
  const handleEditPeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRecord) return
    setFormError(null)
    setFormSubmitting(true)
    triggerHaptic(15)

    const rec = editingRecord

    try {
      const res = await fetch(`/api/attendance/${rec.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: formStatus,
          classNumber: formPeriod,
          notes: formNotes || null,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error || 'Failed to update record.')
        return
      }

      const updated = data.record || {
        id: rec.id,
        subject_id: rec.subject_id,
        date: rec.date,
        status: formStatus,
        class_number: formPeriod,
        notes: formNotes || null,
        created_at: rec.created_at,
      }

      setAllRecords((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, ...updated } : r))
      )
      showToast('Attendance record updated!', 'success')
      setIsEditPeriodOpen(false)
      setEditingRecord(null)
    } catch {
      setFormError('Unable to connect to server. Please try again.')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Delete Period Confirm
  const handleDeletePeriodConfirm = async () => {
    if (!deletingRecord) return
    triggerHaptic(30)
    const rec = deletingRecord
    setIsDeleteConfirmOpen(false)
    setDeletingRecord(null)

    // Optimistic delete
    setAllRecords((prev) => prev.filter((r) => r.id !== rec.id))

    scheduleUndo(
      {
        type: 'delete',
        recordId: rec.id,
        subjectId: rec.subject_id,
        date: rec.date,
        periodNumber: rec.class_number,
        deletedRecord: rec,
        timestamp: Date.now(),
      },
      `Period ${rec.class_number} attendance deleted`
    )

    try {
      const res = await fetch(`/api/attendance/${rec.id}`, { method: 'DELETE' })
      if (!res.ok) {
        // Rollback
        setAllRecords((prev) => [...prev, rec])
        showToast('Failed to delete attendance record.', 'error')
      }
    } catch {
      setAllRecords((prev) => [...prev, rec])
      showToast('Network error while deleting attendance record.', 'error')
    }
  }

  // Save Target Attendance
  const handleTargetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTargetSubmitting(true)
    triggerHaptic(15)

    try {
      const res = await fetch('/api/attendance/target', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: tempTarget }),
      })

      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Failed to update target.', 'error')
        return
      }

      setSummaryData((prev) => (prev ? { ...prev, target: tempTarget } : null))
      showToast(`Attendance target updated to ${tempTarget}%!`, 'success')
      setIsTargetModalOpen(false)
    } catch {
      showToast('Network error while saving target.', 'error')
    } finally {
      setTargetSubmitting(false)
    }
  }

  // CSV Export
  const handleExportCSV = () => {
    triggerHaptic(15)
    if (!activeSubject) return

    const subjectRecords = allRecords
      .filter((r) => r.subject_id === activeSubject.subjectId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.class_number - a.class_number)

    const headers = ['Subject Code', 'Subject Name', 'Date', 'Period', 'Status', 'Notes']
    const rows = subjectRecords.map((r) => {
      const statusLabel =
        r.status === 'present' ? 'Present' : r.status === 'absent' ? 'Absent' : 'No Class'
      const cleanNotes = (r.notes || '').replace(/"/g, '""')
      return [
        activeSubject.subjectCode,
        `"${activeSubject.subjectName}"`,
        r.date,
        r.class_number,
        statusLabel,
        `"${cleanNotes}"`,
      ].join(',')
    })

    // Add Summary at bottom of CSV
    const pct = liveSubjectMetrics?.formattedPercentage || '—'
    const summaryRows = [
      '',
      '--- SUMMARY ---',
      `Subject,"${activeSubject.subjectName}" (${activeSubject.subjectCode})`,
      `Total Classes Conducted,${liveSubjectMetrics?.total || 0}`,
      `Present,${liveSubjectMetrics?.attended || 0}`,
      `Absent,${liveSubjectMetrics?.missed || 0}`,
      `No Class,${liveSubjectMetrics?.noClass || 0}`,
      `Attendance Percentage,${pct}`,
      `Target,${summaryData?.target || 75}%`,
    ]

    const csvContent = [headers.join(','), ...rows, ...summaryRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Attendance_${activeSubject.subjectCode.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showToast('Attendance report exported!', 'success')
  }

  // Calendar Days Calculation (Month Matrix starting Monday)
  const calendarDays = useMemo(() => {
    const year = viewYear
    const month = viewMonth
    const firstDayOfMonth = new Date(year, month - 1, 1)
    const lastDayOfMonth = new Date(year, month, 0)
    const totalDaysInMonth = lastDayOfMonth.getDate()

    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // Convert to Monday = 0, ..., Sunday = 6
    const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7

    const days: Array<{
      dateStr: string
      dayNum: number
      isCurrentMonth: boolean
      isToday: boolean
    }> = []

    const todayStr = new Date().toISOString().split('T')[0]

    // Days from previous month to fill the first row
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i
      const prevM = month === 1 ? 12 : month - 1
      const prevY = month === 1 ? year - 1 : year
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      })
    }

    // Days in current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      })
    }

    // Days in next month to fill complete weeks (35 or 42 cells)
    const remainder = (7 - (days.length % 7)) % 7
    const nextM = month === 12 ? 1 : month + 1
    const nextY = month === 12 ? year + 1 : year
    for (let d = 1; d <= remainder; d++) {
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      })
    }

    return days
  }, [viewYear, viewMonth])

  // Month navigation helpers
  const handlePrevMonth = () => {
    triggerHaptic(10)
    if (viewMonth === 1) {
      setViewYear((y) => y - 1)
      setViewMonth(12)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    triggerHaptic(10)
    if (viewMonth === 12) {
      setViewYear((y) => y + 1)
      setViewMonth(1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const handleGoToToday = () => {
    triggerHaptic(15)
    const now = new Date()
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth() + 1)
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    setSelectedDate(todayStr)
  }

  // Get active subject records for selected date
  const selectedDateRecords = useMemo(() => {
    if (!activeSubject) return []
    return allRecords
      .filter((r) => r.subject_id === activeSubject.subjectId && r.date === selectedDate)
      .sort((a, b) => a.class_number - b.class_number)
  }, [activeSubject, allRecords, selectedDate])

  // Open Add Period modal for a specific date
  const openAddPeriodModal = (dateStr: string) => {
    triggerHaptic(15)
    setFormDate(dateStr)
    const existingForDate = allRecords.filter(
      (r) => r.subject_id === activeSubject?.subjectId && r.date === dateStr
    )
    const nextClassNum =
      existingForDate.length > 0
        ? Math.min(10, Math.max(...existingForDate.map((r) => r.class_number)) + 1)
        : 1
    setFormPeriod(nextClassNum)
    setFormStatus('present')
    setFormNotes('')
    setFormError(null)
    setIsAddPeriodOpen(true)
  }

  // Open Edit Period modal
  const openEditPeriodModal = (record: RawAttendanceRecord) => {
    triggerHaptic(15)
    setEditingRecord(record)
    setFormDate(record.date)
    setFormPeriod(record.class_number)
    setFormStatus(record.status)
    setFormNotes(record.notes || '')
    setFormError(null)
    setIsEditPeriodOpen(true)
  }

  // Open Delete Confirmation
  const openDeleteConfirmModal = (record: RawAttendanceRecord) => {
    triggerHaptic(20)
    setDeletingRecord(record)
    setIsDeleteConfirmOpen(true)
  }

  // Status Color Helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe':
        return { text: '#34d399', bg: 'rgba(16, 185, 129, 0.14)', border: 'rgba(16, 185, 129, 0.35)' }
      case 'at_target':
        return { text: '#60a5fa', bg: 'rgba(59, 130, 246, 0.14)', border: 'rgba(59, 130, 246, 0.35)' }
      case 'below_target':
        return { text: '#fbbf24', bg: 'rgba(245, 158, 11, 0.14)', border: 'rgba(245, 158, 11, 0.35)' }
      case 'critical':
        return { text: '#f87171', bg: 'rgba(239, 68, 68, 0.14)', border: 'rgba(239, 68, 68, 0.35)' }
      default:
        return { text: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.25)' }
    }
  }

  // Dynamic Tasks based on real student data
  const attendanceTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const todayRecords = allRecords.filter((r) => r.date === today)
    const hasTodayRecords = todayRecords.length > 0

    const lowSubjects = (summaryData?.subjects || []).filter(
      (s) => s.total > 0 && s.status === 'below_target'
    )

    const tasks = [
      {
        id: `task_today_${today}`,
        title: "Log today's attendance",
        description: hasTodayRecords
          ? `Recorded ${todayRecords.length} class period${todayRecords.length === 1 ? '' : 's'} today.`
          : 'Tap any subject class in the calendar to record today.',
        isAutoDone: hasTodayRecords,
        badge: hasTodayRecords ? 'Recorded' : 'Pending',
        badgeType: hasTodayRecords ? 'success' : 'warning',
      },
      {
        id: 'task_target_review',
        title: `Semester target: ${summaryData?.target || 75}% attendance`,
        description:
          liveSubjectMetrics && liveSubjectMetrics.percentage !== null && liveSubjectMetrics.percentage >= (summaryData?.target || 75)
            ? `Target achieved! You can safely miss ${liveSubjectMetrics.classesCanMiss} class${liveSubjectMetrics.classesCanMiss === 1 ? '' : 'es'}.`
            : liveSubjectMetrics?.classesNeededToAttend
            ? `Attend the next ${liveSubjectMetrics.classesNeededToAttend} consecutive classes to reach target.`
            : 'Maintain active attendance across all subjects.',
        isAutoDone: (liveSubjectMetrics?.percentage || 0) >= (summaryData?.target || 75),
        badge: `${summaryData?.target || 75}% Goal`,
        badgeType: 'info',
      },
    ]

    if (lowSubjects.length > 0) {
      tasks.push({
        id: `task_low_subjects_${lowSubjects.map((s) => s.subjectId).join('_')}`,
        title: `Review ${lowSubjects.length} subject${lowSubjects.length === 1 ? '' : 's'} below target`,
        description: lowSubjects.map((s) => `${s.subjectName} (${s.formattedPercentage})`).join(', '),
        isAutoDone: false,
        badge: 'Attention Needed',
        badgeType: 'danger',
      })
    }

    if (activeSubject && liveSubjectMetrics?.classesNeededToAttend && liveSubjectMetrics.classesNeededToAttend > 0) {
      tasks.push({
        id: `task_recover_${activeSubject.subjectId}`,
        title: `Attend next ${liveSubjectMetrics.classesNeededToAttend} classes for ${activeSubject.subjectName}`,
        description: `Consecutive attendance will recover your ${activeSubject.subjectName} attendance to ${summaryData?.target || 75}%.`,
        isAutoDone: false,
        badge: 'Recovery Plan',
        badgeType: 'warning',
      })
    }

    tasks.push({
      id: `task_monthly_review_${viewYear}_${viewMonth}`,
      title: `Review ${formatMonthYearLabel(viewYear, viewMonth)} report`,
      description: 'Check your monthly attendance performance breakdown in the Statistics tab.',
      isAutoDone: false,
      badge: 'Monthly',
      badgeType: 'info',
    })

    return tasks
  }, [allRecords, summaryData, liveSubjectMetrics, activeSubject, viewYear, viewMonth])



  return (
    <div className="attendance-page-root">
      {loading ? (
        <div className="attendance-folders-loading-view">
          <div className="skeleton-folders-header glass-card">
            <div className="skeleton-line title" />
            <div className="skeleton-line subtitle" />
          </div>
          <div className="skeleton-folders-grid">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="skeleton-folder-card glass-card">
                <div className="skeleton-tab" />
                <div className="skeleton-icon-row" />
                <div className="skeleton-title-line" />
                <div className="skeleton-bottom-line" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="attendance-error-card glass-card">
          <AlertTriangle size={32} color="#f87171" />
          <h3>Unable to Load Attendance</h3>
          <p>{error}</p>
          <button type="button" onClick={() => void loadData()} className="btn-primary" style={{ marginTop: '1rem' }}>
            <RefreshCw size={15} /> Try Again
          </button>
        </div>
      ) : !summaryData || summaryData.subjects.length === 0 ? (
        <div className="attendance-empty-profile glass-card">
          <div className="empty-profile-icon">
            <Folder size={44} />
          </div>
          <h2 className="empty-profile-title">No subjects available</h2>
          <p className="empty-profile-desc">
            We couldn't find subjects assigned to your current academic profile.
            Please check your profile or contact an administrator.
          </p>
          <div className="empty-profile-actions">
            <button
              type="button"
              onClick={() => void loadData()}
              className="btn-primary"
            >
              <RefreshCw size={15} /> Refresh Data
            </button>
          </div>
        </div>
      ) : !selectedSubjectId || !activeSubject ? (
        /* ======================================================== */
        /* VIEW A: MY SUBJECTS FOLDER GRID                          */
        /* ======================================================== */
        <div className="attendance-folders-view">
          {/* FOLDERS OVERVIEW HEADER */}
          <header className="folders-main-header glass-card">
            <div className="header-meta-left">
              <div className="folder-hero-badge">
                <FolderOpen size={18} className="hero-badge-icon" />
                <span>
                  {summaryData.academicContext.programName || 'B.Tech'}
                  {summaryData.academicContext.branchName ? ` • ${summaryData.academicContext.branchName}` : ''}
                  {summaryData.academicContext.semester ? ` • Semester ${summaryData.academicContext.semester}` : ''}
                </span>
              </div>
              <h1 className="folders-page-title">Attendance Tracker</h1>
              <p className="folders-page-subtitle">
                Choose an assigned subject to view the calendar, track percentage, and log classes.
              </p>
            </div>

            <div className="header-meta-right">
              <div className="overall-stat-card glass-panel">
                <div className="overall-stat-top">
                  <span className="stat-label">Overall Attendance</span>
                  <span
                    className="overall-status-pill"
                    style={{
                      color: getStatusColor(summaryData.summary.status || 'no_records').text,
                      backgroundColor: getStatusColor(summaryData.summary.status || 'no_records').bg,
                      borderColor: getStatusColor(summaryData.summary.status || 'no_records').border,
                    }}
                  >
                    {summaryData.summary.statusLabel || 'No records'}
                  </span>
                </div>
                <div className="overall-pct-row">
                  <span className="overall-pct-num">
                    {summaryData.summary.formattedPercentage || '—'}
                  </span>
                  <span className="overall-ratio-text">
                    {summaryData.summary.attended || 0} / {summaryData.summary.total || 0} classes
                  </span>
                </div>
              </div>

              <div className="folders-header-actions">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(10)
                    setIsTargetModalOpen(true)
                  }}
                  className="glass-btn target-goal-btn"
                  title="Configure Attendance Target"
                >
                  <Target size={15} />
                  <span>Target: {summaryData.target || 75}%</span>
                </button>

                <button
                  type="button"
                  onClick={() => void loadData()}
                  className="icon-btn refresh-btn"
                  title="Refresh Attendance Data"
                  aria-label="Refresh Attendance Data"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
          </header>

          {/* SEARCH AND FILTER TOOLBAR */}
          <div className="folders-toolbar glass-card">
            <div className="folder-search-input-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subjects by name or code (e.g. NCT-201)..."
                className="folder-search-input"
                aria-label="Search assigned subjects"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="clear-search-btn"
                  aria-label="Clear search query"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="folder-filter-pills" role="tablist" aria-label="Filter subjects by status">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(5)
                  setStatusFilter('all')
                }}
                className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
              >
                All Subjects ({statusFilterCounts.all})
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(5)
                  setStatusFilter('on_track')
                }}
                className={`filter-chip ${statusFilter === 'on_track' ? 'active' : ''}`}
              >
                <span className="chip-dot safe" />
                On Track ({statusFilterCounts.onTrack})
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(5)
                  setStatusFilter('needs_attention')
                }}
                className={`filter-chip ${statusFilter === 'needs_attention' ? 'active' : ''}`}
              >
                <span className="chip-dot warning" />
                Needs Attention ({statusFilterCounts.needsAttention})
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(5)
                  setStatusFilter('no_records')
                }}
                className={`filter-chip ${statusFilter === 'no_records' ? 'active' : ''}`}
              >
                <span className="chip-dot empty" />
                No Attendance ({statusFilterCounts.noRecords})
              </button>
            </div>
          </div>

          {/* SUBJECT FOLDERS GRID SECTION */}
          <div className="folders-section-header">
            <div className="folders-section-title-wrap">
              <Folder size={18} className="section-folder-icon" />
              <h2 className="folders-section-title">My Subjects</h2>
              <span className="folders-count-pill">{filteredSubjects.length} of {liveSubjectCards.length}</span>
            </div>
            <p className="folders-section-hint">Tap a folder to open its attendance calendar</p>
          </div>

          {filteredSubjects.length === 0 ? (
            <div className="empty-folders-search glass-card">
              <Folder size={36} className="empty-icon" />
              <h3>No subjects match your filter</h3>
              <p>
                {searchQuery
                  ? `No subjects match "${searchQuery}". Try a different search term or reset filters.`
                  : 'No subjects currently match this status filter.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                }}
                className="btn-primary"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="subjects-folder-grid" role="grid" aria-label="Assigned Subject Folders">
              {filteredSubjects.map((sub) => {
                const colors = getStatusColor(sub.status)
                const hasRecords = sub.hasRecords && sub.liveConducted > 0

                return (
                  <div
                    key={sub.subjectId}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectSubject(sub.subjectId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSelectSubject(sub.subjectId)
                      }
                    }}
                    className="subject-folder-card glass-card"
                    aria-label={`Open folder for ${sub.subjectName} (${sub.subjectCode}). Attendance: ${sub.formattedPercentage}. Status: ${sub.statusLabel}`}
                  >
                    {/* Top folder tab indicator */}
                    <div className="folder-tab-badge">
                      <span className="folder-tab-code">{sub.subjectCode}</span>
                    </div>

                    {/* Folder Top Row: Icon + Status Pill */}
                    <div className="folder-top-row">
                      <div
                        className="folder-icon-plate"
                        style={{
                          background: colors.bg,
                          borderColor: colors.border,
                          color: colors.text,
                        }}
                      >
                        <Folder size={24} className="folder-icon-svg" />
                      </div>

                      <div
                        className="folder-status-pill"
                        style={{
                          color: colors.text,
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                        }}
                      >
                        <span
                          className="status-dot-mini"
                          style={{ backgroundColor: colors.text }}
                        />
                        <span>{sub.statusLabel}</span>
                      </div>
                    </div>

                    {/* Folder Content: Subject Name and Meta */}
                    <div className="folder-middle-stack">
                      <h3 className="folder-subject-title" title={sub.subjectName}>
                        {sub.subjectName}
                      </h3>
                      <div className="folder-sub-tags">
                        <span className="folder-code-chip">{sub.subjectCode}</span>
                        {sub.credits ? (
                          <span className="folder-credit-chip">{sub.credits} Credits</span>
                        ) : null}
                      </div>
                    </div>

                    {/* Folder Bottom: Attendance Metric & Progress bar */}
                    <div className="folder-bottom-stack">
                      {hasRecords ? (
                        <>
                          <div className="folder-pct-row">
                            <span
                              className="folder-percentage-large"
                              style={{ color: colors.text }}
                            >
                              {sub.formattedPercentage}
                            </span>
                            <span className="folder-counts-sub">
                              {sub.liveAttended} Present • {sub.liveMissed} Missed
                            </span>
                          </div>
                          <div className="folder-progress-track">
                            <div
                              className="folder-progress-fill"
                              style={{
                                width: `${Math.min(100, Math.max(0, sub.percentage || 0))}%`,
                                backgroundColor: colors.text,
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="folder-empty-metrics">
                          <span className="folder-empty-main">No attendance yet</span>
                          <span className="folder-empty-cta">Tap to log classes →</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* ======================================================== */
        /* VIEW B: SUBJECT ATTENDANCE WORKSPACE                     */
        /* ======================================================== */
        <div className="subject-workspace-view">
          {/* 1. LIQUID GLASS HEADER */}
          <header className="attendance-header glass-card">
            <div className="header-left">
              <button
                type="button"
                onClick={handleBackToFolders}
                className="icon-btn back-btn back-to-folders-btn"
                title="Return to My Subjects"
                aria-label="Back to My Subjects"
              >
                <ArrowLeft size={18} />
                <span className="back-btn-label">My Subjects</span>
              </button>

              <button
                type="button"
                onClick={handleBackToFolders}
                className="subject-info-btn"
                title="Click to view all subjects"
              >
                <div className="subject-icon-box">
                  <Folder size={18} />
                </div>
                <div className="subject-text-stack">
                  <div className="subject-title-row">
                    <h1 className="subject-name">{activeSubject.subjectName}</h1>
                    <span className="subject-code-tag">{activeSubject.subjectCode}</span>
                  </div>
                  <p className="subject-attendance-sub">
                    <span className="sub-pct-bold">
                      {liveSubjectMetrics?.formattedPercentage || activeSubject.formattedPercentage || '—'}
                    </span>{' '}
                    attendance
                  </p>
                </div>
              </button>
            </div>

            <div className="header-actions">
              <button
                type="button"
                onClick={handleBackToFolders}
                className="glass-btn all-folders-action-btn"
                title="View All Subject Folders"
              >
                <FolderOpen size={15} />
                <span className="export-btn-text">All Folders</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="export-action-btn glass-btn"
                title="Export Attendance to CSV"
              >
                <Download size={15} />
                <span className="export-btn-text">Export</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOptionsMenuOpen(true)}
                className="icon-btn more-options-btn"
                title="More Options"
                aria-label="More Options"
              >
                <MoreVertical size={18} />
              </button>
            </div>
          </header>

          {/* 2. SEGMENTED NAVIGATION CONTROL */}
          <nav className="segmented-nav-wrap" aria-label="Attendance Views">
            <div className="segmented-nav glass-card" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'calendar'}
                onClick={() => {
                  triggerHaptic(10)
                  setActiveTab('calendar')
                }}
                className={`segmented-tab ${activeTab === 'calendar' ? 'active' : ''}`}
              >
                <CalendarIcon size={16} />
                <span>Calendar</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'statistics'}
                onClick={() => {
                  triggerHaptic(10)
                  setActiveTab('statistics')
                }}
                className={`segmented-tab ${activeTab === 'statistics' ? 'active' : ''}`}
              >
                <BarChart3 size={16} />
                <span>Statistics</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'tasks'}
                onClick={() => {
                  triggerHaptic(10)
                  setActiveTab('tasks')
                }}
                className={`segmented-tab ${activeTab === 'tasks' ? 'active' : ''}`}
              >
                <CheckSquare size={16} />
                <span>Tasks</span>
                {attendanceTasks.some((t) => !completedTaskIds[t.id] && !t.isAutoDone) && (
                  <span className="tasks-active-badge" />
                )}
              </button>
            </div>
          </nav>

          {/* MAIN CONTENT AREA */}
          <main className="attendance-main-container">
            {/* TAB 1: CALENDAR VIEW */}
            {activeTab === 'calendar' && (
              <section className="calendar-tab-section" aria-label="Monthly Attendance Calendar">
                {/* CALENDAR CONTROLS & MONTH SELECTOR */}
                <div className="calendar-controls glass-card">
                  <div className="month-selector">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="cal-nav-btn"
                      title="Previous Month"
                      aria-label="Previous Month"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <h2 className="current-month-heading">
                      {formatMonthYearLabel(viewYear, viewMonth)}
                    </h2>

                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="cal-nav-btn"
                      title="Next Month"
                      aria-label="Next Month"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="cal-right-actions">
                    <button
                      type="button"
                      onClick={handleGoToToday}
                      className="today-pill-btn"
                      title="Jump to Current Date"
                    >
                      Today
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsGestureGuideOpen(true)}
                      className="guide-help-btn"
                      title="Interaction Guide & Shortcuts"
                    >
                      <HelpCircle size={15} />
                      <span className="guide-btn-text">Gestures</span>
                    </button>
                  </div>
                </div>

                {/* GESTURE HELPER HINT BAR */}
                <div className="gesture-helper-bar">
                  <span className="gesture-hint-item">
                    <span className="hint-bullet green">●</span> Tap <strong>Present</strong>
                  </span>
                  <span className="gesture-sep">•</span>
                  <span className="gesture-hint-item">
                    <span className="hint-bullet red">●</span> Double-tap <strong>Absent</strong>
                  </span>
                  <span className="gesture-sep">•</span>
                  <span className="gesture-hint-item">
                    <span className="hint-bullet gray">●</span> Long-press <strong>Options</strong>
                  </span>
                </div>

                {/* MONTHLY CALENDAR GRID */}
                <div className="calendar-grid-card glass-card" role="grid" aria-label="Attendance Calendar">
                  {/* WEEKDAY HEADER ROW */}
                  <div className="cal-weekdays-row" role="row">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName) => (
                      <div key={dayName} className="cal-weekday-header" role="columnheader">
                        {dayName}
                      </div>
                    ))}
                  </div>

                  {/* DAYS GRID */}
                  <div className="cal-days-grid">
                    {calendarDays.map((day) => (
                      <CalendarDayCell
                        key={day.dateStr}
                        day={day}
                        activeSubjectId={activeSubject?.subjectId || ''}
                        records={allRecords}
                        isSelected={selectedDate === day.dateStr}
                        onSingleTap={(d) => handleQuickMark(d, 'present')}
                        onDoubleTap={(d) => handleQuickMark(d, 'absent')}
                        onLongPress={handleOpenDayOptions}
                        onSelectDate={(d) => setSelectedDate(d)}
                      />
                    ))}
                  </div>
                </div>

                {/* SELECTED DATE DETAILS & QUICK ACTIONS (COMPACT PANEL) */}
                <div className="day-detail-panel glass-card">
                  <div className="day-detail-header">
                    <div className="detail-date-box">
                      <CalendarIcon size={16} className="text-accent" />
                      <h3 className="detail-date-title">{formatDateDisplay(selectedDate)}</h3>
                      {selectedDate === new Date().toISOString().split('T')[0] && (
                        <span className="today-badge">Today</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openAddPeriodModal(selectedDate)}
                      className="add-period-btn glass-btn"
                    >
                      <Plus size={14} />
                      <span>Add Period</span>
                    </button>
                  </div>

                  {selectedDateRecords.length === 0 ? (
                    <div className="no-records-day-box">
                      <p className="no-records-text">No attendance recorded for this date.</p>
                      <div className="quick-add-buttons">
                        <button
                          type="button"
                          onClick={() => handleQuickMark(selectedDate, 'present')}
                          className="quick-action-pill present"
                        >
                          <Check size={13} /> Mark Present (P1)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickMark(selectedDate, 'absent')}
                          className="quick-action-pill absent"
                        >
                          <X size={13} /> Mark Absent (P1)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickMark(selectedDate, 'no_class')}
                          className="quick-action-pill no-class"
                        >
                          <Minus size={13} /> No Class
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="day-periods-list">
                      {selectedDateRecords.map((r) => (
                        <div key={r.id} className="period-card-row">
                          <div className="period-info">
                            <span className="period-badge">Period {r.class_number}</span>
                            <span className={`status-pill status-${r.status}`}>
                              {r.status === 'present' ? '✓ Present' : r.status === 'absent' ? '✕ Absent' : '— No Class'}
                            </span>
                            {r.notes && <span className="period-notes-snippet">“{r.notes}”</span>}
                          </div>

                          <div className="period-actions">
                            {/* Fast status toggle buttons */}
                            <button
                              type="button"
                              onClick={() => void handleUpdateRecordStatus(r, 'present')}
                              className={`status-quick-btn present ${r.status === 'present' ? 'active' : ''}`}
                              title="Mark Present"
                              aria-label="Mark Present"
                            >
                              <Check size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleUpdateRecordStatus(r, 'absent')}
                              className={`status-quick-btn absent ${r.status === 'absent' ? 'active' : ''}`}
                              title="Mark Absent"
                              aria-label="Mark Absent"
                            >
                              <X size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleUpdateRecordStatus(r, 'no_class')}
                              className={`status-quick-btn no-class ${r.status === 'no_class' ? 'active' : ''}`}
                              title="Mark No Class"
                              aria-label="Mark No Class"
                            >
                              <Minus size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditPeriodModal(r)}
                              className="icon-sub-btn edit"
                              title="Edit Attendance Period"
                              aria-label="Edit Attendance Period"
                            >
                              <Edit3 size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteConfirmModal(r)}
                              className="icon-sub-btn delete"
                              title="Delete Period"
                              aria-label="Delete Period"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ======================================================== */}
            {/* TAB 2: STATISTICS VIEW */}
            {/* ======================================================== */}
            {activeTab === 'statistics' && (
              <section className="statistics-tab-section" aria-label="Attendance Statistics and Analytics">
                {/* 1. TOP SUMMARY METRIC CARDS */}
                <div className="stats-metric-grid">
                  <div className="stat-card glass-card">
                    <span className="stat-label">Conducted Classes</span>
                    <span className="stat-val">{liveSubjectMetrics?.total || 0}</span>
                    <span className="stat-sub">Excluding No-Class</span>
                  </div>

                  <div className="stat-card glass-card present-border">
                    <span className="stat-label">Present</span>
                    <span className="stat-val text-emerald">{liveSubjectMetrics?.attended || 0}</span>
                    <span className="stat-sub">Attended lectures</span>
                  </div>

                  <div className="stat-card glass-card absent-border">
                    <span className="stat-label">Absent</span>
                    <span className="stat-val text-rose">{liveSubjectMetrics?.missed || 0}</span>
                    <span className="stat-sub">Missed classes</span>
                  </div>

                  <div className="stat-card glass-card">
                    <span className="stat-label">No Class</span>
                    <span className="stat-val text-muted">{liveSubjectMetrics?.noClass || 0}</span>
                    <span className="stat-sub">Excluded from %</span>
                  </div>
                </div>

                {/* 2. TARGET ANALYSIS & HEADROOM BANNER */}
                {liveSubjectMetrics && (
                  <div className="target-analysis-banner glass-card">
                    <div className="target-banner-top">
                      <div className="target-icon-wrap">
                        <Target size={22} className="text-accent" />
                      </div>
                      <div className="target-banner-text">
                        {!liveSubjectMetrics.hasRecords ? (
                          <h4>No Attendance Recorded Yet</h4>
                        ) : liveSubjectMetrics.percentage !== null &&
                          liveSubjectMetrics.percentage >= liveSubjectMetrics.target ? (
                          <h4>Target Achieved 🎉</h4>
                        ) : (
                          <h4>Target Not Achieved ⚠️</h4>
                        )}

                        <p className="target-advice-description">
                          {!liveSubjectMetrics.hasRecords ? (
                            'Mark your first class period in the Calendar to see live target headroom calculations.'
                          ) : liveSubjectMetrics.percentage !== null &&
                            liveSubjectMetrics.percentage >= liveSubjectMetrics.target ? (
                            <>
                              You can miss <strong>{liveSubjectMetrics.classesCanMiss}</strong> class
                              {liveSubjectMetrics.classesCanMiss === 1 ? '' : 'es'} and remain at or above
                              your target of <strong>{liveSubjectMetrics.target}%</strong>.
                            </>
                          ) : liveSubjectMetrics.isRecoveryUnreachable ? (
                            <>
                              Critical: The {liveSubjectMetrics.target}% target is mathematically
                              unreachable this semester due to missed classes.
                            </>
                          ) : (
                            <>
                              Attend the next{' '}
                              <strong>{liveSubjectMetrics.classesNeededToAttend}</strong> class
                              {liveSubjectMetrics.classesNeededToAttend === 1 ? '' : 'es'} continuously
                              to reach <strong>{liveSubjectMetrics.target}%</strong>.
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* TARGET PROGRESS BAR */}
                    {liveSubjectMetrics.hasRecords && liveSubjectMetrics.percentage !== null && (
                      <div className="target-progress-container">
                        <div className="progress-labels-row">
                          <span className="curr-pct-text">
                            Current: <strong>{liveSubjectMetrics.formattedPercentage}</strong>
                          </span>
                          <span className="target-tick-text">
                            Target: <strong>{liveSubjectMetrics.target}%</strong>
                          </span>
                        </div>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(100, Math.max(0, liveSubjectMetrics.percentage))}%`,
                              backgroundColor: getStatusColor(liveSubjectMetrics.status).text,
                            }}
                          />
                          <div
                            className="target-marker-line"
                            style={{ left: `${liveSubjectMetrics.target}%` }}
                            title={`Target: ${liveSubjectMetrics.target}%`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. MONTHLY ATTENDANCE BREAKDOWN */}
                <div className="monthly-stats-section glass-card">
                  <div className="section-title-row">
                    <h3 className="section-title">Monthly Attendance Performance</h3>
                    <span className="section-subtitle">Tap a month for period breakdown</span>
                  </div>

                  {liveMonthlySummaries.length === 0 ? (
                    <p className="empty-sub-text">No monthly records logged for {activeSubject?.subjectName}.</p>
                  ) : (
                    <div className="monthly-cards-grid">
                      {liveMonthlySummaries.map((m) => (
                        <button
                          key={m.yearMonth}
                          type="button"
                          onClick={() => {
                            triggerHaptic(15)
                            setSelectedMonthModal(m)
                          }}
                          className="month-stat-card glass-card"
                        >
                          <div className="m-card-top">
                            <span className="m-card-name">{m.monthLabel}</span>
                            <span
                              className="m-card-pct"
                              style={{ color: getStatusColor(m.status).text }}
                            >
                              {m.formattedPercentage}
                            </span>
                          </div>

                          <div className="m-card-progress">
                            <div
                              className="m-progress-fill"
                              style={{
                                width: `${Math.min(100, Math.max(0, m.percentage || 0))}%`,
                                backgroundColor: getStatusColor(m.status).text,
                              }}
                            />
                          </div>

                          <div className="m-card-counts">
                            <span>Present: {m.present}</span>
                            <span>Absent: {m.absent}</span>
                            {m.noClass > 0 && <span>No Class: {m.noClass}</span>}
                            <span>Total: {m.total}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. SUBJECT-WISE COMPARISON */}
                <div className="subjects-comparison-section glass-card">
                  <div className="section-title-row">
                    <h3 className="section-title">Subject-Wise Attendance Comparison</h3>
                    <span className="section-subtitle">Click any subject to open in calendar</span>
                  </div>

                  <div className="subject-comparison-table-wrap">
                    <table className="comparison-table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Attended</th>
                          <th>Missed</th>
                          <th>Conducted</th>
                          <th>Attendance %</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(summaryData?.subjects || []).map((sub) => {
                          const isCurrent = sub.subjectId === activeSubject?.subjectId
                          const colors = getStatusColor(sub.status)
                          return (
                            <tr
                              key={sub.subjectId}
                              onClick={() => {
                                triggerHaptic(15)
                                setSelectedSubjectId(sub.subjectId)
                                setActiveTab('calendar')
                              }}
                              className={`comparison-row ${isCurrent ? 'is-active-subject' : ''}`}
                            >
                              <td>
                                <div className="sub-table-title">
                                  <strong>{sub.subjectName}</strong>
                                  <span className="sub-code-inline">{sub.subjectCode}</span>
                                </div>
                              </td>
                              <td className="text-emerald">{sub.attended}</td>
                              <td className="text-rose">{sub.missed}</td>
                              <td>{sub.total}</td>
                              <td>
                                <strong style={{ color: colors.text }}>
                                  {sub.formattedPercentage}
                                </strong>
                              </td>
                              <td>
                                <span
                                  className="status-badge"
                                  style={{
                                    color: colors.text,
                                    backgroundColor: colors.bg,
                                    borderColor: colors.border,
                                  }}
                                >
                                  {sub.statusLabel}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* ======================================================== */}
            {/* TAB 3: TASKS TAB */}
            {/* ======================================================== */}
            {activeTab === 'tasks' && (
              <section className="tasks-tab-section" aria-label="Attendance Action Tasks">
                <div className="tasks-header-card glass-card">
                  <div className="tasks-header-left">
                    <CheckSquare size={22} className="text-accent" />
                    <div>
                      <h3 className="tasks-title">Attendance Tasks & Reminders</h3>
                      <p className="tasks-subtitle">
                        Action items derived from your academic calendar & attendance records.
                      </p>
                    </div>
                  </div>

                  <div className="tasks-progress-summary">
                    <span className="tasks-progress-text">
                      Completed:{' '}
                      {
                        attendanceTasks.filter(
                          (t) => completedTaskIds[t.id] || t.isAutoDone
                        ).length
                      }{' '}
                      / {attendanceTasks.length}
                    </span>
                  </div>
                </div>

                <div className="tasks-list">
                  {attendanceTasks.map((task) => {
                    const isDone = !!completedTaskIds[task.id] || task.isAutoDone
                    return (
                      <div
                        key={task.id}
                        className={`task-item-card glass-card ${isDone ? 'is-completed' : ''}`}
                        onClick={() => toggleTask(task.id)}
                      >
                        <button
                          type="button"
                          className={`task-checkbox ${isDone ? 'checked' : ''}`}
                          aria-label={`Toggle task: ${task.title}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleTask(task.id)
                          }}
                        >
                          {isDone && <Check size={14} strokeWidth={3} />}
                        </button>

                        <div className="task-content">
                          <div className="task-top-row">
                            <h4 className="task-name">{task.title}</h4>
                            <span className={`task-badge badge-${task.badgeType}`}>
                              {task.badge}
                            </span>
                          </div>
                          <p className="task-desc">{task.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </main>
        </div>
      )}

      {/* ======================================================== */}
      {/* UNDO TOAST NOTIFICATION (5 SECONDS) */}
      {/* ======================================================== */}
      {undoAction && undoToastMessage && (
        <aside className="undo-toast-wrap" aria-live="polite">
          <div className="undo-toast glass-card">
            <span className="undo-message-text">{undoToastMessage}</span>
            <button type="button" onClick={triggerUndo} className="undo-action-btn">
              <Undo2 size={14} />
              <span>Undo</span>
            </button>
          </div>
        </aside>
      )}

      {/* GENERAL TOAST MESSAGE */}
      {toastMessage && (
        <aside className="general-toast-wrap" aria-live="polite">
          <div className={`general-toast glass-card toast-${toastMessage.type}`}>
            <span>{toastMessage.text}</span>
          </div>
        </aside>
      )}

      {/* ======================================================== */}
      {/* DAY DETAIL BOTTOM SHEET / ACTION MENU */}
      {/* ======================================================== */}
      {isDayDetailOpen && (
        <div className="modal-backdrop" onClick={() => setIsDayDetailOpen(false)}>
          <div
            className="bottom-sheet glass-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Day Attendance Actions"
          >
            <div className="bottom-sheet-handle" />
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{formatDateDisplay(selectedDate)}</h3>
                <p className="modal-subtitle">{activeSubject?.subjectName} attendance</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDayDetailOpen(false)}
                className="icon-btn close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="day-sheet-actions">
              <div className="sheet-quick-buttons">
                <button
                  type="button"
                  onClick={() => {
                    setIsDayDetailOpen(false)
                    void handleQuickMark(selectedDate, 'present')
                  }}
                  className="sheet-action-tile present"
                >
                  <Check size={18} />
                  <span>Mark Present</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDayDetailOpen(false)
                    void handleQuickMark(selectedDate, 'absent')
                  }}
                  className="sheet-action-tile absent"
                >
                  <X size={18} />
                  <span>Mark Absent</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDayDetailOpen(false)
                    void handleQuickMark(selectedDate, 'no_class')
                  }}
                  className="sheet-action-tile no-class"
                >
                  <Minus size={18} />
                  <span>No Class</span>
                </button>
              </div>

              <div className="sheet-periods-list">
                <div className="sheet-section-title-row">
                  <h4 className="sheet-section-title">Periods on this date</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDayDetailOpen(false)
                      openAddPeriodModal(selectedDate)
                    }}
                    className="sheet-add-btn"
                  >
                    <Plus size={14} /> Add Period
                  </button>
                </div>

                {selectedDateRecords.length === 0 ? (
                  <p className="sheet-empty-text">No class periods recorded yet for this day.</p>
                ) : (
                  selectedDateRecords.map((r) => (
                    <div key={r.id} className="sheet-period-item">
                      <div className="sheet-period-left">
                        <span className="sheet-p-badge">Period {r.class_number}</span>
                        <span className={`status-pill status-${r.status}`}>
                          {r.status === 'present' ? '✓ Present' : r.status === 'absent' ? '✕ Absent' : '— No Class'}
                        </span>
                        {r.notes && <span className="sheet-notes-text">“{r.notes}”</span>}
                      </div>

                      <div className="sheet-period-right">
                        <button
                          type="button"
                          onClick={() => {
                            setIsDayDetailOpen(false)
                            openEditPeriodModal(r)
                          }}
                          className="sheet-btn edit"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDayDetailOpen(false)
                            openDeleteConfirmModal(r)
                          }}
                          className="sheet-btn delete"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD PERIOD MODAL */}
      {/* ======================================================== */}
      {isAddPeriodOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddPeriodOpen(false)}>
          <div
            className="modal-dialog glass-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Add Attendance Period"
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Add Attendance Period</h3>
                <p className="modal-subtitle">
                  {activeSubject?.subjectName} • {formatDateDisplay(formDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPeriodOpen(false)}
                className="icon-btn close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddPeriodSubmit} className="modal-form">
              {formError && (
                <div className="form-error-banner">
                  <AlertTriangle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="add-period-num">Period Number (1–10)</label>
                <input
                  id="add-period-num"
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={formPeriod}
                  onChange={(e) => setFormPeriod(parseInt(e.target.value, 10) || 1)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Attendance Status</label>
                <div className="status-radio-group">
                  <button
                    type="button"
                    onClick={() => setFormStatus('present')}
                    className={`radio-tile present ${formStatus === 'present' ? 'active' : ''}`}
                  >
                    <Check size={16} />
                    <span>Present</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormStatus('absent')}
                    className={`radio-tile absent ${formStatus === 'absent' ? 'active' : ''}`}
                  >
                    <X size={16} />
                    <span>Absent</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormStatus('no_class')}
                    className={`radio-tile no-class ${formStatus === 'no_class' ? 'active' : ''}`}
                  >
                    <Minus size={16} />
                    <span>No Class</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="add-period-notes">Notes (Optional)</label>
                <input
                  id="add-period-notes"
                  type="text"
                  maxLength={200}
                  placeholder="e.g. Lab session, Tutorial, Guest lecture"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="modal-buttons-row">
                <button
                  type="button"
                  onClick={() => setIsAddPeriodOpen(false)}
                  className="btn-secondary"
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={formSubmitting}>
                  {formSubmitting ? 'Saving...' : 'Add Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EDIT PERIOD MODAL */}
      {/* ======================================================== */}
      {isEditPeriodOpen && editingRecord && (
        <div className="modal-backdrop" onClick={() => setIsEditPeriodOpen(false)}>
          <div
            className="modal-dialog glass-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Edit Attendance Period"
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Edit Period {editingRecord.class_number}</h3>
                <p className="modal-subtitle">{formatDateDisplay(editingRecord.date)}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditPeriodOpen(false)}
                className="icon-btn close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditPeriodSubmit} className="modal-form">
              {formError && (
                <div className="form-error-banner">
                  <AlertTriangle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="edit-period-num">Period Number</label>
                <input
                  id="edit-period-num"
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={formPeriod}
                  onChange={(e) => setFormPeriod(parseInt(e.target.value, 10) || 1)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Attendance Status</label>
                <div className="status-radio-group">
                  <button
                    type="button"
                    onClick={() => setFormStatus('present')}
                    className={`radio-tile present ${formStatus === 'present' ? 'active' : ''}`}
                  >
                    <Check size={16} />
                    <span>Present</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormStatus('absent')}
                    className={`radio-tile absent ${formStatus === 'absent' ? 'active' : ''}`}
                  >
                    <X size={16} />
                    <span>Absent</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormStatus('no_class')}
                    className={`radio-tile no-class ${formStatus === 'no_class' ? 'active' : ''}`}
                  >
                    <Minus size={16} />
                    <span>No Class</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="edit-period-notes">Notes</label>
                <input
                  id="edit-period-notes"
                  type="text"
                  maxLength={200}
                  placeholder="Optional notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="modal-buttons-row">
                <button
                  type="button"
                  onClick={() => setIsEditPeriodOpen(false)}
                  className="btn-secondary"
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={formSubmitting}>
                  {formSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ======================================================== */}
      {isDeleteConfirmOpen && deletingRecord && (
        <div className="modal-backdrop" onClick={() => setIsDeleteConfirmOpen(false)}>
          <div
            className="modal-dialog glass-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm Period Deletion"
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Delete Attendance Period?</h3>
                <p className="modal-subtitle">
                  Delete Period {deletingRecord.class_number} attendance for{' '}
                  {formatDateDisplay(deletingRecord.date)}?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="icon-btn close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-text">
              <p>
                This will remove the {deletingRecord.status} record from your calculations and statistics.
                You can undo this immediately using the undo toast.
              </p>
            </div>

            <div className="modal-buttons-row">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePeriodConfirm}
                className="btn-danger"
              >
                Delete Period
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBJECT SWITCHER MODAL */}
      {/* ======================================================== */}
      {isSubjectSwitcherOpen && (
        <div className="modal-backdrop" onClick={() => setIsSubjectSwitcherOpen(false)}>
          <div
            className="modal-dialog glass-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Switch Subject"
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Switch Subject Folder</h3>
                <p className="modal-subtitle">Choose an assigned subject workspace</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSubjectSwitcherOpen(false)}
                className="icon-btn close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-folders-grid">
              {liveSubjectCards.map((sub) => {
                const isSelected = sub.subjectId === activeSubject?.subjectId
                const colors = getStatusColor(sub.status)
                return (
                  <button
                    key={sub.subjectId}
                    type="button"
                    onClick={() => {
                      triggerHaptic(15)
                      handleSelectSubject(sub.subjectId)
                      setIsSubjectSwitcherOpen(false)
                    }}
                    className={`modal-folder-item glass-card ${isSelected ? 'active' : ''}`}
                  >
                    <div className="modal-folder-top">
                      <div className="modal-folder-icon" style={{ color: colors.text, borderColor: colors.border }}>
                        <Folder size={18} />
                      </div>
                      <span className="modal-folder-code">{sub.subjectCode}</span>
                      <span className="modal-folder-pct" style={{ color: colors.text }}>
                        {sub.formattedPercentage}
                      </span>
                    </div>
                    <span className="modal-folder-name" title={sub.subjectName}>
                      {sub.subjectName}
                    </span>
                    <div className="modal-folder-bottom">
                      <span className="modal-folder-status" style={{ color: colors.text }}>
                        ● {sub.statusLabel}
                      </span>
                      {sub.liveConducted > 0 && (
                        <span className="modal-folder-counts">
                          {sub.liveAttended}/{sub.liveConducted}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="modal-footer-action">
              <button
                type="button"
                onClick={() => {
                  handleBackToFolders()
                  setIsSubjectSwitcherOpen(false)
                }}
                className="btn-secondary"
                style={{ width: '100%' }}
              >
                <FolderOpen size={16} /> View All Folders in Grid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TARGET CONFIGURATION MODAL */}
      {/* ======================================================== */}
      {isTargetModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsTargetModalOpen(false)}>
          <div
            className="modal-dialog glass-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Set Target Attendance"
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Attendance Target Goal</h3>
                <p className="modal-subtitle">Configure minimum target percentage (e.g. 75%)</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTargetModalOpen(false)}
                className="icon-btn close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTargetSubmit} className="modal-form">
              <div className="target-slider-wrap">
                <span className="target-large-display">{tempTarget}%</span>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="1"
                  value={tempTarget}
                  onChange={(e) => setTempTarget(parseInt(e.target.value, 10) || 75)}
                  className="target-slider"
                />
                <div className="slider-ticks">
                  <span>50%</span>
                  <span>75% (HBTU Min)</span>
                  <span>85%</span>
                  <span>95%</span>
                </div>
              </div>

              <div className="modal-buttons-row">
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(false)}
                  className="btn-secondary"
                  disabled={targetSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={targetSubmitting}>
                  {targetSubmitting ? 'Saving...' : 'Save Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* GESTURES & SHORTCUTS GUIDE MODAL */}
      {/* ======================================================== */}
      {isGestureGuideOpen && (
        <div className="modal-backdrop" onClick={() => setIsGestureGuideOpen(false)}>
          <div
            className="modal-dialog glass-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Gestures and Shortcuts Guide"
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Interaction & Gesture Guide</h3>
                <p className="modal-subtitle">Fast attendance workflows for mobile & desktop</p>
              </div>
              <button
                type="button"
                onClick={() => setIsGestureGuideOpen(false)}
                className="icon-btn close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="guide-content-list">
              <div className="guide-item">
                <div className="guide-badge green">Single Tap / Click</div>
                <div className="guide-desc">
                  <strong>Mark Present (P)</strong>: Marks Period 1 as Present, or toggles existing single period.
                </div>
              </div>

              <div className="guide-item">
                <div className="guide-badge red">Double Tap / Double Click</div>
                <div className="guide-desc">
                  <strong>Mark Absent (A)</strong>: Marks Period 1 as Absent with fine-tuned disambiguation.
                </div>
              </div>

              <div className="guide-item">
                <div className="guide-badge gray">Long Press / Right-Click</div>
                <div className="guide-desc">
                  <strong>Open Day Options Sheet</strong>: Manage multiple periods, add notes, or mark No Class.
                </div>
              </div>

              <div className="guide-item">
                <div className="guide-badge blue">Multiple Periods</div>
                <div className="guide-desc">
                  Dates with multiple class periods show a multi-period dot indicator. Tapping opens the Day Detail Panel.
                </div>
              </div>

              <div className="guide-item">
                <div className="guide-badge amber">Scroll Safety</div>
                <div className="guide-desc">
                  Swiping or dragging across the calendar cancels taps automatically so scrolling never marks attendance accidentally.
                </div>
              </div>
            </div>

            <div className="modal-buttons-row">
              <button
                type="button"
                onClick={() => setIsGestureGuideOpen(false)}
                className="btn-primary"
                style={{ width: '100%' }}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MORE OPTIONS SHEET */}
      {/* ======================================================== */}
      {isOptionsMenuOpen && (
        <div className="modal-backdrop" onClick={() => setIsOptionsMenuOpen(false)}>
          <div
            className="bottom-sheet glass-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Options Menu"
          >
            <div className="bottom-sheet-handle" />
            <div className="modal-header">
              <h3 className="modal-title">Attendance Options</h3>
              <button
                type="button"
                onClick={() => setIsOptionsMenuOpen(false)}
                className="icon-btn close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="options-menu-list">
              <button
                type="button"
                onClick={() => {
                  setIsOptionsMenuOpen(false)
                  setIsSubjectSwitcherOpen(true)
                }}
                className="option-menu-item"
              >
                <BookOpen size={18} />
                <span>Switch Subject</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOptionsMenuOpen(false)
                  setIsTargetModalOpen(true)
                }}
                className="option-menu-item"
              >
                <Target size={18} />
                <span>Change Target Attendance ({summaryData?.target || 75}%)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOptionsMenuOpen(false)
                  openAddPeriodModal(selectedDate)
                }}
                className="option-menu-item"
              >
                <Plus size={18} />
                <span>Add Period for {formatShortDate(selectedDate)}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOptionsMenuOpen(false)
                  handleExportCSV()
                }}
                className="option-menu-item"
              >
                <Download size={18} />
                <span>Export Attendance (CSV)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOptionsMenuOpen(false)
                  setIsGestureGuideOpen(true)
                }}
                className="option-menu-item"
              >
                <HelpCircle size={18} />
                <span>Gestures & Shortcuts Guide</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOptionsMenuOpen(false)
                  void loadData()
                }}
                className="option-menu-item"
              >
                <RefreshCw size={18} />
                <span>Refresh Attendance Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MONTH DETAILS BREAKDOWN MODAL */}
      {/* ======================================================== */}
      {selectedMonthModal && (
        <div className="modal-backdrop" onClick={() => setSelectedMonthModal(null)}>
          <div
            className="modal-dialog glass-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Month Attendance Breakdown"
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{selectedMonthModal.monthLabel}</h3>
                <p className="modal-subtitle">
                  {selectedMonthModal.formattedPercentage} Attendance
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMonthModal(null)}
                className="icon-btn close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-stats-summary">
              <div className="m-detail-chip">
                <span>Present</span>
                <strong className="text-emerald">{selectedMonthModal.present}</strong>
              </div>
              <div className="m-detail-chip">
                <span>Absent</span>
                <strong className="text-rose">{selectedMonthModal.absent}</strong>
              </div>
              <div className="m-detail-chip">
                <span>No Class</span>
                <strong className="text-muted">{selectedMonthModal.noClass}</strong>
              </div>
              <div className="m-detail-chip">
                <span>Total Classes</span>
                <strong>{selectedMonthModal.total}</strong>
              </div>
            </div>

            <div className="modal-buttons-row">
              <button
                type="button"
                onClick={() => setSelectedMonthModal(null)}
                className="btn-primary"
                style={{ width: '100%' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* LIQUID GLASS ATTENDANCE STYLES (MOBILE-FIRST) */}
      {/* ======================================================== */}
      <style jsx>{`
        .attendance-page-root {
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          padding: 1rem 1rem 3rem 1rem;
          color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          box-sizing: border-box;
          user-select: none;
        }

        /* ======================================================== */
        /* SUBJECT FOLDER GRID SYSTEM (VIEW A)                     */
        /* ======================================================== */
        .attendance-folders-view {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
          animation: folderFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes folderFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .folders-main-header {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          border-radius: 1.25rem;
          background: rgba(15, 23, 42, 0.72);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .folders-header-top {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .folders-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .folders-page-title {
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -0.025em;
          color: #ffffff;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .student-profile-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          background: rgba(56, 189, 248, 0.1);
          border: 1px solid rgba(56, 189, 248, 0.25);
          color: #38bdf8;
          font-size: 0.78rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .folders-page-subtitle {
          font-size: 0.88rem;
          color: #94a3b8;
          margin: 0;
        }

        .folders-overall-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          padding: 0.9rem 1.15rem;
          border-radius: 1rem;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .overall-stats-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .overall-label-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .overall-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #94a3b8;
        }

        .overall-status-pill {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.12rem 0.5rem;
          border-radius: 9999px;
          border: 1px solid;
          display: inline-flex;
          align-items: center;
        }

        .overall-pct-row {
          display: flex;
          align-items: baseline;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .overall-pct-num {
          font-size: 1.75rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1;
        }

        .overall-ratio-text {
          font-size: 0.85rem;
          color: #94a3b8;
          font-weight: 500;
        }

        .folders-header-actions {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .target-goal-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 0.85rem;
          font-size: 0.825rem;
          font-weight: 600;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #e2e8f0;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .target-goal-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.2);
        }

        /* TOOLBAR: SEARCH & FILTER */
        .folders-toolbar {
          padding: 0.85rem 1.15rem;
          border-radius: 1rem;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .folder-search-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .folder-search-input-wrap .search-icon {
          position: absolute;
          left: 0.85rem;
          color: #64748b;
          pointer-events: none;
        }

        .folder-search-input {
          width: 100%;
          padding: 0.65rem 2.25rem 0.65rem 2.45rem;
          font-size: 0.875rem;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .folder-search-input::placeholder {
          color: #64748b;
        }

        .folder-search-input:focus {
          border-color: rgba(56, 189, 248, 0.6);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
        }

        .clear-search-btn {
          position: absolute;
          right: 0.75rem;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem;
          border-radius: 0.35rem;
        }

        .clear-search-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
        }

        .folder-filter-pills {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.2rem;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .folder-filter-pills::-webkit-scrollbar {
          display: none;
        }

        .filter-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.38rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.09);
          color: #94a3b8;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .filter-chip:hover {
          background: rgba(255, 255, 255, 0.09);
          color: #ffffff;
        }

        .filter-chip.active {
          background: rgba(56, 189, 248, 0.15);
          border-color: rgba(56, 189, 248, 0.45);
          color: #38bdf8;
        }

        .chip-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .chip-dot.safe {
          background-color: #10b981;
        }

        .chip-dot.warning {
          background-color: #f59e0b;
        }

        .chip-dot.empty {
          background-color: #64748b;
        }

        /* SECTION HEADER */
        .folders-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding: 0.25rem 0.25rem 0 0.25rem;
        }

        .folders-section-title-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .section-folder-icon {
          color: #38bdf8;
        }

        .folders-section-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .folders-count-pill {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.15rem 0.5rem;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .folders-section-hint {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
        }

        /* EMPTY SEARCH STATE */
        .empty-folders-search {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 3rem 1.5rem;
          border-radius: 1.25rem;
          gap: 0.75rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .empty-folders-search .empty-icon {
          color: #64748b;
          margin-bottom: 0.25rem;
        }

        .empty-folders-search h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0;
        }

        .empty-folders-search p {
          font-size: 0.85rem;
          color: #94a3b8;
          max-width: 420px;
          margin: 0;
        }

        /* ======================================================== */
        /* RESPONSIVE SUBJECT FOLDERS GRID & DIGITAL CARDS          */
        /* ======================================================== */
        .subjects-folder-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
          width: 100%;
        }

        .subject-folder-card {
          aspect-ratio: 1 / 1;
          min-height: 200px;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          padding: 1.1rem;
          border-radius: 1.25rem;
          background: rgba(15, 23, 42, 0.72);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.2s ease,
                      background 0.2s ease;
          overflow: hidden;
          box-sizing: border-box;
          user-select: none;
        }

        /* Top subtle folder tab styling */
        .folder-tab-badge {
          position: absolute;
          top: 0;
          left: 1.1rem;
          background: rgba(255, 255, 255, 0.08);
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          padding: 0.15rem 0.55rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-top: none;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 1;
        }

        .folder-tab-code {
          font-size: 0.65rem;
          font-weight: 700;
          color: #94a3b8;
          font-family: monospace;
          letter-spacing: 0.04em;
        }

        .folder-top-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.5rem;
          width: 100%;
          margin-top: 0.5rem;
        }

        .folder-icon-plate {
          width: 44px;
          height: 44px;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid;
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }

        .folder-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.2rem 0.55rem;
          border-radius: 9999px;
          border: 1px solid;
          white-space: nowrap;
          max-width: 58%;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .status-dot-mini {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* Folder Middle: Subject Title & Chips */
        .folder-middle-stack {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
          flex: 1;
          justify-content: center;
          margin: 0.4rem 0;
        }

        .folder-subject-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #f8fafc;
          line-height: 1.25;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
        }

        .folder-sub-tags {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-wrap: wrap;
          margin-top: 0.2rem;
        }

        .folder-code-chip {
          font-size: 0.7rem;
          font-weight: 600;
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.1);
          padding: 0.1rem 0.35rem;
          border-radius: 0.25rem;
          border: 1px solid rgba(56, 189, 248, 0.2);
          font-family: monospace;
        }

        .folder-credit-chip {
          font-size: 0.65rem;
          color: #94a3b8;
          background: rgba(255, 255, 255, 0.05);
          padding: 0.1rem 0.35rem;
          border-radius: 0.25rem;
        }

        /* Folder Bottom: Attendance Stats & Progress Bar */
        .folder-bottom-stack {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          width: 100%;
          margin-top: auto;
        }

        .folder-pct-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 0.35rem;
          flex-wrap: wrap;
        }

        .folder-percentage-large {
          font-size: 1.25rem;
          font-weight: 800;
          line-height: 1;
        }

        .folder-counts-sub {
          font-size: 0.7rem;
          color: #94a3b8;
          white-space: nowrap;
          font-weight: 500;
        }

        .folder-progress-track {
          width: 100%;
          height: 5px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 9999px;
          overflow: hidden;
        }

        .folder-progress-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.3s ease;
        }

        .folder-empty-metrics {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .folder-empty-main {
          font-size: 0.8rem;
          font-weight: 600;
          color: #94a3b8;
        }

        .folder-empty-cta {
          font-size: 0.7rem;
          color: #38bdf8;
          font-weight: 500;
        }

        /* Folder Interactions */
        .subject-folder-card:hover {
          transform: translateY(-3px);
          border-color: rgba(56, 189, 248, 0.4);
          box-shadow: 0 12px 28px -6px rgba(0, 0, 0, 0.5), 0 0 15px -3px rgba(56, 189, 248, 0.2);
          background: rgba(15, 23, 42, 0.85);
        }

        .subject-folder-card:hover .folder-icon-plate {
          transform: scale(1.06);
        }

        .subject-folder-card:focus-visible {
          outline: 2px solid #38bdf8;
          outline-offset: 2px;
        }

        .subject-folder-card:active {
          transform: translateY(-1px) scale(0.99);
        }

        /* SKELETONS */
        .skeleton-folders-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
          width: 100%;
        }

        .skeleton-folder-card {
          aspect-ratio: 1 / 1;
          min-height: 200px;
          border-radius: 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 1.1rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }

        .skeleton-folder-card::after {
          content: '';
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0,
            rgba(255, 255, 255, 0.05) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .skeleton-shimmer-plate {
          width: 44px;
          height: 44px;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.06);
        }

        .skeleton-shimmer-line {
          height: 12px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.06);
          margin-bottom: 0.4rem;
        }

        /* EMPTY PROFILE VIEW */
        .attendance-empty-profile {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 3.5rem 1.5rem;
          border-radius: 1.5rem;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          max-width: 580px;
          margin: 2rem auto;
          gap: 1rem;
        }

        .attendance-empty-profile h2 {
          font-size: 1.35rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .attendance-empty-profile p {
          font-size: 0.9rem;
          color: #94a3b8;
          line-height: 1.5;
          margin: 0;
        }

        /* SWITCHER MODAL FOLDERS GRID */
        .modal-folders-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
          max-height: 52vh;
          overflow-y: auto;
          padding: 0.25rem;
          margin-top: 0.75rem;
        }

        .modal-folder-item {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          padding: 0.85rem;
          border-radius: 0.85rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .modal-folder-item:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(56, 189, 248, 0.4);
        }

        .modal-folder-item.active {
          background: rgba(56, 189, 248, 0.12);
          border-color: rgba(56, 189, 248, 0.5);
        }

        .modal-folder-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.35rem;
        }

        .modal-folder-icon {
          width: 28px;
          height: 28px;
          border-radius: 0.45rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid;
          background: rgba(255, 255, 255, 0.05);
        }

        .modal-folder-code {
          font-size: 0.7rem;
          font-weight: 700;
          color: #94a3b8;
          font-family: monospace;
        }

        .modal-folder-pct {
          font-size: 0.8rem;
          font-weight: 700;
        }

        .modal-folder-name {
          font-size: 0.825rem;
          font-weight: 600;
          color: #f8fafc;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .modal-folder-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.68rem;
          color: #94a3b8;
        }

        .modal-footer-action {
          margin-top: 1rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        /* WORKSPACE HEADER ADDITIONS */
        .back-to-folders-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 0.75rem;
          width: auto !important;
          border-radius: 0.65rem;
          background: rgba(56, 189, 248, 0.1);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: #38bdf8;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .back-to-folders-btn:hover {
          background: rgba(56, 189, 248, 0.2);
          border-color: #38bdf8;
          color: #ffffff;
        }

        .back-btn-label {
          font-size: 0.825rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .all-folders-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.75rem;
          border-radius: 0.65rem;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #e2e8f0;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .all-folders-action-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }

        /* LIQUID GLASS HEADER */
        .attendance-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-radius: 1rem;
          background: rgba(15, 23, 42, 0.72);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 0.85rem;
          gap: 0.75rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          min-width: 0;
          flex: 1;
        }

        .icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 0.65rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }

        .subject-info-btn {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          background: transparent;
          border: none;
          text-align: left;
          cursor: pointer;
          padding: 0;
          min-width: 0;
          flex: 1;
        }

        .subject-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 0.65rem;
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(129, 140, 248, 0.2));
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: #38bdf8;
          flex-shrink: 0;
        }

        .subject-text-stack {
          min-width: 0;
          flex: 1;
        }

        .subject-title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
        }

        .subject-name {
          font-size: 1.05rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .subject-code-tag {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 0.12rem 0.4rem;
          border-radius: 0.35rem;
          background: rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          flex-shrink: 0;
        }

        .subject-attendance-sub {
          font-size: 0.8rem;
          color: #94a3b8;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sub-pct-bold {
          font-weight: 700;
          color: #38bdf8;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .export-action-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.82rem;
          font-weight: 600;
          padding: 0.45rem 0.85rem;
          border-radius: 0.65rem;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #e2e8f0;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .export-action-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }

        /* SEGMENTED NAVIGATION CONTROL */
        .segmented-nav-wrap {
          margin-bottom: 1rem;
        }

        .segmented-nav {
          display: flex;
          padding: 0.3rem;
          border-radius: 0.85rem;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          gap: 0.35rem;
        }

        .segmented-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          padding: 0.6rem 0.85rem;
          border-radius: 0.65rem;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .segmented-tab.active {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }

        .tasks-active-badge {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #f59e0b;
        }

        /* CALENDAR VIEW */
        .calendar-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 0.85rem;
          border-radius: 0.85rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 0.65rem;
        }

        .month-selector {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .cal-nav-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cal-nav-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }

        .current-month-heading {
          font-size: 0.98rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0;
        }

        .cal-right-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .today-pill-btn {
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.3rem 0.65rem;
          border-radius: 0.5rem;
          background: rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: #38bdf8;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .today-pill-btn:hover {
          background: rgba(56, 189, 248, 0.22);
        }

        .guide-help-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.3rem 0.6rem;
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .gesture-helper-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          font-size: 0.76rem;
          color: #94a3b8;
          padding: 0.35rem 0.5rem;
          margin-bottom: 0.65rem;
          text-align: center;
        }

        .gesture-hint-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .hint-bullet.green {
          color: #10b981;
        }

        .hint-bullet.red {
          color: #ef4444;
        }

        .hint-bullet.gray {
          color: #64748b;
        }

        .gesture-sep {
          color: rgba(255, 255, 255, 0.15);
        }

        /* CALENDAR GRID */
        .calendar-grid-card {
          padding: 0.75rem;
          border-radius: 1rem;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 1rem;
        }

        .cal-weekdays-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          margin-bottom: 0.5rem;
        }

        .cal-weekday-header {
          font-size: 0.75rem;
          font-weight: 600;
          color: #94a3b8;
          padding: 0.3rem 0;
        }

        .cal-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.35rem;
        }

        /* CALENDAR DAY CELL */
        :global(.cal-day-cell) {
          aspect-ratio: 1 / 1.15;
          min-height: 58px;
          border-radius: 0.65rem;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 0.3rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
          touch-action: manipulation;
          position: relative;
        }

        :global(.cal-day-cell:hover) {
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(255, 255, 255, 0.18);
        }

        :global(.cal-day-cell.out-month) {
          opacity: 0.35;
        }

        :global(.cal-day-cell.is-today) {
          border-color: rgba(56, 189, 248, 0.55);
          box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.4);
        }

        :global(.cal-day-cell.is-selected) {
          background: rgba(255, 255, 255, 0.12);
          border-color: #38bdf8;
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
        }

        :global(.cal-day-header) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        :global(.cal-day-number) {
          font-size: 0.8rem;
          font-weight: 600;
          color: #e2e8f0;
        }

        :global(.cal-note-dot) {
          color: #38bdf8;
        }

        :global(.cal-day-content) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 24px;
        }

        :global(.cal-empty-slot) {
          width: 100%;
          height: 100%;
        }

        :global(.cal-status-chip) {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.15rem;
          width: 100%;
          padding: 0.15rem 0.2rem;
          border-radius: 0.4rem;
          font-size: 0.72rem;
          font-weight: 700;
          transition: transform 0.15s ease;
        }

        :global(.cal-status-chip.status-present) {
          background: rgba(16, 185, 129, 0.22);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.4);
        }

        :global(.cal-status-chip.status-absent) {
          background: rgba(239, 68, 68, 0.22);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        :global(.cal-status-chip.status-no_class) {
          background: rgba(100, 116, 139, 0.22);
          color: #94a3b8;
          border: 1px solid rgba(100, 116, 139, 0.35);
        }

        :global(.cal-multi-periods) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0.1rem 0.2rem;
          border-radius: 0.35rem;
          background: rgba(255, 255, 255, 0.08);
        }

        :global(.multi-dots) {
          display: flex;
          gap: 2px;
        }

        :global(.dot-indicator) {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }

        :global(.dot-indicator.dot-present) {
          background: #10b981;
        }

        :global(.dot-indicator.dot-absent) {
          background: #ef4444;
        }

        :global(.dot-indicator.dot-no_class) {
          background: #94a3b8;
        }

        :global(.multi-count) {
          font-size: 0.68rem;
          font-weight: 700;
          color: #cbd5e1;
        }

        /* DAY DETAIL PANEL */
        .day-detail-panel {
          padding: 0.95rem;
          border-radius: 1rem;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .day-detail-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.85rem;
        }

        .detail-date-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .detail-date-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0;
        }

        .today-badge {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.1rem 0.4rem;
          border-radius: 0.3rem;
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
        }

        .add-period-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 0.35rem 0.75rem;
          border-radius: 0.55rem;
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.35);
          color: #38bdf8;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .add-period-btn:hover {
          background: rgba(56, 189, 248, 0.25);
        }

        .no-records-day-box {
          padding: 0.85rem;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.025);
          text-align: center;
        }

        .no-records-text {
          font-size: 0.84rem;
          color: #94a3b8;
          margin-bottom: 0.75rem;
        }

        .quick-add-buttons {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .quick-action-pill {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.35rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .quick-action-pill.present {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border-color: rgba(16, 185, 129, 0.35);
        }

        .quick-action-pill.present:hover {
          background: rgba(16, 185, 129, 0.25);
        }

        .quick-action-pill.absent {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.35);
        }

        .quick-action-pill.absent:hover {
          background: rgba(239, 68, 68, 0.25);
        }

        .quick-action-pill.no-class {
          background: rgba(100, 116, 139, 0.15);
          color: #94a3b8;
          border-color: rgba(100, 116, 139, 0.35);
        }

        .day-periods-list {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }

        .period-card-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 0.85rem;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.07);
          gap: 0.5rem;
        }

        .period-info {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .period-badge {
          font-size: 0.82rem;
          font-weight: 700;
          color: #f1f5f9;
        }

        .status-pill {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.15rem 0.5rem;
          border-radius: 0.4rem;
        }

        .status-pill.status-present {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .status-pill.status-absent {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .status-pill.status-no_class {
          background: rgba(100, 116, 139, 0.15);
          color: #94a3b8;
          border: 1px solid rgba(100, 116, 139, 0.3);
        }

        .period-notes-snippet {
          font-size: 0.75rem;
          color: #94a3b8;
          font-style: italic;
        }

        .period-actions {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .status-quick-btn {
          width: 28px;
          height: 28px;
          border-radius: 0.45rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .status-quick-btn.present {
          color: #34d399;
        }

        .status-quick-btn.present.active {
          background: rgba(16, 185, 129, 0.3);
          border-color: #10b981;
        }

        .status-quick-btn.absent {
          color: #f87171;
        }

        .status-quick-btn.absent.active {
          background: rgba(239, 68, 68, 0.3);
          border-color: #ef4444;
        }

        .status-quick-btn.no-class {
          color: #94a3b8;
        }

        .status-quick-btn.no-class.active {
          background: rgba(100, 116, 139, 0.3);
          border-color: #64748b;
        }

        .icon-sub-btn {
          width: 28px;
          height: 28px;
          border-radius: 0.45rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .icon-sub-btn.delete {
          color: #f87171;
        }

        .icon-sub-btn:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        /* STATISTICS VIEW */
        .stats-metric-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 0.65rem;
          margin-bottom: 0.85rem;
        }

        .stat-card {
          padding: 0.85rem;
          border-radius: 0.85rem;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
        }

        .stat-card.present-border {
          border-left: 3px solid #10b981;
        }

        .stat-card.absent-border {
          border-left: 3px solid #ef4444;
        }

        .stat-label {
          font-size: 0.74rem;
          color: #94a3b8;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .stat-val {
          font-size: 1.45rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.2;
        }

        .stat-sub {
          font-size: 0.68rem;
          color: #64748b;
          margin-top: 0.25rem;
        }

        .text-emerald {
          color: #34d399 !important;
        }

        .text-rose {
          color: #f87171 !important;
        }

        .text-muted {
          color: #94a3b8 !important;
        }

        .text-accent {
          color: #38bdf8 !important;
        }

        /* TARGET ANALYSIS BANNER */
        .target-analysis-banner {
          padding: 1rem;
          border-radius: 1rem;
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 1rem;
        }

        .target-banner-top {
          display: flex;
          gap: 0.85rem;
          align-items: flex-start;
          margin-bottom: 0.85rem;
        }

        .target-icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 0.75rem;
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .target-banner-text h4 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 0.25rem 0;
        }

        .target-advice-description {
          font-size: 0.88rem;
          color: #cbd5e1;
          margin: 0;
          line-height: 1.45;
        }

        .target-progress-container {
          padding-top: 0.5rem;
        }

        .progress-labels-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          color: #94a3b8;
          margin-bottom: 0.35rem;
        }

        .progress-track {
          width: 100%;
          height: 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.08);
          position: relative;
          overflow: visible;
        }

        .progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .target-marker-line {
          position: absolute;
          top: -3px;
          bottom: -3px;
          width: 2px;
          background: #38bdf8;
          box-shadow: 0 0 6px #38bdf8;
        }

        /* MONTHLY STATS & COMPARISON */
        .monthly-stats-section,
        .subjects-comparison-section {
          padding: 1rem;
          border-radius: 1rem;
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 1rem;
        }

        .section-title-row {
          margin-bottom: 0.85rem;
        }

        .section-title {
          font-size: 0.98rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 0.2rem 0;
        }

        .section-subtitle {
          font-size: 0.76rem;
          color: #94a3b8;
        }

        .monthly-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 0.75rem;
        }

        .month-stat-card {
          padding: 0.85rem;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.08);
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .month-stat-card:hover {
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(255, 255, 255, 0.18);
        }

        .m-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.45rem;
        }

        .m-card-name {
          font-size: 0.88rem;
          font-weight: 700;
          color: #ffffff;
        }

        .m-card-pct {
          font-size: 0.88rem;
          font-weight: 800;
        }

        .m-card-progress {
          width: 100%;
          height: 5px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.08);
          margin-bottom: 0.5rem;
          overflow: hidden;
        }

        .m-progress-fill {
          height: 100%;
          border-radius: 3px;
        }

        .m-card-counts {
          display: flex;
          justify-content: space-between;
          font-size: 0.72rem;
          color: #94a3b8;
        }

        .subject-comparison-table-wrap {
          overflow-x: auto;
        }

        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.84rem;
        }

        .comparison-table th {
          text-align: left;
          padding: 0.65rem 0.75rem;
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.74rem;
          text-transform: uppercase;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .comparison-row {
          cursor: pointer;
          transition: background 0.15s ease;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .comparison-row:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .comparison-row.is-active-subject {
          background: rgba(56, 189, 248, 0.08);
        }

        .comparison-table td {
          padding: 0.75rem;
          color: #e2e8f0;
        }

        .sub-table-title {
          display: flex;
          flex-direction: column;
        }

        .sub-code-inline {
          font-size: 0.72rem;
          color: #94a3b8;
        }

        .status-badge {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 0.15rem 0.5rem;
          border-radius: 0.4rem;
          border: 1px solid transparent;
        }

        /* TASKS TAB */
        .tasks-header-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.95rem;
          border-radius: 1rem;
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 0.85rem;
        }

        .tasks-header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .tasks-title {
          font-size: 0.98rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .tasks-subtitle {
          font-size: 0.78rem;
          color: #94a3b8;
          margin: 0;
        }

        .tasks-progress-text {
          font-size: 0.78rem;
          font-weight: 600;
          color: #38bdf8;
          padding: 0.25rem 0.65rem;
          border-radius: 0.5rem;
          background: rgba(56, 189, 248, 0.12);
        }

        .tasks-list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .task-item-card {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          padding: 0.85rem;
          border-radius: 0.85rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .task-item-card:hover {
          background: rgba(255, 255, 255, 0.04);
        }

        .task-item-card.is-completed {
          opacity: 0.65;
        }

        .task-checkbox {
          width: 22px;
          height: 22px;
          border-radius: 0.4rem;
          border: 1px solid rgba(255, 255, 255, 0.25);
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          cursor: pointer;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .task-checkbox.checked {
          background: #10b981;
          border-color: #10b981;
        }

        .task-content {
          flex: 1;
          min-width: 0;
        }

        .task-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .task-name {
          font-size: 0.9rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0;
        }

        .task-desc {
          font-size: 0.8rem;
          color: #94a3b8;
          margin: 0;
        }

        .task-badge {
          font-size: 0.68rem;
          font-weight: 600;
          padding: 0.1rem 0.45rem;
          border-radius: 0.35rem;
        }

        .task-badge.badge-success {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
        }

        .task-badge.badge-warning {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
        }

        .task-badge.badge-danger {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
        }

        .task-badge.badge-info {
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
        }

        /* UNDO TOAST */
        .undo-toast-wrap {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          z-index: 1000;
          animation: slideUpToast 0.25s ease-out;
        }

        @keyframes slideUpToast {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .undo-toast {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(56, 189, 248, 0.4);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);
        }

        .undo-message-text {
          font-size: 0.85rem;
          font-weight: 600;
          color: #ffffff;
        }

        .undo-action-btn {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.82rem;
          font-weight: 700;
          padding: 0.35rem 0.75rem;
          border-radius: 0.5rem;
          background: #38bdf8;
          color: #0f172a;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .undo-action-btn:hover {
          background: #7dd3fc;
        }

        /* GENERAL TOAST */
        .general-toast-wrap {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
        }

        .general-toast {
          padding: 0.65rem 1.25rem;
          border-radius: 0.75rem;
          font-size: 0.85rem;
          font-weight: 600;
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        }

        .general-toast.toast-success {
          border-color: rgba(16, 185, 129, 0.5);
          color: #34d399;
        }

        .general-toast.toast-error {
          border-color: rgba(239, 68, 68, 0.5);
          color: #f87171;
        }

        .general-toast.toast-info {
          border-color: rgba(56, 189, 248, 0.5);
          color: #38bdf8;
        }

        /* MODALS & BOTTOM SHEETS */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          padding: 1rem;
        }

        .modal-dialog {
          width: 100%;
          max-width: 440px;
          padding: 1.25rem;
          border-radius: 1.25rem;
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        }

        .bottom-sheet {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          max-width: 540px;
          margin: 0 auto;
          padding: 1.25rem;
          border-radius: 1.5rem 1.5rem 0 0;
          background: rgba(15, 23, 42, 0.96);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-bottom: none;
          box-shadow: 0 -20px 40px rgba(0, 0, 0, 0.6);
          max-height: 85vh;
          overflow-y: auto;
        }

        .bottom-sheet-handle {
          width: 38px;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.2);
          margin: 0 auto 1rem auto;
        }

        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .modal-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 0.2rem 0;
        }

        .modal-subtitle {
          font-size: 0.8rem;
          color: #94a3b8;
          margin: 0;
        }

        .close-btn {
          width: 32px;
          height: 32px;
        }

        .day-sheet-actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .sheet-quick-buttons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        .sheet-action-tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 0.75rem 0.5rem;
          border-radius: 0.75rem;
          border: 1px solid transparent;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .sheet-action-tile.present {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border-color: rgba(16, 185, 129, 0.35);
        }

        .sheet-action-tile.absent {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.35);
        }

        .sheet-action-tile.no-class {
          background: rgba(100, 116, 139, 0.15);
          color: #94a3b8;
          border-color: rgba(100, 116, 139, 0.35);
        }

        .sheet-periods-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .sheet-section-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.25rem;
        }

        .sheet-section-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: #cbd5e1;
          margin: 0;
        }

        .sheet-add-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.25rem 0.65rem;
          border-radius: 0.4rem;
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
          border: none;
          cursor: pointer;
        }

        .sheet-empty-text {
          font-size: 0.82rem;
          color: #94a3b8;
          text-align: center;
          padding: 0.85rem;
        }

        .sheet-period-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 0.85rem;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .sheet-period-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .sheet-p-badge {
          font-size: 0.82rem;
          font-weight: 700;
          color: #f1f5f9;
        }

        .sheet-notes-text {
          font-size: 0.75rem;
          color: #94a3b8;
          font-style: italic;
        }

        .sheet-period-right {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .sheet-btn {
          width: 30px;
          height: 30px;
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .sheet-btn.delete {
          color: #f87171;
        }

        /* FORMS IN MODALS */
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .form-error-banner {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 0.75rem;
          border-radius: 0.55rem;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #f87171;
          font-size: 0.8rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .form-group label {
          font-size: 0.78rem;
          font-weight: 600;
          color: #cbd5e1;
        }

        .form-input {
          padding: 0.65rem 0.85rem;
          border-radius: 0.65rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #ffffff;
          font-size: 0.88rem;
          outline: none;
          box-sizing: border-box;
          width: 100%;
        }

        .form-input:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
        }

        .status-radio-group {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        .radio-tile {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 0.65rem;
          border-radius: 0.65rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .radio-tile.present.active {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border-color: #10b981;
        }

        .radio-tile.absent.active {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border-color: #ef4444;
        }

        .radio-tile.no-class.active {
          background: rgba(100, 116, 139, 0.2);
          color: #94a3b8;
          border-color: #64748b;
        }

        .modal-buttons-row {
          display: flex;
          justify-content: flex-end;
          gap: 0.65rem;
          margin-top: 0.5rem;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.65rem 1.15rem;
          border-radius: 0.65rem;
          background: #38bdf8;
          color: #0f172a;
          font-weight: 700;
          font-size: 0.86rem;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .btn-primary:hover {
          background: #7dd3fc;
        }

        .btn-secondary {
          padding: 0.65rem 1rem;
          border-radius: 0.65rem;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #e2e8f0;
          font-weight: 600;
          font-size: 0.86rem;
          cursor: pointer;
        }

        .btn-danger {
          padding: 0.65rem 1.15rem;
          border-radius: 0.65rem;
          background: #ef4444;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.86rem;
          border: none;
          cursor: pointer;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        /* SUBJECTS PICKER LIST */
        .subjects-picker-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 60vh;
          overflow-y: auto;
        }

        .subject-picker-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 0.85rem;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transition: all 0.18s ease;
          text-align: left;
        }

        .subject-picker-item:hover,
        .subject-picker-item.active {
          background: rgba(56, 189, 248, 0.12);
          border-color: rgba(56, 189, 248, 0.35);
        }

        .picker-left {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .picker-icon {
          width: 34px;
          height: 34px;
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #38bdf8;
        }

        .picker-text {
          display: flex;
          flex-direction: column;
        }

        .picker-name {
          font-size: 0.9rem;
          font-weight: 700;
          color: #ffffff;
        }

        .picker-code {
          font-size: 0.74rem;
          color: #94a3b8;
        }

        .picker-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.2rem;
        }

        .picker-pct {
          font-size: 0.92rem;
          font-weight: 800;
        }

        .picker-status-tag {
          font-size: 0.68rem;
          font-weight: 600;
          padding: 0.1rem 0.4rem;
          border-radius: 0.35rem;
          border: 1px solid transparent;
        }

        /* TARGET SLIDER */
        .target-slider-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.85rem;
          padding: 1rem 0;
        }

        .target-large-display {
          font-size: 2.5rem;
          font-weight: 800;
          color: #38bdf8;
        }

        .target-slider {
          width: 100%;
          cursor: pointer;
          accent-color: #38bdf8;
        }

        .slider-ticks {
          display: flex;
          justify-content: space-between;
          width: 100%;
          font-size: 0.72rem;
          color: #94a3b8;
        }

        /* GUIDE CONTENT */
        .guide-content-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }

        .guide-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.65rem 0.85rem;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }

        .guide-badge {
          display: inline-block;
          font-size: 0.74rem;
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: 0.35rem;
          width: fit-content;
        }

        .guide-badge.green {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
        }

        .guide-badge.red {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
        }

        .guide-badge.gray {
          background: rgba(100, 116, 139, 0.15);
          color: #94a3b8;
        }

        .guide-badge.blue {
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
        }

        .guide-badge.amber {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
        }

        .guide-desc {
          font-size: 0.82rem;
          color: #cbd5e1;
          line-height: 1.4;
        }

        /* OPTIONS MENU */
        .options-menu-list {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .option-menu-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 0.85rem;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.07);
          color: #e2e8f0;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          width: 100%;
          text-align: left;
        }

        .option-menu-item:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        /* MONTH DETAIL MODAL */
        .modal-stats-summary {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.65rem;
          margin-bottom: 1.25rem;
        }

        .m-detail-chip {
          padding: 0.75rem;
          border-radius: 0.65rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
        }

        .m-detail-chip span {
          font-size: 0.74rem;
          color: #94a3b8;
        }

        .m-detail-chip strong {
          font-size: 1.2rem;
          color: #ffffff;
          margin-top: 0.15rem;
        }

        /* RESPONSIVE DESIGN */
        @media (max-width: 1024px) {
          .subjects-folder-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .skeleton-folders-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .attendance-page-root {
            padding: 0.75rem 0.5rem 3rem 0.5rem;
          }

          .attendance-header {
            padding: 0.65rem 0.75rem;
          }

          .export-btn-text,
          .guide-btn-text,
          .back-btn-label {
            display: none;
          }

          .export-action-btn {
            padding: 0.5rem;
          }

          .subjects-folder-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.65rem;
          }

          .skeleton-folders-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.65rem;
          }

          .subject-folder-card {
            padding: 0.75rem;
            min-height: 165px;
            border-radius: 1rem;
          }

          .folder-icon-plate {
            width: 36px;
            height: 36px;
            border-radius: 0.6rem;
          }

          .folder-status-pill {
            font-size: 0.6rem;
            padding: 0.15rem 0.4rem;
          }

          .folder-subject-title {
            font-size: 0.825rem;
            -webkit-line-clamp: 2;
          }

          .folder-percentage-large {
            font-size: 1.05rem;
          }

          .folder-counts-sub {
            font-size: 0.65rem;
          }

          .modal-folders-grid {
            grid-template-columns: 1fr;
          }

          .folders-overall-card {
            flex-direction: column;
            align-items: flex-start;
          }

          .folders-header-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .cal-day-cell {
            min-height: 50px;
            padding: 0.2rem;
          }

          .cal-day-number {
            font-size: 0.75rem;
          }

          .sheet-action-tile {
            font-size: 0.72rem;
            padding: 0.6rem 0.35rem;
          }

          .undo-toast-wrap {
            left: 1rem;
            right: 1rem;
            bottom: 1rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .attendance-folders-view,
          .subject-folder-card,
          .folder-progress-fill,
          .modal-folder-item {
            animation: none !important;
            transition: none !important;
          }
          .subject-folder-card:hover {
            transform: none !important;
          }
          .skeleton-folder-card::after {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
