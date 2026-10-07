import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getR2Client, getR2Config } from '@/lib/r2/client'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket') || 'notes'
    const path = searchParams.get('path')

    if (!path) {
      return NextResponse.json({ error: 'Path is required.' }, { status: 400 })
    }

    const cleanPath = decodeURIComponent(path).replace(/^\/+/, '')

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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      url: streamUrl,
      streamUrl,
      directUrl: data.signedUrl,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate view URL'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
