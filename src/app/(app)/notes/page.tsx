export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { NotesClient } from './NotesClient'

export const metadata: Metadata = {
  title: 'Study Notes',
  description: 'Access verified handwritten and typed study notes for all subjects. Upload and share your own notes with fellow students.',
}

export default async function NotesPage() {
  const supabase = await createClient()

  // Fetch programs for the filter
  const { data: programs } = await supabase
    .from('programs')
    .select('id, name, short_code')
    .order('name')

  // Fetch published notes with subject info
  const { data: notes } = await supabase
    .from('notes')
    .select(`
      id, title, description, file_path, file_type, file_size, view_count, created_at,
      subjects (id, subject_code, subject_name)
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div style={{ padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span className="badge badge-green" style={{ padding: '0.3rem 0.75rem', fontWeight: 700 }}>
            Verified Notes
          </span>
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.025em',
          marginBottom: 6,
        }}>
          Study Notes
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Verified handwritten and typed study notes contributed by fellow students.
        </p>
      </div>

      <NotesClient
        initialNotes={notes ?? []}
        programs={programs ?? []}
      />
    </div>
  )
}
