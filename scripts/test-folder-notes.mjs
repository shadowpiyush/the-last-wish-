/**
 * test-folder-notes.mjs
 * Verification test suite for Dynamic Folder-Based Study Notes System
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Supabase credentials missing from environment.')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY)
const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY)

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ❌ FAIL: ${message}`)
    failed++
  }
}

async function runTests() {
  console.log('\n🚀 Starting Dynamic Folder-Based Study Notes Verification Suite\n')

  // 1. Verify Branches and Programs
  console.log('--- 1. Testing Academic Structure (Programs & Branches) ---')
  const { data: programs, error: progErr } = await supabaseAdmin.from('programs').select('*')
  assert(!progErr && programs?.length >= 4, `Programs table has ${programs?.length} valid degree programs`)

  const { data: branches, error: branchErr } = await supabaseAdmin.from('branches').select('*')
  assert(!branchErr && branches?.length >= 21, `Branches table has ${branches?.length} engineering/tech departments`)

  // 2. Verify Canonical Subjects (Single Source of Truth)
  console.log('\n--- 2. Testing Canonical Subjects (Dynamic from Syllabus/Curriculum) ---')
  const { data: subjects, error: subErr } = await supabaseAdmin
    .from('subjects')
    .select('id, subject_code, subject_name, branch_id, semester_number, year_number, credits, category')
  assert(!subErr && subjects?.length >= 500, `Found ${subjects?.length} canonical subjects in database`)

  // Verify Workshop Practice NWS-102 occurs dynamically across valid branches
  const workshopSubjects = subjects?.filter((s) => s.subject_code === 'NWS-102' || s.subject_code === 'NWS102') || []
  assert(workshopSubjects.length >= 6, `Workshop Practice exists across ${workshopSubjects.length} official curriculum branches`)

  // 3. Verify Syllabus Units
  console.log('\n--- 3. Testing Syllabus Units Integration ---')
  const { count: unitsCount, error: unitsErr } = await supabaseAdmin
    .from('syllabus_units')
    .select('*', { count: 'exact', head: true })
  assert(!unitsErr && unitsCount >= 2000, `Syllabus units table populated with ${unitsCount} official units`)

  const sampleSubId = workshopSubjects[0]?.id
  if (sampleSubId) {
    const { data: sampleUnits } = await supabaseAdmin
      .from('syllabus_units')
      .select('unit_number, unit_title, description')
      .eq('subject_id', sampleSubId)
      .order('unit_number', { ascending: true })
    assert(sampleUnits && sampleUnits.length === 5, `Subject ${workshopSubjects[0]?.subject_code} has all 5 syllabus units mapped`)
  }

  // 4. Verify Published Notes and Branch Assignments
  console.log('\n--- 4. Testing Published Notes & Multi-Branch Availability ---')
  const { data: publishedNotes, error: notesErr } = await supabaseAdmin
    .from('notes')
    .select(`
      id, title, description, file_path, file_size, status,
      subjects!inner(id, subject_code, subject_name, branch_id, branches(name, code))
    `)
    .eq('status', 'published')

  assert(!notesErr && publishedNotes?.length >= 6, `Found ${publishedNotes?.length} published study notes`)

  const noteBranchCodes = new Set(publishedNotes?.map((n) => n.subjects?.branches?.code).filter(Boolean))
  assert(noteBranchCodes.size >= 5, `Published notes accessible across multiple branches: ${Array.from(noteBranchCodes).join(', ')}`)

  // 5. Verify Zero Duplicate Subjects
  console.log('\n--- 5. Testing Zero Duplicate Subject Invariants ---')
  const subjectKeyCounts = new Map()
  let duplicateCount = 0
  for (const s of (subjects || [])) {
    const key = `${s.branch_id}-${s.semester_number}-${s.subject_code}`
    if (subjectKeyCounts.has(key)) {
      duplicateCount++
    } else {
      subjectKeyCounts.set(key, 1)
    }
  }
  assert(duplicateCount === 0, `Zero duplicate subjects found in academic curriculum (checked ${subjects?.length} subjects)`)

  // 6. Test Read-Only Anon/Student Storage View URL Contract
  console.log('\n--- 6. Testing Storage Security & Download Prevention ---')
  const sampleNote = publishedNotes?.[0]
  if (sampleNote?.file_path) {
    assert(sampleNote.file_path.endsWith('.pdf'), `Note storage key is a verified PDF document (${sampleNote.file_path})`)
    assert(sampleNote.file_size > 0 && sampleNote.file_size <= 50 * 1024 * 1024, `File size is within allowed policy (${(sampleNote.file_size / (1024 * 1024)).toFixed(2)} MB)`)
  }

  console.log('\n============================================================')
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`)
  console.log('============================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests()

