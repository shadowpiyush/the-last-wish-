import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Auth callback handler for OAuth providers (Google, GitHub, Apple)
 * and email confirmation links.
 *
 * Supabase redirects here with a `code` query param after successful
 * OAuth consent or email verification. We exchange the code for a session.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error || errorDescription) {
    const msg = encodeURIComponent(errorDescription || error || 'OAuth authentication failed')
    return NextResponse.redirect(`${origin}/auth?error=${msg}`)
  }

  if (code) {
    try {
      const supabase = await createClient()
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (!exchangeError) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(exchangeError.message)}`)
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Session exchange failed'
      return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(errMsg)}`)
    }
  }

  // Auth code exchange failed — redirect to auth page with error
  return NextResponse.redirect(`${origin}/auth?error=auth_callback_error`)
}
