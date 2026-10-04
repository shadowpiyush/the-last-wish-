import Link from 'next/link'
import type { Metadata } from 'next'
import { BookOpen, GraduationCap, FileText, Library, Calculator, ArrowRight, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Harcoutian Study Hub — Modern Academic Platform',
  description: 'An independent, unofficial student study portal featuring canonical syllabus roadmaps, verified lecture notes, previous year question papers, a digital academic library, and academic calculators for HBTU undergraduate engineering and management programs.',
}

const features = [
  {
    icon: BookOpen,
    title: 'Program Syllabus',
    desc: 'Unit-wise topic breakdowns with linked study resources for every subject.',
    href: '/syllabus',
    color: '#e11d48',
    bg: 'rgba(225, 29, 72, 0.1)',
  },
  {
    icon: GraduationCap,
    title: 'Curriculum Roadmap',
    desc: 'Semester-by-semester view of all subjects, credits, and lecture hours.',
    href: '/curriculum',
    color: '#4f46e5',
    bg: 'rgba(79, 70, 229, 0.1)',
  },
  {
    icon: FileText,
    title: 'Study Notes',
    desc: 'Verified handwritten and typed notes uploaded by fellow students.',
    href: '/notes',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.1)',
  },
  {
    icon: Library,
    title: 'Digital Library',
    desc: 'Textbooks, reference manuals, and e-books with an in-app reader.',
    href: '/library',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.1)',
  },
  {
    icon: Calculator,
    title: 'Academic Calculators',
    desc: 'GPA, CGPA, SGPA, and attendance calculators.',
    href: '/calculators',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.1)',
  },
]

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <section style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 2rem 2rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(99, 102, 241, 0.15), transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 700 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '0.35rem 0.875rem',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-accent-bg)',
            border: '1px solid var(--border-light)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-accent)',
            marginBottom: '1.5rem',
          }}>
            <Sparkles size={13} />
            Independent Academic Platform
          </div>

          {/* Brand */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}>
            <div className="brand-badge-icon" style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 50%, #06b6d4 100%)',
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <BookOpen size={24} color="#fff" />
            </div>
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.25rem)',
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.035em',
            lineHeight: 1.1,
            marginBottom: '1rem',
          }}>
            <span>Harcoutian </span>
            <span className="text-gradient">Study Hub</span>
          </h1>

          <p style={{
            fontSize: 'clamp(0.9375rem, 2vw, 1.125rem)',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: 560,
            margin: '0 auto 2rem',
          }}>
            An independent student study portal with canonical syllabus roadmaps, verified lecture notes,
            previous year question papers, and a digital academic library.
          </p>

          {/* CTAs */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <Link href="/syllabus" className="btn btn-primary" style={{
              padding: '0.7rem 1.75rem',
              fontSize: '0.9375rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-full)',
              gap: '0.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: 'var(--shadow-glow)',
            }}>
              Explore Syllabus
              <ArrowRight size={16} />
            </Link>
            <Link href="/auth" className="btn btn-secondary" style={{
              padding: '0.7rem 1.75rem',
              fontSize: '0.9375rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-full)',
            }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '2rem 1.5rem 4rem',
        width: '100%',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}>
          {features.map((f) => {
            const Icon = f.icon
            return (
              <Link
                key={f.href}
                href={f.href}
                className="glass-card"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  transition: 'transform 200ms ease, box-shadow 200ms ease',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-sm)',
                  background: f.bg,
                  color: f.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={20} />
                </div>
                <div>
                  <h3 style={{
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    marginBottom: '0.25rem',
                    color: 'var(--text-primary)',
                  }}>
                    {f.title}
                  </h3>
                  <p style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-tertiary)',
                    lineHeight: 1.5,
                  }}>
                    {f.desc}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-light)',
        padding: '1.5rem 2rem',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)',
      }}>
        <p>
          © {new Date().getFullYear()} Harcoutian Study Hub. Strictly unofficial.
          Not affiliated with, endorsed by, or sponsored by HBTU.
        </p>
      </footer>
    </div>
  )
}
