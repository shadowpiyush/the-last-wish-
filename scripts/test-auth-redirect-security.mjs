/**
 * Automated Test Suite: Authentication Redirect Security & Canonical URL Resolution
 * 
 * Verifies that:
 * 1. Canonical application URLs are resolved safely without trailing slashes.
 * 2. External platform URLs (e.g. vercel.com, vercel.com/login) are strictly rejected.
 * 3. Open redirect vectors (protocol-relative, scheme injection, CRLF, backslash) are neutralized.
 * 4. Internal paths are preserved correctly (/dashboard, /admin, /profile).
 * 5. Role-based destinations (/admin vs /dashboard) resolve properly.
 */

import {
  getBaseUrl,
  getBaseUrlFromRequest,
  getAuthCallbackUrl,
  sanitizeInternalPath,
} from '../src/lib/auth/url.ts'

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

console.log('\n=== RUNNING AUTHENTICATION REDIRECT SECURITY TEST SUITE ===\n')

// Group 1: Open Redirect Vectors Sanitization
console.log('1. Open Redirect & Destination Path Sanitization:')
assert(
  sanitizeInternalPath('https://vercel.com', '/dashboard') === '/dashboard',
  'Blocks absolute external URL (https://vercel.com)'
)
assert(
  sanitizeInternalPath('http://vercel.com/login', '/dashboard') === '/dashboard',
  'Blocks Vercel login platform URL (http://vercel.com/login)'
)
assert(
  sanitizeInternalPath('//vercel.com', '/dashboard') === '/dashboard',
  'Blocks protocol-relative path (//vercel.com)'
)
assert(
  sanitizeInternalPath('/\\vercel.com', '/dashboard') === '/dashboard',
  'Blocks backslash-prefixed protocol-relative trick (/\\vercel.com)'
)
assert(
  sanitizeInternalPath('/dashboard\\evil.com', '/dashboard') === '/dashboard',
  'Blocks internal paths containing backslashes'
)
assert(
  sanitizeInternalPath('javascript:alert(1)', '/dashboard') === '/dashboard',
  'Blocks javascript: pseudo-protocol'
)
assert(
  sanitizeInternalPath('data:text/html;base64,...', '/dashboard') === '/dashboard',
  'Blocks data: URI scheme'
)
assert(
  sanitizeInternalPath('/dashboard\r\nSet-Cookie:malicious=1', '/dashboard') === '/dashboard',
  'Blocks CRLF response-splitting characters'
)
assert(
  sanitizeInternalPath('/admin', '/dashboard') === '/admin',
  'Permits valid internal admin path (/admin)'
)
assert(
  sanitizeInternalPath('/dashboard', '/dashboard') === '/dashboard',
  'Permits valid internal dashboard path (/dashboard)'
)
assert(
  sanitizeInternalPath('/notes?subject=cs', '/dashboard') === '/notes?subject=cs',
  'Permits internal path with query params'
)
assert(
  sanitizeInternalPath(null, '/dashboard') === '/dashboard',
  'Safely falls back on null'
)
assert(
  sanitizeInternalPath('', '/dashboard') === '/dashboard',
  'Safely falls back on empty string'
)

// Group 2: Canonical Base URL Resolution
console.log('\n2. Canonical Base URL Resolution:')
const base = getBaseUrl()
assert(
  base.startsWith('http://') || base.startsWith('https://'),
  `Base URL has valid scheme: ${base}`
)
assert(!base.endsWith('/'), 'Base URL never has a trailing slash')
assert(!base.includes('vercel.com'), 'Base URL is never the vercel.com platform')

const callbackUrl = getAuthCallbackUrl()
assert(
  callbackUrl === `${base}/auth/callback`,
  `Callback URL correctly formatted: ${callbackUrl}`
)

// Group 3: Server Request Origin Handling
console.log('\n3. Server Request Origin Resolution:')
const mockReqForwarded = new Request('http://internal-worker:8080/auth/callback', {
  headers: {
    'x-forwarded-host': 'harcoutianhub.in',
    'x-forwarded-proto': 'https',
  },
})
const resolvedForwarded = getBaseUrlFromRequest(mockReqForwarded)
assert(
  resolvedForwarded === 'https://harcoutianhub.in',
  `Correctly extracts forwarded host & proto: ${resolvedForwarded}`
)

const mockReqVercelPlatform = new Request('http://internal-worker:8080/auth/callback', {
  headers: {
    'x-forwarded-host': 'vercel.com',
    'x-forwarded-proto': 'https',
  },
})
const resolvedBlocked = getBaseUrlFromRequest(mockReqVercelPlatform)
assert(
  resolvedBlocked !== 'https://vercel.com',
  `Strictly rejects vercel.com as incoming origin: ${resolvedBlocked}`
)

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`)

if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
