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
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>
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

  const supabase = createClient()

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
          // If no profile exists, fallback to basic student profile
          // We NO LONGER check email for 'admin' string here.
          const currentU = authUser
          const fallbackProfile: UserProfile = {
            id: userId,
            full_name: currentU?.user_metadata?.full_name || 'Student User',
            mobile_number: currentU?.user_metadata?.mobile_number || null,
            profile_picture_url: currentU?.user_metadata?.avatar_url || null,
            role: currentU?.user_metadata?.role === 'admin' ? 'admin' : 'student',
            status: 'active',
            program_id: currentU?.user_metadata?.program_id || 'btech',
            branch_id: currentU?.user_metadata?.branch_id || 'btech-cse',
            current_year: currentU?.user_metadata?.current_year || 1,
            current_semester: currentU?.user_metadata?.current_semester || 1,
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
        console.warn('fetchProfile error:', err)
        return null
      }
    },
    [supabase]
  )

  useEffect(() => {
    // Real Supabase listeners
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
      } else {
        setLoading(false)
      }
    }).catch(() => {
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

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

    // Register via server API route which auto-confirms email and sets role strictly to student
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

      // Do NOT sign in automatically to enforce the OTP flow on manual sign-in
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Registration failed'
      showToast({ type: 'error', message: errMsg })
      throw err
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.warn('Sign out error:', error)
    }
    setUser(null)
    setProfile(null)
    setSession(null)
    showToast({ type: 'info', message: 'Signed out successfully.' })
  }

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('Not authenticated')

    if (data.mobile_number !== undefined) {
      const mobileCheck = validateAndNormalizeIndianMobile(data.mobile_number)
      if (!mobileCheck.valid) {
        const errMsg = mobileCheck.error || 'Mobile number is required.'
        showToast({ type: 'error', message: errMsg })
        throw new Error(errMsg)
      }
      data.mobile_number = mobileCheck.normalized!
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
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      showToast({ type: 'error', message: error.message })
      throw error
    }
    showToast({ type: 'success', message: 'Password updated securely.' })
  }

  const resetPassword = async (email: string) => {
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
    if (user) {
      await fetchProfile(user.id)
    }
  }

  const signInWithOAuth = async (provider: OAuthProvider) => {
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

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signInWithOAuth,
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
