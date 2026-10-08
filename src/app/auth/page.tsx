'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  BookOpen,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  GraduationCap,
} from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { validateAndNormalizeIndianMobile } from '@/lib/validation/mobile'
import { sanitizeInternalPath } from '@/lib/auth/url'

interface ProgramItem {
  id: string
  name: string
  short_code: string
  duration_years: number
  total_semesters: number
}

interface BranchItem {
  id: string
  program_id: string
  name: string
  code: string
}

type AuthStep = 'credentials' | 'register' | 'forgot'

function AuthPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, signInWithOAuth, signInWithPassword, signUp, resetPassword, loading: authLoading } = useAuth()

  const [step, setStep] = useState<AuthStep>('credentials')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const errorBannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (error) errorBannerRef.current?.focus()
  }, [error])

  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regName, setRegName] = useState('')
  const [regMobile, setRegMobile] = useState('')

  // Academic program & branch selection
  const [programsList, setProgramsList] = useState<ProgramItem[]>([])
  const [branchesList, setBranchesList] = useState<BranchItem[]>([])
  const [academicOptionsLoading, setAcademicOptionsLoading] = useState(false)
  const [academicOptionsError, setAcademicOptionsError] = useState('')
  const [academicLoadAttempt, setAcademicLoadAttempt] = useState(0)
  const [regProgramId, setRegProgramId] = useState<string>('')
  const [regBranchId, setRegBranchId] = useState<string>('')
  const [regYear, setRegYear] = useState<number>(1)
  const [regSemester, setRegSemester] = useState<number>(1)

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  // Handle OAuth callback errors from URL
  useEffect(() => {
    const errParam = searchParams.get('error')
    const errDesc = searchParams.get('error_description')
    if (errDesc || errParam) {
      const decoded = decodeURIComponent(errDesc || errParam || '')
      void Promise.resolve().then(() => setError(decoded))
    }

    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.substring(1)
      const hashParams = new URLSearchParams(hash)
      const hashErr = hashParams.get('error_description') || hashParams.get('error')
      if (hashErr) {
        void Promise.resolve().then(() => setError(decodeURIComponent(hashErr)))
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }
  }, [searchParams])

  // Redirect already-authenticated users based on server-side role resolution
  useEffect(() => {
    if (user && !authLoading) {
      const explicitRedirect = searchParams.get('redirect')
      const safeRedirect = sanitizeInternalPath(explicitRedirect, '')
      const target = safeRedirect || (profile?.role === 'admin' ? '/admin' : '/dashboard')
      router.replace(target)
    }
  }, [user, profile, authLoading, searchParams, router])

  // Academic options are only needed on the registration tab. Load both in parallel
  // so the sign-in screen avoids two unnecessary requests and registration avoids a waterfall.
  useEffect(() => {
    if (step !== 'register' || programsList.length > 0) return

    let cancelled = false
    const supabase = createClient()
    async function loadProgramsAndBranches() {
      setAcademicOptionsLoading(true)
      setAcademicOptionsError('')
      try {
        const [programResult, branchResult] = await Promise.all([
          supabase.from('programs')
            .select('id, name, short_code, duration_years, total_semesters')
            .order('name'),
          supabase.from('branches')
            .select('id, program_id, name, code')
            .order('name'),
        ])

        if (programResult.error || branchResult.error) {
          throw new Error('Academic options could not be loaded.')
        }
        if (cancelled) return

        const progs = programResult.data
        const branches = branchResult.data
        if (!progs?.length || !branches?.length) {
          setAcademicOptionsError('Academic options are unavailable right now. Please retry.')
          return
        }

        setProgramsList(progs as ProgramItem[])
        setBranchesList(branches as BranchItem[])
        const btech = (progs as ProgramItem[]).find((p) => p.short_code === 'B.Tech') || progs[0]
        setRegProgramId(btech.id)

        const matching = (branches as BranchItem[]).filter((branch) => branch.program_id === btech.id)
        if (matching.length > 0) {
          setRegBranchId(matching[0].id)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load academic programs/branches:', err)
          setAcademicOptionsError('Academic options could not be loaded. Please retry.')
        }
      } finally {
        if (!cancelled) setAcademicOptionsLoading(false)
      }
    }
    void loadProgramsAndBranches()
    return () => { cancelled = true }
  }, [step, programsList.length, academicLoadAttempt])

  const handleProgramSelect = (progId: string) => {
    setRegProgramId(progId)
    const matching = branchesList.filter((b) => b.program_id === progId)
    if (matching.length > 0) {
      setRegBranchId(matching[0].id)
    } else {
      setRegBranchId('')
    }
    setRegYear(1)
    setRegSemester(1)
  }

  const selectedProgramObj = programsList.find((p) => p.id === regProgramId)
  const maxYears = selectedProgramObj?.duration_years || 4
  const availableBranches = branchesList.filter((b) => b.program_id === regProgramId)

  // ==================== HANDLERS ====================

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    const email = loginEmail.trim()
    const password = loginPassword.trim()

    if (!email) { setError('Please enter your email address.'); return }
    if (!password) { setError('Please enter your password.'); return }

    setLoading(true)
    try {
      await signInWithPassword(email, password)
      setRedirecting(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed. Please check your credentials.'
      setError(message)
      setLoading(false)
    }
  }

  const handleOAuth = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithOAuth('google')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign-in failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!regName.trim()) { setError('Full name is required.'); return }
    if (!regEmail.trim()) { setError('Email address is required.'); return }

    const mobileCheck = validateAndNormalizeIndianMobile(regMobile)
    if (!mobileCheck.valid) { setError(mobileCheck.error || 'Mobile number is required.'); return }
    if (regPassword.length < 8) { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    try {
      await signUp({
        email: regEmail,
        password: regPassword,
        fullName: regName,
        mobileNumber: mobileCheck.normalized!,
        programId: regProgramId,
        branchId: regBranchId,
        currentYear: regYear,
        currentSemester: regSemester,
      })
      setSuccessMessage('Registration successful! Please check your email (including spam/junk folder) and click the verification link to activate your account before signing in.')
      setLoginEmail(regEmail)
      setLoginPassword('')
      setStep('credentials')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(forgotEmail)
      setForgotSent(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // ==================== LOADING / REDIRECT STATE ====================

  if (authLoading || redirecting || Boolean(user && !authLoading)) {
    return (
      <div className="auth-page-wrapper">
        <div className="glass-card auth-loading-card">
          <div className="auth-loading-icon">
            <Loader2 size={28} className="animate-spin" />
          </div>
          <div>
            <h2 className="auth-loading-title">
              Welcome to <span className="text-gradient">Harcoutian Hub</span>
            </h2>
            <p className="auth-loading-subtitle">
              {redirecting || user ? 'Academic session confirmed! Opening your portal...' : 'Checking session...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ==================== MAIN RENDER ====================

  return (
    <div className="auth-page-wrapper">
      {/* Ambient glow */}
      <div className="auth-ambient-glow" />

      <div className="auth-container">
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Link href="/" className="auth-brand-link">
            <div className="brand-badge-icon" style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 50%, #06b6d4 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
            }}>
              <BookOpen size={20} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.125rem', lineHeight: 1.2 }}>
                <span>Harcoutian</span>
                <span className="text-gradient">Hub</span>
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Academic Portal
              </div>
            </div>
          </Link>

          <h1 style={{
            fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)',
          }}>
            Welcome to <span className="text-gradient">Harcoutian Hub</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {step === 'credentials' && 'Sign in to access your academic portal'}
            {step === 'register' && 'Create your student account'}
            {step === 'forgot' && 'Reset your password'}
          </p>
        </div>

        {/* Auth card */}
        <div className="glass-card auth-card">
          {/* Tab switcher (credentials vs register) */}
          {(step === 'credentials' || step === 'register') && (
            <div className="auth-tab-bar">
              {(['credentials', 'register'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setStep(t); setError(''); setSuccessMessage('') }}
                  className={`auth-tab ${step === t ? 'auth-tab-active' : ''}`}
                  type="button"
                >
                  {t === 'credentials' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>
          )}

          {/* Success message */}
          {successMessage && (
            <div className="auth-success-banner" role="status">
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="auth-error-banner" id="auth-error" role="alert" tabIndex={-1} ref={errorBannerRef}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {/* ==================== CREDENTIALS STEP ==================== */}
          {step === 'credentials' && (
            <form onSubmit={handleSignIn} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    id="login-email"
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: 38 }}
                    placeholder="rollno@hbtu.ac.in"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="login-password">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ paddingLeft: 38, paddingRight: 40 }}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setStep('forgot'); setError(''); setSuccessMessage('') }}
                style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 600, marginBottom: '1rem', display: 'block', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Forgot password?
              </button>

              <button
                type="submit"
                className="btn btn-primary auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /><span>Verifying credentials...</span></>
                ) : (
                  <>Sign In <ArrowRight size={16} /></>
                )}
              </button>

              {/* OAuth Divider */}
              <div className="auth-divider">
                <div className="auth-divider-line" />
                <span className="auth-divider-text">or continue with</span>
                <div className="auth-divider-line" />
              </div>

              {/* Google OAuth — single unified button */}
              <button
                type="button"
                onClick={handleOAuth}
                disabled={loading}
                className="btn btn-secondary auth-oauth-btn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </form>
          )}

          {/* ==================== REGISTER FORM ==================== */}
          {step === 'register' && (
            <form onSubmit={handleRegister} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-name">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    id="reg-name"
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: 38 }}
                    placeholder="Your full name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    maxLength={120}
                    autoComplete="name"
                    aria-describedby={error ? 'auth-error' : undefined}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    id="reg-email"
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: 38 }}
                    placeholder="you@university.edu"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    autoComplete="email"
                    aria-describedby={error ? 'auth-error' : undefined}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-mobile" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Mobile Number <span style={{ color: '#ef4444' }}>*</span></span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>10-digit Indian Mobile</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    id="reg-mobile"
                    type="tel"
                    className="form-input"
                    style={{ paddingLeft: 38 }}
                    placeholder="9876543210 or +91 9876543210"
                    value={regMobile}
                    onChange={(e) => setRegMobile(e.target.value)}
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    aria-describedby={error ? 'auth-error' : undefined}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-password">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ paddingLeft: 38, paddingRight: 40 }}
                    placeholder="Min 8 characters"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    aria-describedby={error ? 'auth-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Academic Course & Branch Selection */}
              <div style={{
                margin: '1.25rem 0', padding: '1rem', borderRadius: 'var(--radius-lg)',
                background: 'rgba(79, 70, 229, 0.06)', border: '1px solid rgba(79, 70, 229, 0.2)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: '0.8125rem', fontWeight: 700,
                  color: 'var(--color-accent)', marginBottom: '0.75rem',
                }}>
                  <GraduationCap size={16} /> Academic Course & Branch
                  {academicOptionsLoading && <span role="status" style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>Loading…</span>}
                </div>

                {academicOptionsError && (
                  <div role="status" style={{ marginBottom: '0.75rem', fontSize: '0.75rem', color: 'var(--color-danger)' }}>
                    {academicOptionsError}{' '}
                    <button type="button" onClick={() => setAcademicLoadAttempt((attempt) => attempt + 1)} style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
                      Retry
                    </button>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label" htmlFor="reg-program" style={{ fontSize: '0.75rem' }}>Degree Program</label>
                  <select
                    id="reg-program"
                    className="form-select"
                    value={regProgramId}
                    onChange={(e) => handleProgramSelect(e.target.value)}
                    style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem' }}
                    required
                    aria-describedby={error ? 'auth-error' : undefined}
                  >
                    {programsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.short_code} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label" htmlFor="reg-branch" style={{ fontSize: '0.75rem' }}>Branch / Specialization</label>
                  <select
                    id="reg-branch"
                    className="form-select"
                    value={regBranchId}
                    onChange={(e) => setRegBranchId(e.target.value)}
                    style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem' }}
                    required
                    aria-describedby={error ? 'auth-error' : undefined}
                  >
                    {availableBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        [{b.code}] {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="reg-year" style={{ fontSize: '0.75rem' }}>Year</label>
                    <select
                      id="reg-year"
                      className="form-select"
                      value={regYear}
                      onChange={(e) => {
                        const y = Number(e.target.value)
                        setRegYear(y)
                        setRegSemester((y - 1) * 2 + 1)
                      }}
                      style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem' }}
                    >
                      {Array.from({ length: maxYears }, (_, i) => i + 1).map((yr) => (
                        <option key={yr} value={yr}>Year {yr}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="reg-semester" style={{ fontSize: '0.75rem' }}>Semester</label>
                    <select
                      id="reg-semester"
                      className="form-select"
                      value={regSemester}
                      onChange={(e) => setRegSemester(Number(e.target.value))}
                      style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem' }}
                    >
                      <option value={(regYear - 1) * 2 + 1}>Semester {(regYear - 1) * 2 + 1}</option>
                      <option value={(regYear - 1) * 2 + 2}>Semester {(regYear - 1) * 2 + 2}</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary auth-submit-btn"
                disabled={loading || academicOptionsLoading || programsList.length === 0 || branchesList.length === 0}
                style={{ marginTop: '0.5rem' }}
              >
                {loading ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /><span>Creating your account…</span></> : <>Create Account <ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {/* ==================== FORGOT PASSWORD ==================== */}
          {step === 'forgot' && (
            <form onSubmit={handleForgot} noValidate>
              {forgotSent ? (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'var(--color-success-bg)', color: 'var(--color-success)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}>
                    <Mail size={22} />
                  </div>
                  <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Check your email</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
                    If an account exists, password reset instructions have been sent.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setStep('credentials'); setForgotSent(false); setError('') }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8125rem' }}
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="forgot-email">Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                      <input
                        id="forgot-email"
                        type="email"
                        className="form-input"
                        style={{ paddingLeft: 38 }}
                        placeholder="you@university.edu"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary auth-submit-btn"
                    disabled={loading}
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send Reset Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep('credentials'); setError('') }}
                    className="auth-back-btn"
                  >
                    <ArrowLeft size={14} /> Back to Sign In
                  </button>
                </>
              )}
            </form>
          )}
        </div>

        {/* Disclaimer */}
        <p style={{
          textAlign: 'center', fontSize: '0.6875rem',
          color: 'var(--text-quaternary)', marginTop: '1.5rem', lineHeight: 1.5,
        }}>
          Harcoutian Study Hub is an independent, unofficial student platform.
          Not affiliated with, endorsed by, or sponsored by HBTU.
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin { animation: spin 1s linear infinite; }

        /* ============ AUTH PAGE RESPONSIVE STYLES ============ */
        .auth-page-wrapper {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          padding: 2rem;
          position: relative;
          overflow: hidden;
        }

        .auth-ambient-glow {
          position: absolute;
          top: 20%;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 400px;
          background: radial-gradient(ellipse, rgba(79, 70, 229, 0.12), transparent 70%);
          pointer-events: none;
        }

        .auth-container {
          max-width: 440px;
          width: 100%;
          position: relative;
          z-index: 1;
        }

        .auth-brand-link {
          display: inline-flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 1rem;
          text-decoration: none;
        }

        .auth-card {
          padding: 2rem;
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
        }

        .auth-card:hover {
          transform: none;
        }

        .auth-tab-bar {
          display: flex;
          gap: 0.25rem;
          margin-bottom: 1.5rem;
          padding: 0.25rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-full);
        }

        .auth-tab {
          flex: 1;
          padding: 0.5rem;
          border-radius: var(--radius-full);
          font-size: 0.8125rem;
          font-weight: 600;
          background: transparent;
          color: var(--text-tertiary);
          box-shadow: none;
          transition: all 200ms ease;
          border: none;
          cursor: pointer;
        }

        .auth-tab-active {
          background: var(--bg-card);
          color: var(--text-primary);
          box-shadow: var(--shadow-sm);
        }

        .auth-submit-btn {
          width: 100%;
          padding: 0.7rem;
          font-size: 0.875rem;
          font-weight: 700;
          border-radius: var(--radius-md);
          gap: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .auth-oauth-btn {
          width: 100%;
          padding: 0.65rem;
          font-size: 0.875rem;
          font-weight: 600;
          justify-content: center;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.25rem 0;
        }

        .auth-divider-line {
          flex: 1;
          height: 1px;
          background: var(--border-light);
        }

        .auth-divider-text {
          font-size: 0.6875rem;
          color: var(--text-tertiary);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }

        .auth-error-banner {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          background: var(--color-danger-bg);
          color: var(--color-danger);
          font-size: 0.8125rem;
          font-weight: 500;
          margin-bottom: 1rem;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .auth-error-banner:focus {
          outline: 2px solid var(--color-danger);
          outline-offset: 2px;
        }

        .auth-success-banner {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          background: var(--color-success-bg);
          color: var(--color-success);
          font-size: 0.8125rem;
          font-weight: 500;
          margin-bottom: 1rem;
          line-height: 1.4;
        }

        .auth-back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          width: 100%;
          margin-top: 1rem;
          padding: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-tertiary);
          background: none;
          border: none;
          cursor: pointer;
          transition: color 150ms ease;
        }

        .auth-back-btn:hover {
          color: var(--text-primary);
        }

        .auth-loading-card {
          padding: 2.5rem 2rem;
          border-radius: var(--radius-xl);
          max-width: 420px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
          box-shadow: var(--shadow-xl);
        }

        .auth-loading-card:hover {
          transform: none;
        }

        .auth-loading-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5, #06b6d4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4);
        }

        .auth-loading-title {
          font-size: 1.25rem;
          font-weight: 800;
          font-family: var(--font-display);
          margin-bottom: 6px;
          text-align: center;
        }

        .auth-loading-subtitle {
          font-size: 0.875rem;
          color: var(--text-secondary);
          text-align: center;
        }

        /* ============ MOBILE RESPONSIVE ============ */
        @media (max-width: 480px) {
          .auth-page-wrapper {
            padding: 1rem;
            align-items: flex-start;
            padding-top: max(env(safe-area-inset-top, 0px), 1.5rem);
          }

          .auth-container {
            max-width: 100%;
            min-width: 0;
          }

          .auth-card {
            padding: 1.25rem;
            border-radius: var(--radius-lg);
            min-width: 0;
          }

          .auth-card form,
          .auth-card .form-group,
          .auth-card .form-input,
          .auth-card .form-select {
            min-width: 0;
            max-width: 100%;
          }

          .auth-card select {
            text-overflow: ellipsis;
          }

          .auth-ambient-glow {
            width: 300px;
            height: 200px;
            top: 10%;
          }

          .auth-submit-btn {
            min-height: 48px;
            font-size: 0.9375rem;
          }

          .auth-oauth-btn {
            min-height: 48px;
          }
        }

        @media (max-width: 360px) {
          .auth-page-wrapper {
            padding: 0.75rem;
          }

          .auth-card {
            padding: 1rem;
          }
        }

        /* Touch-friendly inputs on mobile */
        @media (hover: none) and (pointer: coarse) {
          .form-input, .form-select {
            min-height: 48px;
            font-size: 16px !important;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .animate-spin {
            animation: none;
          }
          .auth-card, .btn {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}>
        <div style={{ color: 'var(--text-tertiary)' }}>Loading...</div>
      </div>
    }>
      <AuthPageInner />
    </Suspense>
  )
}
