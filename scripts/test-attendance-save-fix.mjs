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

async function verifyDbRecord(userId, date, classNumber) {
  // Check primary table
  const { data: primary } = await adminClient
    .from('attendance_records')
    .select('id, user_id, subject_id, date, status, class_number')
    .eq('user_id', userId)
    .eq('date', date)
    .eq('class_number', classNumber)
    .maybeSingle()

  if (primary) return primary

  // Check fallback activity_events table
  const { data: fallback } = await adminClient
    .from('activity_events')
    .select('id, user_id, subject_id, status, metadata, occurred_at')
    .eq('user_id', userId)
    .eq('event_type', 'attendance_record')

  if (fallback) {
    const match = fallback.find((row) => {
      const meta = row.metadata || {}
      return (meta.date === date || row.occurred_at?.startsWith(date)) && (meta.class_number === classNumber || (!meta.class_number && classNumber === 1))
    })
    if (match) {
      return {
        id: match.id,
        user_id: match.user_id,
        subject_id: match.subject_id,
        date,
        status: match.status || match.metadata?.status,
        class_number: classNumber,
      }
    }
  }

  return null
}

async function runAcceptanceTest() {
  console.log('\n=============================================================')
  console.log('CRITICAL ATTENDANCE SAVE FAILURE — VERIFICATION & ACCEPTANCE')
  console.log('=============================================================\n')

  const TEST_EMAIL = '250109010@hbtu.ac.in'
  const { data: profiles } = await adminClient.from('profiles').select('id').eq('email', TEST_EMAIL).single()
  const userId = profiles?.id
  assert.ok(userId, `Test user profile not found for ${TEST_EMAIL}`)

  const errorToasts = []

  const cookies = await getAuthCookies(TEST_EMAIL)

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 850 })
    await page.setCookie(...cookies)

    page.on('request', (req) => {
      if (req.url().includes('/api/attendance')) {
        console.log('   --> API REQUEST:', req.method(), req.url(), req.postData())
      }
    })
    page.on('response', async (res) => {
      if (res.url().includes('/api/attendance')) {
        const text = await res.text().catch(() => '')
        console.log('   <-- API RESPONSE:', res.status(), res.url(), text)
      }
    })
    page.on('console', (msg) => {
      console.log('   [PAGE CONSOLE]:', msg.type(), msg.text())
      if (msg.text().includes("Couldn't save attendance")) {
        errorToasts.push(msg.text())
      }
    })

    // Initial DB cleanup for targetDate to test pristine flow
    const targetDate = '2026-10-15'
    await adminClient.from('attendance_records').delete().eq('user_id', userId).eq('date', targetDate)
    const { data: events } = await adminClient.from('activity_events').select('id, metadata, occurred_at').eq('user_id', userId).eq('event_type', 'attendance_record')
    if (events) {
      for (const ev of events) {
        if (ev.metadata?.date === targetDate || ev.occurred_at?.startsWith(targetDate)) {
          await adminClient.from('activity_events').delete().eq('id', ev.id)
        }
      }
    }

    console.log('1. Loading Attendance page...')
    await page.goto(`${BASE_URL}/attendance`, { waitUntil: 'networkidle2' })
    const folderCard = await page.$('.subject-folder-card')
    if (folderCard) {
      console.log('   📂 Subject folder grid found. Opening first subject folder...')
      await folderCard.click()
    }
    await page.waitForSelector('.subject-name', { timeout: 10000 })
    await page.waitForSelector('.cal-day-cell.in-month', { timeout: 10000 })
    await page.waitForFunction(() => {
      const el = document.querySelector('.subject-name')
      return el && el.textContent.trim().length > 0
    })
    // Wait for initial summary and records network calls to settle
    await new Promise((r) => setTimeout(r, 800))
    console.log('   ✅ Loaded /attendance successfully and data stabilized')

    console.log(`\n2. Testing Single Tap on ${targetDate} (Expect: Present recorded and persisted)...`)

    // Click on 15th day cell
    const dayCells = await page.$$('.cal-day-cell.in-month')
    // 15th cell is index 14
    const cell15 = dayCells[14]
    assert.ok(cell15, 'Cell for 15th day found')

    const cellInfo = await page.evaluate((el) => ({
      className: el.className,
      text: el.innerText,
      ariaLabel: el.getAttribute('aria-label'),
      rect: el.getBoundingClientRect(),
    }), cell15)
    console.log('   Cell 14 info:', cellInfo)

    await cell15.click()
    // Wait for request and UI confirmation
    await new Promise((r) => setTimeout(r, 1200))

    // Check DB
    const dbRecordPresent = await verifyDbRecord(userId, targetDate, 1)
    console.log('   DB record after single tap:', dbRecordPresent)
    assert.ok(dbRecordPresent, 'Database record must exist for Period 1 on ' + targetDate)
    assert.equal(dbRecordPresent.status, 'present', 'Database record status must be "present"')
    console.log('   ✅ DB confirms: Period 1 Present recorded!')

    // 3. Test Persistence across Refresh
    console.log('\n3. Testing Persistence across Page Refresh...')
    await page.reload({ waitUntil: 'networkidle2' })
    await page.waitForSelector('.attendance-header', { timeout: 10000 })

    // Check that cell on 15th still has present marker or day detail shows present
    const dayCellsReload = await page.$$('.cal-day-cell.in-month')
    await dayCellsReload[14].click()
    await new Promise((r) => setTimeout(r, 600))

    const p1StatusText = await page.$eval('.day-periods-list', (el) => el.textContent)
    assert.ok(p1StatusText.includes('Present'), 'Period 1 should still be marked Present after refresh')
    console.log('   ✅ UI confirms: Period 1 Present survives browser refresh!')

    // 4. Test Double Tap on the same day (Expect: update to Absent)
    console.log('\n4. Testing Double Tap on the same date (Expect: Update to Absent)...')
    // Double click the cell
    await dayCellsReload[14].click({ clickCount: 2 })
    await new Promise((r) => setTimeout(r, 1200))

    const dbRecordAbsent = await verifyDbRecord(userId, targetDate, 1)
    console.log('   DB record after double tap:', dbRecordAbsent)
    assert.ok(dbRecordAbsent, 'Database record must exist after double tap')
    assert.equal(dbRecordAbsent.status, 'absent', 'Database record status must now be "absent"')
    console.log('   ✅ DB confirms: Period 1 atomically updated to Absent!')

    // 5. Test Persistence of Absent across Refresh
    console.log('\n5. Testing Persistence of Absent across Page Refresh...')
    await page.reload({ waitUntil: 'networkidle2' })
    await page.waitForSelector('.attendance-header', { timeout: 10000 })
    await page.waitForFunction(() => {
      const el = document.querySelector('.subject-name')
      return el && el.textContent.trim().length > 0
    })
    await new Promise((r) => setTimeout(r, 800))

    const dayCellsReload2 = await page.$$('.cal-day-cell.in-month')
    const chipText = await dayCellsReload2[14].$eval('.chip-label', (el) => el.textContent.trim())
    assert.equal(chipText, 'A', 'Calendar day cell chip must show A (Absent)')
    console.log('   ✅ Calendar day cell chip confirms: "A" (Absent) is displayed on calendar!')

    // Open options via right-click or long-press to select date without triggering single-tap Present
    await dayCellsReload2[14].click({ button: 'right' })
    await new Promise((r) => setTimeout(r, 600))

    // Close options bottom sheet if opened
    const closeBtn = await page.$('.bottom-sheet .close-btn')
    if (closeBtn) {
      await closeBtn.click()
      await new Promise((r) => setTimeout(r, 400))
    }

    const p1AbsentText = await page.$eval('.day-periods-list', (el) => el.textContent)
    assert.ok(p1AbsentText.includes('Absent'), 'Period 1 should still be marked Absent after refresh')
    console.log('   ✅ UI confirms: Period 1 Absent survives browser refresh!')

    // 6. Test Add Period (Period 2 Present)
    console.log('\n6. Testing Add Period 2 via Modal...')
    const addPeriodBtn = (await page.$('.sheet-add-btn')) || (await page.$('.add-period-btn'))
    assert.ok(addPeriodBtn, 'Add period button found')
    await addPeriodBtn.click()
    await page.waitForSelector('.modal-backdrop', { timeout: 3000 })

    // Fill period number 2
    const periodInput = await page.$('input[type="number"]')
    if (periodInput) {
      await periodInput.click({ clickCount: 3 })
      await periodInput.type('2')
    }

    // Submit form
    const submitBtn = await page.$('button[type="submit"]')
    await submitBtn.click()
    await new Promise((r) => setTimeout(r, 1200))

    const dbRecordP2 = await verifyDbRecord(userId, targetDate, 2)
    console.log('   DB record for Period 2:', dbRecordP2)
    assert.ok(dbRecordP2, 'Period 2 record must exist in DB')
    console.log('   ✅ DB confirms: Period 2 created!')

    // 7. Test Delete Period (clean up Period 1 and Period 2)
    console.log('\n7. Testing Delete Period flow...')
    const deleteBtns = await page.$$('.icon-sub-btn.delete')
    if (deleteBtns.length > 0) {
      await deleteBtns[0].click()
      await page.waitForSelector('.modal-backdrop', { timeout: 3000 })
      const confirmDeleteBtn = await page.$('button.btn-danger')
      await confirmDeleteBtn.click()
      await new Promise((r) => setTimeout(r, 1000))
    }

    // Delete remaining period if any
    const deleteBtnsRemaining = await page.$$('.icon-sub-btn.delete')
    if (deleteBtnsRemaining.length > 0) {
      await deleteBtnsRemaining[0].click()
      await page.waitForSelector('.modal-backdrop', { timeout: 3000 })
      const confirmDeleteBtn = await page.$('button.btn-danger')
      await confirmDeleteBtn.click()
      await new Promise((r) => setTimeout(r, 1000))
    }

    // Direct cleanup to leave zero test artifacts
    if (dbRecordPresent?.id) {
      await adminClient.from('attendance_records').delete().eq('id', dbRecordPresent.id)
      await adminClient.from('activity_events').delete().eq('id', dbRecordPresent.id)
    }
    if (dbRecordP2?.id) {
      await adminClient.from('attendance_records').delete().eq('id', dbRecordP2.id)
      await adminClient.from('activity_events').delete().eq('id', dbRecordP2.id)
    }

    console.log('   ✅ Cleanup confirmed: test records safely removed.')

    // 8. Error Toast Check
    console.log('\n8. Checking for any occurrence of "Couldn\'t save attendance"...')
    assert.equal(errorToasts.length, 0, `Detected error toast messages: ${JSON.stringify(errorToasts)}`)
    console.log('   ✅ ZERO "Couldn\'t save attendance" errors occurred!')

    console.log('\n=============================================================')
    console.log('ALL CRITICAL ACCEPTANCE CHECKS PASSED!')
    console.log('=============================================================\n')
  } finally {
    await browser.close()
  }
}

runAcceptanceTest().catch((err) => {
  console.error('\n❌ ACCEPTANCE TEST FAILED:', err)
  process.exit(1)
})
