import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy-helper'

// In Next.js 16+, the "middleware" file is renamed to "proxy"
// and the exported function must be named "proxy" (or default export)
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (icons, images)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
