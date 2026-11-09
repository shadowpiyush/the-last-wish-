import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getR2Client, getR2Config } from '@/lib/r2/client'
import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
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

    // If bucket is public (like covers), return public URL directly
    if (bucket === 'covers') {
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/covers/${cleanPath}`
      return NextResponse.json({ success: true, url: publicUrl })
    }

    const streamUrl = `/api/storage/stream?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(cleanPath)}`

    // 1. Check Cloudflare R2 first for ultra-fast direct byte-range access
    const { isConfigured, bucketName } = getR2Config()
    if (isConfigured) {
      try {
        const r2Client = getR2Client()
        // Try candidate keys in R2 (with prefix, without prefix, or as cleanPath)
        const candidateKeys = Array.from(
          new Set([
            cleanPath,
            `${bucket}/${cleanPath}`,
            cleanPath.startsWith(`${bucket}/`) ? cleanPath.slice(bucket.length + 1) : null,
          ].filter(Boolean) as string[])
        )

        let foundKey: string | null = null
        for (const testKey of candidateKeys) {
          try {
            await r2Client.send(new HeadObjectCommand({ Bucket: bucketName, Key: testKey }))
            foundKey = testKey
            break
          } catch {
            // Check next key
          }
        }

        if (foundKey) {
          const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: foundKey,
            ResponseContentDisposition: 'inline',
            ResponseContentType: 'application/pdf',
          })
          const r2Url = await getSignedUrl(r2Client, command, { expiresIn: 3600 })

          const result: CachedSignedUrl = {
            url: r2Url,
            streamUrl,
            directUrl: r2Url,
            provider: 'r2',
            expiresAt: Date.now() + 50 * 60 * 1000,
          }
          signedUrlCache.set(cacheKey, result)

          return NextResponse.json({
            success: true,
            url: r2Url,
            streamUrl,
            directUrl: r2Url,
            provider: 'r2',
          })
        }
      } catch (r2Err: unknown) {
        console.warn(`R2 signing check for "${cleanPath}" warning:`, r2Err)
      }
    }

    // 2. Fall back to Supabase Storage if file is not in R2
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Serving strictly with download: false ensures Content-Disposition: inline for reading only.
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(cleanPath, 7200, {
        download: false,
      })

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message || 'File not found or inaccessible.' }, { status: 404 })
    }

    const result: CachedSignedUrl = {
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
