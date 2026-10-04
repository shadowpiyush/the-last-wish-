import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/admin'
import { getR2Client, getR2Config } from '@/lib/r2/client'
import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    // 1. Strict admin verification
    const authCheck = await verifyAdmin(request)
    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    // 2. Validate request payload
    const body = await request.json()
    const { title, fileName, fileSize, contentType, description, author } = body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'eBook title is required.' }, { status: 400 })
    }

    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'File name is required.' }, { status: 400 })
    }

    if (!fileSize || typeof fileSize !== 'number' || fileSize <= 0) {
      return NextResponse.json({ error: 'Invalid file size. File must not be empty.' }, { status: 400 })
    }

    // Reject non-PDF files
    const isPdf =
      fileName.toLowerCase().endsWith('.pdf') ||
      contentType === 'application/pdf'

    if (!isPdf) {
      return NextResponse.json({ error: 'Only PDF documents are allowed for eBook upload.' }, { status: 400 })
    }

    // 3. Check R2 configuration
    const { bucketName, isConfigured } = getR2Config()
    if (!isConfigured) {
      return NextResponse.json(
        {
          error:
            'Cloudflare R2 is not configured on the server. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in your environment.',
        },
        { status: 503 }
      )
    }

    const r2Client = getR2Client()

    // 4. Generate safe unique key
    const sanitizedFileName = fileName
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '-')
      .replace(/-+/g, '-')

    const fileUuid = crypto.randomUUID()
    const fileKey = `ebooks/${fileUuid}/${sanitizedFileName}`

    // 5. Calculate chunk size (10 MB is optimal for S3/R2 multipart up to 100 GB)
    const partSize = 10 * 1024 * 1024 // 10 MB
    const totalParts = Math.ceil(fileSize / partSize)

    // 6. Initiate multipart upload in R2
    const command = new CreateMultipartUploadCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: 'application/pdf',
      Metadata: {
        title: encodeURIComponent(title.trim()),
        author: encodeURIComponent((author || 'Unknown').trim()),
        originalfilename: encodeURIComponent(fileName),
        filesize: String(fileSize),
        uploaderid: authCheck.user?.id || '',
      },
    })

    const res = await r2Client.send(command)

    if (!res.UploadId) {
      return NextResponse.json({ error: 'Failed to obtain Upload ID from Cloudflare R2.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      uploadId: res.UploadId,
      fileKey,
      partSize,
      totalParts,
      bucket: bucketName,
    })
  } catch (err: unknown) {
    console.error('Multipart initiate error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to initiate multipart upload'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
