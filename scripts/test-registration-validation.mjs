import test from 'node:test'
import assert from 'node:assert/strict'

const baseUrl = new URL(process.env.REGISTRATION_TEST_URL || 'http://127.0.0.1:3000')
if (!['localhost', '127.0.0.1', '::1'].includes(baseUrl.hostname)) {
  throw new Error('Registration validation tests only run against a local server.')
}

async function post(body, raw = false) {
  return fetch(new URL('/api/auth/register', baseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw ? body : JSON.stringify(body),
  })
}

test('rejects malformed JSON with a structured client error', async () => {
  const response = await post('{', true)
  const payload = await response.json()
  assert.equal(response.status, 400)
  assert.equal(payload.success, false)
  assert.equal(payload.error.code, 'INVALID_JSON')
})

test('rejects invalid email before any auth or database write', async () => {
  const response = await post({ email: 'not-an-email', password: 'abcdefgh', fullName: 'Student' })
  const payload = await response.json()
  assert.equal(response.status, 422)
  assert.equal(payload.error.code, 'VALIDATION_ERROR')
})

test('rejects malformed mobile numbers before any auth or database write', async () => {
  const response = await post({
    email: 'student@example.test',
    password: 'abcdefgh',
    fullName: 'Student',
    mobileNumber: '123',
  })
  const payload = await response.json()
  assert.equal(response.status, 422)
  assert.equal(payload.error.code, 'VALIDATION_ERROR')
})

test('rejects client supplied non-database academic identifiers', async () => {
  const response = await post({
    email: 'student@example.test',
    password: 'abcdefgh',
    fullName: 'Student',
    mobileNumber: '9876543210',
    programId: 'btech',
    branchId: 'btech-cse',
    currentYear: 1,
    currentSemester: 1,
  })
  const payload = await response.json()
  assert.equal(response.status, 422)
  assert.equal(payload.error.code, 'VALIDATION_ERROR')
})
