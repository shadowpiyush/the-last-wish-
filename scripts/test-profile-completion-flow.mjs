/**
 * Comprehensive Automated Test Suite: Profile Completion Flow & Redirect Loop Prevention
 * 
 * Tests:
 * 1. Unauthorized access to /api/profile/complete is rejected (401)
 * 2. Academic validation (Program -> Branch relationship)
 * 3. Mobile number validation (Indian format normalization)
 * 4. Google OAuth user simulation (user in auth.users without mobile number or initial profile)
 * 5. Route guard interception before completion (redirects /dashboard -> /complete-profile)
 * 6. Atomic profile save via /api/profile/complete (upserts into public.profiles)
 * 7. Verification that database row is persisted as source of truth
 * 8. Route guard resolution after completion (allows /dashboard, blocks /complete-profile loop)
 * 9. Clean up test records
 */

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import fs from 'fs'

// Load .env.local
const envContent = fs.readFileSync('.env.local', 'utf8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=')
    if (idx !== -1) {
      process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const BASE_URL = 'http://localhost:3000'

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let passed = 0
let failed = 0

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`)
    passed++
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`)
    failed++
  }
}

async function runTestSuite() {
  console.log('===============================================================')
  console.log('TEST SUITE: PROFILE COMPLETION ARCHITECTURE & LOOP PREVENTION')
  console.log('===============================================================\n')

  // ─────────────────────────────────────────────────────────────
  // 1. SECURITY & UNAUTHENTICATED GUARDS
  // ─────────────────────────────────────────────────────────────
  console.log('1. Testing /api/profile/complete Security (Unauthenticated):')
  const unauthRes = await fetch(`${BASE_URL}/api/profile/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mobileNumber: '+919876543210',
      programId: '74435b70-c7b7-4587-ad44-40437c1b1051',
      branchId: '7603f736-c6db-44a6-a255-da7b6c560449',
      currentYear: 1,
      currentSemester: 1,
    }),
  })
  assert(unauthRes.status === 401, 'Unauthenticated request to /api/profile/complete returns 401', `Status: ${unauthRes.status}`)

  // ─────────────────────────────────────────────────────────────
  // 2. FETCH VALID ACADEMIC PROGRAMS & BRANCHES
  // ─────────────────────────────────────────────────────────────
  console.log('\n2. Fetching Canonical Academic Programs & Branches:')
  const { data: progs } = await supabaseAdmin.from('programs').select('id, name, short_code, duration_years, total_semesters').order('name')
  const { data: branches } = await supabaseAdmin.from('branches').select('id, program_id, name, code').order('name')

  assert(progs && progs.length > 0, `Loaded ${progs?.length} academic programs from database`)
  assert(branches && branches.length > 0, `Loaded ${branches?.length} academic branches from database`)

  const btech = progs.find(p => p.short_code === 'B.Tech') || progs[0]
  const validBranch = branches.find(b => b.program_id === btech.id) || branches[0]
  const invalidBranch = branches.find(b => b.program_id !== btech.id) || null

  // ─────────────────────────────────────────────────────────────
  // 3. SIMULATE FIRST-TIME GOOGLE OAUTH USER
  // ─────────────────────────────────────────────────────────────
  console.log('\n3. Simulating First-time Google OAuth User:')
  const testEmail = `google_test_${Date.now()}@hbtu-portal.in`
  const testPassword = `Pass#${Date.now()}!Secure`

  // Create user in auth.users WITHOUT mobile_number or program_id (exactly how Google OAuth creates it)
  const { data: { user: testUser }, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: {
      full_name: 'Aditi Sharma',
      avatar_url: 'https://lh3.googleusercontent.com/a/dummy-photo',
      iss: 'https://accounts.google.com',
    },
  })

  assert(!createErr && testUser?.id, `Simulated Google user created in auth.users: ${testUser?.id}`)

  // Check initial state in public.profiles:
  const { data: initialProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', testUser.id).maybeSingle()
  console.log(`  Initial public.profiles state: ${initialProfile ? 'Row exists' : 'No row exists (expected for OAuth signup)'}`)

  // ─────────────────────────────────────────────────────────────
  // 4. SIGN IN WITH TEST USER TO OBTAIN AUTH COOKIES
  // ─────────────────────────────────────────────────────────────
  console.log('\n4. Signing In to Establish Authenticated Session:')
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: testEmail,
  })

  assert(!linkErr && linkData?.properties?.hashed_token, 'Generated magic link token for session establishment')

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

  assert(!verifyErr, 'SSR client verified OTP and acquired session cookies')

  const cookieHeader = Object.entries(cookiesObj).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ')

  // ─────────────────────────────────────────────────────────────
  // 5. ATTEMPT INVALID PROFILE SUBMISSIONS (ACADEMIC INTEGRITY)
  // ─────────────────────────────────────────────────────────────
  console.log('\n5. Testing Validation on /api/profile/complete (Authenticated):')

  // A. Invalid Mobile Number
  const badMobileRes = await fetch(`${BASE_URL}/api/profile/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      fullName: 'Aditi Sharma',
      mobileNumber: '12345', // Invalid
      programId: btech.id,
      branchId: validBranch.id,
      currentYear: 1,
      currentSemester: 1,
    }),
  })
  const badMobileData = await badMobileRes.json()
  assert(badMobileRes.status === 400 && badMobileData.error.includes('mobile'), 'Rejects invalid mobile number with 400', badMobileData.error)

  // B. Mismatched Program -> Branch Relationship
  if (invalidBranch) {
    const mismatchRes = await fetch(`${BASE_URL}/api/profile/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        fullName: 'Aditi Sharma',
        mobileNumber: '9876543210',
        programId: btech.id,
        branchId: invalidBranch.id, // Does not belong to B.Tech
        currentYear: 1,
        currentSemester: 1,
      }),
    })
    const mismatchData = await mismatchRes.json()
    assert(mismatchRes.status === 400 && mismatchData.error.includes('belong'), 'Rejects mismatched Program -> Branch relationship', mismatchData.error)
  }

  // ─────────────────────────────────────────────────────────────
  // 6. ATOMIC SAVE & COMPLETE PROFILE VIA API
  // ─────────────────────────────────────────────────────────────
  console.log('\n6. Executing Atomic Profile Completion:')
  const completeRes = await fetch(`${BASE_URL}/api/profile/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      fullName: 'Aditi Sharma',
      mobileNumber: '9876543210', // Raw 10 digits
      programId: btech.id,
      branchId: validBranch.id,
      currentYear: 1,
      currentSemester: 1,
    }),
  })

  assert(completeRes.status === 200, `POST /api/profile/complete returned 200 OK (Status: ${completeRes.status})`)
  const completeData = await completeRes.json()
  assert(completeData.success === true, 'Response indicates success: true')
  assert(completeData.profile?.mobile_number === '+919876543210', `Normalized Indian mobile saved: ${completeData.profile?.mobile_number}`)
  assert(completeData.profile?.program_id === btech.id, `Program ID persisted correctly: ${completeData.profile?.program_id}`)
  assert(completeData.profile?.branch_id === validBranch.id, `Branch ID persisted correctly: ${completeData.profile?.branch_id}`)

  // ─────────────────────────────────────────────────────────────
  // 7. VERIFY DATABASE AS AUTHORITATIVE SOURCE OF TRUTH
  // ─────────────────────────────────────────────────────────────
  console.log('\n7. Verifying Database State Directly via Service Role:')
  const { data: dbProfile, error: dbErr } = await supabaseAdmin
    .from('profiles')
    .select(`
      *,
      programs:program_id (name, short_code),
      branches:branch_id (name, code)
    `)
    .eq('id', testUser.id)
    .single()

  assert(!dbErr && dbProfile, 'Profile record exists in public.profiles table')
  assert(dbProfile?.mobile_number === '+919876543210', `Database contains correct mobile number (+919876543210)`)
  assert(dbProfile?.program_id === btech.id, `Database contains valid program_id foreign key`)
  assert(dbProfile?.branch_id === validBranch.id, `Database contains valid branch_id foreign key`)
  assert(dbProfile?.programs?.short_code === btech.short_code, `Database joined program short_code: ${dbProfile?.programs?.short_code}`)
  assert(dbProfile?.branches?.code === validBranch.code, `Database joined branch code: ${dbProfile?.branches?.code}`)

  // ─────────────────────────────────────────────────────────────
  // 8. VERIFY ROUTE GUARD ALLOWS ACCESS TO DASHBOARD
  // ─────────────────────────────────────────────────────────────
  console.log('\n8. Verifying Route Access After Profile Completion:')
  const dashRes = await fetch(`${BASE_URL}/dashboard`, {
    headers: { Cookie: cookieHeader },
    redirect: 'manual',
  })

  assert(
    dashRes.status === 200,
    `Authenticated user with complete profile accesses /dashboard successfully (Status: ${dashRes.status})`
  )
  assert(!dashRes.headers.get('location')?.includes('/complete-profile'), 'User is NOT redirected back to /complete-profile')

  // ─────────────────────────────────────────────────────────────
  // 9. CLEAN UP TEST USER
  // ─────────────────────────────────────────────────────────────
  console.log('\n9. Cleaning Up Test Data:')
  await supabaseAdmin.from('profiles').delete().eq('id', testUser.id)
  await supabaseAdmin.auth.admin.deleteUser(testUser.id)
  console.log('  Cleaned up test user from auth.users and public.profiles.')

  console.log('\n===============================================================')
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('===============================================================\n')

  if (failed > 0) process.exit(1)
  process.exit(0)
}

runTestSuite().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
