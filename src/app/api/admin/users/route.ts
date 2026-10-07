import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/admin'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { getAvatarUrl } from '@/lib/profile/avatar'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const startedAt = performance.now()
    // 1. Strict admin verification
    const authCheck = await verifyAdmin(request)
    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { searchParams } = new URL(request.url)
    const rawSearch = searchParams.get('search')?.trim() || ''
    // Keep PostgREST's OR expression structural. Search content is limited to values
    // that cannot alter the filter grammar while retaining names, emails, and phones.
    const search = rawSearch.replace(/[^\p{L}\p{N}@.+ _-]/gu, '').slice(0, 80)
    const branchId = searchParams.get('branchId')?.trim() || ''
    const role = searchParams.get('role')?.trim() || 'all'
    const status = searchParams.get('status')?.trim() || 'all'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)))
    const offset = (page - 1) * pageSize

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Database service configuration missing.' }, { status: 500 })
    }

    const supabaseAdmin = createAdminSupabase(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Query only the current directory page. The email and login projection is kept
    // on profiles by the migration, so this no longer loads every auth account first.
    let query = supabaseAdmin
      .from('profiles')
      .select(
        `
        id,
        full_name,
        mobile_number,
        email,
        email_confirmed_at,
        profile_picture_url,
        profile_picture_path,
        profile_picture_version,
        role,
        status,
        program_id,
        branch_id,
        current_year,
        current_semester,
        created_at,
        updated_at,
        last_login_at,
        branches (
          id,
          name,
          code
        ),
        programs (
          id,
          name,
          short_code
        )
      `,
        { count: 'exact' }
      )

    // Filter by branch
    if (branchId && branchId !== 'all') {
      query = query.eq('branch_id', branchId)
    }

    // Filter by role
    if (role && role !== 'all') {
      query = query.eq('role', role)
    }

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Filter by search term (across directory-safe columns)
    if (search) {
      query = query.or(`full_name.ilike.*${search}*,email.ilike.*${search}*,mobile_number.ilike.*${search}*`)
    }

    // Sorting & Pagination
    query = query.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1)

    const { data: profiles, count, error: profileErr } = await query
    const databaseDuration = performance.now() - startedAt

    if (profileErr) {
      console.error('Error fetching admin users:', profileErr)
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }

    // Format safe response (strictly non-sensitive user info)
    const formattedUsers = (profiles || []).map((p: Record<string, unknown>) => {
      const branchObj = p.branches as { id: string; name: string; code: string } | null
      const programObj = p.programs as { id: string; name: string; short_code: string } | null

      return {
        id: p.id,
        full_name: p.full_name || 'Anonymous User',
        email: p.email || null,
        mobile_number: p.mobile_number || null,
        profile_picture_url: getAvatarUrl({
          id: p.id as string,
          profile_picture_path: p.profile_picture_path as string | null,
          profile_picture_version: p.profile_picture_version as string | null,
          profile_picture_url: p.profile_picture_url as string | null,
        }),
        role: p.role || 'student',
        status: p.status || 'active',
        branch_id: p.branch_id,
        branch_name: branchObj ? `${branchObj.name} (${branchObj.code})` : null,
        branch_code: branchObj?.code || null,
        program_id: p.program_id,
        program_name: programObj ? `${programObj.name} (${programObj.short_code})` : null,
        current_year: p.current_year || 1,
        current_semester: p.current_semester || 1,
        created_at: p.created_at,
        updated_at: p.updated_at,
        last_sign_in_at: p.last_login_at || null,
      }
    })

    const totalCount = count ?? formattedUsers.length
    const totalPages = Math.ceil(totalCount / pageSize)

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }, {
      headers: {
        'Server-Timing': `directory-auth;dur=${databaseDuration.toFixed(1)}, directory-total;dur=${(performance.now() - startedAt).toFixed(1)}`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err: unknown) {
    console.error('Admin users API error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to retrieve registered users'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    // 1. Strict admin verification
    const authCheck = await verifyAdmin(request)
    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const body = await request.json()
    const { userId, status, role } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 })
    }

    // Disallow self-modification of admin role to prevent accidental lockout
    if (authCheck.user?.id === userId && (role === 'student' || status === 'blocked')) {
      return NextResponse.json(
        { error: 'Admins cannot demote or block their own account.' },
        { status: 400 }
      )
    }

    const updates: Record<string, string> = { updated_at: new Date().toISOString() }
    if (status && ['active', 'blocked'].includes(status)) {
      updates.status = status
    }
    if (role && ['student', 'admin'].includes(role)) {
      updates.role = role
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'No valid status or role updates provided.' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    const supabaseAdmin = createAdminSupabase(supabaseUrl!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: updatedProfile, error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'User profile updated successfully.',
      user: updatedProfile,
    })
  } catch (err: unknown) {
    console.error('Admin user update error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to update user'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
