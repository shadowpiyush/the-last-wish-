export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/auth/admin'
import { AlertTriangle } from 'lucide-react'
import { AdminClient, type BookItem } from './AdminClient'

export const metadata: Metadata = {
  title: 'Admin Control Center',
  description: 'Administrative dashboard for uploading notes, library ebooks, and platform management.',
}

export default async function AdminPage() {
  // 1. Strict server-side admin authorization
  const authCheck = await verifyAdmin()

  if (!authCheck.user) {
    redirect('/auth?redirect=/admin')
  }

  if (!authCheck.isAdmin) {
    return (
      <div style={{ padding: '4rem 1.5rem', maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <AlertTriangle size={32} color="#ef4444" />
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
          403 — Access Denied
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: 1.6, fontSize: '0.9375rem' }}>
          You do not have administrative privileges to access the Admin Control Center.
          Your authenticated account ({authCheck.user.email}) is currently assigned the role:{' '}
          <strong style={{ color: '#ef4444' }}>{authCheck.user.role}</strong>.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <a href="/dashboard" className="btn btn-primary" style={{ padding: '0.625rem 1.25rem', textDecoration: 'none' }}>
            Go to Student Dashboard
          </a>
          <a href="/library" className="btn btn-secondary" style={{ padding: '0.625rem 1.25rem', textDecoration: 'none' }}>
            Browse Library
          </a>
        </div>
      </div>
    )
  }

  const supabase = await createClient()

  // Fetch admin stats in parallel
  const [
    { count: totalUsers },
    { count: totalNotes },
    { count: pendingNotes },
    { count: totalBooks },
    { count: totalPyqs },
    { count: totalSubjects },
    { data: recentUsers },
    { data: recentAudit },
    { data: recentBooks },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('notes').select('*', { count: 'exact', head: true }),
    supabase.from('notes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('library_books').select('*', { count: 'exact', head: true }),
    supabase.from('pyqs').select('*', { count: 'exact', head: true }),
    supabase.from('subjects').select('*', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('id, full_name, role, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('admin_audit_logs')
      .select('id, action, target_type, target_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('library_books')
      .select('id, title, author, cover_image_url, ebook_file_path, ebook_status, total_pages, created_at')
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const stats = [
    { key: 'users', label: 'Total Users', value: totalUsers ?? 0, color: '#4f46e5' },
    { key: 'books', label: 'Library Books', value: totalBooks ?? 0, color: '#e11d48' },
    { key: 'notes', label: 'Total Notes', value: totalNotes ?? 0, color: '#10b981' },
    { key: 'pending', label: 'Pending Review', value: pendingNotes ?? 0, color: '#f59e0b' },
    { key: 'pyqs', label: 'PYQ Papers', value: totalPyqs ?? 0, color: '#6366f1' },
    { key: 'subjects', label: 'Subjects', value: totalSubjects ?? 0, color: '#06b6d4' },
  ]

  return (
    <div style={{ padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span className="badge badge-indigo" style={{ padding: '0.3rem 0.75rem', fontWeight: 700 }}>
            🛡 Admin Access
          </span>
          <span className="badge badge-neutral">Full Operations & Storage Management</span>
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.025em',
          marginBottom: 6,
        }}>
          Admin Control Center
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Manage students, upload verified lecture notes in PDF, and publish 145MB+ eBooks directly to Cloudflare R2.
        </p>
      </div>

      <AdminClient
        stats={stats}
        recentUsers={recentUsers || []}
        recentAudit={recentAudit || []}
        recentBooks={(recentBooks as unknown as BookItem[]) || []}
      />
    </div>
  )
}
