import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateAndNormalizeIndianMobile } from '@/lib/validation/mobile'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, mobileNumber, programId, branchId, currentYear, currentSemester } = body

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required.' },
        { status: 400 }
      )
    }

    // Mandatory Indian mobile number validation and normalization
    const mobileCheck = validateAndNormalizeIndianMobile(mobileNumber)
    if (!mobileCheck.valid) {
      return NextResponse.json(
        { error: mobileCheck.error || 'Mobile number is required.' },
        { status: 400 }
      )
    }
    const normalizedMobile = mobileCheck.normalized!

    const cleanEmail = email.trim().toLowerCase()
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!supabaseUrl || !serviceKey || supabaseUrl.includes('placeholder.supabase.co')) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Create user with email auto-confirmed so they can log in immediately
    // ROLE IS ALWAYS STUDENT. Never trust client-side input for admin creation.
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        mobile_number: normalizedMobile,
        program_id: programId || 'btech',
        branch_id: branchId || 'btech-cse',
        current_year: currentYear || 1,
        current_semester: currentSemester || 1,
        role: 'student', // HARDCODED FOR SECURITY
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Upsert profile record with verified UUIDs for program and branch
    if (data?.user) {
      let validProgId: string | null = null
      let validBranchId: string | null = null

      if (typeof programId === 'string' && /^[0-9a-fA-F-]{36}$/.test(programId)) {
        const { data: p } = await supabaseAdmin.from('programs').select('id').eq('id', programId).maybeSingle()
        if (p) validProgId = p.id
      }

      if (typeof branchId === 'string' && /^[0-9a-fA-F-]{36}$/.test(branchId)) {
        const { data: b } = await supabaseAdmin.from('branches').select('id').eq('id', branchId).maybeSingle()
        if (b) validBranchId = b.id
      }

      const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName.trim(),
        mobile_number: normalizedMobile,
        program_id: validProgId,
        branch_id: validBranchId,
        current_year: Number(currentYear) || 1,
        current_semester: Number(currentSemester) || 1,
        role: 'student', // HARDCODED FOR SECURITY
        status: 'active',
      })

      if (profileErr) {
        console.error('Profile upsert warning:', profileErr.message)
      }
    }

    return NextResponse.json({ success: true, user: data.user })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
