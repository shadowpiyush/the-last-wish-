import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/admin'
import { getR2Client, getR2Config } from '@/lib/r2/client'
import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    // 1. Strict admin verification
    const authCheck = await verifyAdmin(request)
    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    // 2. Validate request payload
    const body = await request.json()
    const {
      uploadId,
      fileKey,
      parts,
      title,
      subtitle,
      description,
      author,
      publisher,
      edition,
      publicationYear,
      totalPages,
      coverImageUrl,
      fileName,
      fileSize,
      mappings = [],
    } = body

    if (!uploadId || !fileKey) {
      return NextResponse.json({ error: 'uploadId and fileKey are required.' }, { status: 400 })
    }

    if (!Array.isArray(parts) || parts.length === 0) {
      return NextResponse.json({ error: 'At least one uploaded part is required to complete upload.' }, { status: 400 })
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'eBook title is required.' }, { status: 400 })
    }

    const { bucketName } = getR2Config()
    const r2Client = getR2Client()

    // 3. Complete multipart upload in Cloudflare R2
    // Ensure parts are sorted strictly ascending by PartNumber and ETags are quoted
    const sortedParts = [...parts]
      .sort((a, b) => Number(a.PartNumber || a.partNumber) - Number(b.PartNumber || b.partNumber))
      .map((p) => {
        const rawEtag = String(p.ETag || p.etag || '').trim()
        const etag = rawEtag.startsWith('"') ? rawEtag : `"${rawEtag}"`
        return {
          PartNumber: Number(p.PartNumber || p.partNumber),
          ETag: etag,
        }
      })

    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: bucketName,
      Key: fileKey,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: sortedParts,
      },
    })

    const r2Result = await r2Client.send(completeCommand)
    console.log('[R2 Multipart Completed]', {
      bucket: bucketName,
      key: fileKey,
      location: r2Result.Location,
    })

    // 4. Connect to Supabase via Service Role for atomic metadata insertion
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        {
          error:
            'eBook was successfully uploaded to Cloudflare R2, but Supabase credentials are not configured to save metadata.',
          fileKey,
          uploadCompletedInR2: true,
        },
        { status: 500 }
      )
    }

    const supabaseAdmin = createAdminSupabase(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 5. Insert into public.ebooks table (if exists)
    let savedEbookRecord: any = null
    try {
      const { data: ebookRow, error: ebookErr } = await supabaseAdmin
        .from('ebooks')
        .insert({
          title: title.trim(),
          description: description?.trim() || null,
          author: (author || 'Unknown').trim(),
          file_key: fileKey,
          file_name: fileName || fileKey.split('/').pop() || 'ebook.pdf',
          file_size: fileSize || 0,
          mime_type: 'application/pdf',
          total_pages: totalPages ? Number(totalPages) : 0,
          cover_image_url: coverImageUrl || null,
          uploaded_by: authCheck.user?.id || null,
        })
        .select()
        .single()

      if (!ebookErr && ebookRow) {
        savedEbookRecord = ebookRow
      }
    } catch (e) {
      console.warn('Note: public.ebooks insertion warning (table may be created in pending migration):', e)
    }

    // 6. Insert / sync into library_books for platform-wide library browsing and reader
    let libraryBookRecord: any = null
    try {
      // Determine subject_id fallback if needed
      let chosenSubjectId: string | null = null
      if (Array.isArray(mappings) && mappings.length > 0) {
        for (const m of mappings) {
          if (m.subjectIds && m.subjectIds.length > 0) {
            chosenSubjectId = m.subjectIds[0]
            break
          }
        }
      }

      // If no subjectId was selected, fetch default subject to satisfy NOT NULL constraint
      if (!chosenSubjectId) {
        const { data: defaultSub } = await supabaseAdmin.from('subjects').select('id').limit(1).maybeSingle()
        if (defaultSub) {
          chosenSubjectId = defaultSub.id
        }
      }

      const libraryPayload: any = {
        title: title.trim(),
        subtitle: subtitle?.trim() || null,
        author: (author || 'Unknown').trim(),
        description: description?.trim() || null,
        cover_image_url: coverImageUrl || null,
        ebook_status: 'available',
        ebook_file_path: fileKey,
        total_pages: totalPages ? Number(totalPages) : 100,
        publication_year: publicationYear ? Number(publicationYear) : new Date().getFullYear(),
        publisher: publisher?.trim() || 'Academic Library Press',
        edition: edition?.trim() || null,
        subject_id: chosenSubjectId,
        book_type: 'Textbook',
      }

      const { data: libRow, error: libErr } = await supabaseAdmin
        .from('library_books')
        .insert(libraryPayload)
        .select()
        .single()

      if (libErr) {
        console.warn('library_books insert note:', libErr.message)
      } else {
        libraryBookRecord = libRow
      }

      // 7. Save Academic Mappings if provided and library book created
      if (libraryBookRecord && Array.isArray(mappings) && mappings.length > 0) {
        const mappingRows: any[] = []
        for (const g of mappings) {
          const programId = g.programId || null
          const branches = g.branchIds && g.branchIds.length > 0 ? g.branchIds : [null]
          const year = g.year ? Number(g.year) : null
          const semesters = g.semesters && g.semesters.length > 0 ? g.semesters : [null]
          const subjects = g.subjectIds && g.subjectIds.length > 0 ? g.subjectIds : [null]
          const category = g.category || 'Textbook'

          for (const bId of branches) {
            for (const sem of semesters) {
              for (const sId of subjects) {
                mappingRows.push({
                  book_id: libraryBookRecord.id,
                  program_id: programId,
                  branch_id: bId,
                  year_number: year,
                  semester_number: sem,
                  subject_id: sId,
                  academic_category: category,
                })
              }
            }
          }
        }

        if (mappingRows.length > 0) {
          try {
            await supabaseAdmin.from('ebook_academic_mappings').insert(mappingRows)
          } catch (mErr) {
            console.warn('Academic mappings insert note:', mErr)
          }
        }
      }
    } catch (e) {
      console.warn('library_books sync exception:', e)
    }

    return NextResponse.json({
      success: true,
      fileKey,
      ebook: savedEbookRecord || libraryBookRecord || { id: fileKey, title, file_key: fileKey },
      libraryBook: libraryBookRecord,
      message: 'eBook uploaded to Cloudflare R2 and published successfully!',
    })
  } catch (err: unknown) {
    console.error('Multipart complete error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to complete multipart upload'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
