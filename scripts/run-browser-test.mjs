/**
 * Automated Browser UI Test Suite using Google Chrome
 * 
 * Drives the real Google Chrome browser installed on macOS:
 * /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
 */

import puppeteer from 'puppeteer-core'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = 'http://localhost:3000'

let passed = 0
let failed = 0

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`)
    passed++
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`)
    failed++
  }
}

async function runBrowserTest() {
  console.log('\n======================================================')
  console.log('LAUNCHING REAL GOOGLE CHROME AUTOMATED BROWSER TEST')
  console.log('======================================================\n')

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false, // Visible browser window on screen
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()

    // ─────────────────────────────────────────────────────────────
    // TEST 1: HOMEPAGE VERIFICATION
    // ─────────────────────────────────────────────────────────────
    console.log('1. Testing Homepage (http://localhost:3000)...')
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 })

    const title = await page.title()
    assert(title.includes('Harcoutian Study Hub'), 'Page title contains Harcoutian Study Hub', title)

    const branding = await page.$eval('h1', el => el.innerText)
    assert(branding.includes('Harcoutian'), 'Hero heading contains Harcoutian branding', branding)

    const hasCurriculum = await page.evaluate(() => document.body.innerText.includes('Curriculum Roadmap'))
    assert(hasCurriculum, 'Hero / features contains Curriculum Roadmap')

    const hasNotes = await page.evaluate(() => document.body.innerText.includes('Study Notes'))
    assert(hasNotes, 'Features section contains Study Notes')

    // ─────────────────────────────────────────────────────────────
    // TEST 2: AUTHENTICATION PORTAL (UI & FORM)
    // ─────────────────────────────────────────────────────────────
    console.log('\n2. Testing Authentication Portal (http://localhost:3000/auth)...')
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle2', timeout: 30000 })

    // Wait for the auth form client component to hydrate
    await page.waitForSelector('form', { timeout: 10000 })

    const authText = await page.evaluate(() => document.body.innerText)
    assert(authText.includes('Harcoutian Hub') || authText.includes('Sign In'), 'Auth page rendered with header')

    // Check Google Login button
    const googleBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      return btns.some(b => b.innerText.includes('Google') || b.innerText.includes('Continue with Google'))
    })
    assert(googleBtn, 'Continue with Google button is rendered and visible')

    // Verify absence of test/demo credentials
    assert(!authText.includes('Quick Demo Access'), 'No Quick Demo Access found (clean unified login)')
    assert(!authText.includes('admin@harcoutianhub.in'), 'No prefilled admin credentials')

    // ─────────────────────────────────────────────────────────────
    // TEST 3: CLIENT-SIDE VALIDATION
    // ─────────────────────────────────────────────────────────────
    console.log('\n3. Testing Client-side Form Validation...')
    // Click submit with empty fields
    const submitBtn = await page.waitForSelector('button[type="submit"]')
    await submitBtn.click()

    await new Promise(r => setTimeout(r, 600))
    const errorText = await page.evaluate(() => {
      const alert = document.querySelector('.auth-error-banner, [role="alert"]')
      return alert ? alert.innerText : document.body.innerText
    })
    assert(errorText.includes('Please enter your email address'), 'Empty submission triggers validation error')

    // ─────────────────────────────────────────────────────────────
    // TEST 4: TAB SWITCHING (REGISTER FORM)
    // ─────────────────────────────────────────────────────────────
    console.log('\n4. Testing Register Mode...')
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const regBtn = btns.find(b => b.innerText.trim() === 'Register')
      if (regBtn) regBtn.click()
    })

    await new Promise(r => setTimeout(r, 800))
    const signUpFormText = await page.evaluate(() => document.body.innerText)
    assert(signUpFormText.includes('Full Name') || signUpFormText.includes('Full name'), 'Sign up form displays Full Name field')
    assert(signUpFormText.includes('Mobile Number') || signUpFormText.includes('Mobile number'), 'Sign up form displays Mobile Number field with +91')
    assert(signUpFormText.includes('Academic Program') || signUpFormText.includes('Program'), 'Sign up form displays Academic Program dropdown')

    // ─────────────────────────────────────────────────────────────
    // TEST 5: TAB SWITCHING (FORGOT PASSWORD)
    // ─────────────────────────────────────────────────────────────
    console.log('\n5. Testing Forgot Password Mode...')
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const backBtn = btns.find(b => b.innerText.trim() === 'Sign In')
      if (backBtn) backBtn.click()
    })
    await new Promise(r => setTimeout(r, 600))

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const forgotBtn = btns.find(b => b.innerText.includes('Forgot password?'))
      if (forgotBtn) forgotBtn.click()
    })
    await new Promise(r => setTimeout(r, 600))
    const forgotText = await page.evaluate(() => document.body.innerText)
    assert(forgotText.includes('Reset') || forgotText.includes('recovery') || forgotText.includes('Send Reset Link') || forgotText.includes('email'), 'Password reset view displays recovery input')

    // Return to sign in
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const backBtn = btns.find(b => b.innerText.includes('Back to Sign In'))
      if (backBtn) backBtn.click()
    })
    await new Promise(r => setTimeout(r, 600))

    // ─────────────────────────────────────────────────────────────
    // TEST 6: ACADEMIC RESOURCE INTERCEPTION (/calculators)
    // ─────────────────────────────────────────────────────────────
    console.log('\n6. Testing Academic Resource Interception (/calculators)...')
    await page.goto(`${BASE_URL}/calculators`, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 1000))
    const calcRedirectUrl = page.url()
    assert(
      calcRedirectUrl.includes('/auth') && calcRedirectUrl.includes('redirect=%2Fcalculators'),
      `Unauthenticated visit to /calculators safely redirects to auth: ${calcRedirectUrl}`
    )
    assert(!calcRedirectUrl.includes('vercel.com'), 'Calculators intercept stays internal, never redirects to vercel.com')

    // ─────────────────────────────────────────────────────────────
    // TEST 7: PROTECTED ROUTE INTERCEPTION
    // ─────────────────────────────────────────────────────────────
    console.log('\n7. Testing Protected Route Interception (/dashboard)...')
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 800))
    const currentUrl = page.url()
    assert(
      currentUrl.includes('/auth') && currentUrl.includes('redirect=%2Fdashboard'),
      `Unauthenticated visit to /dashboard safely redirects to login: ${currentUrl}`
    )
    assert(!currentUrl.includes('vercel.com'), 'Destination URL remains internal and never redirects to vercel.com')

    console.log('\n======================================================')
    console.log(`BROWSER UI TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
    console.log('======================================================\n')
  } catch (err) {
    console.error('Browser automation error:', err)
    failed++
  } finally {
    // Keep browser visible briefly then close cleanly
    await new Promise(r => setTimeout(r, 2000))
    await browser.close()
  }

  if (failed > 0) process.exit(1)
  process.exit(0)
}

runBrowserTest().catch(console.error)
