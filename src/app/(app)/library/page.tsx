export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { LibraryClient, type BookItem } from './LibraryClient'
import { getCachedPrograms, getCachedBranches } from '@/lib/academic/cache'

export const metadata: Metadata = {
  title: 'Digital Library',
  description: 'Browse textbooks, reference manuals, and e-books in the digital academic library with in-app PDF reader up to 50MB.',
}

export default async function LibraryPage() {
  const supabase = await createClient()

  const loadBooks = async (): Promise<BookItem[]> => {
    try {
      const { data, error } = await supabase
        .from('library_books')
        .select(`
          id, title, subtitle, author, isbn, edition, publisher,
          publication_year, language, description, cover_image_url,
          book_type, ebook_status, ebook_file_path, total_pages,
          subjects (id, subject_code, subject_name),
          ebook_academic_mappings (
            id, program_id, branch_id, year_number, semester_number, subject_id, academic_category,
            branches (id, name, code),
            subjects (id, subject_code, subject_name),
            programs (id, name, short_code)
          )
        `)
        .order('title')
        .limit(100)

      if (!error && data) return data as unknown as BookItem[]
    } catch {
      // Use fallback query below if complex joined lookup fails
    }

    try {
      const { data: fallbackData } = await supabase
        .from('library_books')
        .select(`
          id, title, subtitle, author, isbn, edition, publisher,
          publication_year, language, description, cover_image_url,
          book_type, ebook_status, ebook_file_path, total_pages,
          subjects (id, subject_code, subject_name)
        `)
        .order('title')
        .limit(100)
      return (fallbackData || []) as unknown as BookItem[]
    } catch {
      return []
    }
  }

  // Load cached programs and branches in parallel with books query
  const [programs, branches, books] = await Promise.all([
    getCachedPrograms(),
    getCachedBranches(),
    loadBooks(),
  ])

  return (
    <div style={{ padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span className="badge badge-yellow" style={{ padding: '0.3rem 0.75rem', fontWeight: 700 }}>
            Digital Collection
          </span>
          <span className="badge badge-neutral">PDFs Up to 50 MB · Flexible Academic Mapping</span>
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.025em',
          marginBottom: 6,
        }}>
          Digital Library
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Standard textbooks, reference manuals, and e-books for all HBTU programs and general university resources.
        </p>
      </div>

      <LibraryClient
        initialBooks={books || []}
        programs={programs || []}
        branches={branches || []}
      />
    </div>
  )
}
