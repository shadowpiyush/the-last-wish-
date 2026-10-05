'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { AppShell } from '@/components/layout/AppShell'
import { Loader2 } from 'lucide-react'
import { sanitizeInternalPath } from '@/lib/auth/url'
import { isProfileComplete } from '@/lib/auth/profile'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        const safePath = sanitizeInternalPath(pathname, '')
        const redirectUrl = safePath ? `/auth?redirect=${encodeURIComponent(safePath)}` : '/auth'
        router.replace(redirectUrl)
      } else if (profile && !isProfileComplete(profile)) {
        router.replace('/complete-profile')
      }
    }
  }, [user, profile, loading, router, pathname])

  // While checking auth state, show a clean loading indicator
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          background: 'var(--bg-primary)',
          color: 'var(--text-secondary)',
        }}
      >
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Verifying academic session...</span>
      </div>
    )
  }

  // If not authenticated or profile incomplete, render nothing while redirect occurs
  if (!user || (profile && !isProfileComplete(profile))) {
    return null
  }

  return <AppShell>{children}</AppShell>
}
