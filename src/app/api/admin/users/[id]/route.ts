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
    const { data: profile, error } = await supabaseAdmin
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
      .maybeSingle()
    if (error) throw error
    if (!profile) return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })

    const program = profile.programs as unknown as { id: string; name: string; short_code: string } | null
    const branch = profile.branches as unknown as { id: string; name: string; code: string } | null
    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        email_confirmed_at: profile.email_confirmed_at,
        mobile_number: profile.mobile_number,
        role: profile.role,
        status: profile.status,
        program_id: profile.program_id,
        program_name: program ? `${program.name} (${program.short_code})` : null,
        branch_id: profile.branch_id,
        branch_name: branch ? `${branch.name} (${branch.code})` : null,
        current_year: profile.current_year,
        current_semester: profile.current_semester,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        last_sign_in_at: profile.last_login_at,
        profile_picture_url: getAvatarUrl(profile),
        profile_picture_mime_type: profile.profile_picture_mime_type,
        profile_picture_width: profile.profile_picture_width,
        profile_picture_height: profile.profile_picture_height,
        profile_picture_uploaded_at: profile.profile_picture_uploaded_at,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Admin user detail API error:', error)
    return NextResponse.json({ error: 'Unable to retrieve the user profile.' }, { status: 500 })
  }
}
