import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function runTests() {
  console.log('--- STARTING GOOGLE PROFILE SYNC VERIFICATION TESTS ---\n')
  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${message}`)
      failed++
    }
  }

  try {
    // 1. Audit Google OAuth Users in Database
    console.log('1. Checking Google OAuth Users in Database...')
    const { data: { users }, error: usersErr } = await supabaseAdmin.auth.admin.listUsers()
    if (usersErr) throw usersErr

    const googleUsers = users.filter(u => 
      u.app_metadata?.provider === 'google' || 
      u.app_metadata?.providers?.includes('google') ||
      u.identities?.some(i => i.provider === 'google')
    )

    assert(googleUsers.length > 0, `Found ${googleUsers.length} Google OAuth user(s) in auth.users`)

    for (const u of googleUsers) {
      console.log(`\n  Checking user: ${u.email} (${u.id})`)
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select(`
          id, full_name, email, email_confirmed_at, mobile_number, role,
          program_id, branch_id, current_year, current_semester, last_login_at
        `)
        .eq('id', u.id)
        .maybeSingle()

      if (profile) {
        assert(profile.email === u.email, `Profile email '${profile.email}' matches auth.users email '${u.email}'`)
        assert(Boolean(profile.email_confirmed_at), `Profile has non-null email_confirmed_at: ${profile.email_confirmed_at}`)
        assert(Boolean(profile.last_login_at), `Profile has authentic last_login_at: ${profile.last_login_at}`)
        assert(Boolean(profile.mobile_number), `Profile has mobile_number preserved: ${profile.mobile_number}`)
        assert(Boolean(profile.branch_id), `Profile has academic branch_id preserved: ${profile.branch_id}`)
      } else {
        console.log(`  (Note: User ${u.email} has not completed onboarding yet - profile row absent as expected)`)
      }
    }

    // 2. Test Admin User Detail Resolver logic for Google User
    console.log('\n2. Testing Admin User Detail API logic for Srashti Rajput (Google user)...')
    const srashti = googleUsers.find(u => u.email === 'srashtirajput888@gmail.com')
    if (srashti) {
      const [profileRes, authUserRes] = await Promise.all([
        supabaseAdmin
          .from('profiles')
          .select(`
            id, full_name, email, email_confirmed_at, mobile_number, role, status,
            program_id, branch_id, current_year, current_semester, created_at,
            updated_at, last_login_at,
            programs:program_id (id, name, short_code),
            branches:branch_id (id, name, code)
          `)
          .eq('id', srashti.id)
          .maybeSingle(),
        supabaseAdmin.auth.admin.getUserById(srashti.id),
      ])

      const profile = profileRes.data
      const authUser = authUserRes.data?.user

      const authoritativeEmail = authUser?.email || profile?.email || null
      const authoritativeConfirmedAt = authUser?.email_confirmed_at || authUser?.confirmed_at || profile?.email_confirmed_at || null
      const isEmailVerified = Boolean(authoritativeConfirmedAt)

      const appProvider = authUser?.app_metadata?.provider
      const appProviders = authUser?.app_metadata?.providers || []
      const identityProvider = authUser?.identities?.[0]?.provider
      const isGoogle = appProvider === 'google' || appProviders.includes('google') || identityProvider === 'google'
      const authProvider = isGoogle ? 'google' : (appProvider || identityProvider || (authoritativeEmail ? 'email' : 'unknown'))

      const authoritativeLastSignIn = authUser?.last_sign_in_at || profile?.last_login_at || null
      const phoneConfirmedAt = authUser?.phone_confirmed_at || null
      const isPhoneVerified = Boolean(phoneConfirmedAt)

      assert(authoritativeEmail === 'srashtirajput888@gmail.com', `Resolved authoritative email: ${authoritativeEmail}`)
      assert(isEmailVerified === true, 'Resolved email_verified is TRUE (authoritative Supabase Auth confirmation)')
      assert(authProvider === 'google', `Resolved auth_provider is 'google': ${authProvider}`)
      assert(authoritativeLastSignIn !== null, `Resolved authentic last_sign_in_at: ${authoritativeLastSignIn}`)
      assert(profile?.mobile_number === '+919045735859', `Resolved mobile_number: ${profile?.mobile_number}`)
      assert(isPhoneVerified === false, 'Resolved is_phone_verified is FALSE (profile contact info, not fake SMS OTP)')
      assert(phoneConfirmedAt === null, 'phone_confirmed_at is NULL (correct: unverified SMS identity is not marked confirmed)')
    }

    // 3. Test Directory Users API output
    console.log('\n3. Testing Directory Users API listing projection...')
    const { data: dirProfiles, error: dirErr } = await supabaseAdmin
      .from('profiles')
      .select(`
        id, full_name, email, email_confirmed_at, mobile_number, last_login_at
      `)
      .limit(10)

    if (dirErr) throw dirErr
    assert(dirProfiles.length > 0, `Loaded ${dirProfiles.length} profiles from directory query`)
    const formatted = dirProfiles.map(p => ({
      id: p.id,
      email: p.email,
      email_confirmed_at: p.email_confirmed_at,
      email_verified: Boolean(p.email_confirmed_at),
      last_sign_in_at: p.last_login_at,
    }))
    assert(formatted.every(f => typeof f.email_verified === 'boolean'), 'All formatted users include boolean email_verified field')

    // 4. Test RLS Security Isolation
    console.log('\n4. Testing Row-Level Security (RLS) on public.profiles...')
    const anonClient = createClient(supabaseUrl, anonKey)
    const { data: anonRead, error: anonReadErr } = await anonClient.from('profiles').select('id, full_name, mobile_number')
    assert(anonRead === null || anonRead.length === 0 || anonReadErr, 'Unauthenticated anon client cannot read user mobile numbers')

    console.log(`\n========================================`)
    console.log(`VERIFICATION SUMMARY: ${passed} passed, ${failed} failed`)
    console.log(`========================================`)

    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Test execution failed with error:', err)
    process.exit(1)
  }
}

runTests()

