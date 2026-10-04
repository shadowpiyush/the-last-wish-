'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { Footer } from '@/components/layout/Footer'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [complianceOpen, setComplianceOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Global Keyboard Shortcut: ⌘K or Ctrl+K for Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        {/* Floating Apple-Style Translucent Header */}
        <Header
          onOpenSearch={() => setSearchOpen(true)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenCompliance={() => setComplianceOpen(true)}
        />

        {/* Dynamic Route View */}
        <main className="page-wrapper">{children}</main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* TODO: Global Cmd+K Search Modal */}
      {/* TODO: Compliance Modal */}
      {/* TODO: Ebook Reader Modal */}
    </div>
  )
}
