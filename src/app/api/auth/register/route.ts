import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateAndNormalizeIndianMobile } from '@/lib/validation/mobile'
import { getAuthCallbackUrl, getBaseUrlFromRequest } from '@/lib/auth/url'

export const runtime = 'nodejs'

type RegistrationBody = {
  email?: unknown
  password?: unknown
  fullName?: unknown
  mobileNumber?: unknown
  programId?: unknown
  branchId?: unknown
  currentYear?: unknown
  currentSemester?: unknown
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function failure(code: string, message: string, status: number, requestId: string) {
  return NextResponse.json(
    { success: false, error: { code, message }, requestId },
    { status, headers: { 'Cache-Control': 'no-store' } }
  )
}

function logFailure(requestId: string, category: string, status: number) {
  console.error(JSON.stringify({
    event: 'registration_failed',
    requestId,
    route: '/api/auth/register',
    category,
    status,
    timestamp: new Date().toISOString(),
    runtime: process.env.VERCEL ? 'vercel' : 'node',
  }))
}

export async function POST(request: Request) {
  const requestId = randomUUID()
  let body: RegistrationBody

  try {
    const parsed: unknown = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return failure('VALIDATION_ERROR', 'Please correct the highlighted fields.', 400, requestId)
    }
    body = parsed as RegistrationBody
  } catch {
    return failure('INVALID_JSON', 'The registration request was not valid JSON.', 400, requestId)
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const programId = typeof body.programId === 'string' ? body.programId : ''
  const branchId = typeof body.branchId === 'string' ? body.branchId : ''
  const currentYear = Number(body.currentYear)
  const currentSemester = Number(body.currentSemester)

  if (!fullName || fullName.length > 120 || !email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return failure('VALIDATION_ERROR', 'Enter your full name and a valid email address.', 422, requestId)
  }
  if (password.length < 8 || password.length > 128) {
    return failure('VALIDATION_ERROR', 'Password must be between 8 and 128 characters.', 422, requestId)
  }

  const mobileCheck = validateAndNormalizeIndianMobile(body.mobileNumber)
  if (!mobileCheck.valid) {
    return failure('VALIDATION_ERROR', mobileCheck.error || 'Enter a valid Indian mobile number.', 422, requestId)
  }
  if (!UUID_PATTERN.test(programId) || !UUID_PATTERN.test(branchId) ||
      !Number.isInteger(currentYear) || !Number.isInteger(currentSemester) ||
      currentYear < 1 || currentSemester < 1) {
    return failure('VALIDATION_ERROR', 'Select a valid program, branch, year, and semester.', 422, requestId)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceKey || supabaseUrl.includes('placeholder.supabase.co')) {
    logFailure(requestId, 'configuration_missing', 503)
    return failure('SERVICE_UNAVAILABLE', 'Registration is temporarily unavailable. Please try again later.', 503, requestId)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const { data: program, error: programError } = await supabaseAdmin
      .from('programs')
      .select('id, duration_years, total_semesters')
      .eq('id', programId)
      .maybeSingle()

    if (programError) {
      logFailure(requestId, 'academic_program_lookup', 503)
      return failure('SERVICE_UNAVAILABLE', 'We could not verify your academic selection. Please try again.', 503, requestId)
    }
    if (!program) {
      return failure('VALIDATION_ERROR', 'Select a valid degree program.', 422, requestId)
    }

    const { data: branch, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('id', branchId)
      .eq('program_id', programId)
      .maybeSingle()

    if (branchError) {
      logFailure(requestId, 'academic_branch_lookup', 503)
      return failure('SERVICE_UNAVAILABLE', 'We could not verify your academic selection. Please try again.', 503, requestId)
    }
    if (!branch) {
      return failure('VALIDATION_ERROR', 'Select a branch that belongs to the selected program.', 422, requestId)
    }

    const maxYears = Number(program.duration_years)
    const maxSemesters = Number(program.total_semesters)
    const expectedYear = Math.ceil(currentSemester / 2)
    if (currentYear > maxYears || currentSemester > maxSemesters || expectedYear !== currentYear) {
      return failure('VALIDATION_ERROR', 'Select a semester that belongs to the selected year and program.', 422, requestId)
    }

    const callbackUrl = getAuthCallbackUrl(getBaseUrlFromRequest(request))
    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callbackUrl,
        data: {
          full_name: fullName,
          mobile_number: mobileCheck.normalized,
          program_id: programId,
          branch_id: branchId,
          current_year: currentYear,
          current_semester: currentSemester,
          role: 'student',
        },
      },
    })

    if (error) {
      const authError = error as typeof error & { code?: string; status?: number }
      const duplicate = authError.code === 'user_already_exists' || authError.code === 'email_exists' ||
        /already registered|already exists|user already/i.test(error.message)
      if (duplicate) {
        return failure('ACCOUNT_EXISTS', 'An account with this email already exists. Please sign in or check your email.', 409, requestId)
      }
      if (authError.status === 429 || authError.code === 'over_email_send_rate_limit' || /rate limit/i.test(error.message)) {
        logFailure(requestId, 'auth_email_rate_limited', 429)
        return failure('RATE_LIMITED', 'Email rate limit reached. Please try again in a few minutes.', 429, requestId)
      }
      logFailure(requestId, 'auth_provider_rejected', 400)
      return failure('REGISTRATION_REJECTED', 'We could not create your account. Check your details and try again.', 400, requestId)
    }

    if (!data.user) {
      logFailure(requestId, 'auth_provider_empty_response', 502)
      return failure('REGISTRATION_UNCONFIRMED', 'We could not confirm account creation. Please try again.', 502, requestId)
    }

    // Supabase returns an empty identities array for an existing unconfirmed user.
    if (data.user.identities?.length === 0) {
      return failure('ACCOUNT_EXISTS', 'An account with this email already exists. Please sign in or check your email.', 409, requestId)
    }

    // The database trigger creates a profile in the auth.users transaction. This upsert
    // fills the complete, validated profile and keeps the role server-controlled.
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName,
      mobile_number: mobileCheck.normalized,
      program_id: programId,
      branch_id: branchId,
      current_year: currentYear,
      current_semester: currentSemester,
      role: 'student',
      status: 'active',
    })

    if (profileError) {
      logFailure(requestId, 'profile_persistence', 500)
      return failure('PROFILE_SETUP_FAILED', 'Your account was created, but its student profile could not be completed. Contact support with the reference shown here.', 500, requestId)
    }

    return NextResponse.json({
      success: true,
      user: { id: data.user.id, email: data.user.email },
      requiresEmailVerification: true,
      message: 'Registration successful! Please check your email and click the verification link to activate your account.',
      requestId,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: unknown) {
    const category = error instanceof TypeError ? 'upstream_connection' : 'unexpected'
    logFailure(requestId, category, 500)
    return failure('REGISTRATION_FAILED', 'Something went wrong while creating your account. Please try again.', 500, requestId)
  }
}
