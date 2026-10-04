import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: notes, error } = await supabaseAdmin
      .from('notes')
      .select(`
        id, title, description, file_path, file_type, file_size, status, view_count, created_at, uploader_id,
        subjects (id, subject_code, subject_name, semester_number)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, notes: notes || [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch notes'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description, subjectId, filePath, fileSize, fileType, uploaderId } = body

    if (!title || !subjectId || !filePath) {
      return NextResponse.json(
        { error: 'Title, subjectId, and filePath are required.' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // If uploaderId is not provided, use first admin user or default admin
    let finalUploaderId = uploaderId
    if (!finalUploaderId) {
      const { data: adminProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle()

      finalUploaderId = adminProfile?.id
    }

    if (!finalUploaderId) {
      const { data: anyUser } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .limit(1)
        .single()
      finalUploaderId = anyUser?.id
    }

    const { data: newNote, error } = await supabaseAdmin
      .from('notes')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        subject_id: subjectId,
        uploader_id: finalUploaderId,
        file_path: filePath,
        file_type: fileType || 'application/pdf',
        file_size: fileSize || 0,
        status: 'published', // Admin uploads are auto-published
        view_count: 0,
      })
      .select(`
        id, title, description, file_path, file_type, file_size, status, created_at,
        subjects (id, subject_code, subject_name)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Log admin audit action
    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: finalUploaderId,
      action: `Uploaded verified study notes: ${title}`,
      target_type: 'note',
      target_id: newNote.id,
      details: { file_path: filePath, file_size: fileSize },
    }).select().maybeSingle()

    return NextResponse.json({ success: true, note: newNote })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to publish note'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required.' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    const supabaseAdmin = createClient(supabaseUrl!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Get note to find file path
    const { data: note } = await supabaseAdmin
      .from('notes')
      .select('file_path')
      .eq('id', id)
      .maybeSingle()

    if (note?.file_path) {
      await supabaseAdmin.storage.from('notes').remove([note.file_path])
    }

    const { error } = await supabaseAdmin.from('notes').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete note'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
