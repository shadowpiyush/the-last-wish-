'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Search,
  Sun,
  Moon,
  User,
  LogOut,
  Shield,
  Menu,
  BookOpen,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useTheme } from '@/components/providers/ThemeProvider'

interface HeaderProps {
  onOpenSearch: () => void
  onToggleSidebar: () => void
  onOpenCompliance: () => void
}

export function Header({ onOpenSearch, onToggleSidebar, onOpenCompliance }: HeaderProps) {
  const { user, profile, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [failedAvatarSrc, setFailedAvatarSrc] = useState<string | null>(null)
  const router = useRouter()

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Listen to scroll to compress header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Compute Initials fallback
  const getInitials = (name: string) => {
    if (!name) return 'H'
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const displayName = profile?.full_name || user?.email || 'User'

  return (
    <header className={`app-header ${scrolled ? 'header-scrolled' : ''}`}>
      <div className="header-left">
        <button
          onClick={onToggleSidebar}
          className="btn btn-ghost btn-icon"
          aria-label="Toggle navigation menu"
          style={{ display: 'none' }}
          id="sidebar-toggle-btn"
        >
          <Menu size={20} />
        </button>

        <Link href="/dashboard" className="header-brand">
          <div
            className="brand-badge-icon"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 50%, #06b6d4 100%)',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
            }}
          >
            <BookOpen size={18} />
          </div>
          <div>
            <div
              className="brand-title"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}
            >
              <span>Harcoutian</span>
              <span className="text-gradient">Hub</span>
              <span className="brand-tag">Unofficial</span>
            </div>
          </div>
        </Link>
      </div>

      <div className="header-center">
        <button
          onClick={onOpenSearch}
          className="header-search-btn"
          aria-label="Search study materials"
        >
          <Search size={16} />
          <span>Search syllabus, notes, pyq...</span>
          <span className="search-shortcut">⌘K</span>
        </button>
      </div>

      <div className="header-right">
        {/* Compliance modal link */}
        <button
          onClick={onOpenCompliance}
          className="btn btn-ghost"
          style={{ fontSize: '0.8125rem', gap: '0.375rem' }}
          title="Important Compliance Notice"
        >
          <Shield size={15} color="var(--color-warning)" />
          <span style={{ display: 'none' }}>Compliance</span>
        </button>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-icon"
          aria-label="Toggle light or dark theme"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User Profile / Auth State */}
        {user ? (
          <div className="profile-menu-container" ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="btn btn-ghost"
              style={{
                padding: '3px 10px 3px 4px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-glass)',
                background: 'var(--bg-glass-card)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <div style={{ position: 'relative' }}>
                {profile?.profile_picture_url && profile.profile_picture_url !== failedAvatarSrc ? (
                  <Image
                    src={profile.profile_picture_url}
                    alt={displayName}
                    width={30}
                    height={30}
                    unoptimized
                    onError={() => setFailedAvatarSrc(profile.profile_picture_url)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--color-accent), #818cf8)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                    }}
                  >
                    {getInitials(displayName)}
                  </div>
                )}
                <span
                  style={{
                    position: 'absolute',
                    bottom: -1,
                    right: -1,
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: 'var(--color-success)',
                    border: '2px solid var(--bg-card)',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  maxWidth: 105,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: 'var(--text-primary)',
                }}
              >
                {displayName.split(' ')[0]}
              </span>
            </button>

            {menuOpen && (
              <div
                className="glass-card"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 8,
                  width: 240,
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-modal)',
                  zIndex: 50,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                }}
              >
                <div
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid var(--border-light)',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {displayName}
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-tertiary)',
                      marginTop: 1,
                    }}
                  >
                    {user.email}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                    <span className="badge badge-blue">
                      {(profile?.role || 'student').toUpperCase()}
                    </span>
                    <span className="badge badge-neutral">
                      {profile?.branch_code || 'CSE'}
                    </span>
                  </div>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="nav-item"
                  style={{ padding: '0.5rem 0.75rem' }}
                >
                  <User size={16} />
                  <span>Profile & Security</span>
                </Link>

                {profile?.role === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="nav-item"
                    style={{ padding: '0.5rem 0.75rem', color: 'var(--color-indigo)' }}
                  >
                    <Shield size={16} />
                    <span>Admin Control Center</span>
                  </Link>
                )}

                <button
                  onClick={() => {
                    setMenuOpen(false)
                    signOut()
                    router.push('/auth')
                  }}
                  className="nav-item"
                  style={{
                    padding: '0.5rem 0.75rem',
                    color: 'var(--color-danger)',
                    width: '100%',
                  }}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/auth"
            className="btn btn-primary"
            style={{ padding: '0.45rem 1.1rem', fontSize: '0.8125rem', gap: 6 }}
          >
            <span>Sign In</span>
            <ArrowRight size={14} />
          </Link>
        )}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          #sidebar-toggle-btn { display: inline-flex !important; }
        }
        @media (max-width: 640px) {
          .header-center { display: none; }
          .app-header { padding: 0 1rem; }
        }
      `}</style>
    </header>
  )
}
