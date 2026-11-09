import { createClient } from '@supabase/supabase-js'
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function measureQuery(name, fn) {
  const t0 = performance.now()
  try {
    const res = await fn()
    const t1 = performance.now()
    const durationMs = (t1 - t0).toFixed(2)
    return { name, durationMs: Number(durationMs), success: true, count: Array.isArray(res?.data) ? res.data.length : res?.count ?? 1 }
  } catch (err) {
    const t1 = performance.now()
    return { name, durationMs: Number((t1 - t0).toFixed(2)), success: false, error: err.message }
  }
}

async function runAudit() {
  console.log('========================================================================')
  console.log('⚡ HARCOURTIAN STUDY HUB: DATABASE & BACKEND PERFORMANCE BASELINE AUDIT')
  console.log('========================================================================\n')

  const results = []

  // 1. Academic Metadata Queries (Frequently fetched across all pages)
  results.push(await measureQuery('Programs (all)', () => 
    supabase.from('programs').select('id, name, short_code').order('name')
  ))

  results.push(await measureQuery('Branches (all 21)', () => 
    supabase.from('branches').select('id, program_id, name, code').order('code')
  ))

  results.push(await measureQuery('Subjects (all 550 limit 100)', () => 
    supabase.from('subjects').select('id, subject_code, subject_name, semester_number, year_number, branch_id').limit(100)
  ))

  results.push(await measureQuery('Subjects (filtered by branch & semester)', () => 
    supabase.from('subjects').select('id, subject_code, subject_name').eq('branch_id', '179591ff-0faf-416a-a7e4-9477e92634a2').eq('semester_number', 3)
  ))

  // 2. Study Notes Queries
  results.push(await measureQuery('Study Notes (initial branch query with joins)', () => 
    supabase.from('notes').select(`
      id, title, description, file_path, file_type, file_size, view_count, created_at, status,
      subjects!inner (
        id, subject_code, subject_name, semester_number, year_number, branch_id, program_id,
        branches (id, name, code),
        programs (id, name, short_code)
      )
    `).eq('status', 'published').eq('subjects.branch_id', '179591ff-0faf-416a-a7e4-9477e92634a2').limit(20)
  ))

  results.push(await measureQuery('Study Notes (multi-field search query)', () => 
    supabase.from('notes').select(`
      id, title, description, file_path, file_size, view_count, created_at, status,
      subjects!inner (id, subject_code, subject_name, branches(code))
    `).eq('status', 'published').ilike('title', '%Workshop%').limit(20)
  ))

  // 3. Attendance Queries
  results.push(await measureQuery('Attendance Records (single student)', () => 
    supabase.from('attendance_records').select('*').limit(100)
  ))

  results.push(await measureQuery('Attendance Folders / Subjects', () => 
    supabase.from('attendance_folders').select('*').limit(50)
  ))

  // 4. Digital Library & eBooks
  results.push(await measureQuery('Library Books (with academic mappings)', () => 
    supabase.from('library_books').select(`
      id, title, author, edition, publisher, pages, file_size, storage_path, cover_image_path, download_count,
      ebook_academic_mappings (
        id, program_id, branch_id, year, semester, subject_id,
        branches (name, code),
        subjects (subject_code, subject_name)
      )
    `).limit(20)
  ))

  // 5. Syllabus and Curriculum
  results.push(await measureQuery('Curriculum nodes (filtered by branch)', () => 
    supabase.from('curriculum_nodes').select('*').limit(50)
  ))

  // 6. Profiles & Auth User
  results.push(await measureQuery('Profile lookup (single student with joins)', () => 
    supabase.from('profiles').select(`
      id, full_name, role, program_id, branch_id, current_year, current_semester,
      programs(id, name, short_code),
      branches(id, name, code)
    `).limit(1).single()
  ))

  // 7. Cloudflare R2 latency
  const accountId = process.env.R2_ACCOUNT_ID?.trim()
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim()
  const bucketName = process.env.R2_BUCKET_NAME?.trim() || 'ebookslib'

  if (accountId && accessKeyId && secretAccessKey) {
    const r2T0 = performance.now()
    try {
      const r2 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      })
      await r2.send(new HeadBucketCommand({ Bucket: bucketName }))
      const r2T1 = performance.now()
      results.push({ name: 'Cloudflare R2 Bucket Head Latency', durationMs: Number((r2T1 - r2T0).toFixed(2)), success: true, count: 1 })
    } catch (err) {
      const r2T1 = performance.now()
      results.push({ name: 'Cloudflare R2 Bucket Head Latency', durationMs: Number((r2T1 - r2T0).toFixed(2)), success: false, error: err.message })
    }
  } else {
    results.push({ name: 'Cloudflare R2 Bucket Head Latency', durationMs: 0, success: false, error: 'Not configured' })
  }

  console.log('RESULTS:')
  console.table(results)
}

runAudit().catch(console.error)
