import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  let user: { id: string; email?: string; role?: string } | null = null
  let userRole = 'student'

  // Check dev session cookie (used for local testing / development)
  const devSessionCookie = request.cookies.get('sb-dev-session')?.value
  if (devSessionCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(devSessionCookie))
      if (parsed && parsed.id) {
        user = parsed
        userRole = parsed.role || (parsed.email?.toLowerCase().includes('admin') ? 'admin' : 'student')
      }
    } catch {
      // ignore JSON parse error
    }
  }

  const allCookies = request.cookies.getAll()
  const hasAuthCookie = allCookies.some((c) =>
    c.name.startsWith('sb-') || c.name.includes('auth-token')
  )

  const isAuthRoute = request.nextUrl.pathname === '/auth'
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

  // Fast path 1: Unauthenticated request to a protected route -> immediate redirect without network wait
  if (!user && !hasAuthCookie && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Fast path 2: Public route with no auth cookie -> return immediately (0ms latency)
  if (!user && !hasAuthCookie && !isAuthRoute) {
    return supabaseResponse
  }

  const isPlaceholderUrl =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder.supabase.co')

  // If real Supabase is configured and auth cookie exists, verify session with Supabase
  if (!user && !isPlaceholderUrl && hasAuthCookie) {
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
        // Extract role instantly from token metadata without remote DB query
        userRole =
          sbUser.user_metadata?.role ||
          (sbUser.email?.toLowerCase().includes('admin') ? 'admin' : 'student')
      }
    } catch (e) {
      console.warn('Supabase proxy auth check failed:', e)
    }
  }

  // Check protected route access for verified session
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Admin-only routes — redirect non-admin users
  if (request.nextUrl.pathname.startsWith('/admin') && user) {
    if (userRole !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users away from auth page
  if (request.nextUrl.pathname === '/auth' && user) {
    const url = request.nextUrl.clone()
    url.pathname = userRole === 'admin' ? '/admin' : '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
