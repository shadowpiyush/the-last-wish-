import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/auth/admin'

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

    const body = await request.json()
    const { bucket, fileName, fileSize, contentType } = body

    if (!bucket || !fileName || typeof fileName !== 'string' || !fileName.trim()) {
      return NextResponse.json(
        { error: 'Bucket and fileName are required.', code: 'INVALID_METADATA' },
        { status: 400 }
      )
    }

    const allowedBuckets = ['notes', 'ebooks', 'covers']
    if (!allowedBuckets.includes(bucket)) {
      return NextResponse.json(
        { error: `Invalid bucket. Allowed buckets: ${allowedBuckets.join(', ')}`, code: 'INVALID_STORAGE_BUCKET' },
        { status: 400 }
      )
    }

    // Storage bucket limits: 50MB for ebooks/notes, 25MB for covers
    const bucketLimits: Record<string, number> = {
      ebooks: 50 * 1024 * 1024,
      notes: 50 * 1024 * 1024,
      covers: 25 * 1024 * 1024,
    }
    const maxFileSize = bucketLimits[bucket] || 50 * 1024 * 1024

    if (fileSize && typeof fileSize === 'number' && fileSize > maxFileSize) {
      return NextResponse.json(
        {
          error: `File size (${(fileSize / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of ${(maxFileSize / (1024 * 1024)).toFixed(0)} MB for the ${bucket} bucket.`,
          code: 'FILE_TOO_LARGE',
          maxFileSize,
        },
        { status: 400 }
      )
    }

    // Type validation
    if (bucket === 'covers' && contentType) {
      const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedImageMimes.includes(contentType)) {
        return NextResponse.json(
          { error: 'Only JPG, PNG, and WebP images are allowed for cover thumbnails.', code: 'INVALID_FILE_TYPE' },
          { status: 400 }
        )
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured', code: 'STORAGE_CONFIGURATION_ERROR' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Clean filename and generate unique storage path without path traversal
    const sanitizedName = fileName
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100)

    const uniquePath = `${bucket}/${Date.now()}-${sanitizedName}`

    // Create signed upload URL valid for 2 hours with upsert enabled
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(uniquePath, { upsert: true })

    if (error) {
      return NextResponse.json({ error: error.message, code: 'STORAGE_UPLOAD_FAILED' }, { status: 400 })
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${uniquePath}`

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      path: uniquePath,
      token: data.token,
      publicUrl,
      bucket,
      maxFileSize,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate signed upload URL'
    return NextResponse.json({ error: msg, code: 'STORAGE_UPLOAD_FAILED' }, { status: 500 })
  }
}
