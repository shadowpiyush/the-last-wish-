import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { bucket, fileName, fileSize } = body

    if (!bucket || !fileName) {
      return NextResponse.json(
        { error: 'Bucket and fileName are required.' },
        { status: 400 }
      )
    }

    const allowedBuckets = ['notes', 'ebooks', 'covers']
    if (!allowedBuckets.includes(bucket)) {
      return NextResponse.json(
        { error: `Invalid bucket. Allowed buckets: ${allowedBuckets.join(', ')}` },
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
          maxFileSize,
        },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Clean filename and generate unique storage path
    const sanitizedName = fileName
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '-')
      .replace(/-+/g, '-')

    const uniquePath = `${bucket}/${Date.now()}-${sanitizedName}`

    // Create signed upload URL valid for 2 hours with upsert enabled
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(uniquePath, { upsert: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
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
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
