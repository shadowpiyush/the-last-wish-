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
const FILE_SIZE = 6721998
const FILE_TYPE = 'application/pdf'
const TOTAL_PAGES = 23
const RESOURCE_TITLE = 'Workshop Practice (NWS-102) — Welding Shop Lab Manual'
const RESOURCE_DESC = 'Official laboratory workbook and practical notes for Workshop Practice (NWS-102 / NWS102) covering electric arc welding (Butt Joint), oxy-acetylene gas welding (Lap Joint), welding equipment, tools, and safety protocols.'

async function assignResource() {
  console.log('=== STEP 1: VERIFYING ADMIN USER ===')
  const { data: adminUser, error: adminErr } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'admin')
    .limit(1)
    .single()

  if (adminErr || !adminUser) {
    throw new Error('Admin profile not found')
  }
  console.log(`Admin User: ${adminUser.full_name} (${adminUser.email}, ID: ${adminUser.id})`)

  console.log('\n=== STEP 2: DISCOVERING VERIFIED SUBJECT RECORDS FROM DATABASE ===')
  // Find all subjects matching NWS-102 / Workshop Practice
  const { data: subjects, error: subErr } = await supabase
    .from('subjects')
    .select(`
      id, subject_code, subject_name, year_number, semester_number, category,
      program_id, programs(id, name, short_code),
      branch_id, branches(id, name, code)
    `)
    .or('subject_code.ilike.%NWS%102%,subject_code.ilike.%NWS-102%')
    .ilike('subject_name', '%Workshop Practice%')

  if (subErr || !subjects || subjects.length === 0) {
    throw new Error(`Failed to find NWS-102 subjects: ${subErr?.message}`)
  }

  console.log(`Discovered ${subjects.length} verified academic subject records:`)
  console.table(subjects.map(s => ({
    subject_id: s.id,
    code: s.subject_code,
    name: s.subject_name,
    program: s.programs?.short_code,
    branch_code: s.branches?.code,
    branch_name: s.branches?.name,
    year: s.year_number,
    semester: s.semester_number,
  })))

  // Identify primary subject (LFT is where Arvind Prakash submitted the lab manual)
  const primarySubject = subjects.find(s => s.branches?.code === 'LFT') || subjects[0]
  console.log(`\nPrimary Subject selected: ${primarySubject.subject_code} - ${primarySubject.branches?.code} (${primarySubject.id})`)

  console.log('\n=== STEP 3: CREATING CENTRALIZED DIGITAL RESOURCE RECORD IN library_books ===')
  // Check if already created
  const { data: existingBook } = await supabase
    .from('library_books')
    .select('id, title, ebook_file_path')
    .eq('ebook_file_path', FILE_PATH)
    .maybeSingle()

  let bookId = existingBook?.id

  if (!bookId) {
    const { data: newBook, error: bookErr } = await supabase
      .from('library_books')
      .insert({
        title: RESOURCE_TITLE,
        subtitle: 'Welding Shop Practical Manual & Lab Record (Arc & Gas Welding)',
        author: 'Arvind Prakash (HBTU Kanpur)',
        publisher: 'Harcoutian Academic Press',
        edition: '1st Edition (2026)',
        publication_year: 2026,
        language: 'English',
        description: RESOURCE_DESC,
        book_type: 'Lab Manual',
        subject_id: primarySubject.id,
        ebook_status: 'available',
        ebook_file_path: FILE_PATH,
        total_pages: TOTAL_PAGES,
        storage_provider: 'supabase',
      })
      .select('id')
      .single()

    if (bookErr || !newBook) {
      throw new Error(`Failed to create library_book record: ${bookErr?.message}`)
    }
    bookId = newBook.id
    console.log(`Created library_books record ID: ${bookId}`)
  } else {
    console.log(`Existing library_books record found ID: ${bookId}`)
  }

  console.log('\n=== STEP 4: CREATING ACADEMIC MAPPINGS IN ebook_academic_mappings ===')
  // Delete existing mappings for this book to ensure clean idempotent state
  await supabase
    .from('ebook_academic_mappings')
    .delete()
    .eq('book_id', bookId)

  const academicMappings = subjects.map(s => ({
    book_id: bookId,
    program_id: s.program_id,
    branch_id: s.branch_id,
    year_number: s.year_number,
    semester_number: s.semester_number,
    subject_id: s.id,
    academic_category: 'Lab Manual',
  }))

  const { data: insertedMappings, error: mapErr } = await supabase
    .from('ebook_academic_mappings')
    .insert(academicMappings)
    .select('id, branch_id, subject_id')

  if (mapErr) {
    throw new Error(`Failed to insert academic mappings: ${mapErr.message}`)
  }
  console.log(`Successfully mapped to ${insertedMappings?.length} branches in ebook_academic_mappings!`)

  console.log('\n=== STEP 5: CREATING SUBJECT-WISE NOTES MAPPINGS IN notes ===')
  // For each subject, check if a note already exists with this file_path and subject_id
  const assignedNoteIds = []
  for (const s of subjects) {
    const { data: existingNote } = await supabase
      .from('notes')
      .select('id')
      .eq('file_path', FILE_PATH)
      .eq('subject_id', s.id)
      .maybeSingle()

    if (existingNote) {
      console.log(`Note already exists for branch ${s.branches?.code} (Subject ID: ${s.id}): Note ID ${existingNote.id}`)
      assignedNoteIds.push({ branch: s.branches?.code, noteId: existingNote.id })
    } else {
      const { data: newNote, error: noteErr } = await supabase
        .from('notes')
        .insert({
          title: `${RESOURCE_TITLE} [${s.branches?.code}]`,
          description: RESOURCE_DESC,
          subject_id: s.id,
          uploader_id: adminUser.id,
          file_path: FILE_PATH,
          file_type: FILE_TYPE,
          file_size: FILE_SIZE,
          status: 'published',
          view_count: 0,
        })
        .select('id')
        .single()

      if (noteErr || !newNote) {
        console.error(`Error inserting note for branch ${s.branches?.code}:`, noteErr)
      } else {
        console.log(`Inserted note for branch ${s.branches?.code}: Note ID ${newNote.id}`)
        assignedNoteIds.push({ branch: s.branches?.code, noteId: newNote.id })
      }
    }
  }

  console.log('\n=== STEP 6: RECORDING ADMIN AUDIT LOG ===')
  const { data: auditData, error: auditErr } = await supabase
    .from('admin_audit_logs')
    .insert({
      admin_id: adminUser.id,
      action: 'CENTRALIZED_UPLOAD_ASSIGNMENT',
      target_type: 'academic_resource',
      target_id: bookId,
      details: {
        resource_title: RESOURCE_TITLE,
        subject_code: 'NWS-102',
        subject_name: 'Workshop Practice',
        file_path: FILE_PATH,
        file_size: FILE_SIZE,
        total_pages: TOTAL_PAGES,
        mapped_branches: subjects.map(s => s.branches?.code),
        mappings_count: subjects.length,
        book_id: bookId,
        assigned_notes: assignedNoteIds,
      },
    })
    .select('id, created_at')
    .single()

  if (auditErr) {
    console.warn('Audit log warning:', auditErr.message)
  } else {
    console.log(`Audit log recorded successfully! Log ID: ${auditData.id}`)
  }

  console.log('\n✅ ALL DATABASE ASSIGNMENTS COMPLETED SUCCESSFULLY!')
}

assignResource().catch(err => {
  console.error('Fatal error during assignment:', err)
  process.exit(1)
})

