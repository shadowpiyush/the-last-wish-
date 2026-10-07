import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iatoiiuqezaeuvtkdpvg.supabase.co'
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdG9paXVxZXphZXV2dGtkcHZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzM4OTgsImV4cCI6MjEwNjQ0OTg5OH0.vkkuWjdgv59IOnKeXI9uKPNqu-fzuEwwlAe1nbXBvko'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdG9paXVxZXphZXV2dGtkcHZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDg3Mzg5OCwiZXhwIjoyMTA2NDQ5ODk4fQ.1UvU6drMDFmnT4tNEO3TTrPiaxWjXKjjUZUljXkds08'
const BASE_URL = 'http://localhost:3000'

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
      },
    },
  })

  const { error: verifyErr } = await ssrClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'email',
  })

  if (verifyErr) throw verifyErr

  return Object.entries(cookiesObj).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ')
}

function createPngBytes(width = 128, height = 128) {
  const bytes = new Uint8Array(33)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0)
  bytes.set([0, 0, 0, 13, 73, 72, 68, 82], 8)
  new DataView(bytes.buffer).setUint32(16, width)
  new DataView(bytes.buffer).setUint32(20, height)
  bytes.set([73, 69, 78, 68], 25)
  return bytes
}

function createJpegBytes(width = 128, height = 128) {
  return new Uint8Array([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x08, 0x08,
    height >> 8, height & 0xff, width >> 8, width & 0xff, 0x03,
    0xff, 0xd9,
  ])
}

function createWebpBytes(width = 128, height = 128) {
  const bytes = new Uint8Array(30)
  bytes.set([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 88], 0)
  const encodedWidth = width - 1
  const encodedHeight = height - 1
  bytes.set([encodedWidth & 0xff, encodedWidth >> 8, encodedWidth >> 16], 24)
  bytes.set([encodedHeight & 0xff, encodedHeight >> 8, encodedHeight >> 16], 27)
  return bytes
}

async function uploadAvatar(cookie, fileName, mimeType, bytes) {
  const formData = new FormData()
  const blob = new Blob([bytes], { type: mimeType })
  formData.append('file', blob, fileName)

  return fetch(`${BASE_URL}/api/profile/avatar`, {
    method: 'POST',
    headers: { Cookie: cookie },
    body: formData,
  })
}

async function runTests() {
  console.log('====================================================================')
  console.log('HARCOURTIAN STUDY HUB: PROFILE PICTURE & ADMIN ENGINEERING TEST SUITE')
  console.log('====================================================================\n')

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

  console.log('1. Setting up authenticated test sessions...')
  const adminCookie = await getAuthCookie('admin@harcoutianhub.in')
  const student1Cookie = await getAuthCookie('student@harcoutianhub.in')

  // Create or get a second student account for authorization / IDOR tests
  const student2Email = 'test_student2_auth@harcoutianhub.in'
  let student2Id = null
  const { data: existingS2 } = await adminClient.from('profiles').select('id').eq('email', student2Email).maybeSingle()
  if (existingS2) {
    student2Id = existingS2.id
  } else {
    const { data: s2User, error: s2Err } = await adminClient.auth.admin.createUser({
      email: student2Email,
      password: 'SecurePassword123!',
      email_confirm: true,
      user_metadata: { full_name: 'Student Two', mobile_number: '+919876543211' },
    })
    if (!s2Err && s2User?.user) {
      student2Id = s2User.user.id
      await adminClient.from('profiles').upsert({
        id: student2Id,
        full_name: 'Student Two',
        email: student2Email,
        mobile_number: '+919876543211',
        role: 'student',
        status: 'active',
      })
    }
  }
  const student2Cookie = await getAuthCookie(student2Email)

  // Resolve Student 1 info
  const { data: s1Profile } = await adminClient.from('profiles').select('id, full_name').eq('email', 'student@harcoutianhub.in').single()
  const student1Id = s1Profile.id

  console.log(`   Admin authenticated. Student 1: ${student1Id}, Student 2: ${student2Id}\n`)

  // ─────────────────────────────────────────────────────────────
  // SUITE 1: PROFILE PICTURE VALIDATION & SECURITY
  // ─────────────────────────────────────────────────────────────
  console.log('--- SUITE 1: PROFILE PICTURE UPLOAD VALIDATION & SECURITY ---')

  // 1.1 Unauthenticated upload fails (401)
  const unauthUploadRes = await uploadAvatar('', 'avatar.jpg', 'image/jpeg', createJpegBytes())
  assert(unauthUploadRes.status === 401, 'Unauthenticated upload rejected with 401')

  // 1.2 Reject invalid MIME / fake extension (.exe renamed to .jpg)
  const fakeJpgRes = await uploadAvatar(student1Cookie, 'malicious.jpg', 'image/jpeg', new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))
  assert(fakeJpgRes.status === 400, 'Reject fake image / MZ binary header with 400')

  // 1.3 Reject unsafe SVG upload
  const svgRes = await uploadAvatar(student1Cookie, 'vector.svg', 'image/svg+xml', Buffer.from('<svg></svg>'))
  assert(svgRes.status === 400, 'Reject SVG upload with 400')

  // 1.4 Reject oversized image (> 4MB)
  const oversizedBytes = new Uint8Array(4.5 * 1024 * 1024)
  oversizedBytes.set(createJpegBytes(), 0)
  const oversizedRes = await uploadAvatar(student1Cookie, 'huge.jpg', 'image/jpeg', oversizedBytes)
  assert([400, 413].includes(oversizedRes.status), 'Reject oversized image (>4MB) with 400/413')

  // 1.5 Upload valid JPEG
  const jpegRes = await uploadAvatar(student1Cookie, 'avatar.jpg', 'image/jpeg', createJpegBytes(200, 200))
  const jpegData = await jpegRes.json()
  assert(jpegRes.status === 200 && jpegData.success, 'Upload valid JPEG returns 200 and success')
  assert(jpegData.avatarUrl?.includes('/api/profile/avatar'), 'Upload response returns secure avatarUrl')

  // 1.6 Verify database updated with image metadata
  const { data: dbProfileAfterJpeg } = await adminClient
    .from('profiles')
    .select('profile_picture_path, profile_picture_version, profile_picture_mime_type')
    .eq('id', student1Id)
    .single()
  assert(dbProfileAfterJpeg.profile_picture_path?.startsWith(`${student1Id}/`), 'Storage key is securely prefixed with user ID')
  assert(dbProfileAfterJpeg.profile_picture_mime_type === 'image/jpeg', 'Database stores verified MIME type (image/jpeg)')

  // 1.7 Replace with valid PNG
  const pngRes = await uploadAvatar(student1Cookie, 'avatar.png', 'image/png', createPngBytes(256, 256))
  const pngData = await pngRes.json()
  assert(pngRes.status === 200 && pngData.success, 'Replace with valid PNG returns 200 and success')

  const { data: dbProfileAfterPng } = await adminClient
    .from('profiles')
    .select('profile_picture_path, profile_picture_mime_type')
    .eq('id', student1Id)
    .single()
  assert(dbProfileAfterPng.profile_picture_mime_type === 'image/png', 'Database reference updated to image/png')

  // 1.8 Replace with valid WebP
  const webpRes = await uploadAvatar(student1Cookie, 'avatar.webp', 'image/webp', createWebpBytes(300, 300))
  const webpData = await webpRes.json()
  assert(webpRes.status === 200 && webpData.success, 'Replace with valid WebP returns 200 and success')

  // ─────────────────────────────────────────────────────────────
  // SUITE 2: AUTHORIZATION & IDOR PROTECTION
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- SUITE 2: AUTHORIZATION & IDOR PROTECTION ---')

  // 2.1 Student views own image
  const ownImageRes = await fetch(`${BASE_URL}/api/profile/avatar?userId=${student1Id}`, {
    headers: { Cookie: student1Cookie },
    redirect: 'manual',
  })
  assert([200, 302, 307].includes(ownImageRes.status), 'Student views own image successfully (redirect to signed URL)')

  // 2.2 Student cannot access another student\'s private image (IDOR blocked!)
  const idorRes = await fetch(`${BASE_URL}/api/profile/avatar?userId=${student1Id}`, {
    headers: { Cookie: student2Cookie },
    redirect: 'manual',
  })
  assert(idorRes.status === 403, 'Student cannot access another student image (IDOR blocked with 403)')

  // 2.3 Unauthenticated cannot access private image
  const unauthImageRes = await fetch(`${BASE_URL}/api/profile/avatar?userId=${student1Id}`, {
    redirect: 'manual',
  })
  assert(unauthImageRes.status === 401, 'Unauthenticated image access rejected with 401')

  // 2.4 Admin can view authorized student image
  const adminImageRes = await fetch(`${BASE_URL}/api/profile/avatar?userId=${student1Id}`, {
    headers: { Cookie: adminCookie },
    redirect: 'manual',
  })
  assert([200, 302, 307].includes(adminImageRes.status), 'Admin can view student profile image (200/302/307)')

  // 2.5 Non-admin cannot access admin-only student details API
  const studentDetailForbiddenRes = await fetch(`${BASE_URL}/api/admin/users/${student1Id}`, {
    headers: { Cookie: student2Cookie },
  })
  assert(studentDetailForbiddenRes.status === 403, 'Non-admin cannot access /api/admin/users/[id] (403 Forbidden)')

  // ─────────────────────────────────────────────────────────────
  // SUITE 3: PROFILE PICTURE REMOVAL & DEFAULT AVATAR COMPATIBILITY
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- SUITE 3: PROFILE PICTURE REMOVAL & FALLBACK ---')

  // 3.1 Remove profile picture
  const deleteRes = await fetch(`${BASE_URL}/api/profile/avatar`, {
    method: 'DELETE',
    headers: { Cookie: student1Cookie },
  })
  const deleteData = await deleteRes.json()
  assert(deleteRes.status === 200 && deleteData.success, 'Remove profile picture returns 200 and success')

  // 3.2 Verify database cleared
  const { data: dbProfileAfterDelete } = await adminClient
    .from('profiles')
    .select('profile_picture_path, profile_picture_url')
    .eq('id', student1Id)
    .single()
  assert(dbProfileAfterDelete.profile_picture_path === null, 'Storage reference cleared in database')
  assert(dbProfileAfterDelete.profile_picture_url === null, 'Public URL cleared in database')

  // 3.3 Existing user without image returns 404 from avatar route
  const noImageAvatarRes = await fetch(`${BASE_URL}/api/profile/avatar?userId=${student1Id}`, {
    headers: { Cookie: student1Cookie },
  })
  assert(noImageAvatarRes.status === 404, 'User without profile picture returns clean 404 (handled gracefully by UI fallback)')

  // ─────────────────────────────────────────────────────────────
  // SUITE 4: ADMIN DETAILED PROFILE VIEW
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- SUITE 4: ADMIN STUDENT PROFILE DATA INSPECTION ---')

  // Upload an avatar for student 1 again so admin inspection can verify avatar URL
  await uploadAvatar(student1Cookie, 'avatar.png', 'image/png', createPngBytes(128, 128))

  const adminDetailRes = await fetch(`${BASE_URL}/api/admin/users/${student1Id}`, {
    headers: { Cookie: adminCookie },
  })
  const adminDetailData = await adminDetailRes.json()
  assert(adminDetailRes.status === 200, 'Admin fetches detailed student profile (HTTP 200)')

  const u = adminDetailData.user
  assert(u !== undefined, 'User object returned')
  assert(u.id === student1Id, 'User ID matches')
  assert(typeof u.full_name === 'string' && u.full_name.length > 0, `Admin sees student full name: "${u.full_name}"`)
  assert(typeof u.email === 'string' && u.email.includes('@'), `Admin sees student email: "${u.email}"`)
  assert('mobile_number' in u, 'Admin sees mobile number field')
  assert('program_id' in u && 'program_name' in u, 'Admin sees program details')
  assert('branch_id' in u && 'branch_name' in u, 'Admin sees branch details')
  assert('current_year' in u, 'Admin sees current year')
  assert('current_semester' in u, 'Admin sees current semester')
  assert('status' in u, 'Admin sees account status')
  assert('created_at' in u, 'Admin sees created date')
  assert(u.profile_picture_url?.includes('/api/profile/avatar'), `Admin sees student profile picture URL: "${u.profile_picture_url}"`)

  // Verify passwords, hashes, and secrets are strictly excluded
  assert(!('password' in u) && !('password_hash' in u) && !('encrypted_password' in u), 'Passwords and hashes strictly excluded')
  assert(!('token' in u) && !('otp' in u) && !('secret' in u), 'Tokens and secrets strictly excluded')

  // ─────────────────────────────────────────────────────────────
  // SUITE 5: PERFORMANCE BENCHMARKING
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- SUITE 5: LATENCY & PERFORMANCE MEASUREMENTS ---')

  // 5.1 Admin Student Directory Listing Latency
  const t0 = performance.now()
  const dirRes = await fetch(`${BASE_URL}/api/admin/users?page=1&pageSize=10`, {
    headers: { Cookie: adminCookie },
  })
  const dirDuration = performance.now() - t0
  assert(dirRes.status === 200, `Admin Student List API responds with 200 in ${dirDuration.toFixed(1)}ms`)
  assert(dirDuration < 500, `Admin Student List is fast (< 500ms): actual = ${dirDuration.toFixed(1)}ms`)

  // 5.2 Admin Student Profile Detail Latency
  const t1 = performance.now()
  const detailRes = await fetch(`${BASE_URL}/api/admin/users/${student1Id}`, {
    headers: { Cookie: adminCookie },
  })
  const detailDuration = performance.now() - t1
  assert(detailRes.status === 200, `Admin Student Detail API responds in ${detailDuration.toFixed(1)}ms`)
  assert(detailDuration < 500, `Admin Student Detail is fast (< 500ms): actual = ${detailDuration.toFixed(1)}ms`)

  // 5.3 Avatar Signed Access Latency (Initial creation + cached warm access)
  const t2 = performance.now()
  const avatarRes = await fetch(`${BASE_URL}/api/profile/avatar?userId=${student1Id}&size=96`, {
    headers: { Cookie: adminCookie },
    redirect: 'manual',
  })
  const avatarColdDuration = performance.now() - t2
  assert([200, 302, 307].includes(avatarRes.status), `Initial Avatar API responds in ${avatarColdDuration.toFixed(1)}ms`)
  assert(avatarColdDuration < 600, `Initial Avatar Creation is < 600ms: actual = ${avatarColdDuration.toFixed(1)}ms`)

  const t2Warm = performance.now()
  const avatarWarmRes = await fetch(`${BASE_URL}/api/profile/avatar?userId=${student1Id}&size=96`, {
    headers: { Cookie: adminCookie },
    redirect: 'manual',
  })
  const avatarWarmDuration = performance.now() - t2Warm
  assert([200, 302, 307].includes(avatarWarmRes.status), `Warm Avatar API responds in ${avatarWarmDuration.toFixed(1)}ms`)
  assert(avatarWarmDuration < 200, `Warm Cached Avatar Access is fast (< 200ms): actual = ${avatarWarmDuration.toFixed(1)}ms`)

  // 5.4 Dashboard Latency
  const t3 = performance.now()
  const dashRes = await fetch(`${BASE_URL}/dashboard`, {
    headers: { Cookie: student1Cookie },
  })
  const dashDuration = performance.now() - t3
  assert(dashRes.status === 200, `Dashboard route responds with 200 in ${dashDuration.toFixed(1)}ms`)
  assert(dashDuration < 800, `Dashboard load is responsive (< 800ms): actual = ${dashDuration.toFixed(1)}ms`)

  console.log('\n====================================================================')
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('====================================================================')

  if (failed > 0) process.exit(1)
}

runTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
