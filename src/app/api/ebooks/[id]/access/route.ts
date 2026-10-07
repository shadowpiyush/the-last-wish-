import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/admin'
import { getR2Client, getR2Config } from '@/lib/r2/client'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: 'eBook ID is required.' }, { status: 400 })
    }

    // 1. Verify user is authenticated
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be logged in to access library eBooks.' },
        { status: 401 }
      )
    }

    // 2. Fetch eBook record to get file_key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 })
    }

    const supabaseAdmin = createAdminSupabase(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Check public.ebooks first
    let fileKey: string | null = null
    let title = 'eBook'

    const { data: ebookRow } = await supabaseAdmin
      .from('ebooks')
      .select('title, file_key')
      .eq('id', id)
      .maybeSingle()

    if (ebookRow?.file_key) {
      fileKey = ebookRow.file_key
      title = ebookRow.title
    } else {
      // Check library_books fallback
      const { data: libRow } = await supabaseAdmin
        .from('library_books')
        .select('title, ebook_file_path')
        .eq('id', id)
        .maybeSingle()

      if (libRow?.ebook_file_path) {
        fileKey = libRow.ebook_file_path
        title = libRow.title
      }
    }

    if (!fileKey) {
      return NextResponse.json({ error: 'eBook record or file not found.' }, { status: 404 })
    }

    // 3. Generate short-lived presigned GET URL (1 hour, inline viewing)
    const { bucketName } = getR2Config()
    const r2Client = getR2Client()

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      ResponseContentDisposition: 'inline',
      ResponseContentType: 'application/pdf',
    })

    const presignedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600, // 1 hour
    })

    const streamUrl = `/api/storage/stream?bucket=ebooks&path=${encodeURIComponent(fileKey)}`

    return NextResponse.json({
      success: true,
      url: streamUrl,
      streamUrl,
      directUrl: presignedUrl,
      title,
      fileKey,
      expiresIn: 3600,
    })
  } catch (err: unknown) {
    console.error('eBook access error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to generate eBook access URL'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
