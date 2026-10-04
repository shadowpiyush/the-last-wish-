import Link from 'next/link'
import { Shield, BookOpen } from 'lucide-react'

export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-light)',
        background: 'var(--bg-secondary)',
        padding: '3rem 2rem 2rem 2rem',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '2.5rem',
        }}
      >
        {/* Brand identity column */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              marginBottom: '0.75rem',
            }}
          >
            <div className="brand-badge-icon" style={{ width: 30, height: 30 }}>
              <BookOpen size={16} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.0625rem' }}>Harcoutian Study Hub</span>
          </div>
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              marginBottom: '1rem',
            }}
          >
            An independent, unofficial student study platform dedicated to providing curriculum
            roadmaps, verified study notes, exam papers, and academic tools.
          </p>
          <div className="disclaimer-badge">
            Strictly unofficial. Not affiliated with, endorsed by, or sponsored by Harcourt Butler
            Technical University (HBTU).
          </div>
        </div>

        {/* Academic Modules */}
        <div>
          <h4
            style={{
              fontSize: '0.8125rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-tertiary)',
              marginBottom: '1rem',
            }}
          >
            Academic Resources
          </h4>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.625rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
            }}
          >
            <Link href="/syllabus" style={{ textAlign: 'left' }}>Program Syllabus</Link>
            <Link href="/curriculum" style={{ textAlign: 'left' }}>Curriculum Roadmaps</Link>
            <Link href="/notes" style={{ textAlign: 'left' }}>Handwritten & Typed Notes</Link>
            <Link href="/pyq" style={{ textAlign: 'left' }}>Previous Year Exam Papers (PYQ)</Link>
            <Link href="/library" style={{ textAlign: 'left' }}>Digital Textbook Library</Link>
          </div>
        </div>

        {/* Tools & Legal */}
        <div>
          <h4
            style={{
              fontSize: '0.8125rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-tertiary)',
              marginBottom: '1rem',
            }}
          >
            Tools & Compliance
          </h4>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.625rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
            }}
          >
            <Link href="/calculators" style={{ textAlign: 'left' }}>
              Attendance & SGPA Calculators
            </Link>
            <Link href="/profile" style={{ textAlign: 'left' }}>
              Student Profile & Settings
            </Link>
            <Link
              href="/compliance"
              style={{
                textAlign: 'left',
                color: 'var(--color-warning)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 600,
              }}
            >
              <Shield size={14} />
              <span>Full Compliance Notice</span>
            </Link>
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1200,
          margin: '2rem auto 0 auto',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-light)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.75rem',
          color: 'var(--text-tertiary)',
        }}
      >
        <span>© {new Date().getFullYear()} Harcoutian Study Hub. All rights reserved.</span>
        <span>Strictly for non-commercial educational personal study only.</span>
      </div>
    </footer>
  )
}
