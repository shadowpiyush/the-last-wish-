import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { S3Client, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import crypto from 'crypto'

// 1. Load environment variables
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

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'ebookslib'

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY)

// Helper to authenticate as admin and retrieve cookies
async function getAdminCookieHeader() {
  const { data: linkData, error: linkErr } = await adminSupabase.auth.admin.generateLink({
    type: 'magiclink',
    email: 'admin@harcoutianhub.in',
  })
  if (linkErr || !linkData?.properties?.hashed_token) {
    throw new Error(`Failed to generate admin link: ${linkErr?.message}`)
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

  return Object.entries(cookiesObj)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('; ')
}

let passed = 0
let failed = 0

function report(condition, name, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`)
    passed++
  } else {
    console.error(`  ❌ FAIL: ${name} ${detail ? `(${detail})` : ''}`)
    failed++
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('HARCOURTIAN STUDY HUB — LARGE EBOOK UPLOAD ARCHITECTURE TEST');
  console.log('================================================================\n');

  console.log('1. Authenticating as Administrator...');
  const cookieHeader = await getAdminCookieHeader()
  report(!!cookieHeader, 'Admin cookie session generated')

  const headers = {
    'Content-Type': 'application/json',
    Cookie: cookieHeader,
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 1: File Size Validation & Boundaries
  // ─────────────────────────────────────────────────────────────
  console.log('\n2. Testing File Size Validation & Thresholds (500 MB Limit)...');

  // A. Reject > 500 MB
  const overSizeRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/initiate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'Oversized Monograph',
      author: 'Author Name',
      fileName: 'huge-book.pdf',
      fileSize: 501 * 1024 * 1024, // 501 MB
      contentType: 'application/pdf',
    }),
  })
  const overSizeData = await overSizeRes.json()
  report(
    overSizeRes.status === 400 && overSizeData.code === 'FILE_TOO_LARGE',
    'Rejects file > 500 MB with HTTP 400 FILE_TOO_LARGE',
    `Status: ${overSizeRes.status}, error: ${overSizeData.error}`
  )

  // B. Reject 0 bytes
  const zeroSizeRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/initiate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'Empty Book',
      author: 'Author Name',
      fileName: 'empty.pdf',
      fileSize: 0,
      contentType: 'application/pdf',
    }),
  })
  report(zeroSizeRes.status === 400, 'Rejects 0 byte file with HTTP 400')

  // C. Reject non-PDF
  const nonPdfRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/initiate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'Word Document',
      author: 'Author Name',
      fileName: 'document.docx',
      fileSize: 10 * 1024 * 1024,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
  })
  report(nonPdfRes.status === 400, 'Rejects non-PDF file with HTTP 400')

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Single PUT Initiation (≤ 100 MB)
  // ─────────────────────────────────────────────────────────────
  console.log('\n3. Testing Single PUT Initiation Strategy (Files ≤ 100 MB)...');

  const smallSizes = [
    { name: '10 MB', bytes: 10 * 1024 * 1024 },
    { name: '49 MB', bytes: 49 * 1024 * 1024 },
    { name: '50 MB', bytes: 50 * 1024 * 1024 },
    { name: '100 MB', bytes: 100 * 1024 * 1024 },
  ]

  for (const s of smallSizes) {
    const res = await fetch(`${BASE_URL}/api/admin/ebooks/upload/initiate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `Test eBook ${s.name}`,
        author: 'Faculty Author',
        fileName: `book-${s.name.replace(' ', '')}.pdf`,
        fileSize: s.bytes,
        contentType: 'application/pdf',
      }),
    })
    const data = await res.json()
    report(
      res.status === 200 && data.strategy === 'single_put' && !!data.uploadUrl && data.fileKey.startsWith('ebooks/'),
      `Initiates single PUT for ${s.name}`,
      `Strategy: ${data.strategy}, uploadUrl: ${!!data.uploadUrl}`
    )
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Multipart Upload Initiation Strategy (> 100 MB)
  // ─────────────────────────────────────────────────────────────
  console.log('\n4. Testing Multipart Upload Initiation Strategy (Files > 100 MB)...');

  const largeSizes = [
    { name: '120 MB', bytes: 120 * 1024 * 1024, expectedParts: Math.ceil((120 * 1024 * 1024) / (16 * 1024 * 1024)) },
    { name: '150 MB', bytes: 150 * 1024 * 1024, expectedParts: Math.ceil((150 * 1024 * 1024) / (16 * 1024 * 1024)) },
    { name: '250 MB', bytes: 250 * 1024 * 1024, expectedParts: Math.ceil((250 * 1024 * 1024) / (16 * 1024 * 1024)) },
    { name: '400 MB', bytes: 400 * 1024 * 1024, expectedParts: Math.ceil((400 * 1024 * 1024) / (16 * 1024 * 1024)) },
    { name: '500 MB', bytes: 500 * 1024 * 1024, expectedParts: Math.ceil((500 * 1024 * 1024) / (16 * 1024 * 1024)) },
  ]

  let sampleMultipart = null

  for (const s of largeSizes) {
    const res = await fetch(`${BASE_URL}/api/admin/ebooks/upload/initiate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `Large Textbook ${s.name}`,
        author: 'Senior Professor',
        fileName: `textbook-${s.name.replace(' ', '')}.pdf`,
        fileSize: s.bytes,
        contentType: 'application/pdf',
      }),
    })
    const data = await res.json()
    report(
      res.status === 200 &&
        data.strategy === 'multipart' &&
        !!data.uploadId &&
        data.totalParts === s.expectedParts &&
        data.partSize === 16 * 1024 * 1024,
      `Initiates multipart upload for ${s.name} (${s.expectedParts} parts of 16 MB)`,
      `Status: ${res.status}, strategy: ${data.strategy}, parts: ${data.totalParts}`
    )
    if (!sampleMultipart && data.uploadId) {
      sampleMultipart = data
    }
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 4: Batch Sign Part URLs
  // ─────────────────────────────────────────────────────────────
  console.log('\n5. Testing /api/admin/ebooks/upload/sign-part Batch Signing...');
  if (sampleMultipart) {
    const signRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/sign-part`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        uploadId: sampleMultipart.uploadId,
        fileKey: sampleMultipart.fileKey,
        partNumbers: [1, 2, 3],
      }),
    })
    const signData = await signRes.json()
    report(
      signRes.status === 200 &&
        Array.isArray(signData.parts) &&
        signData.parts.length === 3 &&
        signData.parts[0].presignedUrl.includes('partNumber=1'),
      'Generates valid presigned UploadPart URLs for parts 1, 2, 3',
      `Parts generated: ${signData.parts?.length}`
    )

    // Abort temporary test upload session
    await fetch(`${BASE_URL}/api/admin/ebooks/upload/abort`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        uploadId: sampleMultipart.uploadId,
        fileKey: sampleMultipart.fileKey,
      }),
    })
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 5: Deprecated Chunk Route Returns 410 Gone
  // ─────────────────────────────────────────────────────────────
  console.log('\n6. Testing Deprecated Vercel Chunk Proxy Route...');
  const chunkRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/chunk`, {
    method: 'POST',
    headers,
  })
  const chunkData = await chunkRes.json()
  report(
    chunkRes.status === 410 && chunkData.code === 'DIRECT_R2_UPLOAD_REQUIRED',
    'Chunk proxy endpoint is disabled (HTTP 410 Gone DIRECT_R2_UPLOAD_REQUIRED)',
    `Status: ${chunkRes.status}`
  )

  // ─────────────────────────────────────────────────────────────
  // TEST 6: Real PDF > 100 MB Upload, Multipart Assembly & Verification
  // ─────────────────────────────────────────────────────────────
  console.log('\n7. Executing Real PDF > 100 MB Multipart Upload & Verification...');

  // Create a real 105 MB valid PDF file
  const TARGET_SIZE_BYTES = 105 * 1024 * 1024 // 105 MB (> 100 MB)
  const PART_SIZE = 16 * 1024 * 1024 // 16 MB
  const totalParts = Math.ceil(TARGET_SIZE_BYTES / PART_SIZE)

  console.log(`   Generating 105 MB valid test PDF across ${totalParts} parts...`);

  // Step 1: Initiate multipart upload in R2
  const initRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/initiate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'Advanced Applied Mathematics and Fluid Dynamics',
      author: 'Dr. R. K. Bansal & HBTU Faculty',
      fileName: 'advanced-mathematics-fluid-dynamics-105mb.pdf',
      fileSize: TARGET_SIZE_BYTES,
      contentType: 'application/pdf',
      description: 'Comprehensive 105 MB reference textbook for chemical, mechanical and civil branches.',
    }),
  })
  const initData = await initRes.json()
  report(initRes.status === 200 && initData.strategy === 'multipart', 'Initiated 105 MB multipart session in R2')

  const { uploadId, fileKey } = initData
  const partNumbers = Array.from({ length: totalParts }, (_, i) => i + 1)

  // Step 2: Sign all parts
  const signRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/sign-part`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      uploadId,
      fileKey,
      partNumbers,
    }),
  })
  const signData = await signRes.json()
  report(signData.parts?.length === totalParts, `Presigned ${totalParts} part URLs for direct R2 upload`)

  const signedUrlMap = new Map()
  for (const p of signData.parts) {
    signedUrlMap.set(p.partNumber, p.presignedUrl)
  }

  // Step 3: Stream chunks directly to Cloudflare R2
  console.log(`   Uploading ${totalParts} chunks (16 MB each) directly to Cloudflare R2...`);
  const completedParts = []

  // Pre-generate a 1 MB filler block for speed
  const filler1MB = Buffer.alloc(1024 * 1024, 0x20) // space characters

  for (let pNum = 1; pNum <= totalParts; pNum++) {
    const isFirst = pNum === 1
    const isLast = pNum === totalParts
    const currentPartSize = isLast ? TARGET_SIZE_BYTES - (totalParts - 1) * PART_SIZE : PART_SIZE

    const partBuffer = Buffer.alloc(currentPartSize)
    if (isFirst) {
      partBuffer.write('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
    }
    // Fill buffer
    for (let offset = isFirst ? 64 : 0; offset < currentPartSize; offset += filler1MB.length) {
      const copyLen = Math.min(filler1MB.length, currentPartSize - offset)
      filler1MB.copy(partBuffer, offset, 0, copyLen)
    }
    if (isLast) {
      const trailer = '\nxref\n0 1\n0000000000 65535 f \ntrailer\n<< /Size 1 /Root 1 0 R >>\nstartxref\n9\n%%EOF\n'
      partBuffer.write(trailer, currentPartSize - trailer.length)
    }

    const presignedUrl = signedUrlMap.get(pNum)
    const tPartStart = Date.now()

    const putRes = await fetch(presignedUrl, {
      method: 'PUT',
      body: partBuffer,
    })

    const partElapsed = Date.now() - tPartStart
    const etag = putRes.headers.get('ETag') || putRes.headers.get('etag')

    if (!putRes.ok || !etag) {
      throw new Error(`Failed to upload part ${pNum}: HTTP ${putRes.status} (ETag: ${etag})`)
    }

    completedParts.push({
      PartNumber: pNum,
      ETag: etag.replace(/"/g, ''),
    })

    console.log(`   → Part ${pNum}/${totalParts} uploaded (${(currentPartSize / (1024 * 1024)).toFixed(1)} MB) in ${partElapsed}ms, ETag: ${etag}`)
  }

  report(completedParts.length === totalParts, `All ${totalParts} parts successfully uploaded directly to Cloudflare R2`)

  // Step 4: Complete multipart upload in R2 & register in Supabase
  console.log('   Finalizing multipart upload in R2 and registering book metadata...');
  const compRes = await fetch(`${BASE_URL}/api/admin/ebooks/upload/complete`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      strategy: 'multipart',
      uploadId,
      fileKey,
      parts: completedParts,
      title: 'Advanced Applied Mathematics and Fluid Dynamics',
      subtitle: 'Comprehensive Reference Monograph for Engineering',
      author: 'Dr. R. K. Bansal & HBTU Faculty',
      publisher: 'HBTU Digital Press',
      edition: '3rd Edition',
      publicationYear: 2025,
      totalPages: 1120,
      description: 'Comprehensive 105 MB reference textbook for chemical, mechanical and civil branches.',
      fileName: 'advanced-mathematics-fluid-dynamics-105mb.pdf',
      fileSize: TARGET_SIZE_BYTES,
      mappings: [
        {
          programId: null,
          branchIds: [],
          year: 2,
          semesters: [3, 4],
          subjectIds: [],
          category: 'Textbook',
        },
      ],
    }),
  })

  const compData = await compRes.json()
  report(
    compRes.status === 200 && compData.success === true,
    'Multipart upload completed and persisted in Supabase database',
    `Status: ${compRes.status}, error: ${compData.error}`
  )

  const createdBookId = compData.libraryBook?.id || compData.ebook?.id

  // Step 5: Verify object directly in Cloudflare R2 with HeadObject
  console.log('\n8. Verifying assembled object directly in Cloudflare R2...');
  const headResult = await s3Client.send(
    new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
    })
  )

  report(
    headResult.ContentLength === TARGET_SIZE_BYTES,
    `R2 Object ContentLength matches exact uploaded size (${headResult.ContentLength} bytes === ${TARGET_SIZE_BYTES} bytes)`
  )
  report(headResult.ContentType === 'application/pdf', 'R2 Object ContentType is application/pdf')

  // Step 6: Verify Supabase database record
  console.log('\n9. Verifying Supabase database record...');
  const { data: dbBook, error: dbErr } = await adminSupabase
    .from('library_books')
    .select('*, ebook_academic_mappings(*)')
    .eq('ebook_file_path', fileKey)
    .single()

  report(
    !dbErr && dbBook && dbBook.title === 'Advanced Applied Mathematics and Fluid Dynamics',
    'Database record found in library_books with matching title and file path'
  )
  report(
    dbBook && dbBook.ebook_status === 'available',
    'eBook status marked as available in library_books'
  )

  // Step 7: Verify PDF streaming via accelerated reader API
  console.log('\n10. Testing Range-streaming on the newly uploaded 105 MB eBook...');
  const streamRes = await fetch(`${BASE_URL}/api/storage/stream?bucket=ebooks&path=${encodeURIComponent(fileKey)}`, {
    headers: { Range: 'bytes=0-1024' },
  })
  report(
    streamRes.status === 206 && streamRes.headers.get('accept-ranges') === 'bytes',
    'HTTP 206 Partial Content range stream functions on the new 105 MB eBook'
  )
  const first1k = await streamRes.text()
  report(first1k.startsWith('%PDF-1.4'), 'First chunk delivers valid PDF header (%PDF-1.4)')

  // Step 8: Clean up test book from R2 and Supabase
  console.log('\n11. Cleaning up test eBook from Cloudflare R2 and Supabase...');
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileKey,
      })
    )
    if (createdBookId) {
      await adminSupabase.from('ebook_academic_mappings').delete().eq('book_id', createdBookId)
      await adminSupabase.from('library_books').delete().eq('id', createdBookId)
      await adminSupabase.from('ebooks').delete().eq('file_key', fileKey)
    }
    report(true, 'Test eBook cleaned up successfully')
  } catch (cleanErr) {
    console.warn('Cleanup warning:', cleanErr)
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})

