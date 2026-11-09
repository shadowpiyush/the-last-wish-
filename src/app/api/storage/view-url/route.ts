import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getR2Client, getR2Config } from '@/lib/r2/client'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

interface CachedSignedUrl {
  url: string
  streamUrl: string
  directUrl?: string
  provider?: string
  expiresAt: number
}

// In-memory cache for presigned viewer URLs to avoid expensive repeated signing calls
const signedUrlCache = new Map<string, CachedSignedUrl>()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket') || 'notes'
    const path = searchParams.get('path')

    if (!path) {
      return NextResponse.json({ error: 'Path is required.' }, { status: 400 })
    }

    const cleanPath = decodeURIComponent(path).replace(/^\/+/, '')
    const cacheKey = `${bucket}:${cleanPath}`

    // Check warm signed URL cache (reusable for up to 50 minutes of the 60-minute window)
    const cached = signedUrlCache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json({
        success: true,
        url: cached.url,
        streamUrl: cached.streamUrl,
        directUrl: cached.directUrl,
        provider: cached.provider,
        cached: true,
      })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // If bucket is public (like covers), return public URL directly
    if (bucket === 'covers') {
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/covers/${cleanPath}`
      return NextResponse.json({ success: true, url: publicUrl })
    }

    const streamUrl = `/api/storage/stream?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(cleanPath)}`

    // If bucket is R2 or an eBook file stored in Cloudflare R2
    if (bucket === 'r2' || bucket === 'ebooks' || cleanPath.startsWith('ebooks/')) {
      const { isConfigured, bucketName } = getR2Config()
      if (isConfigured) {
        try {
          const r2Client = getR2Client()
          const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: cleanPath,
            ResponseContentDisposition: 'inline',
            ResponseContentType: 'application/pdf',
          })
          const r2Url = await getSignedUrl(r2Client, command, { expiresIn: 3600 })
          
          const result = {
            url: streamUrl,
            streamUrl,
            directUrl: r2Url,
            provider: 'r2',
            expiresAt: Date.now() + 50 * 60 * 1000,
          }
          signedUrlCache.set(cacheKey, result)

          return NextResponse.json({
            success: true,
            url: streamUrl,
            streamUrl,
            directUrl: r2Url,
            provider: 'r2',
          })
        } catch (r2Err: unknown) {
          const message = r2Err instanceof Error ? r2Err.message : 'error'
          console.warn(`R2 signing for "${cleanPath}" warning (${message}). Falling back to Supabase storage.`)
        }
      }
    }

    // Direct downloading is disabled platform-wide. Documents are strictly readable online.
    // Serving strictly with download: false ensures Content-Disposition: inline for reading only.
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(cleanPath, 7200, {
        download: false,
      })

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message || 'File not found or inaccessible.' }, { status: 404 })
    }

    const result = {
      url: streamUrl,
      streamUrl,
      directUrl: data.signedUrl,
      provider: 'supabase',
      expiresAt: Date.now() + 100 * 60 * 1000,
    }
    signedUrlCache.set(cacheKey, result)

    return NextResponse.json({
      success: true,
      url: streamUrl,
      streamUrl,
      directUrl: data.signedUrl,
      provider: 'supabase',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
