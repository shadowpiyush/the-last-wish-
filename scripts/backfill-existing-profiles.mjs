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

async function runBackfill() {
  console.log('Starting safe profile identity backfill...')
  const { data: { users }, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 })
  if (authErr) throw authErr

  const { data: profiles, error: profErr } = await supabaseAdmin.from('profiles').select('*')
  if (profErr) throw profErr

  let updatedCount = 0

  for (const u of users) {
    const p = profiles.find((prof) => prof.id === u.id)
    if (!p) {
      console.log(`User ${u.id} (${u.email}) has no profile row yet (will be created on onboarding)`)
      continue
    }

    const updates = {}
    if (!p.email && u.email) {
      updates.email = u.email
    }
    if (!p.email_confirmed_at && (u.email_confirmed_at || u.confirmed_at)) {
      updates.email_confirmed_at = u.email_confirmed_at || u.confirmed_at
    }
    if (!p.last_login_at && u.last_sign_in_at) {
      updates.last_login_at = u.last_sign_in_at
    } else if (u.last_sign_in_at && p.last_login_at && new Date(u.last_sign_in_at) > new Date(p.last_login_at)) {
      updates.last_login_at = u.last_sign_in_at
    }

    // Also check if user has a valid mobile number in metadata that wasn't in profiles
    if (!p.mobile_number && u.user_metadata?.mobile_number) {
      updates.mobile_number = u.user_metadata.mobile_number
    }

    if (Object.keys(updates).length > 0) {
      console.log(`Updating user ${p.full_name} (${u.id}):`, updates)
      const { error: updErr } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', u.id)

      if (updErr) {
        console.error(`Failed to update user ${u.id}:`, updErr.message)
      } else {
        updatedCount++
      }
    }
  }

  console.log(`\nBackfill complete! Updated ${updatedCount} profile(s).`)
}

runBackfill()

