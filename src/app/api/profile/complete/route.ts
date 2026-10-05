import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { validateAndNormalizeIndianMobile } from '@/lib/validation/mobile'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // 1. Authenticate user from session cookies
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

    // 2. Parse request body
    const body = await request.json()
    const {
      fullName,
      mobileNumber,
      programId,
      branchId,
      currentYear,
      currentSemester,
    } = body

    // 3. Validate Full Name
    const cleanName = (typeof fullName === 'string' ? fullName : (user.user_metadata?.full_name || '')).trim()
    if (!cleanName) {
      return NextResponse.json(
        { error: 'Full name is required.' },
        { status: 400 }
      )
    }

    // 4. Validate and normalize Indian mobile number
    const mobileCheck = validateAndNormalizeIndianMobile(mobileNumber)
    if (!mobileCheck.valid) {
      return NextResponse.json(
        { error: mobileCheck.error || 'A valid 10-digit Indian mobile number is required.' },
        { status: 400 }
      )
    }
    const normalizedMobile = mobileCheck.normalized!

    // 5. Initialize Service-Role Admin Client to bypass RLS and ensure atomic write
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Server database configuration error.' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 6. Validate Academic Hierarchy: Program -> Branch
    if (!programId || typeof programId !== 'string' || !/^[0-9a-fA-F-]{36}$/.test(programId)) {
      return NextResponse.json(
        { error: 'Please select a valid academic program.' },
        { status: 400 }
      )
    }

    const { data: program, error: progError } = await supabaseAdmin
      .from('programs')
      .select('id, name, short_code, duration_years, total_semesters')
      .eq('id', programId)
      .maybeSingle()

    if (progError || !program) {
      return NextResponse.json(
        { error: 'Selected academic program was not found.' },
        { status: 400 }
      )
    }

    if (!branchId || typeof branchId !== 'string' || !/^[0-9a-fA-F-]{36}$/.test(branchId)) {
      return NextResponse.json(
        { error: 'Please select a valid academic branch/specialization.' },
        { status: 400 }
      )
    }

    const { data: branch, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('id, program_id, name, code')
      .eq('id', branchId)
      .eq('program_id', program.id)
      .maybeSingle()

    if (branchError || !branch) {
      return NextResponse.json(
        { error: 'Selected branch does not belong to the selected academic program.' },
        { status: 400 }
      )
    }

    // 7. Validate Academic Year and Semester boundaries
    const maxYears = program.duration_years || 4
    const maxSemesters = program.total_semesters || maxYears * 2

    const validYear = Math.min(Math.max(Number(currentYear) || 1, 1), maxYears)
    const validSemester = Math.min(Math.max(Number(currentSemester) || 1, 1), maxSemesters)

    // 8. Check existing profile to preserve role
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = existingProfile?.role || 'student'

    // 9. Atomic Upsert into public.profiles
    const nowIso = new Date().toISOString()
    const { data: savedProfile, error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: cleanName,
        mobile_number: normalizedMobile,
        program_id: program.id,
        branch_id: branch.id,
        current_year: validYear,
        current_semester: validSemester,
        role,
        status: 'active',
        updated_at: nowIso,
      })
      .select(`
        *,
        programs:program_id (name, short_code),
        branches:branch_id (name, code)
      `)
      .single()

    if (upsertError || !savedProfile) {
      console.error('Profile complete upsert failed:', upsertError)
      return NextResponse.json(
        { error: `Database save failed: ${upsertError?.message || 'Could not persist profile.'}` },
        { status: 500 }
      )
    }

    // 10. Synchronize auth.users user_metadata so both auth store and DB agree
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        full_name: cleanName,
        mobile_number: normalizedMobile,
        program_id: program.id,
        branch_id: branch.id,
        current_year: validYear,
        current_semester: validSemester,
      },
    }).catch((err) => {
      console.warn('Metadata sync warning:', err)
    })

    // 11. Format joined profile response
    const profileResponse = {
      ...savedProfile,
      program_name: savedProfile.programs?.name ?? undefined,
      program_code: savedProfile.programs?.short_code ?? undefined,
      branch_name: savedProfile.branches?.name ?? undefined,
      branch_code: savedProfile.branches?.code ?? undefined,
    }
    delete (profileResponse as Record<string, unknown>).programs
    delete (profileResponse as Record<string, unknown>).branches

    return NextResponse.json(
      {
        success: true,
        message: 'Profile completed successfully',
        profile: profileResponse,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  } catch (err: unknown) {
    console.error('Profile completion error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
