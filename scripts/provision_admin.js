const TARGET_EMAIL = 'arvind.ksj18@gmail.com'
const ADMIN_ROLE = 'admin'

async function provisionAdmin() {
  const dotenv = await import('dotenv')
  const { createClient } = await import('@supabase/supabase-js')
  dotenv.config({ path: '.env.local' })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const adminPassword = process.env.PROVISION_ADMIN_PASSWORD

  if (!supabaseUrl || !serviceKey) {
    console.error('ERROR: Missing Supabase credentials in .env.local.')
    process.exit(1)
  }

  if (!adminPassword) {
    console.error('ERROR: Missing PROVISION_ADMIN_PASSWORD in .env.local.')
    console.error('Please set this environment variable securely before running the script.')
    process.exit(1)
  }

  // Initialize Supabase admin client
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    console.log(`Starting provisioning for ${TARGET_EMAIL}...`)

    // 1. Check if user already exists
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError

    let authUser = usersData.users.find((u) => u.email === TARGET_EMAIL)

    if (authUser) {
      console.log(`Account ${TARGET_EMAIL} already exists. Verifying and upgrading role if necessary...`)
      
      // Update the password to the securely provided one, and ensure role in metadata
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: adminPassword,
        user_metadata: { ...authUser.user_metadata, role: ADMIN_ROLE },
        email_confirm: true
      })
      
      if (updateError) throw updateError
      authUser = updatedUser.user
      console.log('User authentication credentials verified/updated securely.')
    } else {
      console.log(`Creating new account for ${TARGET_EMAIL}...`)
      
      // Create new user securely (password hashed by Supabase internally)
      const { data: createdData, error: createError } = await supabase.auth.admin.createUser({
        email: TARGET_EMAIL,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { role: ADMIN_ROLE, full_name: 'Administrator' }
      })
      
      if (createError) throw createError
      authUser = createdData.user
      console.log('User authentication record created securely.')
    }

    // 2. Ensure public.profiles reflects the admin role and preserves existing data
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    if (profileCheckError) throw profileCheckError

    if (existingProfile) {
      if (existingProfile.role !== ADMIN_ROLE) {
        console.log(`Upgrading existing profile role from '${existingProfile.role}' to '${ADMIN_ROLE}'...`)
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({ role: ADMIN_ROLE })
          .eq('id', authUser.id)
          
        if (updateProfileError) throw updateProfileError
        console.log('Profile role upgraded successfully.')
      } else {
        console.log('Profile already has the correct administrator role. No profile changes needed.')
      }
    } else {
      console.log('No existing profile found. Creating new administrator profile...')
      const { error: insertProfileError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          full_name: authUser.user_metadata.full_name || 'Administrator',
          role: ADMIN_ROLE,
          status: 'active'
        })
        
      if (insertProfileError) throw insertProfileError
      console.log('New administrator profile created successfully.')
    }

    console.log(`\n✅ SUCCESS: Administrator account provisioning complete for ${TARGET_EMAIL}.`)
    console.log('The account is subject to the standard Email + Password + OTP production security flow.')
    
  } catch (error) {
    console.error('\n❌ ERROR during provisioning:', error.message || error)
    process.exit(1)
  }
}

provisionAdmin()
