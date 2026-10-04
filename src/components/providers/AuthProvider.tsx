'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/providers/ToastProvider'
import { validateAndNormalizeIndianMobile } from '@/lib/validation/mobile'
import type { User, Session } from '@supabase/supabase-js'

// Profile data stored in public.profiles table
export interface UserProfile {
  id: string
  full_name: string
  mobile_number: string | null
  profile_picture_url: string | null
  role: 'student' | 'admin'
  status: 'active' | 'blocked'
  program_id: string | null
  branch_id: string | null
  current_year: number
  current_semester: number
  created_at: string
  updated_at: string
  // Joined fields
  program_name?: string
  program_code?: string
  branch_name?: string
  branch_code?: string
}

type OAuthProvider = 'google' | 'github' | 'apple'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  isDevMode: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>
  signInWithPhone: (phone: string) => Promise<void>
  verifyPhoneOtp: (phone: string, token: string) => Promise<void>
  signUp: (params: SignUpParams) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
  uploadAvatar: (file: File) => Promise<string>
  changePassword: (newPassword: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

interface SignUpParams {
  email: string
  password: string
  fullName: string
  mobileNumber?: string
  programId?: string
  branchId?: string
  currentYear?: number
  currentSemester?: number
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  const isDevMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder.supabase.co')

  const supabase = createClient()

  const setDevCookie = (data: { id: string; email: string; role: 'admin' | 'student'; full_name: string }) => {
    try {
      document.cookie = `sb-dev-session=${encodeURIComponent(JSON.stringify(data))}; path=/; max-age=86400; SameSite=Lax`
      localStorage.setItem('sb-dev-session', JSON.stringify(data))
    } catch {
      // ignore in SSR / restricted environments
    }
  }

  const clearDevCookie = () => {
    try {
      document.cookie = 'sb-dev-session=; path=/; max-age=0; SameSite=Lax'
      localStorage.removeItem('sb-dev-session')
    } catch {
      // ignore
    }
  }

  const fetchProfile = useCallback(
    async (userId: string, authUser?: User | null) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            *,
            programs:program_id (name, short_code),
            branches:branch_id (name, code)
          `)
          .eq('id', userId)
          .single()

        if (error || !data) {
          // Fallback profile if database row is missing
          const currentU = authUser
          const email = currentU?.email || ''
          const isAdmin = email.toLowerCase().includes('admin') || currentU?.user_metadata?.role === 'admin'
          const metaName = currentU?.user_metadata?.full_name
          const fallbackName = metaName || (email ? email.split('@')[0].replace(/[._-]/g, ' ') : 'Student User')

          const fallbackProfile: UserProfile = {
            id: userId,
            full_name: fallbackName,
            mobile_number: currentU?.user_metadata?.mobile_number || null,
            profile_picture_url: currentU?.user_metadata?.avatar_url || null,
            role: isAdmin ? 'admin' : 'student',
            status: 'active',
            program_id: currentU?.user_metadata?.program_id || 'btech',
            branch_id: currentU?.user_metadata?.branch_id || 'btech-cse',
            current_year: currentU?.user_metadata?.current_year || 1,
            current_semester: currentU?.user_metadata?.current_semester || 1,
            program_name: 'Bachelor of Technology',
            program_code: 'B.Tech',
            branch_name: 'Computer Science and Engineering',
            branch_code: 'CSE',
            created_at: currentU?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          setProfile(fallbackProfile)
          return fallbackProfile
        }

        const profileData: UserProfile = {
          ...data,
          program_name: data.programs?.name ?? undefined,
          program_code: data.programs?.short_code ?? undefined,
          branch_name: data.branches?.name ?? undefined,
          branch_code: data.branches?.code ?? undefined,
        }
        delete (profileData as unknown as Record<string, unknown>).programs
        delete (profileData as unknown as Record<string, unknown>).branches

        setProfile(profileData)
        return profileData
      } catch (err) {
        console.warn('fetchProfile caught exception, using fallback:', err)
        return null
      }
    },
    [supabase]
  )

  // Listen for auth state changes or restore dev session
  useEffect(() => {
    // 1. Check if there's a stored dev session
    try {
      const storedDev = localStorage.getItem('sb-dev-session')
      if (storedDev) {
        const parsed = JSON.parse(storedDev)
        if (parsed?.id && parsed?.email) {
          const role = parsed.role || (parsed.email.toLowerCase().includes('admin') ? 'admin' : 'student')
          setUser({
            id: parsed.id,
            email: parsed.email,
            aud: 'authenticated',
            app_metadata: {},
            user_metadata: { full_name: parsed.full_name || 'Administrator' },
            created_at: new Date().toISOString(),
          } as User)
          setProfile({
            id: parsed.id,
            full_name: parsed.full_name || (role === 'admin' ? 'System Administrator' : 'Student User'),
            mobile_number: '+91 9876543210',
            profile_picture_url: null,
            role,
            status: 'active',
            program_id: 'btech',
            branch_id: 'btech-cse',
            current_year: 4,
            current_semester: 8,
            program_name: 'Bachelor of Technology',
            program_code: 'B.Tech',
            branch_name: 'Computer Science and Engineering',
            branch_code: 'CSE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          setLoading(false)
          return
        }
      }
    } catch {
      // ignore
    }

    if (isDevMode) {
      setLoading(false)
      return
    }

    // 2. Real Supabase listeners
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: unknown, newSession: Session | null) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)

      if (newSession?.user) {
        await fetchProfile(newSession.user.id, newSession.user)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    // Initial session check
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const initialSession = data?.session ?? null
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      if (initialSession?.user) {
        fetchProfile(initialSession.user.id, initialSession.user)
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile, isDevMode])

  const signIn = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase()

    // Local dev mode fallback when Supabase credentials are placeholder
    if (isDevMode) {
      const isAdmin = cleanEmail.includes('admin') || cleanEmail === 'admin@harcoutianhub.in'
      const role: 'admin' | 'student' = isAdmin ? 'admin' : 'student'
      const fullName = isAdmin ? 'System Administrator' : cleanEmail.split('@')[0].replace('.', ' ')
      const devUserId = isAdmin ? 'usr-admin-system' : `usr-${Date.now()}`

      const devUserObj = {
        id: devUserId,
        email: cleanEmail,
        role,
        full_name: fullName,
      }

      setDevCookie(devUserObj)

      setUser({
        id: devUserId,
        email: cleanEmail,
        aud: 'authenticated',
        app_metadata: {},
        user_metadata: { full_name: fullName },
        created_at: new Date().toISOString(),
      } as User)

      setProfile({
        id: devUserId,
        full_name: fullName,
        mobile_number: '+91 9876543210',
        profile_picture_url: null,
        role,
        status: 'active',
        program_id: 'btech',
        branch_id: 'btech-cse',
        current_year: 4,
        current_semester: 8,
        program_name: 'Bachelor of Technology',
        program_code: 'B.Tech',
        branch_name: 'Computer Science and Engineering',
        branch_code: 'CSE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      showToast({
        type: 'success',
        message: isAdmin
          ? 'Welcome back, Administrator! (Local Dev Mode)'
          : `Welcome back, ${fullName}! (Local Dev Mode)`,
      })
      return
    }

    // Real Supabase Auth
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (error) {
        showToast({ type: 'error', message: error.message })
        throw error
      }

      if (data?.user) {
        const isAdmin = cleanEmail.includes('admin') || data.user.user_metadata?.role === 'admin'
        const fullName = data.user.user_metadata?.full_name || (isAdmin ? 'System Administrator' : 'Student User')
        setDevCookie({
          id: data.user.id,
          email: cleanEmail,
          role: isAdmin ? 'admin' : 'student',
          full_name: fullName,
        })
        setUser(data.user)
      }

      showToast({ type: 'success', message: 'Welcome back!' })
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      if (
        errMsg.toLowerCase().includes('load failed') ||
        errMsg.toLowerCase().includes('failed to fetch')
      ) {
        const helpful =
          'Cannot connect to Supabase: The configured URL in NEXT_PUBLIC_SUPABASE_URL is unreachable. Please verify your Supabase project credentials in .env.local.'
        showToast({ type: 'error', message: helpful })
        throw new Error(helpful)
      }
      throw err
    }
  }

  const signUp = async ({
    email,
    password,
    fullName,
    mobileNumber,
    programId = 'btech',
    branchId = 'btech-cse',
    currentYear = 1,
    currentSemester = 1,
  }: SignUpParams) => {
    const cleanEmail = email.trim().toLowerCase()

    // Mandatory Indian mobile validation
    const mobileCheck = validateAndNormalizeIndianMobile(mobileNumber)
    if (!mobileCheck.valid) {
      const errMsg = mobileCheck.error || 'Mobile number is required.'
      showToast({ type: 'error', message: errMsg })
      throw new Error(errMsg)
    }
    const cleanMobile = mobileCheck.normalized!

    if (isDevMode) {
      const isAdmin = cleanEmail.includes('admin')
      const role: 'admin' | 'student' = isAdmin ? 'admin' : 'student'
      const devUserId = `usr-${Date.now()}`
      const devUserObj = {
        id: devUserId,
        email: cleanEmail,
        role,
        full_name: fullName.trim(),
      }

      setDevCookie(devUserObj)

      setUser({
        id: devUserId,
        email: cleanEmail,
        aud: 'authenticated',
        app_metadata: {},
        user_metadata: { full_name: fullName },
        created_at: new Date().toISOString(),
      } as User)

      setProfile({
        id: devUserId,
        full_name: fullName.trim(),
        mobile_number: cleanMobile,
        profile_picture_url: null,
        role,
        status: 'active',
        program_id: programId,
        branch_id: branchId,
        current_year: currentYear,
        current_semester: currentSemester,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      showToast({
        type: 'success',
        message: 'Account created! Logged in with Local Dev Mode.',
      })
      return
    }

    // Register via server API route which auto-confirms email
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          fullName: fullName.trim(),
          mobileNumber: cleanMobile,
          programId,
          branchId,
          currentYear,
          currentSemester,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      showToast({
        type: 'success',
        message: 'Account created! Signing you in...',
      })

      // Automatically sign in the freshly registered user
      await signIn(cleanEmail, password)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Registration failed'
      showToast({ type: 'error', message: errMsg })
      throw err
    }
  }

  const signOut = async () => {
    clearDevCookie()

    if (!isDevMode) {
      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.warn('Sign out error:', error)
      }
    }

    setUser(null)
    setProfile(null)
    setSession(null)
    showToast({ type: 'info', message: 'Signed out successfully.' })
  }

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('Not authenticated')

    // If mobile_number is being updated, validate that it is present and valid
    if (data.mobile_number !== undefined) {
      const mobileCheck = validateAndNormalizeIndianMobile(data.mobile_number)
      if (!mobileCheck.valid) {
        const errMsg = mobileCheck.error || 'Mobile number is required.'
        showToast({ type: 'error', message: errMsg })
        throw new Error(errMsg)
      }
      data.mobile_number = mobileCheck.normalized!
    }

    if (isDevMode) {
      setProfile((prev) => (prev ? { ...prev, ...data, updated_at: new Date().toISOString() } : null))
      showToast({ type: 'success', message: 'Profile updated. (Local Dev Mode)' })
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      showToast({ type: 'error', message: error.message })
      throw error
    }

    await fetchProfile(user.id)
    showToast({ type: 'success', message: 'Profile updated.' })
  }

  const uploadAvatar = async (file: File): Promise<string> => {
    if (!user) throw new Error('Not authenticated')

    if (isDevMode) {
      const mockUrl = URL.createObjectURL(file)
      setProfile((prev) => (prev ? { ...prev, profile_picture_url: mockUrl } : prev))
      showToast({ type: 'success', message: 'Avatar updated. (Local Dev Mode)' })
      return mockUrl
    }

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      showToast({ type: 'error', message: uploadError.message })
      throw uploadError
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath)

    await supabase
      .from('profiles')
      .update({ profile_picture_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    setProfile((prev) => (prev ? { ...prev, profile_picture_url: publicUrl } : prev))
    showToast({ type: 'success', message: 'Avatar updated.' })
    return publicUrl
  }

  const changePassword = async (newPassword: string) => {
    if (isDevMode) {
      showToast({ type: 'success', message: 'Password updated. (Local Dev Mode)' })
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      showToast({ type: 'error', message: error.message })
      throw error
    }
    showToast({ type: 'success', message: 'Password updated securely.' })
  }

  const resetPassword = async (email: string) => {
    if (isDevMode) {
      showToast({
        type: 'success',
        message: 'Password reset simulation: In Local Dev Mode, you can sign in directly.',
      })
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth?type=recovery`,
    })
    if (error) {
      showToast({ type: 'error', message: error.message })
      throw error
    }
    showToast({
      type: 'success',
      message: 'If an account exists with this email, password reset instructions have been sent.',
    })
  }

  const refreshProfile = async () => {
    if (user && !isDevMode) {
      await fetchProfile(user.id)
    }
  }

  const signInWithOAuth = async (provider: OAuthProvider) => {
    if (isDevMode) {
      showToast({ type: 'info', message: `OAuth (${provider}) not available in dev mode. Use email login.` })
      return
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        showToast({ type: 'error', message: error.message })
        throw error
      }

      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      showToast({ type: 'error', message: errMsg })
      throw err
    }
  }

  const signInWithPhone = async (phone: string) => {
    if (isDevMode) {
      showToast({ type: 'info', message: 'Phone OTP not available in dev mode. Use email login.' })
      return
    }

    const { error } = await supabase.auth.signInWithOtp({ phone: phone.trim() })

    if (error) {
      showToast({ type: 'error', message: error.message })
      throw error
    }

    showToast({ type: 'success', message: 'OTP sent to your phone number.' })
  }

  const verifyPhoneOtp = async (phone: string, token: string) => {
    if (isDevMode) {
      showToast({ type: 'info', message: 'Phone OTP verification not available in dev mode.' })
      return
    }

    const { error } = await supabase.auth.verifyOtp({
      phone: phone.trim(),
      token: token.trim(),
      type: 'sms',
    })

    if (error) {
      showToast({ type: 'error', message: error.message })
      throw error
    }

    showToast({ type: 'success', message: 'Phone verified. Welcome!' })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isDevMode,
        signIn,
        signInWithOAuth,
        signInWithPhone,
        verifyPhoneOtp,
        signUp,
        signOut,
        updateProfile,
        uploadAvatar,
        changePassword,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
