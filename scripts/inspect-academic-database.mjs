import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function inspect() {
  console.log('=== 1. FETCHING ALL PROGRAMS ===')
  const { data: programs, error: progErr } = await supabase
    .from('programs')
    .select('id, name, short_code, duration_years, total_semesters')
    .order('name')
  if (progErr) console.error('Error fetching programs:', progErr)
  else console.table(programs)

  console.log('\n=== 2. FETCHING ALL BRANCHES ===')
  const { data: branches, error: branchErr } = await supabase
    .from('branches')
    .select('id, program_id, name, code, programs(short_code)')
    .order('code')
  if (branchErr) console.error('Error fetching branches:', branchErr)
  else {
    console.log(`Total branches: ${branches?.length}`)
    console.table(branches?.map(b => ({
      id: b.id,
      program: b.programs?.short_code,
      name: b.name,
      code: b.code,
    })))
  }

  console.log('\n=== 3. SEARCHING FOR NWS-102 AND WORKSHOP PRACTICE SUBJECTS ===')
  // Broad search
  const { data: nwsSubjects, error: subErr } = await supabase
    .from('subjects')
    .select(`
      id, subject_code, subject_name, year_number, semester_number, credits, category, status,
      program_id, programs(id, name, short_code),
      branch_id, branches(id, name, code)
    `)
    .or('subject_code.ilike.%NWS%,subject_name.ilike.%Workshop%')
    .order('subject_code')

  if (subErr) console.error('Error fetching subjects:', subErr)
  else {
    console.log(`Found ${nwsSubjects?.length} subjects matching NWS or Workshop:`)
    console.table(nwsSubjects?.map(s => ({
      id: s.id,
      subject_code: s.subject_code,
      subject_name: s.subject_name,
      program: s.programs?.short_code,
      branch_code: s.branches?.code,
      branch_name: s.branches?.name,
      year: s.year_number,
      semester: s.semester_number,
      category: s.category,
      status: s.status,
    })))
  }

  console.log('\n=== 4. CHECKING EXISTING NOTES AND LIBRARY BOOKS ===')
  const { data: existingNotes, error: notesErr } = await supabase
    .from('notes')
    .select('id, title, file_path, status, subject_id, subjects(subject_code, subject_name)')
    .order('created_at', { ascending: false })
    .limit(20)
  if (notesErr) console.error('Notes err:', notesErr)
  else {
    console.log(`Existing notes count: ${existingNotes?.length}`)
    console.table(existingNotes?.map(n => ({
      id: n.id,
      title: n.title,
      subject: n.subjects?.subject_code,
      file_path: n.file_path,
      status: n.status,
    })))
  }

  const { data: existingBooks, error: booksErr } = await supabase
    .from('library_books')
    .select('id, title, ebook_file_path, ebook_status, subject_id, subjects(subject_code, subject_name)')
    .order('created_at', { ascending: false })
    .limit(20)
  if (booksErr) console.error('Books err:', booksErr)
  else {
    console.log(`Existing library books count: ${existingBooks?.length}`)
    console.table(existingBooks?.map(b => ({
      id: b.id,
      title: b.title,
      subject: b.subjects?.subject_code,
      ebook_file_path: b.ebook_file_path,
    })))
  }

  console.log('\n=== 5. CHECKING STORAGE BUCKETS ===')
  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets()
  if (bucketErr) console.error('Bucket err:', bucketErr)
  else console.table(buckets)
}

inspect()

