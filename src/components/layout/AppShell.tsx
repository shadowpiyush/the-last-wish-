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
  const [, setSearchOpen] = useState(false)
  const [, setComplianceOpen] = useState(false)
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
    <div className="ambient-background">
      {/* Floating Ambient Glow Orbs for Apple-inspired depth */}
      <div className="ambient-orb orb-1" aria-hidden="true" />
      <div className="ambient-orb orb-2" aria-hidden="true" />
      <div className="ambient-orb orb-3" aria-hidden="true" />
      <div className="ambient-orb orb-4" aria-hidden="true" />

      {/* Floating Glass Application Container */}
      <div className="app-frame">
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
        </div>
      </div>
    </div>
  )
}
