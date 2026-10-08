import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/admin'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { computeAttendanceMetrics } from '@/lib/attendance/calculations'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const adminCheck = await verifyAdmin(request)
    if (!adminCheck.isAdmin || !adminCheck.user) {
      return NextResponse.json(
        { error: adminCheck.error || 'Access denied: Administrator privileges required.' },
        { status: adminCheck.status || 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const programId = searchParams.get('programId')
    const branchId = searchParams.get('branchId')
    const semester = searchParams.get('semester')
    const search = searchParams.get('search')?.trim().toLowerCase()
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20))
    const offset = (page - 1) * limit

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server database configuration error.' }, { status: 500 })
    }

    const adminDb = createAdminClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // If a specific student ID is requested, fetch deep profile & their attendance history
    if (studentId) {
      const { data: studentProfile, error: profErr } = await adminDb
        .from('profiles')
        .select(`
          id, full_name, email, mobile_number, current_year, current_semester, avatar_url,
          programs(id, name, code),
          branches(id, name, code)
        `)
        .eq('id', studentId)
        .maybeSingle()

      if (profErr || !studentProfile) {
        return NextResponse.json({ error: 'Student profile not found.' }, { status: 404 })
      }

      // Fetch attendance records for this student using resilient repository
      const { fetchStudentRecords } = await import('@/lib/attendance/repository')
      const { aggregateMonthlyAttendance } = await import('@/lib/attendance/calculations')
      const records = await fetchStudentRecords(studentId)

      // Fetch subjects metadata for these records
      const subjectIds = Array.from(new Set(records.map((r) => r.subject_id)))
      const subjectsMap = new Map<string, { id: string; subject_name: string; subject_code: string }>()

      if (subjectIds.length > 0) {
        const { data: subjectsData } = await adminDb
          .from('subjects')
          .select('id, subject_name, subject_code')
          .in('id', subjectIds)

        for (const s of subjectsData || []) {
          subjectsMap.set(s.id, s)
        }
      }

      // Aggregate
      let totalAttended = 0
      let totalMissed = 0
      const subjectMap = new Map<string, { subject_name: string; subject_code: string; attended: number; missed: number }>()

      for (const rec of records) {
        const sub = subjectsMap.get(rec.subject_id)
        const sId = rec.subject_id
        const curr = subjectMap.get(sId) || {
          subject_name: sub?.subject_name || 'Subject',
          subject_code: sub?.subject_code || '',
          attended: 0,
          missed: 0,
        }

        if (rec.status === 'present') {
          totalAttended += 1
          curr.attended += 1
        } else {
          totalMissed += 1
          curr.missed += 1
        }
        subjectMap.set(sId, curr)
      }

      const overall = computeAttendanceMetrics(totalAttended, totalAttended + totalMissed, 75)
      const subjectBreakdown = Array.from(subjectMap.entries()).map(([id, info]) => {
        const m = computeAttendanceMetrics(info.attended, info.attended + info.missed, 75)
        return {
          subjectId: id,
          subjectName: info.subject_name,
          subjectCode: info.subject_code,
          ...m,
        }
      })

      const monthly = aggregateMonthlyAttendance(records, subjectsMap, 75)

      const enrichedRecords = records.map((rec) => {
        const sub = subjectsMap.get(rec.subject_id)
        return {
          id: rec.id,
          subject_id: rec.subject_id,
          subject_name: sub?.subject_name || 'Subject',
          subject_code: sub?.subject_code || '',
          date: rec.date,
          status: rec.status,
          class_number: rec.class_number,
          notes: rec.notes,
          created_at: rec.created_at,
        }
      })

      return NextResponse.json({
        student: studentProfile,
        overall,
        subjectBreakdown,
        monthly,
        records: enrichedRecords,
      })
    }

    // Otherwise, fetch directory of students with their aggregated attendance
    let profilesQuery = adminDb
      .from('profiles')
      .select(
        `
        id, full_name, email, mobile_number, current_year, current_semester, role, status,
        programs(id, name, code),
        branches(id, name, code)
      `,
        { count: 'exact' }
      )
      .eq('role', 'student')

    if (programId) profilesQuery = profilesQuery.eq('program_id', programId)
    if (branchId) profilesQuery = profilesQuery.eq('branch_id', branchId)
    if (semester) profilesQuery = profilesQuery.eq('current_semester', parseInt(semester, 10))
    if (search) profilesQuery = profilesQuery.ilike('full_name', `%${search}%`)

    const { data: students, count, error: studentsErr } = await profilesQuery
      .order('full_name', { ascending: true })
      .range(offset, offset + limit - 1)

    if (studentsErr) {
      console.error('Admin attendance directory error:', studentsErr)
      return NextResponse.json({ error: 'Failed to retrieve students list.' }, { status: 500 })
    }

    const studentIds = (students || []).map((s) => s.id)

    // Fetch attendance totals for these students in bulk
    const studentStatsMap = new Map<string, { attended: number; missed: number }>()
    if (studentIds.length > 0) {
      const { data: recordsData } = await adminDb
        .from('attendance_records')
        .select('user_id, status')
        .in('user_id', studentIds)

      for (const rec of recordsData || []) {
        const curr = studentStatsMap.get(rec.user_id) || { attended: 0, missed: 0 }
        if (rec.status === 'present') curr.attended += 1
        else curr.missed += 1
        studentStatsMap.set(rec.user_id, curr)
      }
    }

    const enrichedStudents = (students || []).map((student) => {
      const stats = studentStatsMap.get(student.id) || { attended: 0, missed: 0 }
      const metrics = computeAttendanceMetrics(stats.attended, stats.attended + stats.missed, 75)
      return {
        ...student,
        metrics,
      }
    })

    return NextResponse.json({
      students: enrichedStudents,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (err) {
    console.error('GET /api/admin/attendance unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
