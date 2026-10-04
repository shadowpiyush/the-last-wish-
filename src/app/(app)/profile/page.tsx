'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Phone, GraduationCap, Lock, Camera, Save, LogOut, Shield, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { validateAndNormalizeIndianMobile } from '@/lib/validation/mobile'

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

export default function ProfilePage() {
  const supabase = createClient()
  const { user, profile, signOut, changePassword, updateProfile, refreshProfile, loading: authLoading } = useAuth()

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [mobile, setMobile] = useState(profile?.mobile_number || '')
  const [programId, setProgramId] = useState(profile?.program_id || '')
  const [branchId, setBranchId] = useState(profile?.branch_id || '')
  const [currentYear, setCurrentYear] = useState(profile?.current_year || 1)
  const [currentSemester, setCurrentSemester] = useState(profile?.current_semester || 1)

  const [programs, setPrograms] = useState<ProgramItem[]>([])
  const [branches, setBranches] = useState<BranchItem[]>([])

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Password change
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMessage, setPwMessage] = useState('')

  // Sync state when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setMobile(profile.mobile_number || '')
      if (profile.program_id) setProgramId(profile.program_id)
      if (profile.branch_id) setBranchId(profile.branch_id)
      if (profile.current_year) setCurrentYear(profile.current_year)
      if (profile.current_semester) setCurrentSemester(profile.current_semester)
    }
  }, [profile])

  // Load programs and branches
  useEffect(() => {
    async function loadData() {
      const { data: progs } = await supabase
        .from('programs')
        .select('id, name, short_code, duration_years, total_semesters')
        .order('name')

      const { data: brs } = await supabase
        .from('branches')
        .select('id, program_id, name, code')
        .order('name')

      if (progs) setPrograms(progs)
      if (brs) setBranches(brs)

      if (progs && progs.length > 0 && !profile?.program_id) {
        const btech = (progs as ProgramItem[]).find((p: ProgramItem) => p.short_code === 'B.Tech') || progs[0]
        setProgramId(btech.id)
        if (brs && brs.length > 0) {
          const match = (brs as BranchItem[]).filter((b: BranchItem) => b.program_id === btech.id)
          if (match.length > 0) setBranchId(match[0].id)
        }
      }
    }
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleProgramChange = (progId: string) => {
    setProgramId(progId)
    const matching = branches.filter((b) => b.program_id === progId)
    if (matching.length > 0) {
      setBranchId(matching[0].id)
    } else {
      setBranchId('')
    }
    setCurrentYear(1)
    setCurrentSemester(1)
  }

  const selectedProgObj = programs.find((p) => p.id === programId)
  const maxYears = selectedProgObj?.duration_years || 4
  const availableBranches = branches.filter((b) => b.program_id === programId)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    // Mandatory Indian mobile number validation
    const mobileCheck = validateAndNormalizeIndianMobile(mobile)
    if (!mobileCheck.valid) {
      setMessage(`Error: ${mobileCheck.error || 'Mobile number is required.'}`)
      setSaving(false)
      return
    }

    try {
      await updateProfile({
        full_name: fullName.trim(),
        mobile_number: mobileCheck.normalized!,
        program_id: programId || null,
        branch_id: branchId || null,
        current_year: Number(currentYear),
        current_semester: Number(currentSemester),
      })
      await refreshProfile()
      setMessage('Profile updated successfully!')
    } catch (err: unknown) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Failed to update profile'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMessage('')

    if (newPassword.length < 8) {
      setPwMessage('Error: Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwMessage('Error: Passwords do not match.')
      return
    }

    setPwSaving(true)
    try {
      await changePassword(newPassword)
      setPwMessage('Password changed successfully!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      setPwMessage(`Error: ${err instanceof Error ? err.message : 'Failed to change password'}`)
    } finally {
      setPwSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/auth'
  }

  if (authLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-tertiary)' }}>Loading profile...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-tertiary)' }}>Please sign in to view your profile.</p>
      </div>
    )
  }

  const currentBranchObj = branches.find((b) => b.id === (profile?.branch_id || branchId))
  const currentProgObj = programs.find((p) => p.id === (profile?.program_id || programId))

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: 840, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.025em',
          marginBottom: 6,
        }}>
          Profile & Academic Settings
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Manage your student profile, academic branch, degree program, and security settings.
        </p>
      </div>

      {/* Profile Card */}
      <div className="glass-card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '1.5rem',
            fontWeight: 800,
            flexShrink: 0,
            position: 'relative',
          }}>
            {profile?.profile_picture_url ? (
              <img
                src={profile.profile_picture_url}
                alt="Avatar"
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              (profile?.full_name || user.email || 'U').charAt(0).toUpperCase()
            )}
            <div style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--bg-card)',
              border: '2px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}>
              <Camera size={11} color="var(--text-tertiary)" />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {profile?.full_name || 'Student'}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{user.email}</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <span className={`badge ${profile?.role === 'admin' ? 'badge-indigo' : 'badge-green'}`} style={{ fontSize: '0.625rem' }}>
                {profile?.role === 'admin' ? '🛡 Admin' : '🎓 Student'}
              </span>
              {currentProgObj && (
                <span className="badge badge-maroon" style={{ fontSize: '0.625rem' }}>
                  {currentProgObj.short_code}
                </span>
              )}
              {currentBranchObj && (
                <span className="badge badge-neutral" style={{ fontSize: '0.625rem' }}>
                  [{currentBranchObj.code}] {currentBranchObj.name}
                </span>
              )}
              <span className="badge badge-indigo" style={{ fontSize: '0.625rem' }}>
                Year {profile?.current_year || currentYear} · Sem {profile?.current_semester || currentSemester}
              </span>
            </div>
          </div>
        </div>

        {message && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            background: message.includes('Error') ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
            color: message.includes('Error') ? 'var(--color-danger)' : 'var(--color-success)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            {message.includes('Error') ? null : <CheckCircle2 size={16} />}
            {message}
          </div>
        )}

        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={13} /> Full Name
              </label>
              <input
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Mail size={13} /> Email (Verified)
              </label>
              <input
                className="form-input"
                value={user.email || ''}
                disabled
                style={{ opacity: 0.6 }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={13} /> Mobile Number <span style={{ color: '#ef4444' }}>*</span>
                </span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>10-digit Indian Mobile</span>
              </label>
              <input
                type="tel"
                className="form-input"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="9876543210 or +91 9876543210"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <GraduationCap size={13} /> Degree Program
              </label>
              <select
                className="form-select"
                value={programId}
                onChange={(e) => handleProgramChange(e.target.value)}
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.short_code} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Branch / Specialization</label>
              <select
                className="form-select"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                {availableBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    [{b.code}] {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Academic Year</label>
                <select
                  className="form-select"
                  value={currentYear}
                  onChange={(e) => {
                    const y = Number(e.target.value)
                    setCurrentYear(y)
                    setCurrentSemester((y - 1) * 2 + 1)
                  }}
                >
                  {Array.from({ length: maxYears }, (_, i) => i + 1).map((yr) => (
                    <option key={yr} value={yr}>
                      Year {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Semester</label>
                <select
                  className="form-select"
                  value={currentSemester}
                  onChange={(e) => setCurrentSemester(Number(e.target.value))}
                >
                  <option value={(currentYear - 1) * 2 + 1}>Semester {(currentYear - 1) * 2 + 1}</option>
                  <option value={(currentYear - 1) * 2 + 2}>Semester {(currentYear - 1) * 2 + 2}</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{
              marginTop: '1.25rem',
              padding: '0.65rem 1.75rem',
              fontSize: '0.8125rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Save size={15} /> {saving ? 'Saving...' : 'Save Academic Details'}
          </button>
        </form>
      </div>

      {/* Security Section */}
      <div className="glass-card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={18} color="var(--color-accent)" />
          Security Settings
        </h3>

        {pwMessage && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            background: pwMessage.includes('Error') ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
            color: pwMessage.includes('Error') ? 'var(--color-danger)' : 'var(--color-success)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            marginBottom: '1rem',
          }}>
            {pwMessage}
          </div>
        )}

        <form onSubmit={handleUpdatePassword}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Lock size={13} /> New Password
              </label>
              <input
                className="form-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                minLength={8}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Lock size={13} /> Confirm Password
              </label>
              <input
                className="form-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-secondary"
            disabled={pwSaving}
            style={{
              marginTop: '0.5rem',
              padding: '0.6rem 1.5rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            {pwSaving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Sign Out */}
      <button
        type="button"
        onClick={handleSignOut}
        className="btn btn-secondary"
        style={{
          width: '100%',
          padding: '0.7rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          color: '#e11d48',
          borderColor: 'rgba(225, 29, 72, 0.3)',
        }}
      >
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  )
}
