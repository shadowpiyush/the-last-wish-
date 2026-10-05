import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBaseUrlFromRequest, sanitizeInternalPath } from '@/lib/auth/url'

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
          // Verify profile completion
          const { data: profile } = await supabase
            .from('profiles')
            .select('mobile_number, full_name, program_id, branch_id')
            .eq('id', user.id)
            .maybeSingle()
          
          // Google OAuth might not provide mobile number or program details
          if (!profile || !profile.mobile_number || !profile.program_id) {
            return NextResponse.redirect(`${baseUrl}/complete-profile`)
          }

          // Server-side role resolution from profiles table
          const { data: roleProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()
          
          const role = roleProfile?.role || 'student'
          const finalNext = next === '/dashboard' && role === 'admin' ? '/admin' : next
          return NextResponse.redirect(`${baseUrl}${finalNext}`)
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
