export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import {
  BookOpen,
  FileText,
  Library,
  GraduationCap,
  Calculator,
  TrendingUp,
  Clock,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  Calendar as CalendarIcon,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Award,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCachedCatalogStats } from '@/lib/academic/catalog-stats'
import { getCachedSubjectsForBranch, type CachedSubject } from '@/lib/academic/cache'
import { fetchStudentRecords, getStudentTarget } from '@/lib/attendance/repository'
import { computeAttendanceMetrics } from '@/lib/attendance/calculations'

export const metadata: Metadata = {
  title: 'Academic Dashboard — Harcourtian Study Hub',
  description:
    'Your personalized academic dashboard with real-time curriculum progress, verified notes, attendance monitoring, and syllabus tools.',
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getFirst<T>(item: T | T[] | null | undefined): T | null {
  if (!item) return null
  return Array.isArray(item) ? item[0] ?? null : item
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Fetch Auth User and Catalog Statistics concurrently
  const [userRes, catalogStats] = await Promise.all([
    supabase.auth.getUser(),
    getCachedCatalogStats(),
  ])

  const user = userRes.data.user
  let profile: any = null
  let semesterSubjects: CachedSubject[] = []
  let attendanceMetrics: ReturnType<typeof computeAttendanceMetrics> | null = null
  let studentTarget = 75

  if (user) {
    // 2. Concurrently fetch profile with academic relations, target, and attendance records
    const [profileRes, target, records] = await Promise.all([
      supabase
        .from('profiles')
        .select(`
          id, full_name, email, role, program_id, branch_id, current_year, current_semester,
          programs(id, name, short_code),
          branches(id, name, code)
        `)
        .eq('id', user.id)
        .maybeSingle(),
      getStudentTarget(user.id).catch(() => 75),
      fetchStudentRecords(user.id).catch(() => []),
    ])

    profile = profileRes.data
    studentTarget = target

    // Compute attendance statistics from real database records
    let attended = 0
    let missed = 0
    let noClass = 0
    for (const r of records) {
      if (r.status === 'present') attended++
      else if (r.status === 'absent') missed++
      else if (r.status === 'no_class') noClass++
    }
    const total = attended + missed
    attendanceMetrics = computeAttendanceMetrics(attended, total, studentTarget, noClass)

    // Fetch enrolled subjects for student's branch & semester from cache
    if (profile?.branch_id) {
      const allBranchSubjects = await getCachedSubjectsForBranch(profile.branch_id)
      const currentSem = Number(profile.current_semester) || 1
      semesterSubjects = allBranchSubjects.filter((s) => s.semester_number === currentSem)
    }
  }

  // Academic details
  const programObj = getFirst(profile?.programs)
  const branchObj = getFirst(profile?.branches)
  const programShort = programObj?.short_code || 'B.Tech'
  const branchName = branchObj?.name || 'HBTU Curriculum'
  const currentYear = profile?.current_year || 1
  const currentSemester = profile?.current_semester || 1
  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Scholar'

  // Total credits calculation
  const totalSemesterCredits = semesterSubjects.reduce(
    (acc, s) => acc + (Number(s.credits) || 0),
    0
  )

  const quickLinks = [
    {
      href: '/attendance',
      icon: ClipboardCheck,
      label: 'Attendance',
      badge: 'Daily Tracker',
      color: '#65C9B5',
      bg: 'rgba(101, 201, 181, 0.12)',
    },
    {
      href: '/notes',
      icon: FileText,
      label: 'Study Notes',
      badge: 'Verified PDFs',
      color: '#7650F5',
      bg: 'rgba(118, 80, 245, 0.12)',
    },
    {
      href: '/syllabus',
      icon: BookOpen,
      label: 'Syllabus',
      badge: 'Units & Credits',
      color: '#478BFA',
      bg: 'rgba(71, 139, 250, 0.12)',
    },
    {
      href: '/curriculum',
      icon: GraduationCap,
      label: 'Curriculum',
      badge: 'All Semesters',
      color: '#A66BFA',
      bg: 'rgba(166, 107, 250, 0.12)',
    },
    {
      href: '/pyq',
      icon: Layers,
      label: 'PYQ Papers',
      badge: 'Past Papers',
      color: '#F3A9D5',
      bg: 'rgba(243, 169, 213, 0.18)',
    },
    {
      href: '/library',
      icon: Library,
      label: 'Digital Library',
      badge: 'Reference Books',
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.12)',
    },
    {
      href: '/calculators',
      icon: Calculator,
      label: 'Calculators',
      badge: 'SGPA & CGPA',
      color: '#65C9B5',
      bg: 'rgba(101, 201, 181, 0.12)',
    },
    {
      href: '/profile',
      icon: Shield,
      label: 'Profile & Security',
      badge: 'Academic Identity',
      color: '#7650F5',
      bg: 'rgba(118, 80, 245, 0.12)',
    },
  ]

  // Dynamic Circular Gauge calculation
  const attendancePct = attendanceMetrics?.percentage ?? null
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset =
    attendancePct !== null
      ? circumference - (attendancePct / 100) * circumference
      : circumference

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* =========================================================================
          1. WELCOME HERO SECTION (Soft Pastel Glass Overlay + Gradient Mesh)
          ========================================================================= */}
      <section
        className="hero-modern"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          margin: 0,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.25rem 0.8rem',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(255, 255, 255, 0.75)',
                border: '1px solid var(--border-glass)',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-accent)',
                letterSpacing: '0.02em',
                marginBottom: '0.75rem',
                boxShadow: 'inset 0 1px 1px 0 var(--glass-specular)',
              }}
            >
              <Sparkles size={13} />
              <span>{programShort} • {branchName} • Year {currentYear} • Semester {currentSemester}</span>
            </div>

            <h1
              style={{
                fontSize: '2.25rem',
                fontWeight: 800,
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              {getGreeting()},{' '}
              <span className="text-gradient">{studentName}</span>
            </h1>

            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9375rem',
                maxWidth: '680px',
                marginTop: '0.5rem',
                lineHeight: 1.6,
                margin: '0.5rem 0 0 0',
              }}
            >
              Welcome to your academic command center. Review verified lecture notes, track your 75% attendance compliance, and access semester curriculum milestones.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              href="/notes"
              className="btn btn-primary"
              style={{ borderRadius: 'var(--radius-full)', padding: '0.65rem 1.35rem' }}
            >
              <FileText size={16} />
              <span>Study Notes</span>
            </Link>
            <Link
              href="/attendance"
              className="btn btn-secondary"
              style={{ borderRadius: 'var(--radius-full)', padding: '0.65rem 1.35rem' }}
            >
              <ClipboardCheck size={16} />
              <span>Attendance Tracker</span>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. ACADEMIC STATISTICS (4 Pastel Glass Cards with Exact Color Accents)
          ========================================================================= */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Stat 1: Enrolled Subjects */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(118, 80, 245, 0.12)',
              border: '1px solid rgba(118, 80, 245, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(118, 80, 245, 0.15)',
            }}
          >
            <BookOpen size={24} />
          </div>
          <div>
            <div
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                fontFamily: 'var(--font-display)',
                lineHeight: 1.1,
                color: 'var(--text-primary)',
              }}
            >
              {semesterSubjects.length > 0
                ? semesterSubjects.length
                : catalogStats.totalSubjects ?? 0}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: 3 }}>
              {semesterSubjects.length > 0 ? 'Enrolled Subjects' : 'Catalog Subjects'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
              Semester {currentSemester} Curriculum
            </div>
          </div>
        </div>

        {/* Stat 2: Attendance Score */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(101, 201, 181, 0.15)',
              border: '1px solid rgba(101, 201, 181, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-teal)',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(101, 201, 181, 0.2)',
            }}
          >
            <ClipboardCheck size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  lineHeight: 1.1,
                  color: 'var(--text-primary)',
                }}
              >
                {attendanceMetrics?.hasRecords
                  ? attendanceMetrics.formattedPercentage
                  : `${studentTarget}%`}
              </span>
              <span
                className={`badge ${
                  !attendanceMetrics?.hasRecords
                    ? 'badge-blue'
                    : attendanceMetrics.status === 'safe'
                    ? 'badge-teal'
                    : 'badge-yellow'
                }`}
                style={{ fontSize: '0.65rem' }}
              >
                {!attendanceMetrics?.hasRecords
                  ? 'Target'
                  : attendanceMetrics.status === 'safe'
                  ? '75%+ Safe'
                  : 'Notice'}
              </span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: 3 }}>
              Attendance Score
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
              {attendanceMetrics?.hasRecords
                ? `${attendanceMetrics.attended} of ${attendanceMetrics.total} classes attended`
                : 'Target compliance: 75%'}
            </div>
          </div>
        </div>

        {/* Stat 3: Semester Credit Load */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(71, 139, 250, 0.14)',
              border: '1px solid rgba(71, 139, 250, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-secondary-accent)',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(71, 139, 250, 0.18)',
            }}
          >
            <Award size={24} />
          </div>
          <div>
            <div
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                fontFamily: 'var(--font-display)',
                lineHeight: 1.1,
                color: 'var(--text-primary)',
              }}
            >
              {totalSemesterCredits > 0 ? `${totalSemesterCredits} Credits` : '20 Credits'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: 3 }}>
              {totalSemesterCredits > 0 ? 'Semester Credit Load' : 'Academic Programs'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
              Standard HBTU Grading Scheme
            </div>
          </div>
        </div>

        {/* Stat 4: Verified Resources */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(243, 169, 213, 0.18)',
              border: '1px solid rgba(243, 169, 213, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D44E9B',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(243, 169, 213, 0.25)',
            }}
          >
            <FileText size={24} />
          </div>
          <div>
            <div
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                fontFamily: 'var(--font-display)',
                lineHeight: 1.1,
                color: 'var(--text-primary)',
              }}
            >
              {(catalogStats.totalNotes ?? 0) + (catalogStats.totalPyqs ?? 0)}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: 3 }}>
              Study Materials
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
              {catalogStats.totalNotes ?? 0} Notes • {catalogStats.totalPyqs ?? 0} PYQs
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. TWO-COLUMN CORE LAYOUT: Enrolled Subjects + Attendance Visual Gauge
          ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Column Left: Enrolled Semester Subjects */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={18} color="var(--color-accent)" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Enrolled Semester Subjects
              </h2>
            </div>
            <Link
              href="/syllabus"
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>Full Syllabus</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {semesterSubjects.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {semesterSubjects.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/notes?branch=${profile?.branch_id}&subject=${sub.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                    textDecoration: 'none',
                    color: 'var(--text-primary)',
                    transition: 'all 0.15s ease',
                  }}
                  className="interactive-card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-xs)',
                        background: 'rgba(118, 80, 245, 0.1)',
                        border: '1px solid rgba(118, 80, 245, 0.25)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-accent)',
                        flexShrink: 0,
                      }}
                    >
                      {sub.subject_code}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sub.subject_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {sub.credits ? `${sub.credits} Credits` : 'Theory'} • {sub.category || 'Core'}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={15} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-tertiary)' }}>
              <BookOpen size={36} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
                Explore Your Syllabus
              </p>
              <p style={{ fontSize: '0.8125rem', margin: '4px 0 16px 0' }}>
                Select your branch and semester in the syllabus section to view your courses.
              </p>
              <Link href="/syllabus" className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
                View Branch Syllabus
              </Link>
            </div>
          )}
        </div>

        {/* Column Right: Attendance Visual Progress & Quick Status */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardCheck size={18} color="var(--color-teal)" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Attendance Compliance
              </h2>
            </div>
            <Link
              href="/attendance"
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--color-teal)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>Manage Logs</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              padding: '1rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              marginBottom: '1rem',
            }}
          >
            {/* SVG Progress Ring */}
            <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
              <svg width="96" height="96" viewBox="0 0 96 96">
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  fill="transparent"
                  stroke="rgba(0, 0, 0, 0.08)"
                  strokeWidth="8"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  fill="transparent"
                  stroke="url(#pastelAttendanceGrad)"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="progress-ring-circle"
                />
                <defs>
                  <linearGradient id="pastelAttendanceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#65C9B5" />
                    <stop offset="100%" stopColor="#7650F5" />
                  </linearGradient>
                </defs>
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  color: 'var(--text-primary)',
                }}
              >
                {attendanceMetrics?.hasRecords
                  ? `${Math.round(attendanceMetrics.percentage || 0)}%`
                  : '75%'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {attendanceMetrics?.hasRecords
                  ? attendanceMetrics.status === 'safe'
                    ? 'Eligible for Exams'
                    : 'Attention Required'
                  : '75% Minimum Policy'}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                {attendanceMetrics?.hasRecords ? (
                  attendanceMetrics.classesCanMiss > 0 ? (
                    <span>
                      You can safely miss <strong style={{ color: 'var(--color-success)' }}>{attendanceMetrics.classesCanMiss}</strong> more class(es) without dropping below {studentTarget}%.
                    </span>
                  ) : attendanceMetrics.classesNeededToAttend ? (
                    <span>
                      You need to attend <strong style={{ color: 'var(--color-warning)' }}>{attendanceMetrics.classesNeededToAttend}</strong> consecutive class(es) to recover.
                    </span>
                  ) : (
                    <span>Target criteria maintained comfortably.</span>
                  )
                ) : (
                  <span>
                    Log your daily class attendance to unlock real-time safety margins and recovery insights.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem' }}>
            <Link
              href="/attendance"
              className="btn btn-primary"
              style={{ flex: 1, fontSize: '0.8125rem', borderRadius: 'var(--radius-full)' }}
            >
              <ClipboardCheck size={16} />
              <span>Mark Today&apos;s Attendance</span>
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. ACADEMIC MODULES QUICK NAV (8 Pastel Glass Cards)
          ========================================================================= */}
      <section className="glass-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: '1.25rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--border-light)',
          }}
        >
          <TrendingUp size={18} color="var(--color-accent)" />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Academic Command Center
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '1rem',
          }}
        >
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '1.25rem 0.75rem',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  textDecoration: 'none',
                  color: 'var(--text-primary)',
                  textAlign: 'center',
                  transition: 'all var(--duration-fast) var(--ease-spring)',
                  boxShadow: 'inset 0 1px 1px 0 var(--glass-specular)',
                }}
                className="interactive-card"
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 'var(--radius-md)',
                    background: link.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: link.color,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <Icon size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{link.label}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {link.badge}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* =========================================================================
          5. ACADEMIC CALENDAR & UPCOMING MILESTONES + RECENT NOTES
          ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Academic Calendar Reminders */}
        <div className="glass-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: '1.25rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            <CalendarIcon size={18} color="var(--color-secondary-accent)" />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Academic Calendar & Guidelines
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              style={{
                display: 'flex',
                gap: '0.85rem',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
              }}
            >
              <CheckCircle2 size={18} color="var(--color-teal)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  75% Mandatory Attendance Rule
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Under university academic ordinances, 75% aggregate attendance is required to sit for end-semester examinations.
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '0.85rem',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
              }}
            >
              <BookOpen size={18} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  Continuous Internal Evaluations (CIE)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Check your syllabus roadmaps to verify credit allocations, lecture hours, and sessional test formats.
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '0.85rem',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
              }}
            >
              <Shield size={18} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  Unofficial Student Study Portal
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Harcoutian Study Hub is an independent academic resource built by students, not officially affiliated with HBTU.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recently Added Study Notes */}
        <div className="glass-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: '1.25rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            <Clock size={18} color="var(--color-teal)" />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Recently Added Notes
            </h2>
          </div>

          {catalogStats.recentNotes && catalogStats.recentNotes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {catalogStats.recentNotes.map((note) => (
                <Link
                  key={note.id}
                  href="/notes"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                    textDecoration: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    transition: 'all 0.15s ease',
                  }}
                  className="interactive-card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <FileText size={16} color="var(--color-accent)" style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {note.title}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-tertiary)',
                      flexShrink: 0,
                      marginLeft: 12,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {new Date(note.created_at).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-tertiary)' }}>
              <FileText size={36} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
              <p style={{ fontSize: '0.875rem', margin: 0 }}>No notes published yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
