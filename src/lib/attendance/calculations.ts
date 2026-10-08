/**
 * Pure, authoritative attendance calculation engine.
 * Implements exact mathematical formulas for attendance monitoring,
 * target thresholds, absence headroom, consecutive recovery classes,
 * date normalization, and monthly/subject analytics.
 */

export type AttendanceStatus = 'safe' | 'at_target' | 'below_target' | 'critical' | 'no_records'
export type AttendanceRecordStatus = 'present' | 'absent' | 'no_class'

export interface AttendanceMetrics {
  attended: number
  missed: number
  noClass: number
  total: number // Conducted classes (attended + missed)
  totalEntries: number // All logged records (attended + missed + noClass)
  percentage: number | null
  formattedPercentage: string
  hasRecords: boolean
  target: number
  status: AttendanceStatus
  statusLabel: string
  classesCanMiss: number
  classesNeededToAttend: number | null
  isRecoveryUnreachable: boolean
}

export interface SubjectAttendanceSummary extends AttendanceMetrics {
  subjectId: string
  subjectCode: string
  subjectName: string
  credits?: number
  category?: string
  semesterNumber?: number
}

export interface OverallAttendanceSummary extends AttendanceMetrics {
  subjectsCount: number
  activeSubjectsCount: number
}

export interface MonthlySubjectBreakdownItem {
  subjectId: string
  subjectCode: string
  subjectName: string
  present: number
  absent: number
  noClass: number
  total: number // conducted = present + absent
  totalEntries: number
  percentage: number | null
  formattedPercentage: string
  status: AttendanceStatus
  statusLabel: string
}

export interface MonthlyAttendanceSummary {
  yearMonth: string // e.g. "2026-10"
  monthLabel: string // e.g. "October 2026"
  year: number
  month: number // 1..12
  present: number
  absent: number
  noClass: number
  total: number // conducted = present + absent
  totalEntries: number
  percentage: number | null
  formattedPercentage: string
  status: AttendanceStatus
  statusLabel: string
  subjects: MonthlySubjectBreakdownItem[]
}

export interface RawAttendanceRecord {
  id: string
  subject_id: string
  date: string // YYYY-MM-DD
  status: AttendanceRecordStatus
  class_number: number
  notes?: string | null
  created_at?: string
}

/**
 * Normalizes input date strings into authoritative YYYY-MM-DD representation.
 * Supports:
 * - YYYY-MM-DD (e.g. 2026-10-08)
 * - DD/MM/YYYY (e.g. 08/10/2026)
 * - DD-MM-YYYY (e.g. 08-10-2026)
 * - YYYY/MM/DD (e.g. 2026/10/08)
 * - ISO 8601 strings (e.g. 2026-10-08T00:00:00.000Z)
 */
export function normalizeAttendanceDate(input: unknown): string | null {
  if (!input || typeof input !== 'string') return null
  const str = input.trim()
  if (!str) return null

  // 1. ISO string with time
  if (str.includes('T')) {
    const datePart = str.split('T')[0]
    return normalizeAttendanceDate(datePart)
  }

  // 2. Standard YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(str)
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10)
    const month = parseInt(ymdMatch[2], 10)
    const day = parseInt(ymdMatch[3], 10)
    return validateAndFormatDate(year, month, day)
  }

  // 3. Indian / British DD/MM/YYYY or DD-MM-YYYY (e.g. 08/10/2026)
  const dmyMatch = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(str)
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10)
    const month = parseInt(dmyMatch[2], 10)
    const year = parseInt(dmyMatch[3], 10)
    return validateAndFormatDate(year, month, day)
  }

  return null
}

function validateAndFormatDate(year: number, month: number, day: number): string | null {
  if (year < 2000 || year > 2100) return null
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null

  // Validate exact calendar days (handles leap years & 30-day months)
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null
  }

  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function formatMonthYearLabel(year: number, month: number): string {
  const name = MONTH_NAMES[month - 1] || 'Month'
  return `${name} ${year}`
}

/**
 * Calculates attendance status based on current percentage and target.
 */
export function calculateAttendanceStatus(
  percentage: number | null,
  target: number,
  total: number
): { status: AttendanceStatus; statusLabel: string } {
  if (total === 0 || percentage === null) {
    return { status: 'no_records', statusLabel: 'No records yet' }
  }

  if (percentage >= target + 5) {
    return { status: 'safe', statusLabel: 'Safe' }
  }
  if (percentage >= target) {
    return { status: 'at_target', statusLabel: 'At Target' }
  }
  if (percentage >= target - 10) {
    return { status: 'below_target', statusLabel: 'Below Target' }
  }
  return { status: 'critical', statusLabel: 'Critical' }
}

/**
 * Calculates maximum additional classes a student can safely miss
 * while keeping their attendance at or above the target percentage.
 */
export function calculateClassesCanMiss(attended: number, total: number, target: number): number {
  if (target <= 0) return 999 // Target is 0%, can miss indefinitely
  if (total <= 0 || attended <= 0) return 0
  if (target > 100) return 0

  const p = target / 100
  const currentRatio = attended / total

  if (currentRatio < p) return 0
  if (target >= 100) return 0

  const rawX = (attended * 100) / target - total
  const safeMiss = Math.floor(rawX + 1e-9)

  return Math.max(0, safeMiss)
}

/**
 * Calculates the minimum consecutive future classes a student must attend
 * to bring their attendance percentage back up to the target.
 */
export function calculateClassesNeededToAttend(
  attended: number,
  total: number,
  target: number
): { needed: number | null; unreachable: boolean } {
  if (total <= 0) {
    return { needed: 0, unreachable: false }
  }

  const missed = total - attended
  const currentRatio = attended / total
  const p = target / 100

  if (currentRatio >= p) {
    return { needed: 0, unreachable: false }
  }

  if (target >= 100) {
    if (missed > 0) {
      return { needed: null, unreachable: true }
    }
    return { needed: 0, unreachable: false }
  }

  const numerator = target * total - 100 * attended
  const denominator = 100 - target

  if (denominator <= 0) {
    return { needed: null, unreachable: true }
  }

  const rawX = numerator / denominator
  const needed = Math.max(0, Math.ceil(rawX - 1e-9))

  return { needed, unreachable: false }
}

/**
 * Computes complete metrics given attended count, total count, and target percentage.
 */
export function computeAttendanceMetrics(
  attended: number,
  total: number,
  target = 75,
  noClass = 0
): AttendanceMetrics {
  const safeAttended = Math.max(0, Math.floor(attended))
  const safeTotal = Math.max(safeAttended, Math.floor(total))
  const missed = safeTotal - safeAttended
  const safeNoClass = Math.max(0, Math.floor(noClass))
  const safeTarget = Math.min(100, Math.max(0, target))

  const hasRecords = safeTotal > 0
  let percentage: number | null = null
  let formattedPercentage = '—'

  if (hasRecords) {
    const rawPct = (safeAttended / safeTotal) * 100
    percentage = Math.round(rawPct * 100) / 100 // 2 decimal precision
    formattedPercentage = `${percentage.toFixed(2)}%`
  }

  const { status, statusLabel } = calculateAttendanceStatus(percentage, safeTarget, safeTotal)
  const classesCanMiss = calculateClassesCanMiss(safeAttended, safeTotal, safeTarget)
  const { needed, unreachable } = calculateClassesNeededToAttend(safeAttended, safeTotal, safeTarget)

  return {
    attended: safeAttended,
    missed,
    noClass: safeNoClass,
    total: safeTotal,
    totalEntries: safeTotal + safeNoClass,
    percentage,
    formattedPercentage,
    hasRecords,
    target: safeTarget,
    status,
    statusLabel,
    classesCanMiss,
    classesNeededToAttend: needed,
    isRecoveryUnreachable: unreachable,
  }
}

/**
 * Aggregates raw attendance records into monthly summaries with subject breakdowns.
 */
export function aggregateMonthlyAttendance(
  records: RawAttendanceRecord[],
  subjectsMap: Map<string, { id: string; subject_name: string; subject_code: string }>,
  target = 75
): MonthlyAttendanceSummary[] {
  // Map of "YYYY-MM" -> { present, absent, noClass, total, subjectsMap: Map<subjectId, { present, absent, noClass }> }
  const monthMap = new Map<
    string,
    {
      year: number
      month: number
      present: number
      absent: number
      noClass: number
      subjects: Map<string, { present: number; absent: number; noClass: number }>
    }
  >()

  for (const rec of records) {
    const normalizedDate = normalizeAttendanceDate(rec.date)
    if (!normalizedDate) continue

    const [yearStr, monthStr] = normalizedDate.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)
    const yearMonth = `${yearStr}-${monthStr}`

    let mData = monthMap.get(yearMonth)
    if (!mData) {
      mData = {
        year,
        month,
        present: 0,
        absent: 0,
        noClass: 0,
        subjects: new Map(),
      }
      monthMap.set(yearMonth, mData)
    }

    if (rec.status === 'present') {
      mData.present += 1
    } else if (rec.status === 'absent') {
      mData.absent += 1
    } else if (rec.status === 'no_class') {
      mData.noClass += 1
    }

    let sData = mData.subjects.get(rec.subject_id)
    if (!sData) {
      sData = { present: 0, absent: 0, noClass: 0 }
      mData.subjects.set(rec.subject_id, sData)
    }

    if (rec.status === 'present') {
      sData.present += 1
    } else if (rec.status === 'absent') {
      sData.absent += 1
    } else if (rec.status === 'no_class') {
      sData.noClass += 1
    }
  }

  // Sort months chronologically descending (newest first)
  const sortedKeys = Array.from(monthMap.keys()).sort((a, b) => b.localeCompare(a))

  return sortedKeys.map((ym) => {
    const mData = monthMap.get(ym)!
    const totalConducted = mData.present + mData.absent
    const totalEntries = totalConducted + mData.noClass
    const rawPct = totalConducted > 0 ? (mData.present / totalConducted) * 100 : null
    const percentage = rawPct !== null ? Math.round(rawPct * 100) / 100 : null
    const formattedPercentage = percentage !== null ? `${percentage.toFixed(2)}%` : '—'
    const { status, statusLabel } = calculateAttendanceStatus(percentage, target, totalConducted)

    // Build subject breakdown for this month
    const subjects: MonthlySubjectBreakdownItem[] = Array.from(mData.subjects.entries())
      .map(([sId, counts]) => {
        const sub = subjectsMap.get(sId)
        const subConducted = counts.present + counts.absent
        const subEntries = subConducted + counts.noClass
        const subRawPct = subConducted > 0 ? (counts.present / subConducted) * 100 : null
        const subPct = subRawPct !== null ? Math.round(subRawPct * 100) / 100 : null
        const { status: sStatus, statusLabel: sLabel } = calculateAttendanceStatus(subPct, target, subConducted)

        return {
          subjectId: sId,
          subjectCode: sub?.subject_code || '',
          subjectName: sub?.subject_name || 'Subject',
          present: counts.present,
          absent: counts.absent,
          noClass: counts.noClass,
          total: subConducted,
          totalEntries: subEntries,
          percentage: subPct,
          formattedPercentage: subPct !== null ? `${subPct.toFixed(2)}%` : '—',
          status: sStatus,
          statusLabel: sLabel,
        }
      })
      .sort((a, b) => a.subjectCode.localeCompare(b.subjectCode))

    return {
      yearMonth: ym,
      monthLabel: formatMonthYearLabel(mData.year, mData.month),
      year: mData.year,
      month: mData.month,
      present: mData.present,
      absent: mData.absent,
      noClass: mData.noClass,
      total: totalConducted,
      totalEntries,
      percentage,
      formattedPercentage,
      status,
      statusLabel,
      subjects,
    }
  })
}

