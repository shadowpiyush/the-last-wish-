import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/auth/admin'
import { getR2Client, getR2Config } from '@/lib/r2/client'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import {
  validateEbookMetadata,
  validateAcademicMappings,
  cleanUuidOrNull,
  type ValidatedMappingGroup,
} from '@/lib/validation/ebook'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminSupabaseClient = ReturnType<typeof createClient<any>>

interface MappingRow {
  book_id: string
  program_id: string | null
  branch_id: string | null
  year_number: number | null
  semester_number: number | null
  subject_id: string | null
  academic_category: string
}

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
    const mappingsMap: Record<string, unknown[]> = {}
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
    const authCheck = await verifyAdmin(request)
    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: authCheck.error, code: 'UNAUTHORIZED' }, { status: authCheck.status })
    }

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
      mappings = [],
    } = body

    const metaValidation = validateEbookMetadata({
      title,
      subtitle,
      author,
      publisher,
      edition,
      publicationYear,
      totalPages,
      description,
      coverImageUrl,
    })

    if (!metaValidation.success || !metaValidation.data) {
      return NextResponse.json(
        { error: metaValidation.error, code: metaValidation.code, field: metaValidation.field },
        { status: 400 }
      )
    }

    const validMeta = metaValidation.data

    const mappingValidation = validateAcademicMappings(mappings)
    if (!mappingValidation.success || !mappingValidation.data) {
      return NextResponse.json(
        { error: mappingValidation.error, code: mappingValidation.code, field: mappingValidation.field },
        { status: 400 }
      )
    }

    const validatedMappings = mappingValidation.data

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Academic mapping is completely OPTIONAL.
    let chosenSubjectId: string | null = null
    if (validatedMappings.length > 0) {
      for (const m of validatedMappings) {
        if (m.subjectIds && m.subjectIds.length > 0) {
          chosenSubjectId = m.subjectIds[0]
          break
        }
      }
    }

    // Insert Book Record
    const bookInsertPayload: Record<string, unknown> = {
      title: validMeta.title,
      subtitle: validMeta.subtitle,
      author: validMeta.author,
      isbn: typeof isbn === 'string' && isbn.trim() ? isbn.trim() : null,
      edition: validMeta.edition,
      publisher: validMeta.publisher || 'Harcoutian Academic Press',
      publication_year: validMeta.publicationYear,
      language: language || 'English',
      description: validMeta.description,
      cover_image_url: validMeta.coverImageUrl,
      book_type: bookType || 'Textbook',
      subject_id: chosenSubjectId,
      ebook_status: ebookFilePath ? 'available' : 'unavailable',
      ebook_file_path: ebookFilePath || null,
      total_pages: validMeta.totalPages,
    }

    const { data: newBook, error: insertErr } = await supabaseAdmin
      .from('library_books')
      .insert(bookInsertPayload)
      .select()
      .single()

    if (insertErr || !newBook) {
      return NextResponse.json(
        { error: insertErr?.message || 'Failed to create library book record.', code: 'DATABASE_SAVE_FAILED' },
        { status: 500 }
      )
    }

    // Insert normalized combination mappings into ebook_academic_mappings
    if (newBook && validatedMappings.length > 0) {
      await saveAcademicMappings(supabaseAdmin, newBook.id, validatedMappings)
    }

    // Log admin audit action
    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        action: `Uploaded eBook to Digital Library: ${validMeta.title} (${validatedMappings.length} mapping groups)`,
        target_type: 'book',
        target_id: newBook.id,
        details: { cover_image_url: validMeta.coverImageUrl, ebook_file_path: ebookFilePath, mappings_count: validatedMappings.length },
      }).select().maybeSingle()
    } catch {}

    return NextResponse.json({ success: true, book: newBook })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to publish eBook'
    return NextResponse.json({ error: msg, code: 'DATABASE_SAVE_FAILED' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const authCheck = await verifyAdmin(request)
    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: authCheck.error, code: 'UNAUTHORIZED' }, { status: authCheck.status })
    }

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

    if (!id || !cleanUuidOrNull(id)) {
      return NextResponse.json({ error: 'A valid Book UUID is required.', code: 'INVALID_METADATA' }, { status: 400 })
    }

    const metaValidation = validateEbookMetadata({
      title,
      subtitle,
      author,
      publisher,
      edition,
      publicationYear,
      totalPages,
      description,
      coverImageUrl,
    })

    if (!metaValidation.success || !metaValidation.data) {
      return NextResponse.json(
        { error: metaValidation.error, code: metaValidation.code, field: metaValidation.field },
        { status: 400 }
      )
    }

    const validMeta = metaValidation.data

    const mappingValidation = validateAcademicMappings(mappings)
    if (!mappingValidation.success || !mappingValidation.data) {
      return NextResponse.json(
        { error: mappingValidation.error, code: mappingValidation.code, field: mappingValidation.field },
        { status: 400 }
      )
    }

    const validatedMappings = mappingValidation.data

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    const supabaseAdmin = createClient(supabaseUrl!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let chosenSubjectId: string | null = null
    if (validatedMappings.length > 0) {
      for (const m of validatedMappings) {
        if (m.subjectIds && m.subjectIds.length > 0) {
          chosenSubjectId = m.subjectIds[0]
          break
        }
      }
    }

    // Update book details
    const updatePayload: Record<string, unknown> = {
      title: validMeta.title,
      subtitle: validMeta.subtitle,
      author: validMeta.author,
      isbn: typeof isbn === 'string' && isbn.trim() ? isbn.trim() : null,
      edition: validMeta.edition,
      publisher: validMeta.publisher || 'Harcoutian Academic Press',
      publication_year: validMeta.publicationYear,
      language: language || 'English',
      description: validMeta.description,
      book_type: bookType || 'Textbook',
      total_pages: validMeta.totalPages,
      subject_id: chosenSubjectId,
    }
    if (validMeta.coverImageUrl !== undefined) {
      updatePayload.cover_image_url = validMeta.coverImageUrl
    }

    const { error: updateErr } = await supabaseAdmin
      .from('library_books')
      .update(updatePayload)
      .eq('id', id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message, code: 'DATABASE_SAVE_FAILED' }, { status: 400 })
    }

    // Replace academic mappings
    await saveAcademicMappings(supabaseAdmin, id, validatedMappings)

    // Log admin audit action
    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        action: `Updated eBook Academic Mappings: ${validMeta.title} (${validatedMappings.length} mappings)`,
        target_type: 'book',
        target_id: id,
        details: { mappings_count: validatedMappings.length },
      }).select().maybeSingle()
    } catch {}

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update eBook'
    return NextResponse.json({ error: msg, code: 'DATABASE_SAVE_FAILED' }, { status: 500 })
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

    if (!id || !cleanUuidOrNull(id)) {
      return NextResponse.json({ error: 'A valid Book UUID is required.', code: 'INVALID_METADATA' }, { status: 400 })
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
    return NextResponse.json({ error: msg, code: 'DATABASE_SAVE_FAILED' }, { status: 500 })
  }
}

/**
 * Saves normalized combination mappings for a book into ebook_academic_mappings
 */
async function saveAcademicMappings(
  supabaseAdmin: AdminSupabaseClient,
  bookId: string,
  mappings: ValidatedMappingGroup[],
) {
  try {
    // 1. Delete existing mappings for this book
    await supabaseAdmin.from('ebook_academic_mappings').delete().eq('book_id', bookId)

    if (!mappings || mappings.length === 0) return

    // 2. Generate combination rows
    const rowsToInsert: MappingRow[] = []

    for (const group of mappings) {
      const progId = cleanUuidOrNull(group.programId)
      const branches = group.branchIds.length > 0 ? group.branchIds : [null]
      const year = group.year
      const semesters = group.semesters.length > 0 ? group.semesters : [null]
      const subjects = group.subjectIds.length > 0 ? group.subjectIds : [null]
      const category = group.category || 'Textbook'

      for (const branchId of branches) {
        for (const sem of semesters) {
          for (const subId of subjects) {
            rowsToInsert.push({
              book_id: bookId,
              program_id: progId,
              branch_id: cleanUuidOrNull(branchId),
              year_number: year,
              semester_number: sem,
              subject_id: cleanUuidOrNull(subId),
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
    console.warn('Could not save to ebook_academic_mappings:', e)
  }
}
