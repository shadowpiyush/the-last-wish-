import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { updateRecord, deleteRecord } from '@/lib/attendance/repository'
import type { AttendanceRecordStatus } from '@/lib/attendance/calculations'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Valid record ID is required.' }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Active user session required.' },
        { status: 401 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const { status, classNumber, notes } = body

    const updates: {
      status?: AttendanceRecordStatus
      classNumber?: number
      notes?: string | null
    } = {}

    if (status !== undefined) {
      const normalizedStatus = String(status).toLowerCase().trim()
      if (normalizedStatus !== 'present' && normalizedStatus !== 'absent' && normalizedStatus !== 'no_class') {
        return NextResponse.json(
          { error: 'Status must be "present", "absent", or "no_class".' },
          { status: 400 }
        )
      }
      updates.status = normalizedStatus as AttendanceRecordStatus
    }

    if (classNumber !== undefined) {
      const num = parseInt(String(classNumber), 10)
      if (isNaN(num) || num < 1 || num > 10) {
        return NextResponse.json(
          { error: 'Class number must be between 1 and 10.' },
          { status: 400 }
        )
      }
      updates.classNumber = num
    }

    if (notes !== undefined) {
      updates.notes = notes ? String(notes).trim().slice(0, 500) : null
    }

    const result = await updateRecord(id, user.id, updates)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update attendance record.' },
        { status: result.status }
      )
    }

    return NextResponse.json({
      message: 'Attendance record updated successfully.',
      success: true,
      record: result.record,
    })
  } catch (err) {
    console.error('PATCH /api/attendance/[id] unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Valid record ID is required.' }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Active user session required.' },
        { status: 401 }
      )
    }

    const result = await deleteRecord(id, user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete attendance record.' },
        { status: result.status }
      )
    }

    return NextResponse.json({
      message: 'Attendance record deleted successfully.',
      deletedId: id,
      success: true,
    })
  } catch (err) {
    console.error('DELETE /api/attendance/[id] unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

