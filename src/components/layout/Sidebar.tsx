'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardCheck,
  BookOpen,
  GraduationCap,
  FileText,
  FileCheck,
  Library,
  Calculator,
  ShieldAlert,
  User,
  Shield,
  X,
} from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/attendance', label: 'Attendance Tracker', icon: ClipboardCheck },
  { href: '/syllabus', label: 'Syllabus', icon: BookOpen },
  { href: '/curriculum', label: 'Curriculum Roadmap', icon: GraduationCap },
  { href: '/notes', label: 'Study Notes', icon: FileText },
  { href: '/pyq', label: 'Previous Year Papers', icon: FileCheck },
  { href: '/library', label: 'Digital Library', icon: Library },
  { href: '/calculators', label: 'Academic Calculators', icon: Calculator },
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { profile } = useAuth()
  const pathname = usePathname()

  const handleNavClick = () => {
    onClose()
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 44,
          }}
        />
      )}

      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        <div
          className="sidebar-header"
          style={{ justifyContent: 'space-between', padding: '1.25rem 1.25rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              className="brand-badge-icon"
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 50%, #06b6d4 100%)',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BookOpen size={17} />
            </div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '0.9375rem',
                  letterSpacing: '-0.02em',
                  fontFamily: 'var(--font-display)',
                  lineHeight: 1.15,
                }}
              >
                <span>Harcoutian</span>
                <span className="text-gradient">Hub</span>
              </div>
              <div
                style={{
                  fontSize: '0.6875rem',
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                  marginTop: 1,
                }}
              >
                Academic Portal
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            style={{ display: 'none' }}
            id="sidebar-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-nav">
          <div className="nav-section-title">Academic Modules</div>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`nav-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="nav-item-icon" />
                <span>{item.label}</span>
              </Link>
            )
          })}

          <div className="nav-section-title" style={{ marginTop: '0.75rem' }}>
            Personal & Safety
          </div>
          <Link
            href="/profile"
            onClick={handleNavClick}
            className={`nav-item ${pathname === '/profile' ? 'active' : ''}`}
          >
            <User className="nav-item-icon" />
            <span>Profile & Security</span>
          </Link>

          <Link
            href="/compliance"
            onClick={handleNavClick}
            className={`nav-item ${pathname === '/compliance' ? 'active' : ''}`}
            style={{
              color: pathname === '/compliance' ? '#fff' : 'var(--color-warning)',
            }}
          >
            <ShieldAlert className="nav-item-icon" />
            <span>Compliance Notice</span>
          </Link>

          {/* Admin Control Center Section */}
          {profile?.role === 'admin' && (
            <>
              <div
                className="nav-section-title"
                style={{ marginTop: '0.75rem', color: 'var(--color-indigo)' }}
              >
                Administration
              </div>
              <Link
                href="/admin"
                onClick={handleNavClick}
                className={`nav-item ${pathname.startsWith('/admin') ? 'active' : ''}`}
                style={{
                  background: pathname.startsWith('/admin')
                    ? 'var(--color-indigo)'
                    : 'var(--color-indigo-bg)',
                  color: pathname.startsWith('/admin') ? '#fff' : 'var(--color-indigo)',
                }}
              >
                <Shield className="nav-item-icon" />
                <span>Control Center</span>
              </Link>
            </>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="disclaimer-badge">
            <strong>Independent Platform</strong>
            <br />
            Harcoutian Study Hub is an unofficial student portal and is not affiliated with or
            endorsed by HBTU.
          </div>
        </div>

        <style>{`
          @media (max-width: 1024px) {
            #sidebar-close-btn { display: inline-flex !important; }
          }
        `}</style>
      </aside>
    </>
  )
}
