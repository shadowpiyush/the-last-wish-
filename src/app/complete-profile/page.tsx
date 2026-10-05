'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { validateAndNormalizeIndianMobile } from '@/lib/validation/mobile'
import { Phone, GraduationCap, ArrowRight, Loader2, AlertCircle } from 'lucide-react'

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

function CompleteProfileInner() {
  const router = useRouter()
  const { user, profile, updateProfile, loading: authLoading } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [mobile, setMobile] = useState('')
  const [programsList, setProgramsList] = useState<ProgramItem[]>([])
  const [branchesList, setBranchesList] = useState<BranchItem[]>([])
  
  const [regProgramId, setRegProgramId] = useState<string>('')
  const [regBranchId, setRegBranchId] = useState<string>('')
  const [regYear, setRegYear] = useState<number>(1)
  const [regSemester, setRegSemester] = useState<number>(1)

  // Redirect if already completed
  useEffect(() => {
    if (!authLoading && profile) {
      if (profile.mobile_number && profile.program_id) {
        router.replace(profile.role === 'admin' ? '/admin' : '/dashboard')
      }
    }
    if (!authLoading && !user) {
      router.replace('/auth')
    }
  }, [authLoading, user, profile, router])

  // Fetch programs and branches
  useEffect(() => {
    const supabase = createClient()
    async function loadProgramsAndBranches() {
      try {
        const { data: progs } = await supabase
          .from('programs')
          .select('id, name, short_code, duration_years, total_semesters')
          .order('name')

        const { data: branches } = await supabase
          .from('branches')
          .select('id, program_id, name, code')
          .order('name')

        if (progs && progs.length > 0) {
          setProgramsList(progs as ProgramItem[])
          const btech = (progs as ProgramItem[]).find((p: ProgramItem) => p.short_code === 'B.Tech') || progs[0]
          setRegProgramId(btech.id)

          if (branches && branches.length > 0) {
            setBranchesList(branches as BranchItem[])
            const matching = (branches as BranchItem[]).filter((b: BranchItem) => b.program_id === btech.id)
            if (matching.length > 0) {
              setRegBranchId(matching[0].id)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load academic programs:', err)
      }
    }
    loadProgramsAndBranches()
  }, [])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const mobileCheck = validateAndNormalizeIndianMobile(mobile)
    if (!mobileCheck.valid) {
      setError(mobileCheck.error || 'Please provide a valid Indian mobile number.')
      return
    }

    if (!regProgramId || !regBranchId) {
      setError('Please select your academic program and branch.')
      return
    }

    setLoading(true)
    try {
      await updateProfile({
        mobile_number: mobileCheck.normalized!,
        program_id: regProgramId,
        branch_id: regBranchId,
        current_year: regYear,
        current_semester: regSemester,
      })
      
      // Force a full refresh to ensure all layouts fetch the latest data
      window.location.href = profile?.role === 'admin' ? '/admin' : '/dashboard'
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.'
      setError(msg)
      setLoading(false)
    }
  }

  const selectedProgramObj = programsList.find((p) => p.id === regProgramId)
  const maxYears = selectedProgramObj?.duration_years || 4
  const availableBranches = branchesList.filter((b) => b.program_id === regProgramId)

  if (authLoading || !user) {
    return (
      <div className="auth-page-wrapper">
        <Loader2 className="animate-spin" size={32} color="var(--color-accent)" />
      </div>
    )
  }

  return (
    <div className="auth-page-wrapper">
      <div className="auth-ambient-glow" />
      <div className="auth-container">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
            Complete Your <span className="text-gradient">Profile</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            We need a few more details to set up your student account.
          </p>
        </div>

        <div className="glass-card auth-card">
          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-mobile" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Mobile Number <span style={{ color: '#ef4444' }}>*</span></span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>10-digit Indian Mobile</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  id="profile-mobile"
                  type="tel"
                  className="form-input"
                  style={{ paddingLeft: 38 }}
                  placeholder="9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div style={{
              margin: '1.25rem 0', padding: '1rem', borderRadius: 'var(--radius-lg)',
              background: 'rgba(79, 70, 229, 0.06)', border: '1px solid rgba(79, 70, 229, 0.2)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: '0.8125rem', fontWeight: 700,
                color: 'var(--color-accent)', marginBottom: '0.75rem',
              }}>
                <GraduationCap size={16} /> Academic Details
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" htmlFor="reg-program" style={{ fontSize: '0.75rem' }}>Degree Program</label>
                <select
                  id="reg-program"
                  className="form-select"
                  value={regProgramId}
                  onChange={(e) => handleProgramSelect(e.target.value)}
                  style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem' }}
                >
                  {programsList.map((p) => (
                    <option key={p.id} value={p.id}>{p.short_code} — {p.name}</option>
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
                >
                  {availableBranches.map((b) => (
                    <option key={b.id} value={b.id}>[{b.code}] {b.name}</option>
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
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /><span>Saving...</span></>
              ) : (
                <>Continue to Dashboard <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin { animation: spin 1s linear infinite; }

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

        .auth-card {
          padding: 2rem;
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
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
        }
      `}</style>
    </div>
  )
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}>
        <Loader2 className="animate-spin" size={32} color="var(--color-accent)" />
      </div>
    }>
      <CompleteProfileInner />
    </Suspense>
  )
}
