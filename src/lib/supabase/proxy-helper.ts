import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { sanitizeInternalPath } from '@/lib/auth/url'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Helper to preserve any refreshed Supabase session cookies across redirects
  const createRedirect = (destinationUrl: URL) => {
    const redirectResponse = NextResponse.redirect(destinationUrl)
    const cookiesToTransfer = supabaseResponse.cookies.getAll()
    for (const cookie of cookiesToTransfer) {
      redirectResponse.cookies.set(cookie)
    }
    return redirectResponse
  }

  let user: { id: string; email?: string; role?: string } | null = null
  let userRole = 'student'

  const allCookies = request.cookies.getAll()
  const hasAuthCookie = allCookies.some((c) =>
    c.name.startsWith('sb-') || c.name.includes('auth-token')
  )

  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth/callback')
  const isAuthPage = request.nextUrl.pathname === '/auth'
  const isAuthRoute = isAuthPage || isAuthCallback || request.nextUrl.pathname.startsWith('/auth/')

  // Allow OAuth/magic-link callbacks to execute without interception
  if (isAuthCallback) {
    return supabaseResponse
  }

  const protectedPaths = [
    '/dashboard',
    '/notes',
    '/library',
    '/calculators',
    '/pyq',
    '/curriculum',
    '/syllabus',
    '/profile',
    '/admin',
  ]
  const isProtected = protectedPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  )

  // Fast path 1: Unauthenticated request to a protected route -> immediate redirect
  if (!hasAuthCookie && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('redirect', sanitizeInternalPath(request.nextUrl.pathname, '/dashboard'))
    return createRedirect(url)
  }

  // Fast path 2: Public route with no auth cookie -> return immediately
  if (!hasAuthCookie && !isAuthRoute) {
    return supabaseResponse
  }

  // If auth cookie exists, verify session with Supabase
  if (hasAuthCookie) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              )
              supabaseResponse = NextResponse.next({
                request,
              })
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
              )
            },
          },
        }
      )

      const {
        data: { user: sbUser },
      } = await supabase.auth.getUser()

      if (sbUser) {
        user = sbUser
        // Default role is student unless explicitly admin in metadata
        userRole = sbUser.user_metadata?.role === 'admin' ? 'admin' : 'student'
      }
    } catch (e) {
      console.warn('Supabase proxy auth check failed:', e)
    }
  }

  // Check protected route access for verified session
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('redirect', sanitizeInternalPath(request.nextUrl.pathname, '/dashboard'))
    return createRedirect(url)
  }

  // Admin-only routes — redirect non-admin users
  if (request.nextUrl.pathname.startsWith('/admin') && user) {
    if (userRole !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return createRedirect(url)
    }
  }

  // Redirect authenticated users away from login page
  if (isAuthPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = userRole === 'admin' ? '/admin' : '/dashboard'
    return createRedirect(url)
  }

  return supabaseResponse
}
