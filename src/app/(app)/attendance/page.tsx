export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { AttendanceClient } from './AttendanceClient'

export const metadata: Metadata = {
  title: 'Attendance Tracker — Harcoutian Study Hub',
  description: 'Monitor your subject-wise and overall attendance, safe absence margins, target thresholds, and class recovery plans.',
}

export default function AttendancePage() {
  return <AttendanceClient />
}

