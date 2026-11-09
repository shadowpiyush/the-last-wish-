import { createClient as createServerSupabase } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const adminDb = createServerSupabase(SUPABASE_URL, SERVICE_KEY)
const userId = 'af760426-c004-4a50-900f-00dca0740842' // Dharmsheela Ranjan

async function optimizedSummary() {
  const t0 = performance.now()

  // 1. Fetch profile with branches and programs joined + student target + attendance records ALL IN PARALLEL!
  const [profileRes, targetRes, recordsRes] = await Promise.all([
    adminDb
      .from('profiles')
      .select(`
        id, program_id, branch_id, current_semester, current_year, full_name, role,
        branches(name, code),
        programs(name, short_code)
      `)
      .eq('id', userId)
      .maybeSingle(),
    adminDb
      .from('attendance_settings')
      .select('target_percentage')
      .eq('user_id', userId)
      .maybeSingle(),
    adminDb
      .from('attendance_records')
      .select('id, subject_id, date, status, class_number, notes, created_at')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('class_number', { ascending: false })
  ])

  const profile = profileRes.data
  const targetPercentage = targetRes.data?.target_percentage ?? 75.0
  const attendanceRecords = recordsRes.data || []

  // 2. Fetch assigned subjects based on profile
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

  const t1 = performance.now()
  console.log('Optimized Parallel Flow Duration:', (t1 - t0).toFixed(2), 'ms')
  console.log('Profile:', profile?.full_name, 'Branch:', profile?.branches?.name)
  console.log('Target:', targetPercentage, 'Records:', attendanceRecords.length, 'Subjects:', rawSubjects?.length)
}

optimizedSummary().catch(console.error)

