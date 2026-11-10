import { NextResponse } from 'next/server'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/auth/admin'
import { getAvatarUrl } from '@/lib/profile/avatar'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: RouteContext<'/api/admin/users/[id]'>) {
  try {
    const authCheck = await verifyAdmin(_request)
    if (!authCheck.isAdmin) return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })

    const { id } = await context.params
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
      return NextResponse.json({ error: 'A valid user ID is required.' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'Database service configuration missing.' }, { status: 500 })

    const supabaseAdmin = createAdminSupabase(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Fetch both the profile record and authoritative auth user record
    const [profileRes, authUserRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select(`
          id, full_name, email, email_confirmed_at, mobile_number, role, status,
          program_id, branch_id, current_year, current_semester, created_at,
          updated_at, last_login_at, profile_picture_url, profile_picture_path,
          profile_picture_version, profile_picture_mime_type, profile_picture_width,
          profile_picture_height, profile_picture_uploaded_at,
          programs:program_id (id, name, short_code),
          branches:branch_id (id, name, code)
        `)
        .eq('id', id)
        .maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(id),
    ])

    if (profileRes.error) throw profileRes.error

    const profile = profileRes.data
    const authUser = authUserRes.data?.user

    if (!profile && !authUser) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })
    }

    // Resolve authoritative email and confirmation state from auth.users (with profile fallback)
    const authoritativeEmail = authUser?.email || profile?.email || null
    const authoritativeConfirmedAt =
      authUser?.email_confirmed_at ||
      (authUser as { confirmed_at?: string })?.confirmed_at ||
      profile?.email_confirmed_at ||
      null
    const isEmailVerified = Boolean(authoritativeConfirmedAt)

    // Determine auth provider (Google OAuth vs Email/Password)
    const appProvider = authUser?.app_metadata?.provider
    const appProviders = (authUser?.app_metadata?.providers as string[] | undefined) || []
    const identityProvider = authUser?.identities?.[0]?.provider
    const isGoogle = appProvider === 'google' || appProviders.includes('google') || identityProvider === 'google'
    const authProvider = isGoogle ? 'google' : (appProvider || identityProvider || (authoritativeEmail ? 'email' : 'unknown'))

    // Resolve authoritative last sign-in timestamp
    const authoritativeLastSignIn = authUser?.last_sign_in_at || profile?.last_login_at || null

    // Resolve phone confirmation state (distinguish profile contact number vs SMS verified phone auth identity)
    const phoneConfirmedAt = authUser?.phone_confirmed_at || null
    const isPhoneVerified = Boolean(phoneConfirmedAt)

    // Opportunistic sync back to profiles table if profile has missing email or outdated last_login_at
    if (profile && authUser) {
      const updates: Record<string, string> = {}
      if (!profile.email && authoritativeEmail) {
        updates.email = authoritativeEmail
      }
      if (!profile.email_confirmed_at && authoritativeConfirmedAt) {
        updates.email_confirmed_at = authoritativeConfirmedAt
      }
      if (authoritativeLastSignIn && profile.last_login_at !== authoritativeLastSignIn) {
        updates.last_login_at = authoritativeLastSignIn
      }
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString()
        try {
          await supabaseAdmin.from('profiles').update(updates).eq('id', id)
        } catch (err: unknown) {
          console.warn('Opportunistic profile sync warning:', err)
        }
      }
    }

    const program = profile?.programs as unknown as { id: string; name: string; short_code: string } | null
    const branch = profile?.branches as unknown as { id: string; name: string; code: string } | null

    return NextResponse.json({
      success: true,
      user: {
        id: profile?.id || authUser?.id,
        full_name: profile?.full_name || authUser?.user_metadata?.full_name || 'Anonymous User',
        email: authoritativeEmail,
        email_confirmed_at: authoritativeConfirmedAt,
        email_verified: isEmailVerified,
        auth_provider: authProvider,
        mobile_number: profile?.mobile_number || (authUser?.user_metadata?.mobile_number as string | undefined) || null,
        phone_confirmed_at: phoneConfirmedAt,
        is_phone_verified: isPhoneVerified,
        role: profile?.role || 'student',
        status: profile?.status || 'active',
        program_id: profile?.program_id || null,
        program_name: program ? `${program.name} (${program.short_code})` : null,
        branch_id: profile?.branch_id || null,
        branch_name: branch ? `${branch.name} (${branch.code})` : null,
        current_year: profile?.current_year || 1,
        current_semester: profile?.current_semester || 1,
        created_at: profile?.created_at || authUser?.created_at,
        updated_at: profile?.updated_at || authUser?.updated_at,
        last_sign_in_at: authoritativeLastSignIn,
        profile_picture_url: profile ? getAvatarUrl(profile) : (authUser?.user_metadata?.avatar_url || null),
        profile_picture_mime_type: profile?.profile_picture_mime_type || null,
        profile_picture_width: profile?.profile_picture_width || null,
        profile_picture_height: profile?.profile_picture_height || null,
        profile_picture_uploaded_at: profile?.profile_picture_uploaded_at || null,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Admin user detail API error:', error)
    return NextResponse.json({ error: 'Unable to retrieve the user profile.' }, { status: 500 })
  }
}
