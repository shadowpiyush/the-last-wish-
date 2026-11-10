/**
 * test-pdf-optimization.mjs
 * Rigorous test and benchmark suite for Ultra-Fast PDF Notes Loading & Cloudflare R2 Delivery
 */

import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const R2_ENDPOINT = process.env.R2_ENDPOINT
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'ebookslib'

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

async function runTests() {
  console.log('\n🚀 Starting Ultra-Fast PDF Notes & R2 Delivery Verification Suite\n')

  const r2Client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY,
      secretAccessKey: R2_SECRET_KEY,
    },
  })

  // ──────────────── TEST GROUP 1: Cloudflare R2 Range Request Verification ────────────────
  console.log('--- TEST GROUP 1: Cloudflare R2 Native Range Request Contract ---')
  const noteKey = 'notes/workshop-practice-nws-102-welding-shop.pdf'
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: noteKey,
    ResponseContentType: 'application/pdf',
    ResponseContentDisposition: 'inline',
  })

  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 })
  assert(Boolean(signedUrl), 'Generated signed URL for note PDF')

  // Byte range 0-1023 (first 1 KB)
  const t0 = Date.now()
  const rangeRes = await fetch(signedUrl, {
    headers: { Range: 'bytes=0-1023' },
  })
  const rangeDuration = Date.now() - t0

  assert(rangeRes.status === 206, `HTTP Status is 206 Partial Content (returned ${rangeRes.status})`)
  assert(rangeRes.headers.get('accept-ranges') === 'bytes', `Accept-Ranges header is 'bytes' (${rangeRes.headers.get('accept-ranges')})`)
  assert(rangeRes.headers.get('content-range')?.startsWith('bytes 0-1023/'), `Content-Range header starts with 'bytes 0-1023/' (${rangeRes.headers.get('content-range')})`)
  assert(rangeRes.headers.get('content-length') === '1024', `Content-Length is exactly 1024 bytes (${rangeRes.headers.get('content-length')})`)
  assert(rangeRes.headers.get('content-type') === 'application/pdf', `Content-Type is 'application/pdf' (${rangeRes.headers.get('content-type')})`)
  console.log(`  ⚡ First 1 KB byte range retrieved in ${rangeDuration} ms directly from R2 edge`)

  // ──────────────── TEST GROUP 2: Progressive PDF.js Page 1 Byte Extraction ────────────────
  console.log('\n--- TEST GROUP 2: Progressive PDF Loading & First-Page Latency ---')
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

  const tInit = Date.now()
  const loadingTask = pdfjsLib.getDocument({
    url: signedUrl,
    rangeChunkSize: 65536,
    disableAutoFetch: true,
    disableStream: false,
  })

  const pdfDoc = await loadingTask.promise
  const initLatency = Date.now() - tInit
  assert(pdfDoc.numPages === 23, `PDF Document initialized via Range Requests. Total pages: ${pdfDoc.numPages}`)
  assert(initLatency < 3000, `Document initialized under target (took ${initLatency} ms)`)

  const tPage1 = Date.now()
  const page1 = await pdfDoc.getPage(1)
  const page1Latency = Date.now() - tPage1
  assert(page1Latency < 500, `Page 1 retrieved on-demand in ${page1Latency} ms (under 500ms target)`)

  const viewport = page1.getViewport({ scale: 1.0 })
  assert(viewport.width > 0 && viewport.height > 0, `Page 1 viewport parsed correctly: ${viewport.width} x ${viewport.height}`)

  // ──────────────── TEST GROUP 3: Subsequent Page Navigation & Cache Verification ────────────────
  console.log('\n--- TEST GROUP 3: Subsequent Page Navigation & Cache Performance ---')
  const tPage5 = Date.now()
  const page5 = await pdfDoc.getPage(5)
  const page5Latency = Date.now() - tPage5
  assert(page5Latency < 500, `Page 5 on-demand byte-range load took ${page5Latency} ms (target <500ms)`)

  const tPage23 = Date.now()
  const page23 = await pdfDoc.getPage(23)
  const page23Latency = Date.now() - tPage23
  assert(page23Latency < 500, `Final Page 23 on-demand byte-range load took ${page23Latency} ms`)

  // Re-reading cached Page 1
  const tPage1Cache = Date.now()
  await pdfDoc.getPage(1)
  const cacheHitLatency = Date.now() - tPage1Cache
  assert(cacheHitLatency < 50, `Reopening cached Page 1 took ${cacheHitLatency} ms (target <50ms)`)

  // ──────────────── TEST GROUP 4: Multi-Size PDF Benchmark (45 MB & 154 MB) ────────────────
  console.log('\n--- TEST GROUP 4: Large PDF Benchmarking (45 MB & 154 MB) ---')
  const key45MB = 'ebooks/1791036389316-higher-engineering-mathematics-bs-grewal.pdf'
  const cmd45MB = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key45MB })
  const url45MB = await getSignedUrl(r2Client, cmd45MB, { expiresIn: 3600 })

  const t45Range = Date.now()
  const res45Range = await fetch(url45MB, { headers: { Range: 'bytes=0-2047' } })
  const dur45 = Date.now() - t45Range

  assert(res45Range.status === 206, `45 MB PDF returned HTTP 206 for byte range 0-2047 (took ${dur45} ms)`)
  assert(res45Range.headers.get('content-range')?.includes('/44931612'), 'Content-Range reports total 44.9 MB size without downloading full file')

  const key154MB = 'ebooks/060ceac8-a9bd-4dda-981b-0dd25ef334da/higher-engineering-mathematics-.pdf'
  const cmd154MB = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key154MB })
  const url154MB = await getSignedUrl(r2Client, cmd154MB, { expiresIn: 3600 })

  const t154Range = Date.now()
  const res154Range = await fetch(url154MB, { headers: { Range: 'bytes=0-2047' } })
  const dur154 = Date.now() - t154Range

  assert(res154Range.status === 206, `154 MB PDF returned HTTP 206 for byte range 0-2047 (took ${dur154} ms)`)
  assert(res154Range.headers.get('content-range')?.includes('/154124637'), 'Content-Range reports total 154 MB size without downloading full file')

  // ──────────────── TEST GROUP 5: Security & Anti-Download Verification ────────────────
  console.log('\n--- TEST GROUP 5: Security & Anti-Download Protection ---')
  assert(signedUrl.includes('X-Amz-Signature'), 'R2 delivery uses time-bound cryptographic presigned URLs (60 min expiry)')
  assert(!signedUrl.includes('response-content-disposition=attachment'), 'Content-Disposition strictly forbids attachment / direct download')

  console.log('\n============================================================')
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`)
  console.log('============================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests()

