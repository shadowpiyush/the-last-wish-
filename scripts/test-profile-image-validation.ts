import assert from 'node:assert/strict'
import test from 'node:test'
import { inspectProfileImage } from '../src/lib/validation/profile-image.ts'

function png(width = 128, height = 128) {
  const bytes = new Uint8Array(33)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0)
  bytes.set([0, 0, 0, 13, 73, 72, 68, 82], 8)
  new DataView(bytes.buffer).setUint32(16, width)
  new DataView(bytes.buffer).setUint32(20, height)
  bytes.set([73, 69, 78, 68], 25)
  return bytes
}

function jpeg(width = 128, height = 128) {
  return new Uint8Array([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x08, 0x08,
    height >> 8, height & 0xff, width >> 8, width & 0xff, 0x03,
    0xff, 0xd9,
  ])
}

function webp(width = 128, height = 128) {
  const bytes = new Uint8Array(30)
  bytes.set([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 88], 0)
  const encodedWidth = width - 1
  const encodedHeight = height - 1
  bytes.set([encodedWidth & 0xff, encodedWidth >> 8, encodedWidth >> 16], 24)
  bytes.set([encodedHeight & 0xff, encodedHeight >> 8, encodedHeight >> 16], 27)
  return bytes
}

test('accepts matching JPG, PNG, and WebP image signatures', () => {
  assert.equal(inspectProfileImage('avatar.jpg', 'image/jpeg', jpeg()).ok, true)
  assert.equal(inspectProfileImage('avatar.png', 'image/png', png()).ok, true)
  assert.equal(inspectProfileImage('avatar.webp', 'image/webp', webp()).ok, true)
})

test('rejects mismatched MIME declarations and unsafe extensions', () => {
  assert.equal(inspectProfileImage('avatar.jpg', 'image/png', jpeg()).ok, false)
  assert.equal(inspectProfileImage('avatar.svg', 'image/svg+xml', png()).ok, false)
  assert.equal(inspectProfileImage('avatar.png', 'image/png', new Uint8Array([60, 115, 118, 103])).ok, false)
})

test('rejects oversized dimensions before storage upload', () => {
  const result = inspectProfileImage('large.png', 'image/png', png(4097, 128))
  assert.equal(result.ok, false)
})
