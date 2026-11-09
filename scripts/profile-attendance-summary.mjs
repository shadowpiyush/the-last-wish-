import { createClient as createServerSupabase } from '@supabase/supabase-js'
import {
  computeAttendanceMetrics,
  aggregateMonthlyAttendance,
} from '../src/lib/attendance/calculations.ts'
import {
  fetchStudentRecords,
  getStudentTarget,
} from '../src/lib/attendance/repository.ts'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const adminDb = createServerSupabase(SUPABASE_URL, SERVICE_KEY)
const userId = 'af760426-c004-4a50-900f-00dca0740842' // Dharmsheela Ranjan

async function profile() {
  console.log('Profiling attendance summary steps for student', userId)

  let t = performance.now()
  const p0 = performance.now()
  const { data: profile } = await adminDb
    .from('profiles')
    .select('id, program_id, branch_id, current_semester, current_year, full_name, role')
    .eq('id', userId)
    .maybeSingle()
  console.log('Step 1 (Profile):', (performance.now() - p0).toFixed(2), 'ms')

  const p1 = performance.now()
  const targetPercentage = await getStudentTarget(userId)
  console.log('Step 2 (Target):', (performance.now() - p1).toFixed(2), 'ms')

  const p2 = performance.now()
  let branchName = null
  let programName = null
  if (profile?.branch_id) {
    const { data: branchData } = await adminDb
      .from('branches')
      .select('name, code')
      .eq('id', profile.branch_id)
      .maybeSingle()
    if (branchData) branchName = branchData.name
  }
  if (profile?.program_id) {
    const { data: programData } = await adminDb
      .from('programs')
      .select('name, short_code')
      .eq('id', profile.program_id)
      .maybeSingle()
    if (programData) programName = programData.short_code || programData.name
  }
  console.log('Step 3 (Branch & Program lookup):', (performance.now() - p2).toFixed(2), 'ms')

  const p3 = performance.now()
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
  }
  const { data: rawSubjects } = await subjectsQuery.order('subject_code', { ascending: true })
  console.log('Step 4 (Subjects query):', (performance.now() - p3).toFixed(2), 'ms')

  const p4 = performance.now()
  const attendanceRecords = await fetchStudentRecords(userId)
  console.log('Step 5 (fetchStudentRecords):', (performance.now() - p4).toFixed(2), 'ms')

  console.log('TOTAL:', (performance.now() - t).toFixed(2), 'ms')
}

profile().catch(console.error)

