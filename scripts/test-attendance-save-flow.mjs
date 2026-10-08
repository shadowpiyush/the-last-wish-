import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'

// Load .env.local
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=')
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim()
        const val = trimmed.slice(idx + 1).trim().replace(/^['"](.*)['"]$/, '$1')
        process.env[key] = process.env[key] || val
      }
    }
  }
}

import {
  saveAttendanceRecord,
  fetchStudentRecords,
  updateRecord,
  deleteRecord,
} from '../src/lib/attendance/repository.ts'
import {
  aggregateMonthlyAttendance,
} from '../src/lib/attendance/calculations.ts'

import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminDb = createAdminClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

test('Resilient Attendance Save & Duplicate Protection Flow', async () => {
  // Find a real existing user from profiles table
  const { data: users } = await adminDb
    .from('profiles')
    .select('id')
    .limit(1)

  assert.ok(users && users.length > 0, 'Must have at least one user in profiles')
  const TEST_USER_ID = users[0].id

  // Find a real existing subject
  const { data: subjects } = await adminDb
    .from('subjects')
    .select('id')
    .limit(1)

  const TEST_SUBJECT_ID = subjects && subjects.length > 0 ? subjects[0].id : '00000000-0000-4000-8000-000000000101'

  // Clean up any leftovers first
  const initialRecords = await fetchStudentRecords(TEST_USER_ID)
  for (const rec of initialRecords) {
    await deleteRecord(rec.id, TEST_USER_ID)
  }

  // 1. Save Attendance with DD/MM/YYYY date (08/10/2026) -> should normalize to 2026-10-08
  const saveRes1 = await saveAttendanceRecord({
    userId: TEST_USER_ID,
    subjectId: TEST_SUBJECT_ID,
    date: '08/10/2026',
    status: 'present',
    classNumber: 1,
    notes: 'Fluid mechanics lecture',
  })

  assert.equal(saveRes1.success, true, `Save failed: ${saveRes1.error}`)
  assert.equal(saveRes1.status, 201)
  assert.ok(saveRes1.record)
  assert.equal(saveRes1.record.date, '2026-10-08')
  assert.equal(saveRes1.record.status, 'present')
  assert.equal(saveRes1.record.class_number, 1)

  const record1Id = saveRes1.record.id

  // 2. Duplicate Submission: Same student, same subject, same date, same period -> must fail with 409 DUPLICATE
  const dupRes = await saveAttendanceRecord({
    userId: TEST_USER_ID,
    subjectId: TEST_SUBJECT_ID,
    date: '2026-10-08',
    status: 'present',
    classNumber: 1,
  })

  assert.equal(dupRes.success, false)
  assert.equal(dupRes.status, 409)
  assert.equal(dupRes.errorCode, 'DUPLICATE')
  assert.ok(dupRes.error?.includes('already been recorded'))

  // 3. Different period on same date: Period 2 Absent -> must succeed
  const saveRes2 = await saveAttendanceRecord({
    userId: TEST_USER_ID,
    subjectId: TEST_SUBJECT_ID,
    date: '08/10/2026',
    status: 'absent',
    classNumber: 2,
    notes: 'Missed lab session',
  })

  assert.equal(saveRes2.success, true)
  assert.equal(saveRes2.status, 201)
  assert.equal(saveRes2.record?.class_number, 2)
  assert.equal(saveRes2.record?.status, 'absent')

  const record2Id = saveRes2.record.id

  // 4. Verify Fetch Records returns both records sorted
  const records = await fetchStudentRecords(TEST_USER_ID)
  assert.equal(records.length, 2)
  assert.equal(records[0].date, '2026-10-08')

  // 5. Verify Monthly Aggregation includes October 2026
  const subjectsMap = new Map([
    [TEST_SUBJECT_ID, { id: TEST_SUBJECT_ID, subject_name: 'Physics', subject_code: 'PHY101' }],
  ])
  const monthly = aggregateMonthlyAttendance(records, subjectsMap, 75)
  assert.equal(monthly.length, 1)
  assert.equal(monthly[0].monthLabel, 'October 2026')
  assert.equal(monthly[0].present, 1)
  assert.equal(monthly[0].absent, 1)
  assert.equal(monthly[0].total, 2)
  assert.equal(monthly[0].percentage, 50)

  // 6. Test Update Record (Edit status from absent to present)
  const updateRes = await updateRecord(record2Id, TEST_USER_ID, {
    status: 'present',
    notes: 'Medical certificate approved',
  })
  assert.equal(updateRes.success, true)

  const updatedRecords = await fetchStudentRecords(TEST_USER_ID)
  const updatedRec2 = updatedRecords.find((r) => r.id === record2Id)
  assert.equal(updatedRec2?.status, 'present')
  assert.equal(updatedRec2?.notes, 'Medical certificate approved')

  // 7. Test Delete Records
  const del1 = await deleteRecord(record1Id, TEST_USER_ID)
  assert.equal(del1.success, true)
  const del2 = await deleteRecord(record2Id, TEST_USER_ID)
  assert.equal(del2.success, true)

  // 8. Confirm empty after cleanup
  const remaining = await fetchStudentRecords(TEST_USER_ID)
  assert.equal(remaining.length, 0)
})
