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

async function checkUsers() {
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 50 })
  const { data: profiles } = await supabaseAdmin.from('profiles').select('*')

  console.log(`Auth users count: ${users.length}, Profiles count: ${profiles.length}`)

  for (const u of users) {
    const prof = profiles.find(p => p.id === u.id)
    console.log(`\nUser ID: ${u.id}`)
    console.log(`  auth.users.email: ${u.email}`)
    console.log(`  auth.users.email_confirmed_at: ${u.email_confirmed_at}`)
    console.log(`  auth.users.last_sign_in_at: ${u.last_sign_in_at}`)
    console.log(`  auth.users.app_metadata.provider: ${u.app_metadata?.provider}`)
    console.log(`  auth.users.user_metadata.mobile_number: ${u.user_metadata?.mobile_number}`)
    if (prof) {
      console.log(`  profile.full_name: ${prof.full_name}`)
      console.log(`  profile.email: ${prof.email}`)
      console.log(`  profile.email_confirmed_at: ${prof.email_confirmed_at}`)
      console.log(`  profile.mobile_number: ${prof.mobile_number}`)
      console.log(`  profile.last_login_at: ${prof.last_login_at}`)
    } else {
      console.log(`  ⚠️ NO PROFILE RECORD FOUND IN profiles TABLE!`)
    }
  }
}

checkUsers()

