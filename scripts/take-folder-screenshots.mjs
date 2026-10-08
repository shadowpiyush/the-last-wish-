import puppeteer from 'puppeteer-core'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import fs from 'fs'

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
const ARTIFACT_DIR = '/Users/arvindrajput/.gemini/antigravity-ide/brain/119cfe21-bc96-44aa-bc9e-48fbe7dc6384'

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

async function getAuthCookies(email) {
  const { data: linkData } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

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

async function captureScreenshots() {
  const testEmail = '250109010@hbtu.ac.in'
  const cookies = await getAuthCookies(testEmail)

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setCookie(...cookies)

    // 1. Desktop Folders Grid
    await page.setViewport({ width: 1280, height: 900 })
    await page.goto(`${BASE_URL}/attendance`, { waitUntil: 'networkidle2' })
    await page.waitForSelector('.subjects-folder-grid', { timeout: 10000 })
    await page.screenshot({ path: `${ARTIFACT_DIR}/attendance_folders_desktop.png`, fullPage: false })
    console.log('Saved attendance_folders_desktop.png')

    // 2. Mobile Folders Grid
    await page.setViewport({ width: 390, height: 844, isMobile: true })
    await page.goto(`${BASE_URL}/attendance`, { waitUntil: 'networkidle2' })
    await page.waitForSelector('.subjects-folder-grid', { timeout: 10000 })
    await page.screenshot({ path: `${ARTIFACT_DIR}/attendance_folders_mobile.png`, fullPage: false })
    console.log('Saved attendance_folders_mobile.png')

    // 3. Subject Workspace (after opening a folder)
    await page.setViewport({ width: 1280, height: 900 })
    const folder = await page.waitForSelector('.subject-folder-card', { timeout: 5000 })
    await folder.click()
    await page.waitForSelector('.subject-workspace-view', { timeout: 10000 })
    await page.screenshot({ path: `${ARTIFACT_DIR}/attendance_workspace_desktop.png`, fullPage: false })
    console.log('Saved attendance_workspace_desktop.png')
  } finally {
    await browser.close()
  }
}

captureScreenshots().catch(console.error)
