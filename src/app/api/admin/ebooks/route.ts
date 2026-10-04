import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/auth/admin'
import { getR2Client, getR2Config } from '@/lib/r2/client'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'

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

    // 1. Fetch books
    const { data: books, error: bookErr } = await supabaseAdmin
      .from('library_books')
      .select(`
        id, title, subtitle, author, isbn, edition, publisher,
        publication_year, language, description, cover_image_url,
        book_type, ebook_status, ebook_file_path, total_pages, created_at,
        subjects (id, subject_code, subject_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (bookErr) {
      return NextResponse.json({ error: bookErr.message }, { status: 400 })
    }

    const bookList = books || []
    const bookIds = bookList.map((b) => b.id)

    // 2. Fetch academic mappings if table exists
    let mappingsMap: Record<string, any[]> = {}
    if (bookIds.length > 0) {
      try {
        const { data: mappings } = await supabaseAdmin
          .from('ebook_academic_mappings')
          .select(`
            id, book_id, program_id, branch_id, year_number, semester_number, subject_id, academic_category,
            branches (id, name, code),
            subjects (id, subject_code, subject_name),
            programs (id, name, short_code)
          `)
          .in('book_id', bookIds)

        if (mappings) {
          mappings.forEach((m) => {
            if (!mappingsMap[m.book_id]) mappingsMap[m.book_id] = []
            mappingsMap[m.book_id].push(m)
          })
        }
      } catch {
        // ebook_academic_mappings table might not exist yet
      }
    }

    const booksWithMappings = bookList.map((b) => ({
      ...b,
      academic_mappings: mappingsMap[b.id] || [],
    }))

    return NextResponse.json({ success: true, books: booksWithMappings })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch library books'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      title,
      subtitle,
      author,
      isbn,
      edition,
      publisher,
      publicationYear,
      language,
      description,
      coverImageUrl,
      bookType,
      ebookFilePath,
      totalPages,
      mappings = [], // Array of AcademicMappingGroup
    } = body

    if (!title || !author) {
      return NextResponse.json(
        { error: 'Book Title and Author are required.' },
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

    // Academic mapping is completely OPTIONAL.
    // Determine subject_id for backward compatibility with library_books if not-null constraint exists
    let chosenSubjectId: string | null = null
    if (mappings.length > 0) {
      for (const m of mappings) {
        if (m.subjectIds && m.subjectIds.length > 0) {
          chosenSubjectId = m.subjectIds[0]
          break
        }
      }
    }

    // Insert Book Record
    let newBook: any = null
    const bookInsertPayload: any = {
      title: title.trim(),
      subtitle: subtitle?.trim() || null,
      author: author.trim(),
      isbn: isbn?.trim() || null,
      edition: edition?.trim() || null,
      publisher: publisher?.trim() || 'Harcoutian Academic Press',
      publication_year: publicationYear ? Number(publicationYear) : new Date().getFullYear(),
      language: language || 'English',
      description: description?.trim() || null,
      cover_image_url: coverImageUrl || null,
      book_type: bookType || 'Textbook',
      subject_id: chosenSubjectId,
      ebook_status: ebookFilePath ? 'available' : 'unavailable',
      ebook_file_path: ebookFilePath || null,
      total_pages: totalPages ? Number(totalPages) : 150,
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('library_books')
      .insert(bookInsertPayload)
      .select()
      .single()

    if (insertErr) {
      // If subject_id violates not-null constraint (e.g. migration not run yet and no subject chosen)
      if (insertErr.message.includes('subject_id') && insertErr.message.includes('not-null')) {
        const { data: fallbackSub } = await supabaseAdmin.from('subjects').select('id').limit(1).single()
        if (fallbackSub) {
          bookInsertPayload.subject_id = fallbackSub.id
          const retryRes = await supabaseAdmin.from('library_books').insert(bookInsertPayload).select().single()
          if (retryRes.error) throw new Error(retryRes.error.message)
          newBook = retryRes.data
        } else {
          throw new Error(insertErr.message)
        }
      } else {
        throw new Error(insertErr.message)
      }
    } else {
      newBook = inserted
    }

    // Insert normalized combination mappings into ebook_academic_mappings
    if (newBook && mappings.length > 0) {
      await saveAcademicMappings(supabaseAdmin, newBook.id, mappings)
    }

    // Log admin audit action
    await supabaseAdmin.from('admin_audit_logs').insert({
      action: `Uploaded eBook to Digital Library: ${title} (${mappings.length} mapping groups)`,
      target_type: 'book',
      target_id: newBook.id,
      details: { cover_image_url: coverImageUrl, ebook_file_path: ebookFilePath, mappings_count: mappings.length },
    }).select().maybeSingle()

    return NextResponse.json({ success: true, book: newBook })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to publish eBook'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const {
      id,
      title,
      subtitle,
      author,
      isbn,
      edition,
      publisher,
      publicationYear,
      language,
      description,
      coverImageUrl,
      bookType,
      totalPages,
      mappings = [],
    } = body

    if (!id || !title || !author) {
      return NextResponse.json({ error: 'Book ID, Title, and Author are required.' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    const supabaseAdmin = createClient(supabaseUrl!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let chosenSubjectId: string | null = null
    if (mappings.length > 0) {
      for (const m of mappings) {
        if (m.subjectIds && m.subjectIds.length > 0) {
          chosenSubjectId = m.subjectIds[0]
          break
        }
      }
    }

    // Update book details
    const updatePayload: any = {
      title: title.trim(),
      subtitle: subtitle?.trim() || null,
      author: author.trim(),
      isbn: isbn?.trim() || null,
      edition: edition?.trim() || null,
      publisher: publisher?.trim() || 'Harcoutian Academic Press',
      publication_year: publicationYear ? Number(publicationYear) : undefined,
      language: language || 'English',
      description: description?.trim() || null,
      book_type: bookType || 'Textbook',
      total_pages: totalPages ? Number(totalPages) : undefined,
    }
    if (coverImageUrl !== undefined) updatePayload.cover_image_url = coverImageUrl
    if (chosenSubjectId) updatePayload.subject_id = chosenSubjectId

    const { error: updateErr } = await supabaseAdmin
      .from('library_books')
      .update(updatePayload)
      .eq('id', id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 })
    }

    // Replace academic mappings
    await saveAcademicMappings(supabaseAdmin, id, mappings)

    // Log admin audit action
    await supabaseAdmin.from('admin_audit_logs').insert({
      action: `Updated eBook Academic Mappings: ${title} (${mappings.length} mappings)`,
      target_type: 'book',
      target_id: id,
      details: { mappings_count: mappings.length },
    }).select().maybeSingle()

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update eBook'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const authCheck = await verifyAdmin(request)
    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Book ID is required.' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    const supabaseAdmin = createClient(supabaseUrl!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: book } = await supabaseAdmin
      .from('library_books')
      .select('cover_image_url, ebook_file_path')
      .eq('id', id)
      .maybeSingle()

    // 1. Delete PDF from storage (R2 or Supabase)
    if (book?.ebook_file_path) {
      const { isConfigured, bucketName } = getR2Config()
      if (isConfigured && book.ebook_file_path.startsWith('ebooks/')) {
        try {
          const r2Client = getR2Client()
          await r2Client.send(
            new DeleteObjectCommand({
              Bucket: bucketName,
              Key: book.ebook_file_path,
            })
          )
        } catch (r2Err) {
          console.warn('R2 delete warning:', r2Err)
        }
      }
      // Also attempt Supabase Storage cleanup if stored there
      await supabaseAdmin.storage.from('ebooks').remove([book.ebook_file_path]).catch(() => {})
    }

    // 2. Delete cover thumbnail if applicable
    if (book?.cover_image_url && book.cover_image_url.includes('/covers/')) {
      const coverPath = book.cover_image_url.split('/covers/').pop()
      if (coverPath) {
        await supabaseAdmin.storage.from('covers').remove([coverPath]).catch(() => {})
      }
    }

    // 3. Delete from library_books and public.ebooks
    await supabaseAdmin.from('library_books').delete().eq('id', id)
    try {
      await supabaseAdmin.from('ebooks').delete().eq('id', id)
    } catch {
      // public.ebooks optional cleanup
    }

    return NextResponse.json({ success: true, message: 'eBook deleted successfully.' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete book'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * Saves normalized combination mappings for a book into ebook_academic_mappings
 */
async function saveAcademicMappings(supabaseAdmin: any, bookId: string, mappings: any[]) {
  try {
    // 1. Delete existing mappings for this book
    await supabaseAdmin.from('ebook_academic_mappings').delete().eq('book_id', bookId)

    if (!mappings || mappings.length === 0) return

    // 2. Generate combination rows
    const rowsToInsert: any[] = []

    for (const group of mappings) {
      const programId = group.programId || null
      const branches = group.branchIds && group.branchIds.length > 0 ? group.branchIds : [null]
      const year = group.year ? Number(group.year) : null
      const semesters = group.semesters && group.semesters.length > 0 ? group.semesters : [null]
      const subjects = group.subjectIds && group.subjectIds.length > 0 ? group.subjectIds : [null]
      const category = group.category || 'Textbook'

      for (const branchId of branches) {
        for (const sem of semesters) {
          for (const subId of subjects) {
            rowsToInsert.push({
              book_id: bookId,
              program_id: programId,
              branch_id: branchId,
              year_number: year,
              semester_number: sem,
              subject_id: subId,
              academic_category: category,
            })
          }
        }
      }
    }

    if (rowsToInsert.length > 0) {
      // Chunk inserts in batches of 100
      for (let i = 0; i < rowsToInsert.length; i += 100) {
        const chunk = rowsToInsert.slice(i, i + 100)
        await supabaseAdmin.from('ebook_academic_mappings').insert(chunk)
      }
    }
  } catch (e) {
    console.warn('Could not save to ebook_academic_mappings (table might not exist yet):', e)
  }
}
