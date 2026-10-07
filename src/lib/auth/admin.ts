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

import { cookies } from 'next/headers'
import { createHash } from 'crypto'

interface CachedSession {
  info: AuthUserInfo
  expiresAt: number
}

// Bounded in-memory session cache (TTL: 30s) to eliminate duplicate network roundtrips
const sessionCache = new Map<string, CachedSession>()
const MAX_CACHE_ENTRIES = 500
const CACHE_TTL_MS = 30_000

export function invalidateAuthCache(userId?: string) {
  if (userId) {
    for (const [key, entry] of sessionCache.entries()) {
      if (entry.info.id === userId) {
        sessionCache.delete(key)
      }
    }
  } else {
    sessionCache.clear()
  }
}

async function resolveSessionCacheKey(request?: Request): Promise<string | null> {
  let cookieHeader = request?.headers.get('cookie') || request?.headers.get('authorization')
  if (!cookieHeader) {
    try {
      const cookieStore = await cookies()
      cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join(';')
    } catch {
      // Not in a request context where cookies() is available
    }
  }
  if (!cookieHeader) return null
  return createHash('sha256').update(cookieHeader).digest('hex')
}

/**
 * Resolves the authenticated user from Supabase cookies and profiles table.
 * Caches validated sessions in memory for 30s to eliminate redundant roundtrips.
 */
export async function getAuthUser(request?: Request): Promise<AuthUserInfo | null> {
  try {
    const cacheKey = await resolveSessionCacheKey(request)
    if (cacheKey) {
      const cached = sessionCache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        return cached.info
      }
    }

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

      // Check metadata fallback
      if (role !== 'admin' && user.user_metadata?.role === 'admin') {
        role = 'admin'
      }

      const info: AuthUserInfo = {
        id: user.id,
        email: user.email || '',
        role,
        fullName,
      }

      if (cacheKey) {
        if (sessionCache.size >= MAX_CACHE_ENTRIES) {
          const oldestKey = sessionCache.keys().next().value
          if (oldestKey) sessionCache.delete(oldestKey)
        }
        sessionCache.set(cacheKey, { info, expiresAt: Date.now() + CACHE_TTL_MS })
      }

      return info
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
