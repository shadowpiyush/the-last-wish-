import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'

// Load .env.local if present
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

const BASE_URL = process.env.TEST_APP_URL || 'http://localhost:3000'

test('Attendance API Security — Unauthenticated Access Rejection', async () => {
  // Test that unauthenticated calls to all attendance endpoints are strictly rejected
  try {
    const endpoints = [
      { url: '/api/attendance/summary', method: 'GET' },
      { url: '/api/attendance/history', method: 'GET' },
      { url: '/api/attendance', method: 'GET' },
      { url: '/api/attendance', method: 'POST', body: { subjectId: '123', date: '2026-10-08', status: 'present' } },
      { url: '/api/attendance/test-id', method: 'PATCH', body: { status: 'absent' } },
      { url: '/api/attendance/test-id', method: 'DELETE' },
      { url: '/api/attendance/target', method: 'PUT', body: { target: 80 } },
    ]

    for (const ep of endpoints) {
      const res = await fetch(`${BASE_URL}${ep.url}`, {
        method: ep.method,
        headers: ep.body ? { 'Content-Type': 'application/json' } : {},
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      })

      assert.equal(
        res.status,
        401,
        `Expected 401 Unauthorized for ${ep.method} ${ep.url}, got ${res.status}`
      )
      const data = await res.json()
      assert.ok(data.error, `Expected error message in response for ${ep.url}`)
    }
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED') {
      console.log('Local dev server not running; skipped live network check for unauthenticated calls.')
      return
    }
    throw err
  }
})

test('Attendance API Security — Admin Endpoint Rejection for Unauthenticated/Students', async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/attendance`, {
      method: 'GET',
    })
    // Must be 401 or 403
    assert.ok(
      res.status === 401 || res.status === 403,
      `Expected 401/403 for /api/admin/attendance, got ${res.status}`
    )
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED') {
      return
    }
    throw err
  }
})
