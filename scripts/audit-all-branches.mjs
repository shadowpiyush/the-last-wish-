import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function checkCurriculum() {
  const { data: branches } = await supabase
    .from('branches')
    .select('id, name, code, programs(short_code)')
    .order('code')

  console.log('=== BRANCH CURRICULUM AUDIT ===')
  for (const b of (branches || [])) {
    const { data: subs } = await supabase
      .from('subjects')
      .select('id, subject_code, subject_name, year_number, semester_number')
      .eq('branch_id', b.id)

    const nws102 = subs?.filter(s => s.subject_code.replace(/[-\s]/g, '').toUpperCase() === 'NWS102') || []
    const workshop = subs?.filter(s => s.subject_name.toLowerCase().includes('workshop')) || []

    console.log(`Branch: [${b.programs?.short_code}] ${b.code} - ${b.name}: Total Subjects: ${subs?.length || 0}`)
    if (nws102.length > 0) {
      console.log(`  -> Exact/Normalized NWS102 match:`, nws102.map(s => `ID: ${s.id}, Code: "${s.subject_code}", Name: "${s.subject_name}", Sem: ${s.semester_number}`))
    }
    if (workshop.length > 0 && nws102.length === 0) {
      console.log(`  -> Other Workshop subjects:`, workshop.map(s => `ID: ${s.id}, Code: "${s.subject_code}", Name: "${s.subject_name}", Sem: ${s.semester_number}`))
    }
  }
}

checkCurriculum()

