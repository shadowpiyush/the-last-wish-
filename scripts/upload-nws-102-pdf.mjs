import fs from 'fs'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SOURCE_PATH = '/Users/arvindrajput/.gemini/antigravity/brain/7a0856fe-d87a-4677-ba2d-ead894c7e565/.user_uploaded/media_1794055854655_c751b545.pdf'
const STORAGE_BUCKET = 'notes'
const STORAGE_KEY = 'workshop-practice-nws-102-welding-shop.pdf'

async function uploadPdf() {
  console.log('=== STEP 1: VALIDATING PDF SOURCE FILE ===')
  if (!fs.existsSync(SOURCE_PATH)) {
    throw new Error(`Source file not found at ${SOURCE_PATH}`)
  }

  const fileStats = fs.statSync(SOURCE_PATH)
  const fileBuffer = fs.readFileSync(SOURCE_PATH)
  const magicBytes = fileBuffer.subarray(0, 8).toString('ascii')
  const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex')

  console.log(`- File Size: ${fileStats.size} bytes (${(fileStats.size / (1024 * 1024)).toFixed(2)} MB)`)
  console.log(`- Magic Header: "${magicBytes}"`)
  console.log(`- SHA-256: ${sha256}`)

  // 1. Validate PDF signature
  if (!magicBytes.startsWith('%PDF-')) {
    throw new Error(`Invalid file signature: ${magicBytes}. Expected %PDF-`)
  }

  // 2. Validate size against 50MB policy
  const MAX_LIMIT = 50 * 1024 * 1024
  if (fileStats.size > MAX_LIMIT) {
    throw new Error(`File size ${fileStats.size} exceeds 50MB limit`)
  }

  console.log('\n=== STEP 2: UPLOADING TO SECURE STORAGE ===')
  console.log(`Target Bucket: "${STORAGE_BUCKET}", Key: "${STORAGE_KEY}"`)

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(STORAGE_KEY, fileBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadErr) {
    throw new Error(`Supabase Storage upload failed: ${uploadErr.message}`)
  }

  console.log('Upload successful:', uploadData)

  console.log('\n=== STEP 3: VERIFYING SECURE VIEW URL ===')
  const { data: signedData, error: signErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(STORAGE_KEY, 3600, { download: false })

  if (signErr || !signedData?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${signErr?.message}`)
  }

  console.log('Signed URL generated successfully (valid for 1 hour, download: false).')

  // Quick HTTP HEAD/GET check on signed URL
  const testRes = await fetch(signedData.signedUrl, { method: 'HEAD' })
  console.log(`Signed URL response status: ${testRes.status}`)
  console.log(`Content-Type: ${testRes.headers.get('content-type')}`)
  console.log(`Content-Length: ${testRes.headers.get('content-length')}`)
  console.log(`Content-Disposition: ${testRes.headers.get('content-disposition')}`)

  console.log('\n✅ STORAGE UPLOAD & VERIFICATION COMPLETE!')
}

uploadPdf().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})

