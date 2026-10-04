import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/admin'
import { getR2Client, getR2Config } from '@/lib/r2/client'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    // 1. Strict admin verification
    const authCheck = await verifyAdmin(request)
    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'eBook ID is required for deletion.' }, { status: 400 })
    }

    // 2. Lookup file_key from Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 })
    }

    const supabaseAdmin = createAdminSupabase(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let fileKey: string | null = null
    let coverUrl: string | null = null

    // Check public.ebooks
    const { data: ebookRow } = await supabaseAdmin
      .from('ebooks')
      .select('file_key, cover_image_url')
      .eq('id', id)
      .maybeSingle()

    if (ebookRow) {
      fileKey = ebookRow.file_key
      coverUrl = ebookRow.cover_image_url
    }

    // Also check library_books
    const { data: libRow } = await supabaseAdmin
      .from('library_books')
      .select('ebook_file_path, cover_image_url')
      .eq('id', id)
      .maybeSingle()

    if (libRow) {
      fileKey = fileKey || libRow.ebook_file_path
      coverUrl = coverUrl || libRow.cover_image_url
    }

    // 3. Delete object from Cloudflare R2 first
    if (fileKey && fileKey.startsWith('ebooks/')) {
      try {
        const { bucketName } = getR2Config()
        const r2Client = getR2Client()

        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
          })
        )
        console.log(`[R2 Deleted] Key: ${fileKey}`)
      } catch (r2Err) {
        console.warn('R2 deletion warning (file may already be removed):', r2Err)
      }
    }

    // 4. Delete cover image from Supabase storage if applicable
    if (coverUrl && coverUrl.includes('/covers/')) {
      const coverPath = coverUrl.split('/covers/').pop()
      if (coverPath) {
        await supabaseAdmin.storage.from('covers').remove([coverPath]).catch(() => {})
      }
    }

    // 5. Delete metadata row from Supabase
    await Promise.all([
      supabaseAdmin.from('ebooks').delete().eq('id', id),
      supabaseAdmin.from('library_books').delete().eq('id', id),
    ])

    return NextResponse.json({
      success: true,
      message: 'eBook and its storage file were permanently deleted.',
    })
  } catch (err: unknown) {
    console.error('eBook delete error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to delete eBook'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
