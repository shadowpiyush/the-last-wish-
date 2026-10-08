import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  saveAttendanceRecord,
  fetchStudentRecords,
} from '@/lib/attendance/repository'
import { normalizeAttendanceDate, type AttendanceRecordStatus } from '@/lib/attendance/calculations'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subjectId') || undefined
    const status = (searchParams.get('status') as AttendanceRecordStatus) || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const records = await fetchStudentRecords(user.id, {
      subjectId,
      status,
      startDate,
      endDate,
    })

    return NextResponse.json({ records })
  } catch (err) {
    console.error('GET /api/attendance error:', err)
    return NextResponse.json(
      { error: 'Unable to connect to the server. Check your connection and try again.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate user from session cookies (Never trust client-supplied user ID)
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

    // 2. Parse request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload.' },
        { status: 400 }
      )
    }

    const { subjectId, date, status, classNumber, period, notes, allowUpdate } = body

    // Period / Class Number resolution (supports both classNumber and period)
    const rawClassNumber = classNumber !== undefined ? classNumber : period
    const classNum = parseInt(String(rawClassNumber || 1), 10)
    if (isNaN(classNum) || classNum < 1 || classNum > 10) {
      return NextResponse.json(
        { error: 'Please enter a valid class/period number (1–10).', errorCode: 'INVALID_PERIOD' },
        { status: 400 }
      )
    }

    // 3. Validate Date with multi-format normalization
    const cleanDate = normalizeAttendanceDate(date)
    if (!cleanDate) {
      return NextResponse.json(
        { error: 'Please enter a valid attendance date (e.g. 08/10/2026 or 2026-10-08).', errorCode: 'INVALID_DATE' },
        { status: 400 }
      )
    }

    // Validate date format and reasonable academic year limits (2020 - 2030)
    const yearMatch = /^(\d{4})-\d{2}-\d{2}$/.exec(cleanDate)
    const year = yearMatch ? parseInt(yearMatch[1], 10) : 0
    if (year < 2020 || year > 2030) {
      return NextResponse.json(
        { error: 'Attendance date must fall within a valid academic term (2020–2030).', errorCode: 'INVALID_DATE' },
        { status: 400 }
      )
    }

    // 4. Validate Status (flexible normalization for case, hyphens, and spaces)
    const rawStatus = String(status || '').toLowerCase().trim().replace(/[\s-]+/g, '_')
    const normalizedStatus = rawStatus === 'noclass' ? 'no_class' : rawStatus
    if (normalizedStatus !== 'present' && normalizedStatus !== 'absent' && normalizedStatus !== 'no_class') {
      return NextResponse.json(
        { error: 'Status must be Present, Absent, or No Class.', errorCode: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    // 5. Subject Validation & Academic Context Verification
    if (!subjectId || typeof subjectId !== 'string') {
      return NextResponse.json(
        { error: 'Please select a subject.', errorCode: 'INVALID_SUBJECT' },
        { status: 400 }
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

    // Check student profile academic context
    const { data: profile } = await adminDb
      .from('profiles')
      .select('id, program_id, branch_id, current_semester, role')
      .eq('id', user.id)
      .maybeSingle()

    // Fetch the subject to verify existence
    const { data: subjectRow, error: subjectCheckErr } = await adminDb
      .from('subjects')
      .select('id, subject_name, subject_code, branch_id, semester_number, program_id')
      .eq('id', subjectId)
      .maybeSingle()

    if (subjectCheckErr || !subjectRow) {
      return NextResponse.json(
        { error: 'The selected subject does not exist.', errorCode: 'INVALID_SUBJECT' },
        { status: 400 }
      )
    }

    // Verify academic context: If student has a branch and semester assigned,
    // verify the subject belongs to their academic context or branch or common subjects
    if (profile?.branch_id && profile?.current_semester) {
      const isMatchingBranch = !subjectRow.branch_id || subjectRow.branch_id === profile.branch_id
      const isMatchingSemester = subjectRow.semester_number === profile.current_semester

      // If branch does not match or semester does not match, prevent cross-branch attendance tampering
      if ((!isMatchingBranch || !isMatchingSemester) && profile.role !== 'admin') {
        return NextResponse.json(
          { error: 'This subject is not assigned to your current academic profile.', errorCode: 'UNAUTHORIZED_SUBJECT' },
          { status: 403 }
        )
      }
    }

    // 6. Save via resilient repository layer (atomic upsert supported)
    const result = await saveAttendanceRecord({
      userId: user.id,
      subjectId,
      date: cleanDate,
      status: normalizedStatus as AttendanceRecordStatus,
      classNumber: classNum,
      notes: notes || null,
      allowUpdate: Boolean(allowUpdate),
    })

    if (!result.success || !result.record) {
      return NextResponse.json(
        {
          error: result.error || "We couldn't save your attendance right now. Please try again.",
          errorCode: result.errorCode || 'DATABASE_ERROR',
        },
        { status: result.status || 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Attendance recorded successfully.',
        record: result.record,
        attendance: {
          id: result.record.id,
          subjectId: result.record.subject_id,
          subjectName: subjectRow.subject_name,
          subjectCode: subjectRow.subject_code,
          date: result.record.date,
          period: result.record.class_number,
          status: result.record.status,
          notes: result.record.notes,
        },
      },
      { status: result.status || 201 }
    )
  } catch (err) {
    console.error('POST /api/attendance unhandled error:', err)
    return NextResponse.json(
      { error: "We couldn't save your attendance right now. Please try again.", errorCode: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
