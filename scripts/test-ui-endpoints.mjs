/**
 * Automated UI & Route Verification Test Suite
 * 
 * Tests all user-facing web pages and route guards running on http://localhost:3000
 */

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

console.log('\n=== RUNNING AUTOMATED UI & ROUTE VERIFICATION SUITE ===\n')

async function run() {
  // 1. Homepage UI
  console.log('1. Homepage (GET /):')
  const homeRes = await fetch(`${BASE_URL}/`)
  assert(homeRes.status === 200, 'Homepage returns HTTP 200 OK')
  const homeHtml = await homeRes.text()
  assert(homeHtml.includes('Harcoutian'), 'Homepage includes Harcoutian branding')
  assert(homeHtml.includes('Curriculum Roadmap'), 'Homepage features Curriculum Roadmap card')
  assert(homeHtml.includes('Study Notes'), 'Homepage features Study Notes card')
  assert(homeHtml.includes('Digital Library'), 'Homepage features Digital Library card')
  assert(homeHtml.includes('Academic Calculators'), 'Homepage features Academic Calculators card')

  // 2. Auth Page UI
  console.log('\n2. Authentication Page (GET /auth):')
  const authRes = await fetch(`${BASE_URL}/auth`)
  assert(authRes.status === 200, 'Auth page returns HTTP 200 OK')
  const authHtml = await authRes.text()
  assert(authHtml.includes('Harcoutian'), 'Auth page has Harcoutian branding in metadata/shell')
  assert(authHtml.includes('Loading Harcoutian portal') || authHtml.includes('auth'), 'Auth page streams client portal shell')
  assert(!authHtml.includes('Quick Demo Access'), 'Auth page excludes Quick Demo Access')
  assert(!authHtml.includes('Prefilled admin email'), 'Auth page excludes prefilled credentials')

  // 3. Calculators Public Tool
  console.log('\n3. Public Tools (GET /calculators):')
  const calcRes = await fetch(`${BASE_URL}/calculators`)
  assert(calcRes.status === 200, 'Calculators tool returns HTTP 200 OK')
  const calcHtml = await calcRes.text()
  assert(calcHtml.includes('Calculators') || calcHtml.includes('calculator'), 'Calculators page renders academic calculator tools')

  // 4. Protected Route Guards
  console.log('\n4. Route Protection & Redirect Guards:')
  const dashRes = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' })
  assert(
    dashRes.status === 307 || dashRes.status === 302 || dashRes.status === 308,
    `Unauthenticated /dashboard redirects (HTTP ${dashRes.status})`
  )
  const dashLoc = dashRes.headers.get('location') || ''
  assert(
    dashLoc.includes('/auth') && dashLoc.includes('redirect=%2Fdashboard'),
    `Redirect points to /auth with safe relative redirect target: ${dashLoc}`
  )
  assert(!dashLoc.includes('vercel.com'), 'Redirect target never leaks to vercel.com')

  const adminRes = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' })
  assert(
    adminRes.status === 307 || adminRes.status === 302 || adminRes.status === 308,
    `Unauthenticated /admin redirects (HTTP ${adminRes.status})`
  )
  const adminLoc = adminRes.headers.get('location') || ''
  assert(
    adminLoc.includes('/auth') && adminLoc.includes('redirect=%2Fadmin'),
    `Redirect points to /auth with safe relative target: ${adminLoc}`
  )

  // 5. Complete Profile Page
  console.log('\n5. Profile Completion Route (GET /complete-profile):')
  const compRes = await fetch(`${BASE_URL}/complete-profile`)
  assert(compRes.status === 200, 'Complete Profile route returns HTTP 200 OK')

  // 6. Security Response Headers
  console.log('\n6. Security Headers:')
  const secHeaders = homeRes.headers
  assert(secHeaders.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff present')
  assert(secHeaders.get('x-frame-options') === 'SAMEORIGIN', 'X-Frame-Options: SAMEORIGIN present')
  assert(secHeaders.get('referrer-policy')?.includes('strict-origin'), 'Referrer-Policy configured properly')

  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`)
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
