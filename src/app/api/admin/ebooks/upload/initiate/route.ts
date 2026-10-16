import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/admin'
import { getR2Client, getR2Config } from '@/lib/r2/client'
import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'

const MAX_EBOOK_FILE_SIZE = 500 * 1024 * 1024 // 500 MB

export async function POST(request: Request) {
  try {
    // 1. Strict admin verification
    const authCheck = await verifyAdmin(request)
    if (!authCheck.isAdmin) {
      return NextResponse.json(
        { error: authCheck.error, code: 'UNAUTHORIZED' },
        { status: authCheck.status }
      )
    }

    // 2. Validate request payload
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body.', code: 'INVALID_REQUEST' },
        { status: 400 }
      )
    }

    const { title, fileName, fileSize, contentType, author } = body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'eBook title is required.', code: 'INVALID_BOOK_METADATA', field: 'title' },
        { status: 400 }
      )
    }
    const cleanTitle = title.trim()
    if (cleanTitle.length > 255) {
      return NextResponse.json(
        { error: 'eBook title must not exceed 255 characters.', code: 'INVALID_BOOK_METADATA', field: 'title' },
        { status: 400 }
      )
    }

    if (!author || typeof author !== 'string' || !author.trim()) {
      return NextResponse.json(
        { error: 'Author name is required.', code: 'INVALID_BOOK_METADATA', field: 'author' },
        { status: 400 }
      )
    }
    const cleanAuthor = author.trim()

    if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
      return NextResponse.json(
        { error: 'PDF file name is required.', code: 'INVALID_FILE_TYPE', field: 'fileName' },
        { status: 400 }
      )
    }

    if (!fileSize || typeof fileSize !== 'number' || fileSize <= 0) {
      return NextResponse.json(
        { error: 'Invalid file size. eBook file must not be empty.', code: 'INVALID_FILE_SIZE', field: 'fileSize' },
        { status: 400 }
      )
    }

    if (fileSize > MAX_EBOOK_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size (${(fileSize / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of ${(MAX_EBOOK_FILE_SIZE / (1024 * 1024)).toFixed(0)} MB.`,
          code: 'FILE_TOO_LARGE',
          field: 'fileSize',
        },
        { status: 400 }
      )
    }

    // Reject non-PDF files
    const isPdf =
      fileName.toLowerCase().endsWith('.pdf') ||
      contentType === 'application/pdf'

    if (!isPdf) {
      return NextResponse.json(
        { error: 'Only PDF documents are allowed for eBook upload.', code: 'INVALID_FILE_TYPE', field: 'contentType' },
        { status: 400 }
      )
    }

    // 3. Check R2 configuration
    const { bucketName, isConfigured } = getR2Config()
    if (!isConfigured) {
      return NextResponse.json(
        {
          error:
            'Cloudflare R2 is not configured on the server. Please verify R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in your environment.',
          code: 'STORAGE_CONFIGURATION_ERROR',
        },
        { status: 503 }
      )
    }

    const r2Client = getR2Client()

    // 4. Generate safe unique key preventing path traversal
    const baseName = fileName
      .toLowerCase()
      .replace(/\.pdf$/i, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'ebook'

    const fileUuid = crypto.randomUUID()
    const fileKey = `ebooks/${fileUuid}/${baseName}.pdf`

    // 5. Calculate chunk size (10 MB is optimal for S3/R2 multipart up to 100 GB)
    const partSize = 10 * 1024 * 1024 // 10 MB
    const totalParts = Math.ceil(fileSize / partSize)

    // 6. Initiate multipart upload in R2
    const command = new CreateMultipartUploadCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: 'application/pdf',
      Metadata: {
        title: encodeURIComponent(cleanTitle),
        author: encodeURIComponent(cleanAuthor),
        originalfilename: encodeURIComponent(fileName),
        filesize: String(fileSize),
        uploaderid: authCheck.user?.id || '',
      },
    })

    const res = await r2Client.send(command)

    if (!res.UploadId) {
      return NextResponse.json(
        { error: 'Failed to obtain Upload ID from Cloudflare R2.', code: 'STORAGE_UPLOAD_FAILED' },
        { status: 500 }
      )
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
    return NextResponse.json({ error: msg, code: 'STORAGE_UPLOAD_FAILED' }, { status: 500 })
  }
}
