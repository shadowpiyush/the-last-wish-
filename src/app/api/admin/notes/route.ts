import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/auth/admin'

function getFirst<T>(item: T | T[] | null | undefined): T | null {
  if (!item) return null
  return Array.isArray(item) ? item[0] ?? null : item
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase credentials not configured')
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(request: Request) {
  try {
    const authCheck = await verifyAdmin(request)
    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: authCheck.error, code: 'UNAUTHORIZED' }, { status: authCheck.status })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: notes, error } = await supabaseAdmin
      .from('notes')
      .select(`
        id, title, description, file_path, file_type, file_size, status, view_count, created_at, uploader_id,
        subjects (
          id, subject_code, subject_name, semester_number, year_number,
          branches (id, name, code),
          programs (id, name, short_code)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const noteList = notes || []

    // Group notes by file_path to present centralized multi-branch academic resources
    const resourceMap: Record<string, {
      filePath: string
      title: string
      description: string | null
      fileSize: number
      fileType: string
      status: string
      createdAt: string
      subjectCode: string
      subjectName: string
      assignedBranches: Array<{
        noteId: string
        subjectId: string
        branchCode: string
        branchName: string
        programCode: string
        year: number
        semester: number
      }>
      noteIds: string[]
    }> = {}

    for (const n of noteList) {
      const path = n.file_path
      const sub = getFirst(n.subjects)
      const branchObj = getFirst(sub?.branches)
      const progObj = getFirst(sub?.programs)
      const branchCode = branchObj?.code || 'GEN'
      const branchName = branchObj?.name || 'General'
      const progCode = progObj?.short_code || ''

      if (!resourceMap[path]) {
        resourceMap[path] = {
          filePath: path,
          title: n.title.replace(/\s*\[[A-Z0-9,\s-]+\]$/, ''),
          description: n.description,
          fileSize: n.file_size,
          fileType: n.file_type,
          status: n.status,
          createdAt: n.created_at,
          subjectCode: sub?.subject_code || 'N/A',
          subjectName: sub?.subject_name || 'N/A',
          assignedBranches: [],
          noteIds: [],
        }
      }

      resourceMap[path].noteIds.push(n.id)
      if (sub) {
        resourceMap[path].assignedBranches.push({
          noteId: n.id,
          subjectId: sub.id,
          branchCode,
          branchName,
          programCode: progCode,
          year: sub.year_number,
          semester: sub.semester_number,
        })
      }
    }

    return NextResponse.json({
      success: true,
      notes: noteList,
      centralizedResources: Object.values(resourceMap),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch notes'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authCheck = await verifyAdmin(request)
    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: authCheck.error, code: 'UNAUTHORIZED' }, { status: authCheck.status })
    }

    const body = await request.json()
    const {
      title,
      description,
      subjectId,
      subjectIds,
      filePath,
      fileSize,
      fileType,
      uploaderId,
    } = body

    if (!title || (!subjectId && (!subjectIds || subjectIds.length === 0)) || !filePath) {
      return NextResponse.json(
        { error: 'Title, subjectId (or subjectIds array), and filePath are required.' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Determine final uploader ID
    let finalUploaderId = uploaderId || authCheck.user?.id
    if (!finalUploaderId) {
      const { data: adminProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle()
      finalUploaderId = adminProfile?.id
    }

    const targets: string[] = subjectIds && Array.isArray(subjectIds) && subjectIds.length > 0
      ? subjectIds
      : [subjectId]

    const insertedNotes = []
    for (const sid of targets) {
      const { data: sub } = await supabaseAdmin
        .from('subjects')
        .select('id, subject_code, subject_name, branches(code)')
        .eq('id', sid)
        .maybeSingle()

      const branchObj = getFirst(sub?.branches)
      const branchSuffix = branchObj?.code ? ` [${branchObj.code}]` : ''
      const noteTitle = targets.length > 1 ? `${title.trim()}${branchSuffix}` : title.trim()

      const { data: newNote, error: noteErr } = await supabaseAdmin
        .from('notes')
        .insert({
          title: noteTitle,
          description: description?.trim() || null,
          subject_id: sid,
          uploader_id: finalUploaderId,
          file_path: filePath,
          file_type: fileType || 'application/pdf',
          file_size: fileSize || 0,
          status: 'published',
          view_count: 0,
        })
        .select(`
          id, title, description, file_path, file_type, file_size, status, created_at,
          subjects (id, subject_code, subject_name, branches(code))
        `)
        .single()

      if (!noteErr && newNote) {
        insertedNotes.push(newNote)
      }
    }

    // Log admin audit action
    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: finalUploaderId,
        action: `Uploaded verified study notes: ${title} (${insertedNotes.length} branch assignments)`,
        target_type: 'note',
        target_id: insertedNotes[0]?.id || 'multi',
        details: {
          file_path: filePath,
          file_size: fileSize,
          assignments_count: insertedNotes.length,
          subject_ids: targets,
        },
      }).select().maybeSingle()
    } catch {}

    return NextResponse.json({ success: true, notes: insertedNotes, count: insertedNotes.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to publish note'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const authCheck = await verifyAdmin(request)
    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: authCheck.error, code: 'UNAUTHORIZED' }, { status: authCheck.status })
    }

    const body = await request.json()
    const { action, id, filePath, status, newFilePath, newFileSize, subjectId, title, description } = body
    const supabaseAdmin = getSupabaseAdmin()

    // 1. Toggle publication status
    if (action === 'toggle_status') {
      const nextStatus = status === 'published' ? 'unpublished' : 'published'
      if (filePath) {
        await supabaseAdmin.from('notes').update({ status: nextStatus }).eq('file_path', filePath)
      } else if (id) {
        await supabaseAdmin.from('notes').update({ status: nextStatus }).eq('id', id)
      } else {
        return NextResponse.json({ error: 'id or filePath required for toggle_status' }, { status: 400 })
      }

      try {
        await supabaseAdmin.from('admin_audit_logs').insert({
          admin_id: authCheck.user?.id,
          action: `Changed note publication status to ${nextStatus}`,
          target_type: 'note',
          target_id: id || filePath,
          details: { nextStatus, filePath },
        })
      } catch {}

      return NextResponse.json({ success: true, status: nextStatus })
    }

    // 2. Replace PDF for resource
    if (action === 'replace_pdf') {
      if (!filePath || !newFilePath) {
        return NextResponse.json({ error: 'filePath and newFilePath required for replace_pdf' }, { status: 400 })
      }

      const updateData: Record<string, unknown> = { file_path: newFilePath }
      if (newFileSize) updateData.file_size = newFileSize

      const { error: repErr } = await supabaseAdmin
        .from('notes')
        .update(updateData)
        .eq('file_path', filePath)

      if (repErr) {
        return NextResponse.json({ error: repErr.message }, { status: 400 })
      }

      // Also clean up old storage file if different
      if (filePath !== newFilePath) {
        await supabaseAdmin.storage.from('notes').remove([filePath]).catch(() => {})
      }

      try {
        await supabaseAdmin.from('admin_audit_logs').insert({
          admin_id: authCheck.user?.id,
          action: `Replaced study note PDF: ${filePath} -> ${newFilePath}`,
          target_type: 'note',
          target_id: newFilePath,
          details: { oldPath: filePath, newPath: newFilePath, newFileSize },
        })
      } catch {}

      return NextResponse.json({ success: true, filePath: newFilePath })
    }

    // 3. Add branch mapping
    if (action === 'add_mapping') {
      if (!filePath || !subjectId) {
        return NextResponse.json({ error: 'filePath and subjectId required for add_mapping' }, { status: 400 })
      }

      // Get sample note from same filePath for metadata
      const { data: sampleNote } = await supabaseAdmin
        .from('notes')
        .select('*')
        .eq('file_path', filePath)
        .limit(1)
        .maybeSingle()

      const { data: sub } = await supabaseAdmin
        .from('subjects')
        .select('id, subject_code, subject_name, branches(code)')
        .eq('id', subjectId)
        .maybeSingle()

      const baseTitle = (sampleNote?.title || title || 'Study Notes').replace(/\s*\[[A-Z0-9,\s-]+\]$/, '')
      const branchObj = getFirst(sub?.branches)
      const branchCode = branchObj?.code ? ` [${branchObj.code}]` : ''

      const { data: newMappingNote, error: mapErr } = await supabaseAdmin
        .from('notes')
        .insert({
          title: `${baseTitle}${branchCode}`,
          description: sampleNote?.description || description || null,
          subject_id: subjectId,
          uploader_id: authCheck.user?.id || sampleNote?.uploader_id,
          file_path: filePath,
          file_type: sampleNote?.file_type || 'application/pdf',
          file_size: sampleNote?.file_size || 0,
          status: sampleNote?.status || 'published',
          view_count: 0,
        })
        .select()
        .single()

      if (mapErr) {
        return NextResponse.json({ error: mapErr.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, note: newMappingNote })
    }

    // 4. Update title or description
    if (action === 'update_meta') {
      if (!id && !filePath) {
        return NextResponse.json({ error: 'id or filePath required' }, { status: 400 })
      }
      const updateData: Record<string, unknown> = {}
      if (title) updateData.title = title
      if (description !== undefined) updateData.description = description

      const query = supabaseAdmin.from('notes').update(updateData)
      if (filePath) query.eq('file_path', filePath)
      else query.eq('id', id)

      const { error: metaErr } = await query
      if (metaErr) return NextResponse.json({ error: metaErr.message }, { status: 400 })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update note'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const authCheck = await verifyAdmin(request)
    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: authCheck.error, code: 'UNAUTHORIZED' }, { status: authCheck.status })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const filePath = searchParams.get('filePath')
    const deleteEntireResource = searchParams.get('deleteEntireResource') === 'true'

    const supabaseAdmin = getSupabaseAdmin()

    // Scenario A: Delete entire centralized resource across all branch mappings
    if (deleteEntireResource && filePath) {
      await supabaseAdmin.from('notes').delete().eq('file_path', filePath)
      await supabaseAdmin.storage.from('notes').remove([filePath]).catch(() => {})

      try {
        await supabaseAdmin.from('admin_audit_logs').insert({
          admin_id: authCheck.user?.id,
          action: `Deleted entire study resource and all branch mappings: ${filePath}`,
          target_type: 'note_resource',
          target_id: filePath,
        })
      } catch {}

      return NextResponse.json({ success: true, message: 'Resource and all branch mappings deleted.' })
    }

    // Scenario B: Delete single assignment
    if (!id) {
      return NextResponse.json({ error: 'Note ID is required.' }, { status: 400 })
    }

    // Check if other notes share this file_path
    const { data: note } = await supabaseAdmin
      .from('notes')
      .select('id, file_path, title')
      .eq('id', id)
      .maybeSingle()

    if (!note) {
      return NextResponse.json({ error: 'Note not found.' }, { status: 404 })
    }

    const { count } = await supabaseAdmin
      .from('notes')
      .select('id', { count: 'exact', head: true })
      .eq('file_path', note.file_path)

    // Delete ONLY this specific assignment
    const { error } = await supabaseAdmin.from('notes').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Only delete physical file from storage if NO other branch mappings exist for this file
    if ((count || 1) <= 1 && note.file_path) {
      await supabaseAdmin.storage.from('notes').remove([note.file_path]).catch(() => {})
    }

    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: authCheck.user?.id,
        action: `Removed branch mapping for note: ${note.title} (remaining mappings preserved)`,
        target_type: 'note',
        target_id: id,
        details: { file_path: note.file_path, remainingCount: (count || 1) - 1 },
      })
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Branch assignment removed successfully. Other branch assignments preserved.',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete note'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
