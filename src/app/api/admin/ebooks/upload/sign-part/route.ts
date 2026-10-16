import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/admin'
import { getR2Client, getR2Config } from '@/lib/r2/client'
import { UploadPartCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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

    const { uploadId, fileKey, partNumber, partNumbers } = body

    if (!uploadId || typeof uploadId !== 'string' || !uploadId.trim()) {
      return NextResponse.json(
        { error: 'uploadId is required to sign multipart chunks.', code: 'INVALID_METADATA' },
        { status: 400 }
      )
    }

    if (!fileKey || typeof fileKey !== 'string' || !fileKey.trim() || !fileKey.startsWith('ebooks/')) {
      return NextResponse.json(
        { error: 'A valid fileKey under ebooks/ is required.', code: 'INVALID_METADATA' },
        { status: 400 }
      )
    }

    // Determine part numbers to sign (supports single part or batch)
    let partsToSign: number[] = []
    if (Array.isArray(partNumbers) && partNumbers.length > 0) {
      partsToSign = partNumbers
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0 && n <= 10000)
    } else if (partNumber && Number.isInteger(Number(partNumber)) && Number(partNumber) > 0) {
      partsToSign = [Number(partNumber)]
    }

    if (partsToSign.length === 0) {
      return NextResponse.json(
        { error: 'Valid partNumber or partNumbers array required (positive integers).', code: 'INVALID_CHUNK_PARAMETERS' },
        { status: 400 }
      )
    }

    // Prevent excessive batch signing in a single call (max 50 parts per call)
    if (partsToSign.length > 50) {
      return NextResponse.json(
        { error: 'Cannot sign more than 50 parts in a single request.', code: 'BATCH_LIMIT_EXCEEDED' },
        { status: 400 }
      )
    }

    const { bucketName, isConfigured } = getR2Config()
    if (!isConfigured) {
      return NextResponse.json(
        { error: 'Cloudflare R2 storage is not configured.', code: 'STORAGE_CONFIGURATION_ERROR' },
        { status: 503 }
      )
    }

    const r2Client = getR2Client()

    // 3. Generate presigned URLs for each part (valid for 2 hours)
    const signedParts = await Promise.all(
      partsToSign.map(async (pNum) => {
        const command = new UploadPartCommand({
          Bucket: bucketName,
          Key: fileKey,
          UploadId: uploadId,
          PartNumber: pNum,
        })

        const presignedUrl = await getSignedUrl(r2Client, command, {
          expiresIn: 7200,
        })

        return {
          partNumber: pNum,
          presignedUrl,
        }
      })
    )

    return NextResponse.json({
      success: true,
      parts: signedParts,
      count: signedParts.length,
    })
  } catch (err: unknown) {
    console.error('Multipart sign-part error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to generate presigned upload part URLs'
    return NextResponse.json({ error: msg, code: 'STORAGE_UPLOAD_FAILED' }, { status: 500 })
  }
}
