import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeAttendanceMetrics,
  normalizeAttendanceDate,
  aggregateMonthlyAttendance,
} from '../src/lib/attendance/calculations.ts'

test('Attendance Calculations — Zero Classes State', () => {
  const metrics = computeAttendanceMetrics(0, 0, 75)
  assert.equal(metrics.hasRecords, false)
  assert.equal(metrics.percentage, null)
  assert.equal(metrics.formattedPercentage, '—')
  assert.equal(metrics.status, 'no_records')
  assert.equal(metrics.statusLabel, 'No records yet')
  assert.equal(metrics.classesCanMiss, 0)
  assert.equal(metrics.classesNeededToAttend, 0)
  assert.equal(metrics.isRecoveryUnreachable, false)
})

test('Attendance Calculations — 100% Attendance', () => {
  const metrics = computeAttendanceMetrics(20, 20, 75)
  assert.equal(metrics.hasRecords, true)
  assert.equal(metrics.percentage, 100)
  assert.equal(metrics.formattedPercentage, '100.00%')
  assert.equal(metrics.status, 'safe')
  assert.equal(metrics.missed, 0)
  // Attended 20, Total 20, Target 75%:
  // 20 / (20 + x) >= 0.75 => 20 / 0.75 - 20 = 26.666 - 20 = 6 classes
  assert.equal(metrics.classesCanMiss, 6)
  assert.equal(metrics.classesNeededToAttend, 0)
})

test('Attendance Calculations — Exactly at Target (75%)', () => {
  const metrics = computeAttendanceMetrics(15, 20, 75)
  assert.equal(metrics.percentage, 75)
  assert.equal(metrics.status, 'at_target')
  // 15 / (20 + x) >= 0.75 => 15 / 0.75 - 20 = 20 - 20 = 0
  assert.equal(metrics.classesCanMiss, 0)
  assert.equal(metrics.classesNeededToAttend, 0)
})

test('Attendance Calculations — Above Target Safe', () => {
  // Attended 80, Total 100, Target 75%
  // 80 / (100 + x) >= 0.75 => x <= 80/0.75 - 100 = 106.666 - 100 = 6
  const metrics = computeAttendanceMetrics(80, 100, 75)
  assert.equal(metrics.percentage, 80)
  assert.equal(metrics.status, 'safe')
  assert.equal(metrics.classesCanMiss, 6)
  assert.equal(metrics.classesNeededToAttend, 0)
})

test('Attendance Calculations — Below Target (Recovery required)', () => {
  // Attended 14, Total 20 (70%), Target 75%
  // Formula: (75 * 20 - 100 * 14) / (100 - 75) = (1500 - 1400) / 25 = 100 / 25 = 4
  const metrics = computeAttendanceMetrics(14, 20, 75)
  assert.equal(metrics.percentage, 70)
  assert.equal(metrics.status, 'below_target')
  assert.equal(metrics.classesCanMiss, 0)
  assert.equal(metrics.classesNeededToAttend, 4)
  assert.equal(metrics.isRecoveryUnreachable, false)

  // Verify: if they attend 4 more classes, Attended = 18, Total = 24 => 18/24 = 75.0%
  const verify = computeAttendanceMetrics(18, 24, 75)
  assert.equal(verify.percentage, 75)
})

test('Attendance Calculations — Critical Status (< target - 10%)', () => {
  // Attended 10, Total 20 (50%), Target 75%
  const metrics = computeAttendanceMetrics(10, 20, 75)
  assert.equal(metrics.percentage, 50)
  assert.equal(metrics.status, 'critical')
  assert.equal(metrics.statusLabel, 'Critical')
  // (75 * 20 - 100 * 10) / 25 = (1500 - 1000) / 25 = 500 / 25 = 20
  assert.equal(metrics.classesNeededToAttend, 20)
})

test('Attendance Calculations — Target 100% Edge Case', () => {
  // Attended 19, Total 20, Target 100%
  // Has missed 1 class. Can NEVER reach 100% again mathematically
  const metrics = computeAttendanceMetrics(19, 20, 100)
  assert.equal(metrics.status, 'below_target')
  assert.equal(metrics.classesCanMiss, 0)
  assert.equal(metrics.isRecoveryUnreachable, true)
  assert.equal(metrics.classesNeededToAttend, null)

  // If attended 20 of 20 with target 100%
  const perfect = computeAttendanceMetrics(20, 20, 100)
  assert.equal(perfect.percentage, 100)
  assert.equal(perfect.status, 'at_target')
  assert.equal(perfect.classesCanMiss, 0)
  assert.equal(perfect.classesNeededToAttend, 0)
  assert.equal(perfect.isRecoveryUnreachable, false)
})

test('Attendance Calculations — Target 0% Edge Case', () => {
  const metrics = computeAttendanceMetrics(0, 10, 0)
  assert.equal(metrics.percentage, 0)
  assert.equal(metrics.status, 'at_target')
  assert.equal(metrics.classesCanMiss, 999)
  assert.equal(metrics.classesNeededToAttend, 0)
})

test('Attendance Calculations — Precision & 2 Decimal Places', () => {
  // 1 of 3 classes = 33.33333333...%
  const metrics = computeAttendanceMetrics(1, 3, 75)
  assert.equal(metrics.percentage, 33.33)
  assert.equal(metrics.formattedPercentage, '33.33%')

  // Needed to reach 75%:
  // (75 * 3 - 100 * 1) / 25 = (225 - 100) / 25 = 125 / 25 = 5
  // Check: (1 + 5) / (3 + 5) = 6 / 8 = 75.0%
  assert.equal(metrics.classesNeededToAttend, 5)

  // 18 of 21 classes = 85.71%
  const subMath = computeAttendanceMetrics(18, 21, 75)
  assert.equal(subMath.percentage, 85.71)
  assert.equal(subMath.formattedPercentage, '85.71%')
})

test('Attendance Calculations — Date Normalization (DD/MM/YYYY vs YYYY-MM-DD)', () => {
  // 8 October 2026 must never become 10 August 2026
  assert.equal(normalizeAttendanceDate('08/10/2026'), '2026-10-08')
  assert.equal(normalizeAttendanceDate('08-10-2026'), '2026-10-08')
  assert.equal(normalizeAttendanceDate('2026-10-08'), '2026-10-08')
  assert.equal(normalizeAttendanceDate('2026/10/08'), '2026-10-08')
  assert.equal(normalizeAttendanceDate('2026-10-08T12:00:00.000Z'), '2026-10-08')
  assert.equal(normalizeAttendanceDate('invalid-date'), null)
  assert.equal(normalizeAttendanceDate('32/01/2026'), null)
})

test('Attendance Calculations — Monthly Aggregation & Subject Breakdown', () => {
  const records = [
    { id: '1', subject_id: 'sub-math', date: '2026-10-08', status: 'present', class_number: 1 },
    { id: '2', subject_id: 'sub-math', date: '2026-10-08', status: 'absent', class_number: 2 },
    { id: '3', subject_id: 'sub-phys', date: '2026-10-07', status: 'present', class_number: 1 },
    { id: '4', subject_id: 'sub-math', date: '2026-09-15', status: 'present', class_number: 1 },
  ]

  const subjectsMap = new Map([
    ['sub-math', { id: 'sub-math', subject_name: 'Mathematics', subject_code: 'MATH101' }],
    ['sub-phys', { id: 'sub-phys', subject_name: 'Physics', subject_code: 'PHYS101' }],
  ])

  const monthly = aggregateMonthlyAttendance(records, subjectsMap, 75)
  assert.equal(monthly.length, 2)
  assert.equal(monthly[0].monthLabel, 'October 2026')
  assert.equal(monthly[0].present, 2)
  assert.equal(monthly[0].absent, 1)
  assert.equal(monthly[0].total, 3)

  // Verify October subject breakdown
  const octMath = monthly[0].subjects.find((s) => s.subjectId === 'sub-math')
  assert.ok(octMath)
  assert.equal(octMath.present, 1)
  assert.equal(octMath.absent, 1)
  assert.equal(octMath.total, 2)
  assert.equal(octMath.percentage, 50)
  assert.equal(octMath.formattedPercentage, '50.00%')

  assert.equal(monthly[1].monthLabel, 'September 2026')
  assert.equal(monthly[1].present, 1)
  assert.equal(monthly[1].absent, 0)
  assert.equal(monthly[1].total, 1)
})

test('Attendance Calculations — No Class Exclusion (Requirement #44)', () => {
  // 10 calendar entries: 8 Present, 1 Absent, 1 No Class
  // Attendance must be: 8 / (8 + 1) = 8 / 9 = 88.89%
  const metrics = computeAttendanceMetrics(8, 9, 75, 1)
  assert.equal(metrics.attended, 8)
  assert.equal(metrics.missed, 1)
  assert.equal(metrics.noClass, 1)
  assert.equal(metrics.total, 9) // Conducted = 8 + 1
  assert.equal(metrics.totalEntries, 10) // All entries = 8 + 1 + 1
  assert.equal(metrics.percentage, 88.89)
  assert.equal(metrics.formattedPercentage, '88.89%')
  assert.equal(metrics.status, 'safe')

  // Multi-period records with No Class
  const records = [
    { id: '1', subject_id: 'sub-em2', date: '2026-10-08', status: 'present', class_number: 1 },
    { id: '2', subject_id: 'sub-em2', date: '2026-10-08', status: 'present', class_number: 2 },
    { id: '3', subject_id: 'sub-em2', date: '2026-10-08', status: 'absent', class_number: 3 },
    { id: '4', subject_id: 'sub-em2', date: '2026-10-08', status: 'no_class', class_number: 4 },
  ]
  const subjectsMap = new Map([
    ['sub-em2', { id: 'sub-em2', subject_name: 'EM 2', subject_code: 'EM202' }],
  ])

  const monthly = aggregateMonthlyAttendance(records, subjectsMap, 75)
  assert.equal(monthly.length, 1)
  assert.equal(monthly[0].present, 2)
  assert.equal(monthly[0].absent, 1)
  assert.equal(monthly[0].noClass, 1)
  assert.equal(monthly[0].total, 3) // conducted = 2 + 1
  assert.equal(monthly[0].totalEntries, 4) // 2 + 1 + 1
  assert.equal(monthly[0].percentage, 66.67) // 2 / 3 = 66.67%
})

