import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/admin'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // 1. Strict admin verification
    const authCheck = await verifyAdmin(request)
    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
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

    // Fetch auth users to retrieve authentic email and last_sign_in_at
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    const authMap = new Map<string, { email: string; last_sign_in_at: string | null; phone: string | null }>()
    const matchingEmailUserIds: string[] = []

    if (authData?.users) {
      for (const u of authData.users) {
        authMap.set(u.id, {
          email: u.email || '',
          last_sign_in_at: u.last_sign_in_at || null,
          phone: u.phone || null,
        })
        if (search && u.email && u.email.toLowerCase().includes(search.toLowerCase())) {
          matchingEmailUserIds.push(u.id)
        }
      }
    }

    // Build database query for profiles
    let query = supabaseAdmin
      .from('profiles')
      .select(
        `
        id,
        full_name,
        mobile_number,
        profile_picture_url,
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

    // Filter by search term (across name, mobile number, or email matches)
    if (search) {
      if (matchingEmailUserIds.length > 0) {
        query = query.or(
          `full_name.ilike.%${search}%,mobile_number.ilike.%${search}%,id.in.(${matchingEmailUserIds.join(',')})`
        )
      } else {
        query = query.or(`full_name.ilike.%${search}%,mobile_number.ilike.%${search}%`)
      }
    }

    // Sorting & Pagination
    query = query.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1)

    const { data: profiles, count, error: profileErr } = await query

    if (profileErr) {
      console.error('Error fetching admin users:', profileErr)
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }

    // Format safe response (strictly non-sensitive user info)
    const formattedUsers = (profiles || []).map((p: Record<string, unknown>) => {
      const authInfo = authMap.get(p.id as string)
      const branchObj = p.branches as { id: string; name: string; code: string } | null
      const programObj = p.programs as { id: string; name: string; short_code: string } | null

      return {
        id: p.id,
        full_name: p.full_name || 'Anonymous User',
        email: authInfo?.email || null,
        mobile_number: p.mobile_number || authInfo?.phone || null,
        profile_picture_url: p.profile_picture_url || null,
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
        last_sign_in_at: authInfo?.last_sign_in_at || p.last_login_at || null,
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
