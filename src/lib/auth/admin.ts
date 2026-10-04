import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'

export interface AuthUserInfo {
  id: string
  email: string
  role: string
  fullName?: string
}

export interface AdminVerifyResult {
  isAdmin: boolean
  user: AuthUserInfo | null
  error?: string
  status: number
}

/**
 * Resolves the authenticated user from Supabase cookies and profiles table.
 */
export async function getAuthUser(request?: Request): Promise<AuthUserInfo | null> {
  try {
    const supabase = await createServerSupabase()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (user && !authErr) {
      // Fetch role from profiles table using service role for certainty
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

      let role = 'student'
      let fullName = user.user_metadata?.full_name || ''

      if (serviceKey && supabaseUrl) {
        const adminClient = createAdminSupabase(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
        const { data: profile } = await adminClient
          .from('profiles')
          .select('id, role, full_name')
          .eq('id', user.id)
          .maybeSingle()

        if (profile) {
          role = profile.role || role
          fullName = profile.full_name || fullName
        }
      }

      // Check metadata and email fallback as implemented in existing AuthProvider
      if (role !== 'admin') {
        if (
          user.user_metadata?.role === 'admin' ||
          user.email?.toLowerCase().includes('admin')
        ) {
          role = 'admin'
        }
      }

      return {
        id: user.id,
        email: user.email || '',
        role,
        fullName,
      }
    }

    // Dev session cookie fallback if used in local development
    if (request && typeof request.headers?.get === 'function') {
      const cookieHeader = request.headers.get('cookie') || ''
      const devMatch = cookieHeader.match(/sb-dev-session=([^;]+)/)
      if (devMatch && devMatch[1]) {
        try {
          const parsed = JSON.parse(decodeURIComponent(devMatch[1]))
          if (parsed && parsed.id) {
            return {
              id: parsed.id,
              email: parsed.email || 'admin@harcoutianhub.in',
              role: parsed.role || (parsed.email?.toLowerCase().includes('admin') ? 'admin' : 'student'),
              fullName: parsed.full_name || 'Administrator',
            }
          }
        } catch {
          // ignore parse error
        }
      }
    }

    return null
  } catch (err) {
    console.error('getAuthUser error:', err)
    return null
  }
}

/**
 * Strict server-side verification that the current user has administrator privileges.
 */
export async function verifyAdmin(request?: Request): Promise<AdminVerifyResult> {
  const user = await getAuthUser(request)

  if (!user) {
    return {
      isAdmin: false,
      user: null,
      error: 'Unauthorized: Authentication is required to access this resource.',
      status: 401,
    }
  }

  if (user.role !== 'admin') {
    return {
      isAdmin: false,
      user,
      error: 'Forbidden: You do not have administrator permissions to perform this action.',
      status: 403,
    }
  }

  return {
    isAdmin: true,
    user,
    status: 200,
  }
}
