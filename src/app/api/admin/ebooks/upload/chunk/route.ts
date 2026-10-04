import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/admin'
import { getR2Client, getR2Config } from '@/lib/r2/client'
import { UploadPartCommand } from '@aws-sdk/client-s3'

export const dynamic = 'force-dynamic'

/**
 * Fallback chunk uploader route for Cloudflare R2 multipart uploads.
 * If the administrator's browser is blocked from direct R2 upload by CORS policy,
 * this endpoint proxies the individual chunk to R2 using server-side S3 credentials.
 *
 * Supports:
 * 1. Raw binary octet-stream body with query parameters (?uploadId=...&fileKey=...&partNumber=...)
 * 2. Headers (x-upload-id, x-file-key, x-part-number)
 * 3. Standard FormData body (for smaller chunks or legacy form submissions)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error || 'Access denied' },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    let uploadId = searchParams.get('uploadId') || request.headers.get('x-upload-id') || ''
    let fileKey = searchParams.get('fileKey') || request.headers.get('x-file-key') || ''
    let partNumberStr = searchParams.get('partNumber') || request.headers.get('x-part-number') || ''
    let buffer: Buffer | null = null

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await request.formData()
        uploadId = (formData.get('uploadId') as string) || uploadId
        fileKey = (formData.get('fileKey') as string) || fileKey
        partNumberStr = (formData.get('partNumber') as string) || partNumberStr
        const chunkFile = formData.get('chunk') as Blob | null
        if (chunkFile) {
          buffer = Buffer.from(await chunkFile.arrayBuffer())
        }
      } catch (formErr) {
        console.warn('FormData parse fallback note:', formErr)
      }
    }

    // If buffer was not populated via FormData, read raw binary body
    if (!buffer) {
      const arrayBuf = await request.arrayBuffer()
      if (arrayBuf.byteLength > 0) {
        buffer = Buffer.from(arrayBuf)
      }
    }

    if (!uploadId || !fileKey || !partNumberStr || !buffer || buffer.length === 0) {
      return NextResponse.json(
        {
          error:
            'Missing required parameters (uploadId, fileKey, partNumber) or chunk body payload.',
        },
        { status: 400 }
      )
    }

    const partNumber = parseInt(partNumberStr, 10)
    if (isNaN(partNumber) || partNumber < 1 || partNumber > 10000) {
      return NextResponse.json(
        { error: 'Invalid partNumber: must be an integer between 1 and 10000.' },
        { status: 400 }
      )
    }

    const { bucketName } = getR2Config()
    const client = getR2Client()

    const partResult = await client.send(
      new UploadPartCommand({
        Bucket: bucketName,
        Key: fileKey,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: buffer,
      })
    )

    if (!partResult.ETag) {
      return NextResponse.json(
        { error: `Cloudflare R2 failed to return an ETag for part ${partNumber}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      partNumber,
      etag: partResult.ETag,
    })
  } catch (error: any) {
    console.error('Error uploading chunk fallback to R2:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload chunk to Cloudflare R2.' },
      { status: 500 }
    )
  }
}
