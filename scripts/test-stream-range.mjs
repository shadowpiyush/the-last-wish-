import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

const R2_ENDPOINT = process.env.R2_ENDPOINT
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'ebookslib'

console.log('Testing R2 configuration...')
console.log('Endpoint:', R2_ENDPOINT)
console.log('Bucket:', R2_BUCKET)

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
})

async function testFileRange(key, testName) {
  console.log(`\n========================================`)
  console.log(`TEST: ${testName} (${key})`)
  console.log(`========================================`)

  // 1. HeadObject
  try {
    const head = await r2Client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }))
    console.log(`✅ HeadObject found file!`)
    console.log(`   ContentLength: ${head.ContentLength} bytes (${(head.ContentLength / (1024 * 1024)).toFixed(2)} MB)`)
    console.log(`   ContentType: ${head.ContentType}`)
    console.log(`   AcceptRanges: ${head.AcceptRanges}`)
    console.log(`   ETag: ${head.ETag}`)

    // 2. Range 0-65535 (64KB - standard PDF.js chunk)
    const rangeHeader = 'bytes=0-65535'
    const getRes = await r2Client.send(new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Range: rangeHeader,
    }))

    console.log(`✅ GetObject with Range ${rangeHeader} succeeded!`)
    console.log(`   ContentRange: ${getRes.ContentRange}`)
    console.log(`   ContentLength: ${getRes.ContentLength}`)
    console.log(`   ContentType: ${getRes.ContentType}`)

    const webStream = getRes.Body.transformToWebStream()
    const reader = webStream.getReader()
    let bytesRead = 0
    let firstChunk = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!firstChunk) firstChunk = value
      bytesRead += value.length
    }

    console.log(`   Read total bytes from stream: ${bytesRead}`)
    const magicString = Buffer.from(firstChunk.slice(0, 5)).toString('utf-8')
    console.log(`   First bytes (magic header): "${magicString}" (Expected: "%PDF-")`)
    if (magicString.startsWith('%PDF')) {
      console.log(`   ✅ Magic bytes verified! Valid PDF stream.`)
    } else {
      console.error(`   ❌ Invalid magic bytes!`)
    }

    // 3. Test EOF Range (last 1024 bytes)
    const endOffset = head.ContentLength - 1
    const startOffset = Math.max(0, head.ContentLength - 1024)
    const tailRange = `bytes=${startOffset}-${endOffset}`
    const tailRes = await r2Client.send(new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Range: tailRange,
    }))
    console.log(`✅ Tail Range (${tailRange}) succeeded! ContentRange: ${tailRes.ContentRange}`)

  } catch (err) {
    console.error(`❌ Error testing ${key}:`, err)
  }
}

async function main() {
  await testFileRange('notes/workshop-practice-nws-102-welding-shop.pdf', 'Workshop Practice Notes (6.4 MB)')
  await testFileRange('ebooks/1791036389316-higher-engineering-mathematics-bs-grewal.pdf', 'Higher Engineering Mathematics 45 MB')
  await testFileRange('ebooks/060ceac8-a9bd-4dda-981b-0dd25ef334da/higher-engineering-mathematics-.pdf', 'Higher Engineering Mathematics 154 MB')
}

main()
