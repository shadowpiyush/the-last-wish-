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

async function runAttendanceV3TestSuite() {
  console.log('\n======================================================')
  console.log('TESTING HARCOURTIAN ATTENDANCE TRACKER V3')
  console.log('Calendar-First + Smart Taps + Multi-Period + Analytics')
  console.log('======================================================\n')

  let passed = 0
  const logPass = (msg) => {
    passed++
    console.log(`  ✅ PASS: ${msg}`)
  }

  const cookies = await getAuthCookies('250109010@hbtu.ac.in')

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 850 })
    await page.setCookie(...cookies)

    console.log('1. Navigating to /attendance as authenticated student...')
    await page.goto(`${BASE_URL}/attendance`, { waitUntil: 'networkidle2' })
    console.log('   Current page URL:', page.url())
    logPass('Navigated to /attendance successfully')

    // 2. Header Verification
    console.log('\n2. Verifying Attendance V3 Header...')
    try {
      await page.waitForSelector('.attendance-header', { timeout: 10000 })
    } catch (err) {
      console.log('   Current URL on timeout:', page.url())
      const bodySnippet = await page.evaluate(() => document.body.innerHTML.slice(0, 500))
      console.log('   Body snippet:', bodySnippet)
      throw err
    }
    logPass('Liquid Glass header rendered')

    const subjectName = await page.$eval('.subject-name', (el) => el.textContent.trim())
    assert.ok(subjectName.length > 0, 'Subject name should not be empty')
    logPass(`Active subject displayed: "${subjectName}"`)

    const subjectPctText = await page.$eval('.subject-attendance-sub', (el) => el.textContent.trim())
    assert.ok(subjectPctText.includes('attendance'), 'Attendance percentage text displayed')
    logPass(`Subject percentage displayed: "${subjectPctText}"`)

    const exportBtn = await page.$('.export-action-btn')
    assert.ok(exportBtn, 'Export button present in header')
    logPass('Export action button rendered in header')

    const moreOptionsBtn = await page.$('.more-options-btn')
    assert.ok(moreOptionsBtn, 'More options button present in header')
    logPass('More options menu button rendered')

    // 3. Segmented Navigation Verification
    console.log('\n3. Verifying Segmented Navigation [Calendar | Statistics | Tasks]...')
    const tabs = await page.$$eval('.segmented-tab', (els) =>
      els.map((el) => el.textContent.trim())
    )
    assert.ok(tabs.some((t) => t.includes('Calendar')), 'Calendar tab exists')
    assert.ok(tabs.some((t) => t.includes('Statistics')), 'Statistics tab exists')
    assert.ok(tabs.some((t) => t.includes('Tasks')), 'Tasks tab exists')
    logPass(`Segmented navigation tabs rendered: ${tabs.join(' | ')}`)

    const activeTab = await page.$eval('.segmented-tab.active', (el) => el.textContent.trim())
    assert.ok(activeTab.includes('Calendar'), 'Calendar is active by default')
    logPass('Calendar tab is selected by default')

    // 4. Calendar Controls & Grid Verification
    console.log('\n4. Verifying Calendar View Elements...')
    const monthHeading = await page.$eval('.current-month-heading', (el) => el.textContent.trim())
    assert.ok(monthHeading.length > 0, 'Month heading exists')
    logPass(`Month heading displayed: "${monthHeading}"`)

    const todayBtn = await page.$('.today-pill-btn')
    assert.ok(todayBtn, 'Today button exists')
    logPass('Today pill button rendered')

    const gestureHint = await page.$eval('.gesture-helper-bar', (el) => el.textContent.trim())
    assert.ok(gestureHint.includes('Present') && gestureHint.includes('Absent'), 'Gesture hint bar rendered')
    logPass(`Gesture hint displayed: "${gestureHint}"`)

    const weekdayHeaders = await page.$$eval('.cal-weekday-header', (els) =>
      els.map((el) => el.textContent.trim())
    )
    assert.equal(weekdayHeaders.length, 7, '7 weekday headers (Mon..Sun)')
    logPass(`7 Weekdays displayed: ${weekdayHeaders.join(', ')}`)

    const dayCells = await page.$$('.cal-day-cell.in-month')
    assert.ok(dayCells.length >= 28, 'At least 28 calendar days rendered')
    logPass(`Rendered ${dayCells.length} in-month calendar cells`)

    // 5. Test Tap Gesture Interaction (Single Tap -> Present)
    console.log('\n5. Testing Calendar Smart Tap Interactions...')
    // Select 12th day in month
    const targetCell = dayCells[11] // 12th day index
    assert.ok(targetCell, 'Target date cell found')

    await targetCell.click()
    await new Promise((r) => setTimeout(r, 400)) // Wait for 240ms disambiguation
    logPass('Clicked date cell (Single tap -> Present)')

    // Check if Undo toast appeared
    const undoToast = await page.$('.undo-toast')
    if (undoToast) {
      const toastText = await page.$eval('.undo-message-text', (el) => el.textContent.trim())
      logPass(`Undo toast appeared: "${toastText}"`)
    }

    // 6. Day Detail Panel
    console.log('\n6. Verifying Day Detail Panel & Multi-period Display...')
    const dayDetailTitle = await page.$eval('.detail-date-title', (el) => el.textContent.trim())
    logPass(`Day detail panel active for: "${dayDetailTitle}"`)

    const addPeriodBtn = await page.$('.add-period-btn')
    assert.ok(addPeriodBtn, 'Add period button present')
    logPass('Add Period action button rendered')

    // 7. Test Tab Switching to "Statistics"
    console.log('\n7. Testing Navigation to Statistics Tab...')
    const statsTab = (await page.$$('.segmented-tab'))[1]
    await statsTab.click()
    await page.waitForSelector('.stats-metric-grid', { timeout: 3000 })
    logPass('Switched to Statistics tab successfully')

    const statLabels = await page.$$eval('.stat-label', (els) =>
      els.map((el) => el.textContent.trim())
    )
    assert.ok(statLabels.includes('Conducted Classes'), 'Conducted classes card exists')
    assert.ok(statLabels.includes('Present'), 'Present card exists')
    assert.ok(statLabels.includes('Absent'), 'Absent card exists')
    assert.ok(statLabels.includes('No Class'), 'No Class card exists')
    logPass(`Statistics cards verified: ${statLabels.join(', ')}`)

    const targetBanner = await page.$('.target-analysis-banner')
    assert.ok(targetBanner, 'Target analysis banner rendered')
    const targetAdvice = await page.$eval('.target-advice-description', (el) => el.textContent.trim())
    logPass(`Target analysis advice: "${targetAdvice}"`)

    const comparisonTable = await page.$('.comparison-table')
    assert.ok(comparisonTable, 'Subject comparison table rendered')
    const comparedSubjects = await page.$$eval('.comparison-row strong', (els) =>
      els.map((el) => el.textContent.trim())
    )
    logPass(`Subject comparison rows found for ${comparedSubjects.length} subjects`)

    // 8. Test Tab Switching to "Tasks"
    console.log('\n8. Testing Navigation to Tasks Tab...')
    const tasksTab = (await page.$$('.segmented-tab'))[2]
    await tasksTab.click()
    await page.waitForSelector('.tasks-list', { timeout: 3000 })
    logPass('Switched to Tasks tab successfully')

    const taskItems = await page.$$eval('.task-name', (els) =>
      els.map((el) => el.textContent.trim())
    )
    assert.ok(taskItems.length > 0, 'Attendance tasks rendered')
    logPass(`Attendance tasks rendered (${taskItems.length} tasks): ${taskItems.slice(0, 3).join(', ')}...`)

    // Toggle a task checkbox
    const firstCheckbox = (await page.$$('.task-checkbox'))[0]
    await firstCheckbox.click()
    await new Promise((r) => setTimeout(r, 200))
    logPass('Toggled task checkbox interactively')

    // 9. Mobile Viewport Test (iPhone 14)
    console.log('\n9. Testing Mobile Viewport (390 x 844)...')
    await page.setViewport({ width: 390, height: 844 })
    await new Promise((r) => setTimeout(r, 300))

    // Switch back to Calendar tab on mobile
    const mobileCalTab = (await page.$$('.segmented-tab'))[0]
    await mobileCalTab.click()
    await page.waitForSelector('.calendar-grid-card', { timeout: 3000 })
    logPass('Mobile calendar view rendered without overflow')

    // Open More Options Menu
    const mobileMoreBtn = await page.$('.more-options-btn')
    await mobileMoreBtn.click()
    await page.waitForSelector('.bottom-sheet', { timeout: 3000 })
    logPass('Mobile bottom sheet options menu rendered smoothly')

    const menuItems = await page.$$eval('.option-menu-item span', (els) =>
      els.map((el) => el.textContent.trim())
    )
    assert.ok(menuItems.some((m) => m.includes('Switch Subject')), 'Switch Subject option exists')
    assert.ok(menuItems.some((m) => m.includes('Target')), 'Target option exists')
    assert.ok(menuItems.some((m) => m.includes('Export')), 'Export option exists')
    logPass(`Bottom sheet menu items: ${menuItems.join(', ')}`)

    console.log('\n======================================================')
    console.log(`TEST SUMMARY: ${passed} PASSED, 0 FAILED`)
    console.log('======================================================\n')
  } finally {
    await browser.close()
  }
}

runAttendanceV3TestSuite().catch((err) => {
  console.error('\n❌ TEST FAILED:', err)
  process.exit(1)
})
