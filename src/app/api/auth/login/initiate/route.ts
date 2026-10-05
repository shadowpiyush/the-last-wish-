import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/auth/login/initiate
 * 
 * Step 1 of the Email + Password + OTP flow:
 * 1. Verify password using a non-persistent Supabase client (no session cookies leaked)
 * 2. Rate-limit OTP requests (max 5 per 10 minutes per email)
 * 3. Invalidate existing active challenges for this user
 * 4. Trigger OTP email via Supabase's built-in OTP system
 * 5. Create challenge record for attempt tracking
 * 6. Return challengeId + masked email
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      )
    }

    // Step 1: Verify password using a non-persistent client
    // This creates NO cookies, NO localStorage session — purely in-memory
    const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: authData, error: authError } = await tempClient.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (authError || !authData?.user) {
      // Generic error to prevent account enumeration
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    // Immediately discard the temporary session
    await tempClient.auth.signOut()

    const userId = authData.user.id

    // Step 2: Rate limit OTP requests (max 5 per 10 minutes per email)
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: recentChallenges } = await adminClient
      .from('otp_challenges')
      .select('id')
      .eq('email', cleanEmail)
      .gte('created_at', tenMinAgo)

    if (recentChallenges && recentChallenges.length >= 5) {
      return NextResponse.json(
        { error: 'Too many verification requests. Please wait a few minutes and try again.' },
        { status: 429 }
      )
    }

    // Step 3: Invalidate any existing active challenges for this user
    await adminClient
      .from('otp_challenges')
      .update({ invalidated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('invalidated_at', null)
      .is('used_at', null)

    // Step 4: Trigger OTP email via Supabase's built-in OTP system
    const otpClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error: otpError } = await otpClient.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: false,
      },
    })

    if (otpError) {
      console.error('OTP send error:', otpError.message)
      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      )
    }

    // Step 5: Create challenge record
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    const { data: challenge, error: challengeError } = await adminClient
      .from('otp_challenges')
      .insert({
        user_id: userId,
        email: cleanEmail,
        password_verified: true,
        attempts: 0,
        max_attempts: 10,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single()

    if (challengeError || !challenge) {
      console.error('Challenge creation error:', challengeError?.message)
      return NextResponse.json(
        { error: 'Failed to create verification challenge.' },
        { status: 500 }
      )
    }

    // Mask email for display (a••••z@domain.com)
    const [localPart, domain] = cleanEmail.split('@')
    const maskedLocal =
      localPart.length > 2
        ? localPart[0] + '•'.repeat(Math.min(localPart.length - 2, 5)) + localPart[localPart.length - 1]
        : localPart[0] + '•'
    const maskedEmail = `${maskedLocal}@${domain}`

    return NextResponse.json({
      challengeId: challenge.id,
      maskedEmail,
      expiresIn: 300,
    })
  } catch (err) {
    console.error('Login initiate error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
