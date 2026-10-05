import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateAndNormalizeIndianMobile } from '@/lib/validation/mobile'
import { getAuthCallbackUrl, getBaseUrlFromRequest } from '@/lib/auth/url'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, mobileNumber, programId, branchId, currentYear, currentSemester } = body

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required.' },
        { status: 400 }
      )
    }

    // Mandatory Indian mobile number validation and normalization
    const mobileCheck = validateAndNormalizeIndianMobile(mobileNumber)
    if (!mobileCheck.valid) {
      return NextResponse.json(
        { error: mobileCheck.error || 'Mobile number is required.' },
        { status: 400 }
      )
    }
    const normalizedMobile = mobileCheck.normalized!

    const cleanEmail = email.trim().toLowerCase()
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const callbackUrl = getAuthCallbackUrl(getBaseUrlFromRequest(request))

    if (!supabaseUrl || !serviceKey || supabaseUrl.includes('placeholder.supabase.co')) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      )
    }

    if (!anonKey) {
      return NextResponse.json(
        { error: 'Supabase anon key not configured' },
        { status: 500 }
      )
    }

    // Service-role client — used ONLY for profile upsert and program/branch validation
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Normal auth client using anon key — Supabase will send a confirmation email
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Sign up user via the normal Supabase auth flow.
    // Supabase's "Confirm email" setting will send a verification email.
    // ROLE IS ALWAYS STUDENT. Never trust client-side input for role.
    const { data, error } = await supabaseAuth.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: callbackUrl,
        data: {
          full_name: fullName.trim(),
          mobile_number: normalizedMobile,
          program_id: programId || 'btech',
          branch_id: branchId || 'btech-cse',
          current_year: currentYear || 1,
          current_semester: currentSemester || 1,
          role: 'student', // HARDCODED FOR SECURITY
        },
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Supabase returns the user even before email confirmation.
    // If user already exists and is unconfirmed, signUp returns a user with
    // identities as an empty array. Detect this to avoid duplicate profiles.
    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in or check your email for the verification link.' },
        { status: 409 }
      )
    }

    // Upsert profile record with verified UUIDs for program and branch
    // Using the service-role client for server-side DB operations
    if (data?.user) {
      let validProgId: string | null = null
      let validBranchId: string | null = null

      if (typeof programId === 'string' && /^[0-9a-fA-F-]{36}$/.test(programId)) {
        const { data: p } = await supabaseAdmin.from('programs').select('id').eq('id', programId).maybeSingle()
        if (p) validProgId = p.id
      }

      if (typeof branchId === 'string' && /^[0-9a-fA-F-]{36}$/.test(branchId)) {
        const { data: b } = await supabaseAdmin.from('branches').select('id').eq('id', branchId).maybeSingle()
        if (b) validBranchId = b.id
      }

      const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName.trim(),
        mobile_number: normalizedMobile,
        program_id: validProgId,
        branch_id: validBranchId,
        current_year: Number(currentYear) || 1,
        current_semester: Number(currentSemester) || 1,
        role: 'student', // HARDCODED FOR SECURITY
        status: 'active',
      })

      if (profileErr) {
        console.error('Profile upsert warning:', profileErr.message)
      }
    }

    return NextResponse.json({
      success: true,
      user: data?.user ? { id: data.user.id, email: data.user.email } : undefined,
      requiresEmailVerification: true,
      message: 'Registration successful! Please check your email (including spam/junk folder) and click the verification link to activate your account.',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
