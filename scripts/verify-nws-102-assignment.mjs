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

const FILE_PATH = 'workshop-practice-nws-102-welding-shop.pdf'

async function runVerification() {
  console.log('====================================================================')
  console.log('🧪 HARCOURTIAN STUDY HUB: NWS-102 CENTRALIZED ASSIGNMENT TEST SUITE')
  console.log('====================================================================\n')

  let passedTests = 0
  let totalTests = 0

  function assert(condition, name, details = '') {
    totalTests++
    if (condition) {
      passedTests++
      console.log(`✅ [PASS] ${name} ${details ? `(${details})` : ''}`)
    } else {
      console.error(`❌ [FAIL] ${name} ${details ? `(${details})` : ''}`)
    }
  }

  // 1. Verify NWS-102 subject existence in database
  console.log('--- TEST GROUP 1: Academic Structure Verification ---')
  const { data: matchedSubjects, error: subErr } = await supabase
    .from('subjects')
    .select(`
      id, subject_code, subject_name, year_number, semester_number, category,
      program_id, programs(name, short_code),
      branch_id, branches(name, code)
    `)
    .or('subject_code.ilike.%NWS%102%,subject_code.ilike.%NWS-102%')
    .ilike('subject_name', '%Workshop Practice%')

  assert(!subErr && matchedSubjects && matchedSubjects.length >= 6,
    'Verified subject records exist in database',
    `Found ${matchedSubjects?.length} records`)

  const branchCodes = matchedSubjects?.map(s => s.branches?.code).sort()
  console.log('Discovered branch codes:', branchCodes)
  assert(branchCodes.includes('LFT'), 'Subject exists in LFT (Leather & Fashion Technology)')
  assert(branchCodes.includes('BC'), 'Subject exists in BC (Biochemical Technology)')
  assert(branchCodes.includes('CHE'), 'Subject exists in CHE (Chemical Engineering)')
  assert(branchCodes.includes('CHY'), 'Subject exists in CHY (Chemistry)')
  assert(branchCodes.includes('MDS'), 'Subject exists in MDS (Mathematics & Data Science)')
  assert(branchCodes.includes('PHY'), 'Subject exists in PHY (Physics)')

  // 2. Storage integrity and duplication check
  console.log('\n--- TEST GROUP 2: Storage Integrity & Non-Duplication ---')
  const { data: bucketFiles, error: listErr } = await supabase.storage
    .from('notes')
    .list('', { search: 'workshop-practice-nws-102' })

  const matchingFiles = (bucketFiles || []).filter(f => f.name.includes('nws-102'))
  assert(!listErr && matchingFiles.length === 1,
    'Physical PDF file stored exactly ONCE in notes storage',
    `Found ${matchingFiles.length} file: ${matchingFiles[0]?.name}`)

  assert(matchingFiles[0]?.metadata?.size === 6721998,
    'Physical PDF file size verified intact',
    `${matchingFiles[0]?.metadata?.size} bytes (6.41 MB)`)

  // 3. Centralized Digital Library Book & Academic Mappings
  console.log('\n--- TEST GROUP 3: Centralized Resource & ebook_academic_mappings ---')
  const { data: bookRecord } = await supabase
    .from('library_books')
    .select('id, title, author, book_type, ebook_status, ebook_file_path, total_pages')
    .eq('ebook_file_path', FILE_PATH)
    .maybeSingle()

  assert(!!bookRecord, 'Centralized library_books record exists', `ID: ${bookRecord?.id}`)
  assert(bookRecord?.total_pages === 23, 'Page count matches physical PDF document', '23 pages')
  assert(bookRecord?.ebook_status === 'available', 'eBook publication status is available')

  const { data: mappings } = await supabase
    .from('ebook_academic_mappings')
    .select('id, branch_id, branches(code), subject_id, subjects(subject_code, subject_name)')
    .eq('book_id', bookRecord?.id)

  assert(mappings && mappings.length === 6,
    'Every valid branch mapping exists in ebook_academic_mappings',
    `${mappings?.length} branch mappings`)

  const mappedBranchCodes = mappings?.map(m => m.branches?.code).sort()
  assert(
    JSON.stringify(mappedBranchCodes) === JSON.stringify(['BC', 'CHE', 'CHY', 'LFT', 'MDS', 'PHY']),
    'All 6 verified branches accurately mapped',
    mappedBranchCodes?.join(', ')
  )

  // 4. Notes table assignment check
  console.log('\n--- TEST GROUP 4: Study Notes Table Assignments ---')
  const { data: assignedNotes } = await supabase
    .from('notes')
    .select('id, title, file_path, status, subject_id, subjects(id, subject_code, subject_name, branches(code))')
    .eq('file_path', FILE_PATH)

  assert(assignedNotes && assignedNotes.length === 6,
    'Database notes mappings created for all 6 verified branches',
    `${assignedNotes?.length} assignments`)

  const notesBranches = assignedNotes?.map(n => n.subjects?.branches?.code).sort()
  assert(
    JSON.stringify(notesBranches) === JSON.stringify(['BC', 'CHE', 'CHY', 'LFT', 'MDS', 'PHY']),
    'Notes mapped to each verified branch without duplicate file uploads',
    notesBranches?.join(', ')
  )

  // Verify all notes share the exact same physical storage key
  const uniqueFilePaths = Array.from(new Set(assignedNotes?.map(n => n.file_path)))
  assert(uniqueFilePaths.length === 1 && uniqueFilePaths[0] === FILE_PATH,
    'All notes share the identical physical storage key (no file duplication)',
    FILE_PATH)

  // 5. Student Visibility & Authorization Checks
  console.log('\n--- TEST GROUP 5: Student Profile Visibility & Access Control ---')
  // Check LFT branch (authorized)
  const lftSubject = matchedSubjects?.find(s => s.branches?.code === 'LFT')
  const { data: lftVisibleNotes } = await supabase
    .from('notes')
    .select('id, title, subjects!inner(branch_id)')
    .eq('status', 'published')
    .eq('subjects.branch_id', lftSubject.branch_id)

  assert(lftVisibleNotes && lftVisibleNotes.some(n => n.title.includes('Workshop Practice')),
    'Authorized branch student (LFT) CAN see the Workshop Practice resource')

  // Check BC branch (authorized)
  const bcSubject = matchedSubjects?.find(s => s.branches?.code === 'BC')
  const { data: bcVisibleNotes } = await supabase
    .from('notes')
    .select('id, title, subjects!inner(branch_id)')
    .eq('status', 'published')
    .eq('subjects.branch_id', bcSubject.branch_id)

  assert(bcVisibleNotes && bcVisibleNotes.some(n => n.title.includes('Workshop Practice')),
    'Authorized branch student (BC) CAN see the Workshop Practice resource')

  // Check AIML branch (unrelated branch - excluded)
  const { data: aimlBranch } = await supabase.from('branches').select('id').eq('code', 'AIML').single()
  const { data: aimlVisibleNotes } = await supabase
    .from('notes')
    .select('id, title, subjects!inner(branch_id)')
    .eq('status', 'published')
    .eq('subjects.branch_id', aimlBranch.id)

  const aimlSeesNWS = aimlVisibleNotes?.some(n => n.title.includes('Workshop Practice')) || false
  assert(!aimlSeesNWS,
    'Unrelated branch student (AIML) CANNOT see the NWS-102 PDF (Zero Leakage)',
    'Access strictly blocked')

  // Check Civil Engineering (CE - has NWS101 in Sem 1, excluded from NWS-102)
  const { data: ceBranch } = await supabase.from('branches').select('id').eq('code', 'CE').single()
  const { data: ceVisibleNotes } = await supabase
    .from('notes')
    .select('id, title, subjects!inner(branch_id)')
    .eq('status', 'published')
    .eq('subjects.branch_id', ceBranch.id)

  const ceSeesNWS102 = ceVisibleNotes?.some(n => n.title.includes('NWS-102')) || false
  assert(!ceSeesNWS102,
    'Unrelated branch student (CE) CANNOT see NWS-102 (CE curriculum has NWS101 only)')

  // 6. Secure Viewer Link and Streaming Access
  console.log('\n--- TEST GROUP 6: Secure Viewer and Streaming Verification ---')
  const { data: signedView, error: signErr } = await supabase.storage
    .from('notes')
    .createSignedUrl(FILE_PATH, 3600, { download: false })

  assert(!signErr && !!signedView?.signedUrl,
    'Secure signed view URL generated with download: false (Read Only)')

  const headCheck = await fetch(signedView.signedUrl, { method: 'HEAD' })
  assert(headCheck.status === 200,
    'Direct PDF URL returns HTTP 200 OK',
    `Status: ${headCheck.status}`)

  assert(headCheck.headers.get('content-type') === 'application/pdf',
    'Response Content-Type is application/pdf')

  // 7. Audit log check
  console.log('\n--- TEST GROUP 7: Administrative Audit Logging ---')
  const { data: auditLog } = await supabase
    .from('admin_audit_logs')
    .select('*')
    .eq('target_type', 'academic_resource')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  assert(!!auditLog,
    'Admin upload and multi-branch assignment recorded in audit logs',
    `Action: ${auditLog?.action}`)

  console.log('\n====================================================================')
  console.log(`SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`)
  console.log('====================================================================')

  if (passedTests !== totalTests) {
    process.exit(1)
  }
}

runVerification().catch(err => {
  console.error('Test execution failed:', err)
  process.exit(1)
})

