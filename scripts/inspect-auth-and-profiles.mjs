import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=')
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim()
        const val = trimmed.slice(idx + 1).trim().replace(/^['"](.*)['"]$/, '$1')
        process.env[key] = process.env[key] || val
      }
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function inspect() {
  console.log('=== INSPECTING AUTH.USERS ===')
  const { data: { users }, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 10 })
  if (authErr) {
    console.error('Error listing auth users:', authErr)
    return
  }

  console.log(`Found ${users.length} auth users. Sample user details:`)
  for (const u of users) {
    console.log({
      id: u.id,
      email: u.email,
      phone: u.phone,
      confirmed_at: u.confirmed_at,
      email_confirmed_at: u.email_confirmed_at,
      phone_confirmed_at: u.phone_confirmed_at,
      last_sign_in_at: u.last_sign_in_at,
      created_at: u.created_at,
      app_metadata: u.app_metadata,
      user_metadata: u.user_metadata,
      identities: u.identities?.map(i => ({
        id: i.id,
        provider: i.provider,
        identity_data: i.identity_data,
        last_sign_in_at: i.last_sign_in_at,
      })),
    })
  }

  console.log('\n=== INSPECTING PROFILES TABLE ===')
  const { data: profiles, error: profErr } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .limit(10)

  if (profErr) {
    console.error('Error fetching profiles:', profErr)
  } else {
    console.log(`Found ${profiles.length} profiles. Sample profiles:`)
    console.log(profiles)
  }
}

inspect()

