export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { ShieldAlert, AlertTriangle, FileLock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Compliance Notice',
  description:
    'Important compliance, disclaimer, and legal notice for Harcoutian Study Hub — an independent, unofficial student study platform not affiliated with HBTU.',
}

const prohibitedItems = [
  {
    num: 1,
    title: 'Commercialization',
    desc: 'Selling, bundling, or commercializing any content found on this portal.',
  },
  {
    num: 2,
    title: 'Unauthorized Mirroring',
    desc: 'Re-uploading, mirroring, or distributing materials to other websites, Telegram channels, drives, or other platforms.',
  },
  {
    num: 3,
    title: 'Bulk Harvesting',
    desc: 'Automated scraping or bulk harvesting of platform materials.',
  },
  {
    num: 4,
    title: 'Circumvention',
    desc: 'Circumventing access controls or attempting to obtain protected platform files.',
  },
  {
    num: 5,
    title: 'Commercial Redistribution',
    desc: 'Using platform resources for unauthorized commercial redistribution.',
  },
]

// Pure Server Component — no 'use client' needed
export default function CompliancePage() {
  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <div
          className="brand-badge-icon"
          style={{
            width: 50,
            height: 50,
            margin: '0 auto 1rem auto',
            background: 'var(--color-warning-bg)',
            color: 'var(--color-warning)',
          }}
        >
          <ShieldAlert size={28} />
        </div>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            marginBottom: 6,
          }}
        >
          IMPORTANT COMPLIANCE NOTICE
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
          Strictly For Personal Study Only
        </p>
      </div>

      {/* Main card */}
      <div className="glass-card" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
        {/* Disclaimer banner */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderLeft: '4px solid var(--color-warning)',
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '2rem',
            fontSize: '0.9375rem',
            lineHeight: 1.6,
          }}
        >
          <p
            style={{ fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}
          >
            Harcoutian Study Hub is an independent, unofficial student study platform. It is
            not the official website of Harcourt Butler Technical University (HBTU) and should
            not be represented as affiliated with, endorsed by, or sponsored by HBTU unless
            separately authorized.
          </p>
          <p style={{ color: 'var(--text-secondary)' }}>
            All handwritten notes, PDFs, solved papers, playlists, and study resources on
            Harcoutian Study Hub are provided solely for personal, non-commercial educational
            use by students.
          </p>
        </div>

        {/* Prohibited Actions */}
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertTriangle size={20} color="var(--color-danger)" />
          <span>Strictly Prohibited Actions</span>
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {prohibitedItems.map((item) => (
            <div
              key={item.num}
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                padding: '0.875rem 1rem',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {item.num}
              </span>
              <div>
                <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  {item.title}:{' '}
                </strong>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {item.desc}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Consequences warning */}
        <div
          style={{
            background: 'var(--color-danger-bg)',
            border: '1px solid rgba(255, 59, 48, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
          }}
        >
          <FileLock size={28} color="var(--color-danger)" style={{ flexShrink: 0 }} />
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              lineHeight: 1.5,
            }}
          >
            Violation of platform rules may result in permanent account termination and, where
            applicable, further action under relevant copyright and intellectual-property laws.
          </p>
        </div>
      </div>
    </div>
  )
}
