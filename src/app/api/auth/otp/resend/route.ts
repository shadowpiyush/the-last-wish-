import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/auth/otp/resend
 *
 * Resend OTP without requiring password re-entry.
 * The existing challenge proves password was already verified.
 * Creates a new challenge and sends a fresh OTP.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { challengeId } = body

    if (!challengeId) {
      return NextResponse.json(
        { error: 'Challenge ID is required.' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      )
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Step 1: Look up the existing challenge
    const { data: oldChallenge, error: lookupError } = await adminClient
      .from('otp_challenges')
      .select('*')
      .eq('id', challengeId)
      .single()

    if (lookupError || !oldChallenge) {
      return NextResponse.json(
        { error: 'Invalid verification challenge.' },
        { status: 400 }
      )
    }

    // Validate the old challenge was password-verified and not already used
    if (!oldChallenge.password_verified) {
      return NextResponse.json(
        { error: 'Password verification incomplete. Please sign in again.' },
        { status: 400 }
      )
    }

    if (oldChallenge.used_at) {
      return NextResponse.json(
        { error: 'This challenge has already been completed. Please sign in again.' },
        { status: 400 }
      )
    }

    // Step 2: Rate limit resends (max 5 per 10 min per email)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: recentChallenges } = await adminClient
      .from('otp_challenges')
      .select('id')
      .eq('email', oldChallenge.email)
      .gte('created_at', tenMinAgo)

    if (recentChallenges && recentChallenges.length >= 5) {
      return NextResponse.json(
        { error: 'Too many verification requests. Please wait a few minutes.' },
        { status: 429 }
      )
    }

    // Step 3: Invalidate the old challenge
    await adminClient
      .from('otp_challenges')
      .update({ invalidated_at: new Date().toISOString() })
      .eq('id', challengeId)

    // Step 4: Trigger fresh OTP email
    const otpClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error: otpError } = await otpClient.auth.signInWithOtp({
      email: oldChallenge.email,
      options: {
        shouldCreateUser: false,
      },
    })

    if (otpError) {
      console.error('OTP resend error:', otpError.message)
      return NextResponse.json(
        { error: 'Failed to resend verification code. Please try again.' },
        { status: 500 }
      )
    }

    // Step 5: Create new challenge
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    const { data: newChallenge, error: challengeError } = await adminClient
      .from('otp_challenges')
      .insert({
        user_id: oldChallenge.user_id,
        email: oldChallenge.email,
        password_verified: true,
        attempts: 0,
        max_attempts: 10,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single()

    if (challengeError || !newChallenge) {
      console.error('New challenge creation error:', challengeError?.message)
      return NextResponse.json(
        { error: 'Failed to create new verification challenge.' },
        { status: 500 }
      )
    }

    // Mask email
    const [localPart, domain] = oldChallenge.email.split('@')
    const maskedLocal =
      localPart.length > 2
        ? localPart[0] + '•'.repeat(Math.min(localPart.length - 2, 5)) + localPart[localPart.length - 1]
        : localPart[0] + '•'

    return NextResponse.json({
      challengeId: newChallenge.id,
      maskedEmail: `${maskedLocal}@${domain}`,
      expiresIn: 300,
    })
  } catch (err) {
    console.error('OTP resend error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
