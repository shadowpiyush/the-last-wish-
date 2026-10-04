'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, FileText, Library, User } from 'lucide-react'

const tabs = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/syllabus', label: 'Syllabus', icon: BookOpen },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/profile', label: 'Profile', icon: User },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`mobile-tab ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={20} />
            <span style={{ fontSize: '0.6875rem', fontWeight: isActive ? 600 : 500 }}>
              {tab.label}
            </span>
          </Link>
        )
      })}

      <style>{`
        .mobile-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: var(--bg-glass);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-top: 1px solid var(--border-light);
          z-index: 50;
          padding: 0 0.5rem;
          justify-content: space-around;
          align-items: center;
        }

        .mobile-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 6px 12px;
          color: var(--text-tertiary);
          border-radius: var(--radius-sm);
          transition: all var(--duration-fast) var(--ease-smooth);
          text-decoration: none;
        }

        .mobile-tab.active {
          color: var(--color-accent);
        }

        @media (max-width: 1024px) {
          .mobile-bottom-nav {
            display: flex;
          }
        }
      `}</style>
    </nav>
  )
}
