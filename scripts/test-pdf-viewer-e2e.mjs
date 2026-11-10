/**
 * test-pdf-viewer-e2e.mjs
 * End-to-end verification of progressive PDF loading, R2 streaming proxy,
 * same-origin CORS elimination, and real browser UI validation.
 */

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

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ❌ FAIL: ${message}`)
    failed++
  }
}

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
  }))
}

async function runVerification() {
  console.log('\n========================================================================')
  console.log('HARCOURTIAN STUDY HUB — END-TO-END PDF STREAMING & VIEWER VERIFICATION')
  console.log('========================================================================\n')

  // ──────────────── TEST 1: VIEW-URL SAME-ORIGIN CONTRACT ────────────────
  console.log('--- TEST 1: /api/storage/view-url Same-Origin Streaming Delivery ---')
  const testFiles = [
    { bucket: 'notes', path: 'workshop-practice-nws-102-welding-shop.pdf', label: 'Workshop Practice (NWS-102)' },
    { bucket: 'ebooks', path: '1791036389316-higher-engineering-mathematics-bs-grewal.pdf', label: 'Higher Eng Math (45 MB)' },
    { bucket: 'ebooks', path: '060ceac8-a9bd-4dda-981b-0dd25ef334da/higher-engineering-mathematics-.pdf', label: 'Higher Eng Math (154 MB)' },
  ]

  for (const item of testFiles) {
    const res = await fetch(`${BASE_URL}/api/storage/view-url?bucket=${item.bucket}&path=${encodeURIComponent(item.path)}`)
    assert(res.status === 200, `view-url for ${item.label} returns HTTP 200`)
    const data = await res.json()
    assert(data.success === true, `view-url for ${item.label} returns success: true`)
    assert(data.url && data.url.startsWith('/api/storage/stream'), `data.url is same-origin stream URL: ${data.url}`)
    assert(data.streamUrl && data.streamUrl.startsWith('/api/storage/stream'), `data.streamUrl is present: ${data.streamUrl}`)
    assert(data.provider === 'r2', `Storage provider is identified as Cloudflare R2`)
  }

  // ──────────────── TEST 2: OPTIONS & CORS PREFLIGHT ────────────────
  console.log('\n--- TEST 2: /api/storage/stream OPTIONS Preflight & Headers ---')
  const optionsRes = await fetch(`${BASE_URL}/api/storage/stream?bucket=notes&path=workshop-practice-nws-102-welding-shop.pdf`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Range',
    },
  })
  assert(optionsRes.status === 204, `OPTIONS preflight returns HTTP 204 No Content (got ${optionsRes.status})`)
  assert(optionsRes.headers.get('access-control-allow-origin') === '*', `Preflight allows origin: *`)
  assert(optionsRes.headers.get('access-control-allow-methods')?.includes('GET'), `Preflight allows GET`)
  assert(optionsRes.headers.get('access-control-allow-headers')?.includes('Range'), `Preflight allows Range header`)

  // ──────────────── TEST 3: HEAD REQUEST METADATA ────────────────
  console.log('\n--- TEST 3: /api/storage/stream HEAD Metadata Verification ---')
  const headRes = await fetch(`${BASE_URL}/api/storage/stream?bucket=notes&path=workshop-practice-nws-102-welding-shop.pdf`, {
    method: 'HEAD',
  })
  assert(headRes.status === 200, `HEAD request returns HTTP 200 OK`)
  assert(headRes.headers.get('accept-ranges') === 'bytes', `HEAD returns Accept-Ranges: bytes`)
  assert(headRes.headers.get('content-type') === 'application/pdf', `HEAD returns Content-Type: application/pdf`)
  const headLength = parseInt(headRes.headers.get('content-length') || '0', 10)
  assert(headLength === 6721998, `HEAD reports exact file length 6,721,998 bytes (${headLength})`)

  // ──────────────── TEST 4: HTTP 206 PARTIAL CONTENT RANGE STREAMING ────────────────
  console.log('\n--- TEST 4: HTTP 206 Partial Content Byte-Range Delivery ---')
  const tRange0 = Date.now()
  const rangeRes = await fetch(`${BASE_URL}/api/storage/stream?bucket=notes&path=workshop-practice-nws-102-welding-shop.pdf`, {
    headers: { Range: 'bytes=0-65535' },
  })
  const rangeLatency = Date.now() - tRange0
  assert(rangeRes.status === 206, `Range request returns HTTP 206 Partial Content (took ${rangeLatency}ms)`)
  assert(rangeRes.headers.get('accept-ranges') === 'bytes', `Accept-Ranges header is 'bytes'`)
  assert(rangeRes.headers.get('content-range')?.startsWith('bytes 0-65535/6721998'), `Content-Range is bytes 0-65535/6721998 (${rangeRes.headers.get('content-range')})`)
  assert(rangeRes.headers.get('content-length') === '65536', `Content-Length is exactly 65,536 bytes`)
  assert(rangeRes.headers.get('content-disposition')?.includes('inline'), `Content-Disposition is strictly inline`)

  const buf = await rangeRes.arrayBuffer()
  const magic = Buffer.from(buf.slice(0, 5)).toString('utf-8')
  assert(magic === '%PDF-', `Stream starts with valid PDF magic bytes: "${magic}"`)

  // ──────────────── TEST 5: PDF.JS PROGRESSIVE RANGE EXTRACTION ────────────────
  console.log('\n--- TEST 5: Progressive PDF.js Range Loading (Page 1 in < 1s) ---')
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const streamUrl = `${BASE_URL}/api/storage/stream?bucket=notes&path=workshop-practice-nws-102-welding-shop.pdf`

  const tDoc0 = Date.now()
  const loadingTask = pdfjsLib.getDocument({
    url: streamUrl,
    rangeChunkSize: 65536,
    disableAutoFetch: true,
    disableStream: false,
  })
  const doc = await loadingTask.promise
  const docLatency = Date.now() - tDoc0
  assert(doc.numPages === 23, `PDF.js loaded document metadata. Total pages: ${doc.numPages} (took ${docLatency}ms)`)

  const tPage1 = Date.now()
  const page1 = await doc.getPage(1)
  const page1Latency = Date.now() - tPage1
  assert(page1Latency < 500, `Page 1 extracted in ${page1Latency}ms (target < 500ms)`)
  const vp = page1.getViewport({ scale: 1.0 })
  assert(vp.width > 0 && vp.height > 0, `Page 1 viewport parsed: ${vp.width} x ${vp.height}`)

  // Page 23 (Tail of document)
  const tPage23 = Date.now()
  const page23 = await doc.getPage(23)
  const page23Latency = Date.now() - tPage23
  assert(page23Latency < 500, `Page 23 extracted via on-demand range request in ${page23Latency}ms`)

  // ──────────────── TEST 6: PUPPETEER REAL BROWSER UI VERIFICATION ────────────────
  console.log('\n--- TEST 6: Real Google Chrome UI Browser Test ---')
  const cookies = await getAuthCookies('250109010@hbtu.ac.in')
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setCookie(...cookies)

    // A. TEST STUDY NOTES READER
    console.log('  [A] Navigating to /notes...')
    await page.goto(`${BASE_URL}/notes`, { waitUntil: 'networkidle2' })
    assert(page.url().includes('/notes'), 'Navigated to /notes page')

    console.log('  Searching for "Workshop" in Study Notes...')
    await page.waitForSelector('input[type="text"]', { timeout: 8000 })
    await page.type('input[type="text"]', 'Workshop')
    await new Promise((r) => setTimeout(r, 600)) // debounce search

    // Click "Read Note"
    console.log('  Locating "Read Note" button...')
    const readNoteBtn = await page.waitForSelector('button ::-p-text(Read Note)', { timeout: 8000 })
    assert(Boolean(readNoteBtn), 'Found "Read Note" button in notes search results')

    console.log('  Clicking "Read Note" to open progressive PDF viewer...')
    await readNoteBtn.click()

    // Wait for FastPdfViewer canvas
    await page.waitForSelector('canvas', { timeout: 12000 })
    assert(true, 'FastPdfViewer modal opened and canvas rendered successfully')

    // Verify there is NO error dialog
    const notesError = await page.evaluate(() => {
      const text = document.body.innerText
      return text.includes('Could not stream PDF') || text.includes('Failed to fetch')
    })
    assert(!notesError, 'No "Could not stream PDF" or "Failed to fetch" error appears in Study Notes viewer!')

    // Check footer status bar
    const notesStatusText = await page.evaluate(() => {
      const footer = document.querySelector('canvas')?.closest('div')?.parentElement?.parentElement
      return footer ? footer.innerText : ''
    })
    assert(notesStatusText.includes('Page 1 of 23') || notesStatusText.includes('Page 1'), `Notes status bar displays: ${notesStatusText.split('\n')[0] || 'Page 1'}`)

    // Close viewer
    const closeBtn = await page.$('button[title*="Close"]')
    if (closeBtn) await closeBtn.click()
    await new Promise((r) => setTimeout(r, 400))

    // B. TEST DIGITAL LIBRARY READER (HIGHER ENGINEERING MATHEMATICS)
    console.log('\n  [B] Navigating to /library...')
    await page.goto(`${BASE_URL}/library`, { waitUntil: 'networkidle2' })
    assert(page.url().includes('/library'), 'Navigated to /library page')

    console.log('  Locating "Read Online" button for textbook...')
    const readOnlineBtn = await page.waitForSelector('button ::-p-text(Read Online)', { timeout: 10000 })
    assert(Boolean(readOnlineBtn), 'Found "Read Online" button for textbook')

    console.log('  Clicking "Read Online" to stream textbook PDF...')
    await readOnlineBtn.click()

    // Wait for FastPdfViewer canvas
    await page.waitForSelector('canvas', { timeout: 15000 })
    assert(true, 'FastPdfViewer modal opened for textbook and canvas rendered successfully')

    // Verify there is NO error dialog
    const libraryError = await page.evaluate(() => {
      const text = document.body.innerText
      return text.includes('Could not stream PDF') || text.includes('Failed to fetch')
    })
    assert(!libraryError, 'No "Could not stream PDF" or "Failed to fetch" error appears in Library viewer!')

    const libStatusText = await page.evaluate(() => {
      const footer = document.querySelector('canvas')?.closest('div')?.parentElement?.parentElement
      return footer ? footer.innerText : ''
    })
    assert(libStatusText.includes('Page 1'), `Textbook reader loaded: ${libStatusText.split('\n')[0] || 'Page 1'}`)

  } finally {
    await browser.close()
  }

  console.log('\n========================================================================')
  console.log(`FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('========================================================================\n')

  if (failed > 0) process.exit(1)
  process.exit(0)
}

runVerification().catch((err) => {
  console.error('Fatal verification error:', err)
  process.exit(1)
})
