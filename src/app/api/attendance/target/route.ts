import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabase()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Active user session required.' },
        { status: 401 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const { target } = body
    const targetNum = Number(target)

    if (isNaN(targetNum) || targetNum < 0 || targetNum > 100) {
      return NextResponse.json(
        { error: 'Target attendance percentage must be a number between 0 and 100.' },
        { status: 400 }
      )
    }

    const cleanTarget = Math.round(targetNum * 10) / 10

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const dbClient =
      supabaseUrl && serviceKey
        ? createAdminClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        : supabase

    // Upsert target settings
    const { data, error } = await dbClient
      .from('attendance_settings')
      .upsert(
        {
          user_id: user.id,
          target_percentage: cleanTarget,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('target_percentage, updated_at')
      .single()

    if (error) {
      console.error('PUT /api/attendance/target error:', error)
      return NextResponse.json(
        { error: 'Failed to update target attendance setting.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Target attendance updated successfully.',
      target: data.target_percentage,
    })
  } catch (err) {
    console.error('PUT /api/attendance/target unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
