import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/otp/verify
 *
 * Step 2 of the Email + Password + OTP flow:
 * 1. Look up challenge record (validates password was verified)
 * 2. Check challenge is active, not expired, not used, not invalidated
 * 3. Enforce 10-attempt limit (invalidate on attempt #10)
 * 4. Verify OTP via Supabase's verifyOtp (SSR client sets session cookies)
 * 5. Mark challenge as used
 * 6. Resolve role from profiles table for redirect
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { challengeId, otp } = body

    if (!challengeId || !otp) {
      return NextResponse.json(
        { error: 'Challenge ID and verification code are required.' },
        { status: 400 }
      )
    }

    const cleanOtp = String(otp).trim()
    if (!/^\d{6}$/.test(cleanOtp)) {
      return NextResponse.json(
        { error: 'Verification code must be exactly 6 digits.' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      )
    }

    const adminClient = createAdminClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Step 1: Look up challenge
    const { data: challenge, error: lookupError } = await adminClient
      .from('otp_challenges')
      .select('*')
      .eq('id', challengeId)
      .single()

    if (lookupError || !challenge) {
      return NextResponse.json(
        { error: 'Invalid or expired verification challenge.' },
        { status: 400 }
      )
    }

    // Step 2: Validate challenge state
    if (challenge.used_at) {
      return NextResponse.json(
        { error: 'This verification challenge has already been completed.' },
        { status: 400 }
      )
    }

    if (challenge.invalidated_at) {
      return NextResponse.json(
        { error: 'This verification challenge has been invalidated. Please sign in again.' },
        { status: 400 }
      )
    }

    if (new Date(challenge.expires_at) < new Date()) {
      // Mark as invalidated
      await adminClient
        .from('otp_challenges')
        .update({ invalidated_at: new Date().toISOString() })
        .eq('id', challengeId)

      return NextResponse.json(
        { error: 'Verification code has expired. Please sign in again.' },
        { status: 400 }
      )
    }

    if (!challenge.password_verified) {
      return NextResponse.json(
        { error: 'Password verification incomplete.' },
        { status: 400 }
      )
    }

    // Step 3: Check and increment attempt count
    const currentAttempts = challenge.attempts + 1

    // If already at or beyond max attempts, reject immediately
    if (challenge.attempts >= challenge.max_attempts) {
      return NextResponse.json(
        {
          error: 'Maximum verification attempts exceeded. Please sign in again.',
          remainingAttempts: 0,
        },
        { status: 400 }
      )
    }

    // Update attempt count; invalidate on attempt #10
    const updateData: Record<string, unknown> = { attempts: currentAttempts }
    if (currentAttempts >= challenge.max_attempts) {
      updateData.invalidated_at = new Date().toISOString()
    }

    await adminClient
      .from('otp_challenges')
      .update(updateData)
      .eq('id', challengeId)

    // Step 4: Verify OTP via Supabase SSR client (sets session cookies automatically)
    const supabase = await createClient()
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email: challenge.email,
      token: cleanOtp,
      type: 'email',
    })

    if (verifyError || !verifyData?.session || !verifyData?.user) {
      const remaining = challenge.max_attempts - currentAttempts

      if (currentAttempts >= challenge.max_attempts) {
        return NextResponse.json(
          {
            error: 'Maximum verification attempts exceeded. Please sign in again.',
            remainingAttempts: 0,
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        {
          error: remaining <= 3
            ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            : 'Invalid verification code. Please try again.',
          remainingAttempts: remaining,
        },
        { status: 400 }
      )
    }

    // Step 5: Mark challenge as used
    await adminClient
      .from('otp_challenges')
      .update({ used_at: new Date().toISOString() })
      .eq('id', challengeId)

    // Step 6: Determine role for redirect
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', verifyData.user.id)
      .maybeSingle()

    const role = profile?.role || 'student'
    const redirectTo = role === 'admin' ? '/admin' : '/dashboard'

    return NextResponse.json({
      success: true,
      redirectTo,
    })
  } catch (err) {
    console.error('OTP verify error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
