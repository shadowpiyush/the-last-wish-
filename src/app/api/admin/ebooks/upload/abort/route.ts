import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/admin'
import { getR2Client, getR2Config } from '@/lib/r2/client'
import { AbortMultipartUploadCommand } from '@aws-sdk/client-s3'

export async function POST(request: Request) {
  try {
    // 1. Strict admin verification
    const authCheck = await verifyAdmin(request)
    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const body = await request.json()
    const { uploadId, fileKey } = body

    if (!uploadId || !fileKey) {
      return NextResponse.json({ error: 'uploadId and fileKey are required to abort upload.' }, { status: 400 })
    }

    const { bucketName } = getR2Config()
    const r2Client = getR2Client()

    const command = new AbortMultipartUploadCommand({
      Bucket: bucketName,
      Key: fileKey,
      UploadId: uploadId,
    })

    await r2Client.send(command)

    return NextResponse.json({
      success: true,
      message: 'Multipart upload successfully aborted and temporary parts cleaned up.',
    })
  } catch (err: unknown) {
    console.error('Multipart abort error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to abort multipart upload'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
