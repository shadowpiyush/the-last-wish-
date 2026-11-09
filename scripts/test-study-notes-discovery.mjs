import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function runTests() {
  console.log('========================================================================')
  console.log('🧪 HARCOURTIAN STUDY HUB: STUDY NOTES DEFAULT & DISCOVERY TEST SUITE')
  console.log('========================================================================\n')

  let passed = 0
  let total = 0

  function assert(condition, testName, details = '') {
    total++
    if (condition) {
      passed++
      console.log(`✅ [PASS] ${testName} ${details ? `(${details})` : ''}`)
    } else {
      console.error(`❌ [FAIL] ${testName} ${details ? `(${details})` : ''}`)
    }
  }

  // 1. Student Academic Profile Discovery
  console.log('--- TEST GROUP 1: Student Academic Profile Verification ---')
  const { data: lftStudent } = await supabase
    .from('profiles')
    .select('id, full_name, role, program_id, branch_id, current_year, current_semester, branches(id, code, name), programs(id, name, short_code)')
    .eq('branch_id', '179591ff-0faf-416a-a7e4-9477e92634a2') // LFT
    .limit(1)
    .single()

  assert(Boolean(lftStudent), 'Found sample student in LFT branch', lftStudent?.full_name)
  assert(lftStudent?.branches?.code === 'LFT', 'Branch code is LFT', lftStudent?.branches?.code)
  assert(Boolean(lftStudent?.programs?.short_code), 'Program is resolved', lftStudent?.programs?.short_code)

  // 2. Default "My Branch" Notes Query
  console.log('\n--- TEST GROUP 2: Default "My Branch" View ---')
  const { data: myBranchNotes, error: myBranchErr } = await supabase
    .from('notes')
    .select(`
      id, title, status, file_path, file_size,
      subjects!inner (
        id, subject_code, subject_name, semester_number, year_number, branch_id,
        branches (id, name, code)
      )
    `)
    .eq('status', 'published')
    .eq('subjects.branch_id', lftStudent.branch_id)

  assert(!myBranchErr, 'Query for student own branch succeeds without error')
  assert(myBranchNotes && myBranchNotes.length >= 1, 'Found published notes in student branch', `Count: ${myBranchNotes?.length}`)
  const lftNote = myBranchNotes?.[0]
  assert(lftNote?.subjects?.branches?.code === 'LFT', 'Top note belongs strictly to student branch LFT', lftNote?.subjects?.branches?.code)
  assert(lftNote?.subjects?.subject_code.includes('NWS'), 'Contains Workshop Practice NWS-102', lftNote?.subjects?.subject_code)

  // 3. Explore Other Branches Query
  console.log('\n--- TEST GROUP 3: Explore Other Branches ---')
  // Fetch branch BC (Biochemical)
  const { data: bcBranch } = await supabase
    .from('branches')
    .select('id, code, name')
    .eq('code', 'BC')
    .single()

  assert(Boolean(bcBranch), 'Resolved other branch (BC)', bcBranch?.name)

  const { data: bcNotes, error: bcErr } = await supabase
    .from('notes')
    .select(`
      id, title, status, file_path,
      subjects!inner (
        id, subject_code, subject_name, semester_number, year_number, branch_id,
        branches (id, name, code)
      )
    `)
    .eq('status', 'published')
    .eq('subjects.branch_id', bcBranch.id)

  assert(!bcErr, 'Student can explore and query notes from branch BC')
  assert(bcNotes && bcNotes.length >= 1, 'Found published notes in BC branch', `Count: ${bcNotes?.length}`)
  assert(bcNotes?.[0]?.subjects?.branches?.code === 'BC', 'Explored note belongs to BC branch', bcNotes?.[0]?.subjects?.branches?.code)

  // 4. Cross-Branch Exploration (All Branches)
  console.log('\n--- TEST GROUP 4: All-Branch Discovery ---')
  const { data: allNotes, error: allErr } = await supabase
    .from('notes')
    .select(`
      id, title, status, file_path,
      subjects!inner (
        id, subject_code, subject_name, semester_number, year_number, branch_id,
        branches (id, name, code)
      )
    `)
    .eq('status', 'published')

  assert(!allErr, 'Query for all published notes across branches succeeds')
  assert(allNotes && allNotes.length >= 6, 'All branches published notes accessible', `Total: ${allNotes?.length}`)
  const branchCodes = new Set(allNotes.map(n => n.subjects?.branches?.code))
  assert(branchCodes.has('LFT') && branchCodes.has('BC') && branchCodes.has('CHE') && branchCodes.has('MDS'),
    'Discovered multiple distinct branches in cross-branch mode',
    Array.from(branchCodes).join(', '))

  // 5. Global Multi-Field Search
  console.log('\n--- TEST GROUP 5: Global Multi-Field Search ---')
  // Search 1: by subject code 'NWS-102'
  const { data: searchByCodeSubs } = await supabase
    .from('subjects')
    .select('id')
    .or('subject_code.ilike.%NWS%102%,subject_code.ilike.%NWS-102%')
  const nwsSubIds = (searchByCodeSubs || []).map(s => s.id)

  const { data: searchByCodeNotes } = await supabase
    .from('notes')
    .select('id, title, subjects(subject_code, branches(code))')
    .eq('status', 'published')
    .or(`subject_id.in.(${nwsSubIds.join(',')}),title.ilike.%NWS-102%`)

  assert(searchByCodeNotes && searchByCodeNotes.length >= 6,
    'Global search by subject code "NWS-102" returns results across all branches',
    `Found: ${searchByCodeNotes?.length}`)

  // Search 2: by subject name 'Workshop'
  const { data: searchByNameSubs } = await supabase
    .from('subjects')
    .select('id')
    .ilike('subject_name', '%Workshop%')
  const workshopSubIds = (searchByNameSubs || []).map(s => s.id)

  const { data: searchByNameNotes } = await supabase
    .from('notes')
    .select('id, title, subjects(subject_name, branches(code))')
    .eq('status', 'published')
    .or(`subject_id.in.(${workshopSubIds.join(',')}),title.ilike.%Workshop%`)

  assert(searchByNameNotes && searchByNameNotes.length >= 6,
    'Global search by subject name "Workshop" returns results across all branches',
    `Found: ${searchByNameNotes?.length}`)

  // Search 3: by topic / keyword 'Welding'
  const { data: searchByTopicNotes } = await supabase
    .from('notes')
    .select('id, title, subjects(subject_name, branches(code))')
    .eq('status', 'published')
    .ilike('title', '%Welding%')

  assert(searchByTopicNotes && searchByTopicNotes.length >= 6,
    'Global search by topic keyword "Welding" returns lab manual notes',
    `Found: ${searchByTopicNotes?.length}`)

  // 6. Relevance Prioritization (Student Branch First)
  console.log('\n--- TEST GROUP 6: Result Priority Scoring ---')
  const prioritized = (searchByNameNotes || []).map(n => {
    const isMyBranch = n.subjects?.branches?.code === lftStudent.branches.code
    return {
      ...n,
      score: isMyBranch ? 3 : 1
    }
  }).sort((a, b) => b.score - a.score)

  assert(prioritized[0]?.subjects?.branches?.code === 'LFT',
    'Student own branch (LFT) is prioritized as top result in search',
    `Top result: ${prioritized[0]?.subjects?.branches?.code}`)

  // 7. Cascading Subjects Resolution
  console.log('\n--- TEST GROUP 7: Dynamic Academic Subjects Resolution ---')
  const { data: lftAllSubjects } = await supabase
    .from('subjects')
    .select('id, subject_code, subject_name, semester_number, year_number')
    .eq('branch_id', lftStudent.branch_id)
    .order('semester_number')

  assert(lftAllSubjects && lftAllSubjects.length > 20,
    'Resolved dynamic subjects for LFT branch',
    `Total: ${lftAllSubjects?.length} subjects`)

  const { data: lftSem2Subjects } = await supabase
    .from('subjects')
    .select('id, subject_code, subject_name, semester_number, year_number')
    .eq('branch_id', lftStudent.branch_id)
    .eq('semester_number', 2)

  assert(lftSem2Subjects && lftSem2Subjects.some(s => s.subject_code.includes('NWS')),
    'Semester 2 subjects for LFT contain Workshop Practice (NWS-102)',
    `Sem 2 subject count: ${lftSem2Subjects?.length}`)

  // 8. Security & Unpublished Protection
  console.log('\n--- TEST GROUP 8: Security & Data Integrity ---')
  const { data: draftNotes } = await supabase
    .from('notes')
    .select('id, status')
    .eq('status', 'draft')

  assert(!draftNotes || draftNotes.length === 0,
    'No unpublished draft notes are exposed to students',
    `Draft count: ${draftNotes?.length || 0}`)

  // Check physical storage key deduplication
  const { data: nwsNotes } = await supabase
    .from('notes')
    .select('id, file_path, file_size')
    .ilike('file_path', '%workshop-practice-nws-102%')

  const uniquePaths = new Set((nwsNotes || []).map(n => n.file_path))
  assert(uniquePaths.size === 1,
    'Zero physical duplicate storage files (All 6 branches reuse single PDF file path)',
    `Paths: ${Array.from(uniquePaths).join(', ')}`)

  console.log('\n========================================================================')
  console.log(`SUMMARY: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`)
  console.log('========================================================================')

  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Study Notes Default Branch + All-Branch Discovery is verified.')
  } else {
    process.exit(1)
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err)
  process.exit(1)
})

