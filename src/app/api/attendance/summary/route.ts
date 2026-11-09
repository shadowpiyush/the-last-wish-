import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  computeAttendanceMetrics,
  aggregateMonthlyAttendance,
  type SubjectAttendanceSummary,
  type OverallAttendanceSummary,
} from '@/lib/attendance/calculations'
import {
  fetchStudentRecords,
  getStudentTarget,
} from '@/lib/attendance/repository'

export const dynamic = 'force-dynamic'

function getFirst<T>(item: T | T[] | null | undefined): T | null {
  if (!item) return null
  return Array.isArray(item) ? item[0] ?? null : item
}

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Your session has expired. Please sign in again.' },
        { status: 401 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminDb =
      supabaseUrl && serviceKey
        ? createAdminClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        : supabase

    // 1. Concurrently fetch Profile with program/branch joined, Target, and Attendance Records
    const [profileRes, targetPercentage, attendanceRecords] = await Promise.all([
      adminDb
        .from('profiles')
        .select(`
          id, program_id, branch_id, current_semester, current_year, full_name, role,
          branches (name, code),
          programs (name, short_code)
        `)
        .eq('id', user.id)
        .maybeSingle(),
      getStudentTarget(user.id),
      fetchStudentRecords(user.id),
    ])

    const profile = profileRes.data
    const profileBranch = getFirst(profile?.branches)
    const profileProgram = getFirst(profile?.programs)
    const branchName = profileBranch?.name || null
    const programName = profileProgram?.short_code || profileProgram?.name || null

    // 2. Fetch canonical assigned subjects for student's exact academic context
    let subjectsQuery = adminDb
      .from('subjects')
      .select('id, subject_code, subject_name, credits, category, semester_number, branch_id, program_id')
      .eq('status', 'active')

    if (profile?.branch_id && profile?.current_semester) {
      subjectsQuery = subjectsQuery
        .eq('semester_number', profile.current_semester)
        .or(`branch_id.eq.${profile.branch_id},branch_id.is.null`)

      if (profile.program_id) {
        subjectsQuery = subjectsQuery.or(`program_id.eq.${profile.program_id},program_id.is.null`)
      }
    } else if (profile?.branch_id) {
      subjectsQuery = subjectsQuery.eq('branch_id', profile.branch_id)
    }

    const { data: rawSubjects } = await subjectsQuery.order('subject_code', {
      ascending: true,
    })

    const subjectsList = rawSubjects || []

    // 3. Build subject map from strictly assigned subjects
    const subjectsMap = new Map<string, { id: string; subject_name: string; subject_code: string }>()
    const assignedSubjectIdSet = new Set<string>()
    subjectsList.forEach((s) => {
      subjectsMap.set(s.id, s)
      assignedSubjectIdSet.add(s.id)
    })

    // 4. Aggregate subject-wise totals only for assigned subjects
    const subjectCountsMap = new Map<string, { attended: number; missed: number; noClass: number }>()
    let overallAttended = 0
    let overallMissed = 0
    let overallNoClass = 0

    for (const record of attendanceRecords) {
      if (!assignedSubjectIdSet.has(record.subject_id)) {
        continue
      }

      const counts = subjectCountsMap.get(record.subject_id) || { attended: 0, missed: 0, noClass: 0 }
      if (record.status === 'present') {
        counts.attended += 1
        overallAttended += 1
      } else if (record.status === 'absent') {
        counts.missed += 1
        overallMissed += 1
      } else if (record.status === 'no_class') {
        counts.noClass += 1
        overallNoClass += 1
      }
      subjectCountsMap.set(record.subject_id, counts)
    }

    const subjects: SubjectAttendanceSummary[] = subjectsList.map((subject) => {
      const counts = subjectCountsMap.get(subject.id) || { attended: 0, missed: 0, noClass: 0 }
      const total = counts.attended + counts.missed
      const metrics = computeAttendanceMetrics(counts.attended, total, targetPercentage, counts.noClass)

      return {
        ...metrics,
        subjectId: subject.id,
        subjectCode: subject.subject_code,
        subjectName: subject.subject_name,
        credits: subject.credits,
        category: subject.category,
        semesterNumber: subject.semester_number,
      }
    })

    // 5. Build Overall Metrics
    const overallTotal = overallAttended + overallMissed
    const overallMetrics = computeAttendanceMetrics(overallAttended, overallTotal, targetPercentage, overallNoClass)
    const overallSummary: OverallAttendanceSummary = {
      ...overallMetrics,
      subjectsCount: subjects.length,
      activeSubjectsCount: subjects.filter((s) => s.total > 0).length,
    }

    // 6. Aggregate Monthly Attendance & Monthly Subject Breakdowns
    const monthlySummaries = aggregateMonthlyAttendance(attendanceRecords, subjectsMap, targetPercentage)

    // 7. Recent 15 records
    const recentRecords = attendanceRecords.slice(0, 15).map((record) => {
      const sub = subjectsMap.get(record.subject_id)
      return {
        id: record.id,
        subject_id: record.subject_id,
        subject_name: sub?.subject_name || 'Subject',
        subject_code: sub?.subject_code || '',
        date: record.date,
        status: record.status,
        class_number: record.class_number,
        notes: record.notes || null,
        created_at: record.created_at || record.date,
      }
    })

    // Return full dataset including raw records for single-trip client loading
    return NextResponse.json({
      summary: overallSummary,
      subjects,
      monthly: monthlySummaries,
      recentRecords,
      records: attendanceRecords,
      target: targetPercentage,
      academicContext: {
        semester: profile?.current_semester || null,
        year: profile?.current_year || null,
        branchId: profile?.branch_id || null,
        programId: profile?.program_id || null,
        branchName: branchName || null,
        programName: programName || null,
      },
    })
  } catch (error) {
    console.error('GET /api/attendance/summary error:', error)
    return NextResponse.json(
      { error: 'Unable to load attendance. Please check your connection and try again.' },
      { status: 500 }
    )
  }
}
