import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getBaseUrlFromRequest, sanitizeInternalPath } from '@/lib/auth/url'
import { isProfileComplete } from '@/lib/auth/profile'
import type { UserProfile } from '@/components/providers/AuthProvider'

/**
 * Auth callback handler for OAuth providers (Google)
 * and email confirmation links.
 *
 * Supabase redirects here with a `code` query param after successful
 * OAuth consent or email verification. We exchange the code for a session.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const baseUrl = getBaseUrlFromRequest(request)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next')
  const next = sanitizeInternalPath(rawNext, '/dashboard')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error || errorDescription) {
    const msg = encodeURIComponent(errorDescription || error || 'OAuth authentication failed')
    return NextResponse.redirect(`${baseUrl}/auth?error=${msg}`)
  }

  if (code) {
    try {
      const supabase = await createClient()
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (!exchangeError) {
        // Fetch user from session
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

          if (supabaseUrl && serviceKey) {
            const adminClient = createAdminClient(supabaseUrl, serviceKey, {
              auth: { autoRefreshToken: false, persistSession: false },
            })

            // Check if profile exists by authoritative user.id
            const { data: profile } = await adminClient
              .from('profiles')
              .select('id, full_name, email, mobile_number, program_id, branch_id, role, current_year, current_semester, email_confirmed_at, last_login_at')
              .eq('id', user.id)
              .maybeSingle()

            if (profile) {
              // Existing user profile: sync authoritative email, confirmation date, and last_login_at
              // NEVER overwrite student's mobile number, branch, year, semester, or academic fields!
              const emailConfirmedAt = user.email_confirmed_at || (user as { confirmed_at?: string }).confirmed_at || profile.email_confirmed_at || null
              const lastLoginAt = user.last_sign_in_at || new Date().toISOString()
              const authoritativeEmail = user.email || profile.email || null

              await adminClient
                .from('profiles')
                .update({
                  email: authoritativeEmail,
                  email_confirmed_at: emailConfirmedAt,
                  last_login_at: lastLoginAt,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', user.id)

              // Verify profile completion
              if (!isProfileComplete(profile as unknown as UserProfile)) {
                return NextResponse.redirect(`${baseUrl}/complete-profile`)
              }

              const role = profile.role || 'student'
              const finalNext = next === '/dashboard' && role === 'admin' ? '/admin' : next
              return NextResponse.redirect(`${baseUrl}${finalNext}`)
            } else {
              // New OAuth user: profile has not been created yet because mandatory fields
              // (mobile_number, program, branch, etc.) are collected via /complete-profile.
              return NextResponse.redirect(`${baseUrl}/complete-profile`)
            }
          }
        }
        
        return NextResponse.redirect(`${baseUrl}${next}`)
      }
      return NextResponse.redirect(`${baseUrl}/auth?error=${encodeURIComponent(exchangeError.message)}`)
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Session exchange failed'
      return NextResponse.redirect(`${baseUrl}/auth?error=${encodeURIComponent(errMsg)}`)
    }
  }

  // Auth code exchange failed — redirect to auth page with error
  return NextResponse.redirect(`${baseUrl}/auth?error=auth_callback_error`)
}
