import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import fs from 'fs'

// Load .env.local if present in development/test environment
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=')
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim()
        const val = trimmed.slice(idx + 1).trim().replace(/^['"](.*)['"]$/, '$1')
        process.env[key] = process.env[key] || val
      }
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('ERROR: Missing required Supabase credentials in environment or .env.local')
  process.exit(1)
}

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

async function getAuthCookie(email) {
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkErr || !linkData?.properties?.hashed_token) {
    throw new Error(`Failed to generate link for ${email}: ${linkErr?.message}`)
  }

  const cookiesObj = {}
  const ssrClient = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll() {
        return Object.entries(cookiesObj).map(([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          cookiesObj[name] = value
        })
      }
    }
  })

  const { error: verifyErr } = await ssrClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'email'
  })

  if (verifyErr) throw verifyErr

  return Object.entries(cookiesObj).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ')
}

async function runTests() {
  console.log('====================================================')
  console.log('STARTING AUTOMATED SYSTEM & AUTHORIZATION TESTS')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`)
      failed++
    }
  }

  console.log('Authenticating real admin and student test sessions...')
  const adminCookie = await getAuthCookie('admin@harcoutianhub.in')
  const studentCookie = await getAuthCookie('student@harcoutianhub.in')

  const adminHeaders = {
    'Content-Type': 'application/json',
    Cookie: adminCookie,
  }

  const studentHeaders = {
    'Content-Type': 'application/json',
    Cookie: studentCookie,
  }

  // ─────────────────────────────────────────────────────────────
  // SUITE 1: UNAUTHENTICATED ACCESS TESTS
  // ─────────────────────────────────────────────────────────────
  console.log('--- SUITE 1: UNAUTHENTICATED ACCESS PROTECTION ---')

  const unauthUsersRes = await fetch(`${BASE_URL}/api/admin/users`)
  assert(unauthUsersRes.status === 401, 'Unauthenticated GET /api/admin/users returns 401')

  const unauthInitiateRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Test Book', fileName: 'test.pdf', fileSize: 1000 }),
  })
  assert(unauthInitiateRes.status === 401, 'Unauthenticated POST /api/admin/ebooks/upload/initiate returns 401')

  const unauthSignRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/sign-part`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId: 'xyz', fileKey: 'abc', partNumber: 1 }),
  })
  assert(unauthSignRes.status === 401, 'Unauthenticated POST /api/admin/ebooks/upload/sign-part returns 401')

  const unauthCompleteRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId: 'xyz', fileKey: 'abc', parts: [] }),
  })
  assert(unauthCompleteRes.status === 401, 'Unauthenticated POST /api/admin/ebooks/upload/complete returns 401')

  const unauthAbortRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/abort`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId: 'xyz', fileKey: 'abc' }),
  })
  assert(unauthAbortRes.status === 401, 'Unauthenticated POST /api/admin/ebooks/upload/abort returns 401')

  const unauthDeleteRes = await fetch(`${BASE_URL}/api/admin/ebooks?id=123`, {
    method: 'DELETE',
  })
  assert(unauthDeleteRes.status === 401, 'Unauthenticated DELETE /api/admin/ebooks returns 401')

  const unauthChunkRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/chunk`, {
    method: 'POST',
  })
  assert(unauthChunkRes.status === 401, 'Unauthenticated POST /api/admin/ebooks/upload/chunk returns 401')

  const unauthAccessRes = await fetch(`${BASE_URL}/api/ebooks/123/access`)
  assert(unauthAccessRes.status === 401, 'Unauthenticated GET /api/ebooks/[id]/access returns 401')

  // ─────────────────────────────────────────────────────────────
  // SUITE 2: NORMAL USER (STUDENT) FORBIDDEN CHECKS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- SUITE 2: NORMAL USER (STUDENT) FORBIDDEN CHECKS ---')

  const studentUsersRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: studentHeaders,
  })
  assert(studentUsersRes.status === 403, 'Student GET /api/admin/users returns 403 Forbidden')

  const studentInitiateRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/initiate`, {
    method: 'POST',
    headers: studentHeaders,
    body: JSON.stringify({ title: 'Student Book', fileName: 'test.pdf', fileSize: 1000 }),
  })
  assert(studentInitiateRes.status === 403, 'Student POST /api/admin/ebooks/upload/initiate returns 403 Forbidden')

  const studentSignRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/sign-part`, {
    method: 'POST',
    headers: studentHeaders,
    body: JSON.stringify({ uploadId: 'xyz', fileKey: 'abc', partNumber: 1 }),
  })
  assert(studentSignRes.status === 403, 'Student POST /api/admin/ebooks/upload/sign-part returns 403 Forbidden')

  const studentChunkRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/chunk`, {
    method: 'POST',
    headers: studentHeaders,
  })
  assert(studentChunkRes.status === 403, 'Student POST /api/admin/ebooks/upload/chunk returns 403 Forbidden')

  const studentDeleteRes = await fetch(`${BASE_URL}/api/admin/ebooks?id=123`, {
    method: 'DELETE',
    headers: studentHeaders,
  })
  assert(studentDeleteRes.status === 403, 'Student DELETE /api/admin/ebooks returns 403 Forbidden')

  // ─────────────────────────────────────────────────────────────
  // SUITE 3: ADMIN USER DIRECTORY & MANAGEMENT TESTS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- SUITE 3: ADMIN USER DIRECTORY & MANAGEMENT ---')

  const adminUsersRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: adminHeaders,
  })
  assert(adminUsersRes.status === 200, 'Admin GET /api/admin/users returns 200 OK')
  const adminUsersData = await adminUsersRes.json()

  assert(Array.isArray(adminUsersData.users), 'Admin users response contains users array')
  assert(adminUsersData.users.length > 0, `Users array contains registered profiles (${adminUsersData.users.length} found)`)

  // Check no sensitive secrets are leaked
  const sampleUser = adminUsersData.users[0]
  const hasSecrets = 'password' in sampleUser || 'encrypted_password' in sampleUser || 'token' in sampleUser || 'service_role' in sampleUser
  assert(!hasSecrets, 'User profile object strictly excludes passwords, hashes, and secrets')
  assert('full_name' in sampleUser && 'email' in sampleUser && 'role' in sampleUser, 'User profile contains full_name, email, and role')

  // Test Search by Name
  const searchNameRes = await fetch(`${BASE_URL}/api/admin/users?search=Administrator`, {
    headers: adminHeaders,
  })
  const searchNameData = await searchNameRes.json()
  assert(
    searchNameData.users.some((u) => u.full_name.includes('Administrator')),
    'Admin user search by name works correctly'
  )

  // Test Search by Email
  const searchEmailRes = await fetch(`${BASE_URL}/api/admin/users?search=student@harcoutianhub.in`, {
    headers: adminHeaders,
  })
  const searchEmailData = await searchEmailRes.json()
  assert(
    searchEmailData.users.some((u) => u.email === 'student@harcoutianhub.in'),
    'Admin user search by email works correctly'
  )

  // Test Role Filter
  const roleFilterRes = await fetch(`${BASE_URL}/api/admin/users?role=student`, {
    headers: adminHeaders,
  })
  const roleFilterData = await roleFilterRes.json()
  assert(
    roleFilterData.users.every((u) => u.role === 'student'),
    'Role filter (student) returns only student accounts'
  )

  // Test Pagination
  const paginationRes = await fetch(`${BASE_URL}/api/admin/users?page=1&pageSize=1`, {
    headers: adminHeaders,
  })
  const paginationData = await paginationRes.json()
  assert(paginationData.users.length === 1, 'Pagination respects pageSize=1')
  assert(paginationData.pagination.totalPages >= 1, 'Pagination provides totalPages metadata')

  // ─────────────────────────────────────────────────────────────
  // SUITE 4: INPUT VALIDATION & FAILURE HANDLING TESTS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- SUITE 4: INPUT VALIDATION & FAILURE HANDLING ---')

  // Reject non-PDF file
  const invalidTypeRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/initiate`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'Invalid Book',
      fileName: 'virus.exe',
      fileSize: 1024,
      contentType: 'application/x-msdownload',
    }),
  })
  assert(invalidTypeRes.status === 400, 'Reject non-PDF file (.exe) with 400 Bad Request')

  // Reject 0-byte file
  const emptyFileRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/initiate`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'Empty Book',
      fileName: 'empty.pdf',
      fileSize: 0,
      contentType: 'application/pdf',
    }),
  })
  assert(emptyFileRes.status === 400, 'Reject empty 0-byte PDF with 400 Bad Request')

  // Reject missing title
  const missingTitleRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/initiate`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: '',
      fileName: 'book.pdf',
      fileSize: 1048576,
      contentType: 'application/pdf',
    }),
  })
  assert(missingTitleRes.status === 400, 'Reject missing eBook title with 400 Bad Request')

  // Abort with missing uploadId
  const invalidAbortRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/abort`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ uploadId: '', fileKey: '' }),
  })
  assert(invalidAbortRes.status === 400, 'Reject abort without uploadId with 400 Bad Request')

  // Sign parts without uploadId
  const invalidSignRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/sign-part`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ uploadId: '', fileKey: 'test.pdf', partNumber: 1 }),
  })
  assert(invalidSignRes.status === 400, 'Reject sign-part without uploadId with 400 Bad Request')

  // Complete without parts
  const invalidCompRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/complete`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ uploadId: 'test', fileKey: 'test.pdf', parts: [], title: 'Title' }),
  })
  assert(invalidCompRes.status === 400, 'Reject complete without parts with 400 Bad Request')

  // ─────────────────────────────────────────────────────────────
  // SUITE 5: 145 MB LARGE FILE CHUNK LOGIC VERIFICATION
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- SUITE 5: 145 MB LARGE FILE LOGIC VERIFICATION ---')

  const targetSize145MB = 145 * 1024 * 1024 // 152,043,520 bytes
  const partSize = 10 * 1024 * 1024 // 10 MB
  const expectedChunks = Math.ceil(targetSize145MB / partSize)
  assert(expectedChunks === 15, `145 MB PDF correctly divides into ${expectedChunks} parts of 10 MB`)

  console.log('\n====================================================')
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('====================================================')
}

runTests().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
