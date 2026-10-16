import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/admin'
import { getR2Client, getR2Config } from '@/lib/r2/client'
import { CompleteMultipartUploadCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { validateEbookMetadata, validateAcademicMappings, isValidUuid } from '@/lib/validation/ebook'

interface MappingRow {
  book_id: string
  program_id: string | null
  branch_id: string | null
  year_number: number | null
  semester_number: number | null
  subject_id: string | null
  academic_category: string
}

export async function POST(request: Request) {
  let fileKeyToDeleteOnFailure: string | null = null

  try {
    // 1. Strict admin verification
    const authCheck = await verifyAdmin(request)
    if (!authCheck.isAdmin) {
      return NextResponse.json(
        { error: authCheck.error, code: 'UNAUTHORIZED' },
        { status: authCheck.status }
      )
    }

    // 2. Parse and validate request payload
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body.', code: 'INVALID_REQUEST' },
        { status: 400 }
      )
    }

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

    if (!uploadId || typeof uploadId !== 'string' || !uploadId.trim()) {
      return NextResponse.json(
        { error: 'uploadId is required.', code: 'INVALID_METADATA', field: 'uploadId' },
        { status: 400 }
      )
    }

    if (!fileKey || typeof fileKey !== 'string' || !fileKey.trim() || !fileKey.startsWith('ebooks/')) {
      return NextResponse.json(
        { error: 'A valid fileKey starting with ebooks/ is required.', code: 'INVALID_METADATA', field: 'fileKey' },
        { status: 400 }
      )
    }

    if (!Array.isArray(parts) || parts.length === 0) {
      return NextResponse.json(
        { error: 'At least one uploaded part is required to complete upload.', code: 'INVALID_CHUNK_PARAMETERS' },
        { status: 400 }
      )
    }

    // Validate metadata using shared schema
    const metaValidation = validateEbookMetadata({
      title: title as string,
      subtitle: subtitle as string,
      author: author as string,
      publisher: publisher as string,
      edition: edition as string,
      publicationYear: publicationYear as number,
      totalPages: totalPages as number,
      description: description as string,
      coverImageUrl: coverImageUrl as string,
    })

    if (!metaValidation.success || !metaValidation.data) {
      return NextResponse.json(
        { error: metaValidation.error, code: metaValidation.code, field: metaValidation.field },
        { status: 400 }
      )
    }

    const validMeta = metaValidation.data

    // Validate optional academic mappings using shared schema
    const mappingValidation = validateAcademicMappings(mappings)
    if (!mappingValidation.success || !mappingValidation.data) {
      return NextResponse.json(
        { error: mappingValidation.error, code: mappingValidation.code, field: mappingValidation.field },
        { status: 400 }
      )
    }

    const validatedMappings = mappingValidation.data

    const { bucketName, isConfigured } = getR2Config()
    if (!isConfigured) {
      return NextResponse.json(
        { error: 'Cloudflare R2 is not configured.', code: 'STORAGE_CONFIGURATION_ERROR' },
        { status: 503 }
      )
    }

    const r2Client = getR2Client()

    // 3. Complete multipart upload in Cloudflare R2
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

    try {
      await r2Client.send(completeCommand)
      fileKeyToDeleteOnFailure = fileKey // Track for cleanup if database fails
    } catch (r2Err) {
      console.error('R2 complete upload failed:', r2Err)
      return NextResponse.json(
        {
          error: r2Err instanceof Error ? r2Err.message : 'Failed to finalize multipart upload in Cloudflare R2.',
          code: 'STORAGE_UPLOAD_FAILED',
        },
        { status: 500 }
      )
    }

    // 4. Connect to Supabase via Service Role for atomic persistence
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      // Clean up orphaned R2 object before exiting
      await cleanupR2Object(r2Client, bucketName, fileKey)
      return NextResponse.json(
        {
          error: 'Supabase credentials are not configured to persist eBook metadata.',
          code: 'DATABASE_CONFIGURATION_ERROR',
        },
        { status: 500 }
      )
    }

    const supabaseAdmin = createAdminSupabase(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 5. Validate academic mapping IDs against actual database records if mappings provided
    if (validatedMappings.length > 0) {
      const allProgramIds = validatedMappings.map((m) => m.programId).filter((id): id is string => Boolean(id))
      const allBranchIds = validatedMappings.flatMap((m) => m.branchIds)
      const allSubjectIds = validatedMappings.flatMap((m) => m.subjectIds)

      if (allProgramIds.length > 0) {
        const { data: dbProgs } = await supabaseAdmin.from('programs').select('id').in('id', allProgramIds)
        const validProgSet = new Set((dbProgs || []).map((p) => p.id))
        for (const pid of allProgramIds) {
          if (!validProgSet.has(pid)) {
            await cleanupR2Object(r2Client, bucketName, fileKey)
            return NextResponse.json(
              { error: `Referenced degree program (${pid}) does not exist.`, code: 'INVALID_ACADEMIC_MAPPING' },
              { status: 400 }
            )
          }
        }
      }

      if (allBranchIds.length > 0) {
        const { data: dbBranches } = await supabaseAdmin.from('branches').select('id').in('id', allBranchIds)
        const validBranchSet = new Set((dbBranches || []).map((b) => b.id))
        for (const bid of allBranchIds) {
          if (!validBranchSet.has(bid)) {
            await cleanupR2Object(r2Client, bucketName, fileKey)
            return NextResponse.json(
              { error: `Referenced branch specialization (${bid}) does not exist.`, code: 'INVALID_ACADEMIC_MAPPING' },
              { status: 400 }
            )
          }
        }
      }

      if (allSubjectIds.length > 0) {
        const { data: dbSubjects } = await supabaseAdmin.from('subjects').select('id').in('id', allSubjectIds)
        const validSubSet = new Set((dbSubjects || []).map((s) => s.id))
        for (const sid of allSubjectIds) {
          if (!validSubSet.has(sid)) {
            await cleanupR2Object(r2Client, bucketName, fileKey)
            return NextResponse.json(
              { error: `Referenced curriculum subject (${sid}) does not exist.`, code: 'INVALID_ACADEMIC_MAPPING' },
              { status: 400 }
            )
          }
        }
      }
    }

    // 6. Determine primary subject_id (nullable for General Library eBook)
    let chosenSubjectId: string | null = null
    if (validatedMappings.length > 0) {
      for (const m of validatedMappings) {
        if (m.subjectIds && m.subjectIds.length > 0) {
          chosenSubjectId = m.subjectIds[0]
          break
        }
      }
    }
    // Note: If no subject was selected, chosenSubjectId remains null.
    // Do NOT generate fake default IDs for General Library eBooks.

    // 7. Insert into public.library_books (Primary source for Digital Library)
    const libraryPayload = {
      title: validMeta.title,
      subtitle: validMeta.subtitle,
      author: validMeta.author,
      description: validMeta.description,
      cover_image_url: validMeta.coverImageUrl,
      ebook_status: 'available',
      ebook_file_path: fileKey,
      total_pages: validMeta.totalPages,
      publication_year: validMeta.publicationYear,
      publisher: validMeta.publisher || 'Academic Library Press',
      edition: validMeta.edition,
      subject_id: chosenSubjectId,
      book_type: 'Textbook',
    }

    const { data: libraryBookRecord, error: libErr } = await supabaseAdmin
      .from('library_books')
      .insert(libraryPayload)
      .select()
      .single()

    if (libErr || !libraryBookRecord) {
      console.error('library_books insert failed:', libErr)
      // Clean up orphaned R2 file to guarantee consistency
      await cleanupR2Object(r2Client, bucketName, fileKey)
      return NextResponse.json(
        {
          error: `Failed to save eBook in library catalog: ${libErr?.message || 'Database insert error.'}`,
          code: 'DATABASE_SAVE_FAILED',
        },
        { status: 500 }
      )
    }

    // 8. Save normalized combination rows into ebook_academic_mappings
    if (validatedMappings.length > 0) {
      const mappingRows: MappingRow[] = []
      for (const g of validatedMappings) {
        const progId = g.programId && isValidUuid(g.programId) ? g.programId : null
        const branches = g.branchIds.length > 0 ? g.branchIds : [null]
        const year = g.year
        const semesters = g.semesters.length > 0 ? g.semesters : [null]
        const subjects = g.subjectIds.length > 0 ? g.subjectIds : [null]
        const category = g.category || 'Textbook'

        for (const bId of branches) {
          for (const sem of semesters) {
            for (const sId of subjects) {
              mappingRows.push({
                book_id: libraryBookRecord.id,
                program_id: progId,
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
          const { error: mappingInsertErr } = await supabaseAdmin
            .from('ebook_academic_mappings')
            .insert(mappingRows)

          if (mappingInsertErr) {
            console.warn('Academic mappings insert warning:', mappingInsertErr.message)
          }
        } catch (mErr) {
          console.warn('Academic mappings insert exception:', mErr)
        }
      }
    }

    // 9. Sync into public.ebooks table (if exists) for R2 tracking
    let savedEbookRecord: Record<string, unknown> | null = null
    try {
      const { data: ebookRow, error: ebookErr } = await supabaseAdmin
        .from('ebooks')
        .insert({
          title: validMeta.title,
          description: validMeta.description,
          author: validMeta.author,
          file_key: fileKey,
          file_name: (typeof fileName === 'string' && fileName.trim()) || fileKey.split('/').pop() || 'ebook.pdf',
          file_size: typeof fileSize === 'number' ? fileSize : 0,
          mime_type: 'application/pdf',
          total_pages: validMeta.totalPages,
          cover_image_url: validMeta.coverImageUrl,
          uploaded_by: authCheck.user?.id || null,
        })
        .select()
        .single()

      if (!ebookErr && ebookRow) {
        savedEbookRecord = ebookRow
      }
    } catch {
      // Optional ebooks sync table
    }

    // 10. Log Admin Audit Action
    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        action: `Uploaded eBook to Digital Library: ${validMeta.title}`,
        target_type: 'book',
        target_id: libraryBookRecord.id,
        details: {
          file_key: fileKey,
          mappings_count: validatedMappings.length,
          is_general_library: validatedMappings.length === 0,
        },
      }).select().maybeSingle()
    } catch {
      // Audit log optional
    }

    return NextResponse.json({
      success: true,
      fileKey,
      libraryBook: libraryBookRecord,
      ebook: savedEbookRecord || libraryBookRecord,
      message: 'eBook uploaded to Cloudflare R2 and published successfully!',
    })
  } catch (err: unknown) {
    console.error('Multipart complete error:', err)
    // If upload was completed in R2 but something unhandled threw, clean up
    if (fileKeyToDeleteOnFailure) {
      try {
        const { bucketName } = getR2Config()
        const r2Client = getR2Client()
        await cleanupR2Object(r2Client, bucketName, fileKeyToDeleteOnFailure)
      } catch {}
    }
    const msg = err instanceof Error ? err.message : 'Failed to complete multipart upload'
    return NextResponse.json({ error: msg, code: 'DATABASE_SAVE_FAILED' }, { status: 500 })
  }
}

async function cleanupR2Object(r2Client: ReturnType<typeof getR2Client>, bucket: string, key: string) {
  try {
    await r2Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    console.log(`[R2 Cleaned up orphaned object] Key: ${key}`)
  } catch (e) {
    console.warn(`[R2 Cleanup Warning] Failed to delete orphaned object ${key}:`, e)
  }
}
