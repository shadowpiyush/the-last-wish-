import { NextResponse } from 'next/server'
import { getR2Client, getR2Config } from '@/lib/r2/client'
import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// In-memory cache for resolved R2 keys so subsequent byte-range requests execute with zero latency
const resolvedR2KeyCache = new Map<string, string>()

/**
 * High-performance streaming proxy for Cloudflare R2 and Supabase storage.
 * Supports HTTP 206 Range requests (byte-range streaming) so browsers and PDF.js
 * can instantly load large PDFs in milliseconds without downloading the whole file.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket') || 'notes'
    const rawPath = searchParams.get('path')

    if (!rawPath) {
      return NextResponse.json({ error: 'Path is required.' }, { status: 400 })
    }

    const cleanPath = decodeURIComponent(rawPath).replace(/^\/+/, '')
    if (cleanPath.includes('..')) {
      return NextResponse.json({ error: 'Invalid path.' }, { status: 400 })
    }

    const filename = cleanPath.split('/').pop() || 'document.pdf'
    const rangeHeader = request.headers.get('range')

    // 1. Try Cloudflare R2 first for ultra-fast byte-range delivery
    const { isConfigured, bucketName } = getR2Config()
    if (isConfigured) {
      try {
        const r2Client = getR2Client()
        const cacheKey = `${bucket}:${cleanPath}`
        let foundKey: string | null = resolvedR2KeyCache.get(cacheKey) || null

        if (!foundKey) {
          const candidateKeys = Array.from(
            new Set([
              cleanPath,
              `${bucket}/${cleanPath}`,
              cleanPath.startsWith(`${bucket}/`) ? cleanPath.slice(bucket.length + 1) : null,
            ].filter(Boolean) as string[])
          )

          for (const testKey of candidateKeys) {
            try {
              await r2Client.send(new HeadObjectCommand({ Bucket: bucketName, Key: testKey }))
              foundKey = testKey
              resolvedR2KeyCache.set(cacheKey, testKey)
              break
            } catch {
              // Check next candidate key
            }
          }
        }

        if (foundKey) {
          const getParams: { Bucket: string; Key: string; Range?: string } = {
            Bucket: bucketName,
            Key: foundKey,
          }

          if (rangeHeader) {
            getParams.Range = rangeHeader
          }

          let res
          try {
            res = await r2Client.send(new GetObjectCommand(getParams))
          } catch (getErr: unknown) {
            const errObj = getErr as { name?: string; $metadata?: { httpStatusCode?: number } }
            if (errObj?.name === 'InvalidRange' || errObj?.$metadata?.httpStatusCode === 416) {
              const head = await r2Client.send(new HeadObjectCommand({ Bucket: bucketName, Key: foundKey }))
              return new Response(null, {
                status: 416,
                headers: {
                  'Content-Range': `bytes */${head.ContentLength || 0}`,
                  'Accept-Ranges': 'bytes',
                  'Content-Type': 'application/pdf',
                  'Access-Control-Allow-Origin': '*',
                },
              })
            }
            throw getErr
          }

          if (res.Body) {
            const isPartial = Boolean(rangeHeader && res.ContentRange)
            const status = isPartial ? 206 : 200

            const headers: Record<string, string> = {
              'Content-Type': res.ContentType || 'application/pdf',
              'Accept-Ranges': 'bytes',
              'Content-Disposition': `inline; filename="${filename}"`,
              'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Range, Accept, Content-Type, If-Range, If-None-Match',
              'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, ETag',
            }

            if (res.ContentLength !== undefined) {
              headers['Content-Length'] = String(res.ContentLength)
            }
            if (res.ContentRange) {
              headers['Content-Range'] = res.ContentRange
            }
            if (res.ETag) {
              headers['ETag'] = res.ETag
            }

            const webStream = res.Body.transformToWebStream()
            return new Response(webStream, {
              status,
              headers,
            })
          }
        }
      } catch (r2Err: unknown) {
        console.warn(`R2 stream check for "${cleanPath}" fell back to Supabase:`, (r2Err as Error)?.message)
      }
    }

    // 2. Fall back to Supabase Storage if file is not in R2
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Storage credentials not configured' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(cleanPath, 7200, { download: false })

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message || 'File not found' }, { status: 404 })
    }

    // Proxy request to Supabase signed URL forwarding Range header
    const forwardHeaders: Record<string, string> = {}
    if (rangeHeader) {
      forwardHeaders['Range'] = rangeHeader
    }

    const supaRes = await fetch(data.signedUrl, {
      headers: forwardHeaders,
    })

    const responseHeaders: Record<string, string> = {
      'Content-Type': supaRes.headers.get('content-type') || 'application/pdf',
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Range, Accept, Content-Type, If-Range, If-None-Match',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, ETag',
    }

    const cl = supaRes.headers.get('content-length')
    if (cl) responseHeaders['Content-Length'] = cl
    const cr = supaRes.headers.get('content-range')
    if (cr) responseHeaders['Content-Range'] = cr
    const etag = supaRes.headers.get('etag')
    if (etag) responseHeaders['ETag'] = etag

    return new Response(supaRes.body, {
      status: supaRes.status,
      headers: responseHeaders,
    })
  } catch (err: unknown) {
    console.error('Storage stream error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to stream storage file'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function HEAD(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket') || 'notes'
    const rawPath = searchParams.get('path')

    if (!rawPath) {
      return new Response(null, { status: 400 })
    }

    const cleanPath = decodeURIComponent(rawPath).replace(/^\/+/, '')
    const { isConfigured, bucketName } = getR2Config()

    if (isConfigured) {
      try {
        const r2Client = getR2Client()
        const cacheKey = `${bucket}:${cleanPath}`
        let foundKey = resolvedR2KeyCache.get(cacheKey) || null

        if (!foundKey) {
          const candidateKeys = Array.from(
            new Set([
              cleanPath,
              `${bucket}/${cleanPath}`,
              cleanPath.startsWith(`${bucket}/`) ? cleanPath.slice(bucket.length + 1) : null,
            ].filter(Boolean) as string[])
          )

          for (const testKey of candidateKeys) {
            try {
              await r2Client.send(new HeadObjectCommand({ Bucket: bucketName, Key: testKey }))
              foundKey = testKey
              resolvedR2KeyCache.set(cacheKey, testKey)
              break
            } catch {}
          }
        }

        if (foundKey) {
          const head = await r2Client.send(new HeadObjectCommand({ Bucket: bucketName, Key: foundKey }))
          const headers: Record<string, string> = {
            'Content-Type': head.ContentType || 'application/pdf',
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Range, Accept, Content-Type, If-Range, If-None-Match',
            'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, ETag',
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
          }
          if (head.ContentLength !== undefined) {
            headers['Content-Length'] = String(head.ContentLength)
          }
          if (head.ETag) {
            headers['ETag'] = head.ETag
          }
          return new Response(null, { status: 200, headers })
        }
      } catch {}
    }

    return new Response(null, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Type': 'application/pdf',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, ETag',
      },
    })
  } catch {
    return new Response(null, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Accept, Content-Type, If-Range, If-None-Match',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, ETag',
      'Access-Control-Max-Age': '86400',
    },
  })
}
