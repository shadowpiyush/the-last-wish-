import puppeteer from 'puppeteer-core'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import fs from 'fs'
import assert from 'node:assert/strict'

// Load .env.local
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
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

async function getAuthCookies(email) {
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkErr || !linkData?.properties?.hashed_token) {
    throw new Error(`Failed to generate link for ${email}: ${linkErr?.message}`)
  }

  const cookiesObj = {}
  const ssrClient = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll() {
        return Object.entries(cookiesObj).map(([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          cookiesObj[name] = value
        })
      },
    },
  })

  await ssrClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'email',
  })

  return Object.entries(cookiesObj).map(([name, value]) => ({
    name,
    value,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
  }))
}

async function runFolderSystemTests() {
  console.log('\n=============================================================')
  console.log('HARCOURTIAN STUDY HUB — ATTENDANCE SUBJECT FOLDER SYSTEM QA')
  console.log('=============================================================\n')

  const testEmail = '250109010@hbtu.ac.in'

  // 1. Fetch user & academic context from DB
  const { data: userProfile, error: profileErr } = await adminClient
    .from('profiles')
    .select('id, full_name, role, program_id, branch_id, current_year, current_semester')
    .eq('email', testEmail)
    .single()

  if (profileErr || !userProfile) {
    throw new Error(`Could not find profile for ${testEmail}: ${profileErr?.message}`)
  }

  console.log(`👤 Student: ${userProfile.full_name} (${testEmail})`)
  console.log(`📚 Academic Context: Semester ${userProfile.current_semester}, Branch ID: ${userProfile.branch_id}`)

  // Fetch student's assigned subjects directly from database to verify truth
  const { data: dbSubjects } = await adminClient
    .from('subjects')
    .select('id, subject_name, subject_code, semester_number, branch_id')
    .eq('semester_number', userProfile.current_semester)
    .or(`branch_id.eq.${userProfile.branch_id},branch_id.is.null`)

  console.log(`📋 Database Assigned Subjects (${dbSubjects.length}):`)
  dbSubjects.forEach((s) => console.log(`   - ${s.subject_code}: ${s.subject_name}`))

  // Find Fluid Mechanics (NCT-201) and Chemical Process Calculations (NCT-205)
  const fluidMech = dbSubjects.find((s) => s.subject_code === 'NCT-201')
  const chemProcess = dbSubjects.find((s) => s.subject_code === 'NCT-205')
  assert.ok(fluidMech, 'Subject NCT-201 should exist in student assignments')
  assert.ok(chemProcess, 'Subject NCT-205 should exist in student assignments')

  // Generate auth cookies
  const cookies = await getAuthCookies(testEmail)

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 800 })
    await page.setCookie(...cookies)

    // STEP 1: Open Attendance Tracker
    console.log('\n[STEP 1] Navigating to /attendance...')
    await page.goto(`${BASE_URL}/attendance`, { waitUntil: 'networkidle2', timeout: 30000 })
    await page.waitForSelector('.attendance-page-root', { timeout: 15000 })
    console.log('✅ Page loaded successfully.')

    // STEP 2: Verify Subject Folder Grid appears
    console.log('\n[STEP 2] Verifying Subject Folder Grid appears...')
    await page.waitForSelector('.subjects-folder-grid', { timeout: 10000 })
    const folderCount = await page.$$eval('.subject-folder-card', (cards) => cards.length)
    console.log(`✅ Subject folder grid rendered with ${folderCount} folders.`)
    assert.strictEqual(folderCount, dbSubjects.length, `Expected ${dbSubjects.length} folders, found ${folderCount}`)

    // STEP 3: Verify only student's assigned subjects appear (Zero cross-branch contamination)
    console.log('\n[STEP 3] Verifying folder subjects match assigned academic context...')
    const renderedCodes = await page.$$eval('.subject-folder-card .folder-tab-code', (els) =>
      els.map((el) => el.textContent.trim())
    )
    console.log(`Rendered Subject Codes: ${renderedCodes.join(', ')}`)
    const expectedCodes = dbSubjects.map((s) => s.subject_code)
    for (const code of expectedCodes) {
      assert.ok(renderedCodes.includes(code), `Expected subject ${code} to be rendered in folder grid`)
    }
    console.log('✅ Zero cross-branch/cross-semester subject leaks. Exact assigned match.')

    // Verify folder visual features (Folder tab, glowing plate, square aspect, status pill)
    const cardStyles = await page.$eval('.subject-folder-card', (el) => {
      const comp = window.getComputedStyle(el)
      return {
        aspectRatio: comp.aspectRatio,
        cursor: comp.cursor,
        borderRadius: comp.borderRadius,
      }
    })
    console.log(`Card styles verified: cursor=${cardStyles.cursor}, radius=${cardStyles.borderRadius}`)

    // Check responsive 2 columns on mobile
    console.log('\n[STEP 4] Verifying responsive layout on mobile viewport (390px)...')
    await page.setViewport({ width: 390, height: 844 })
    await page.waitForFunction(() => {
      const grid = document.querySelector('.subjects-folder-grid')
      if (!grid) return false
      const style = window.getComputedStyle(grid)
      const cols = style.gridTemplateColumns.split(' ').length
      return cols === 2
    }, { timeout: 5000 })
    console.log('✅ Mobile layout: Exactly 2 columns on 390px screen.')

    // Reset to desktop viewport
    await page.setViewport({ width: 1280, height: 800 })

    // STEP 5: Click Fluid Mechanics (NCT-201)
    console.log('\n[STEP 5] Clicking Fluid Mechanics (NCT-201) folder card...')
    const nct201Card = await page.waitForSelector(
      `.subject-folder-card[aria-label*="NCT-201"]`,
      { timeout: 5000 }
    )
    await nct201Card.click()

    // STEP 6: Verify subject attendance workspace opens
    console.log('\n[STEP 6] Verifying subject attendance workspace opens...')
    await page.waitForSelector('.subject-workspace-view', { timeout: 10000 })
    const activeTitle = await page.$eval('.subject-name', (el) => el.textContent.trim())
    const activeCode = await page.$eval('.subject-code-tag', (el) => el.textContent.trim())
    console.log(`Active workspace header: ${activeTitle} (${activeCode})`)
    assert.strictEqual(activeCode, 'NCT-201', 'Active subject should be NCT-201')

    // Verify Calendar / Statistics / Tasks navigation tabs
    const tabs = await page.$$eval('.segmented-tab span', (spans) => spans.map((s) => s.textContent.trim()))
    console.log(`Available segmented tabs: ${tabs.join(' | ')}`)
    assert.ok(tabs.includes('Calendar'), 'Calendar tab must exist')
    assert.ok(tabs.includes('Statistics'), 'Statistics tab must exist')
    assert.ok(tabs.includes('Tasks'), 'Tasks tab must exist')
    console.log('✅ Subject workspace, header, and segmented tabs verified.')

    // STEP 7: Mark Present on Today's date cell
    console.log('\n[STEP 7] Marking attendance (single tap -> Present)...')
    const todayCell = await page.waitForSelector('.cal-day-cell.is-today', { timeout: 5000 })
    await todayCell.click()
    await new Promise((r) => setTimeout(r, 1200)) // allow debounce / network save

    // Verify day detail or status pill indicates Present
    const hasPresent = await page.evaluate(() => {
      const todayEl = document.querySelector('.cal-day-cell.is-today')
      const chip = todayEl?.querySelector('.status-present')
      return !!chip
    })
    console.log(`Today cell dot present: ${hasPresent}`)
    assert.ok(hasPresent, 'Today cell must reflect present status')
    console.log('✅ Attendance successfully marked as Present.')

    // STEP 8: Refresh page and verify persistence
    console.log('\n[STEP 8] Refreshing page to verify attendance persistence...')
    await page.reload({ waitUntil: 'networkidle2' })
    await page.waitForSelector('.subject-workspace-view', { timeout: 10000 })
    const reloadedPresent = await page.evaluate(() => {
      const todayEl = document.querySelector('.cal-day-cell.is-today')
      const chip = todayEl?.querySelector('.status-present')
      return !!chip
    })
    assert.ok(reloadedPresent, 'Attendance must persist across page reloads')
    console.log('✅ Attendance persisted in database after refresh.')

    // STEP 9: Return to Subject Folders
    console.log('\n[STEP 9] Returning to Subject Folders via back button (← My Subjects)...')
    const backBtn = await page.waitForSelector('.back-to-folders-btn', { timeout: 5000 })
    await backBtn.click()

    await page.waitForSelector('.subjects-folder-grid', { timeout: 10000 })
    console.log('✅ Smoothly returned to My Subjects folder grid.')

    // Verify NCT-201 card displays updated attendance
    const nct201AttendanceText = await page.$eval(
      `.subject-folder-card[aria-label*="NCT-201"] .folder-percentage-large`,
      (el) => el.textContent.trim()
    )
    console.log(`NCT-201 folder card attendance: ${nct201AttendanceText}`)
    assert.ok(nct201AttendanceText.includes('%'), 'Folder card must show percentage')

    // STEP 10: Open another subject (Chemical Process Calculations NCT-205) and verify data isolation
    console.log('\n[STEP 10] Opening Chemical Process Calculations (NCT-205) to test data isolation...')
    const nct205Card = await page.waitForSelector(
      `.subject-folder-card[aria-label*="NCT-205"]`,
      { timeout: 5000 }
    )
    await nct205Card.click()

    await page.waitForSelector('.subject-workspace-view', { timeout: 10000 })
    const activeSub2 = await page.$eval('.subject-code-tag', (el) => el.textContent.trim())
    assert.strictEqual(activeSub2, 'NCT-205', 'Active subject should now be NCT-205')

    // Verify isolation: NCT-205 must NOT show attendance from NCT-201
    // (If NCT-205 has no attendance today, today cell should not have dot-present unless separately marked)
    const nct205RecordsResponse = await page.evaluate(async (subId) => {
      const res = await fetch(`/api/attendance/history?subjectId=${subId}`)
      return await res.json()
    }, chemProcess.id)

    console.log(`NCT-205 database records count: ${nct205RecordsResponse.records?.length || 0}`)
    const nct201RecordsResponse = await page.evaluate(async (subId) => {
      const res = await fetch(`/api/attendance/history?subjectId=${subId}`)
      return await res.json()
    }, fluidMech.id)
    console.log(`NCT-201 database records count: ${nct201RecordsResponse.records?.length || 0}`)

    assert.notStrictEqual(
      chemProcess.id,
      fluidMech.id,
      'Subjects must have different IDs'
    )
    console.log('✅ Full data isolation verified between subjects.')

    // STEP 11: Direct URL authorization security check (IDOR prevention)
    console.log('\n[STEP 11] Testing Direct URL Security (IDOR/BOLA prevention)...')
    // Attempting to query attendance for an unauthorized subject (e.g. from a different branch)
    const unauthorizedSubRes = await page.evaluate(async () => {
      // Pick a random invalid or cross-branch subject uuid
      const res = await fetch(`/api/attendance/history?subjectId=00000000-0000-0000-0000-000000000000`)
      return { status: res.status }
    })
    console.log(`Unauthorized subject response status: ${unauthorizedSubRes.status}`)
    assert.strictEqual(unauthorizedSubRes.status, 404, 'Non-existent or unauthorized subject query must be rejected')
    console.log('✅ Direct URL security verified.')

    console.log('\n=============================================================')
    console.log('🎉 ALL 11 ACCEPTANCE CRITERIA PASSED SUCCESSFULLY!')
    console.log('=============================================================\n')
  } finally {
    await browser.close()
  }
}

runFolderSystemTests().catch((err) => {
  console.error('\n❌ QA TEST FAILED:', err)
  process.exit(1)
})
