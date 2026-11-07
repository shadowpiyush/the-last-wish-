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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 })
    }

    const supabaseAdmin = createAdminSupabase(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 2. Fetch user profile for academic authorization check
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, program_id, branch_id, current_year, current_semester')
      .eq('id', user.id)
      .maybeSingle()

    const isAdmin = user.role === 'admin' || userProfile?.role === 'admin'

    // 3. Fetch eBook record to get file_key and storage provider
    let fileKey: string | null = null
    let title = 'eBook'
    let storageProvider = 'r2'

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
        .select('id, title, ebook_file_path, storage_provider')
        .eq('id', id)
        .maybeSingle()

      if (libRow?.ebook_file_path) {
        fileKey = libRow.ebook_file_path
        title = libRow.title
        storageProvider = libRow.storage_provider || 'supabase'
      }
    }

    if (!fileKey) {
      return NextResponse.json({ error: 'eBook record or file not found.' }, { status: 404 })
    }

    // 4. Academic authorization check (IDOR / BOLA Prevention)
    if (!isAdmin) {
      // Check if this book has specific academic mappings
      const { data: mappings } = await supabaseAdmin
        .from('ebook_academic_mappings')
        .select('id, program_id, branch_id, semester_number')
        .eq('book_id', id)

      // If mapped to specific branches, user must match at least one branch
      if (mappings && mappings.length > 0) {
        const studentBranchId = userProfile?.branch_id
        const isAuthorized = mappings.some(m => !m.branch_id || m.branch_id === studentBranchId)

        if (!isAuthorized) {
          return NextResponse.json(
            {
              error: 'Forbidden: You do not have academic authorization to access this curriculum resource for your branch.',
              code: 'BRANCH_ACCESS_DENIED',
            },
            { status: 403 }
          )
        }
      }
    }

    // 5. Generate secure stream and direct URL
    const isR2Candidate = (storageProvider === 'r2' || fileKey.startsWith('ebooks/')) && !fileKey.startsWith('notes/')
    const { isConfigured, bucketName } = getR2Config()

    let presignedUrl = ''
    const bucket = fileKey.startsWith('notes/') || storageProvider === 'supabase' ? 'notes' : 'ebooks'
    const cleanPath = fileKey.replace(/^(notes|ebooks)\//, '')
    const streamUrl = `/api/storage/stream?bucket=${bucket}&path=${encodeURIComponent(cleanPath)}`

    if (isR2Candidate && isConfigured) {
      try {
        const r2Client = getR2Client()
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: fileKey,
          ResponseContentDisposition: 'inline',
          ResponseContentType: 'application/pdf',
        })
        presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 })
      } catch (r2Err) {
        console.warn('R2 presign error, falling back to streamUrl:', r2Err)
      }
    }

    if (!presignedUrl) {
      const { data: signedData } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(cleanPath, 3600, { download: false })
      presignedUrl = signedData?.signedUrl || streamUrl
    }

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
