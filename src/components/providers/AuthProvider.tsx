'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/providers/ToastProvider'
import { validateAndNormalizeIndianMobile } from '@/lib/validation/mobile'
import { getBaseUrl, getAuthCallbackUrl } from '@/lib/auth/url'
import { getAvatarUrl } from '@/lib/profile/avatar'
import type { User, Session } from '@supabase/supabase-js'

// Profile data stored in public.profiles table
export interface UserProfile {
  id: string
  full_name: string
  mobile_number: string | null
  profile_picture_url: string | null
  profile_picture_path?: string | null
  profile_picture_version?: string | null
  profile_picture_mime_type?: string | null
  profile_picture_size_bytes?: number | null
  profile_picture_width?: number | null
  profile_picture_height?: number | null
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

export interface CompleteProfileParams {
  fullName?: string
  mobileNumber: string
  programId: string
  branchId: string
  currentYear: number
  currentSemester: number
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUp: (params: SignUpParams) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
  completeProfile: (params: CompleteProfileParams) => Promise<UserProfile>
  uploadAvatar: (file: File) => Promise<string>
  removeAvatar: () => Promise<void>
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
  const profileUserIdRef = useRef<string | null>(null)

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
          profile_picture_url: getAvatarUrl(data),
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)

      if (newSession?.user) {
        const userId = newSession.user.id
        const shouldFetchProfile = profileUserIdRef.current !== userId || event === 'USER_UPDATED'

        if (shouldFetchProfile) {
          profileUserIdRef.current = userId
          setLoading(true)
          // Keep the auth event callback quick; the profile request must not delay
          // Supabase's other session events or trigger a duplicate getSession call.
          void fetchProfile(userId, newSession.user).finally(() => setLoading(false))
        } else {
          setLoading(false)
        }
      } else {
        profileUserIdRef.current = null
        setProfile(null)
        setLoading(false)
      }
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

    // Register via server API route which sends a confirmation email; does NOT auto-sign in
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 25_000)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
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

      const data = await res.json().catch(() => null) as {
        success?: boolean
        message?: string
        error?: { code?: string; message?: string } | string
        requestId?: string
        requiresEmailVerification?: boolean
      } | null

      if (!res.ok || !data?.success) {
        const error = typeof data?.error === 'object' ? data.error : undefined
        const code = error?.code
        const message = error?.message || (typeof data?.error === 'string' ? data.error : '')
        const safeMessage = code === 'ACCOUNT_EXISTS'
          ? 'An account with this email already exists. Please sign in or check your email.'
          : code === 'VALIDATION_ERROR'
            ? message || 'Please correct the highlighted fields.'
            : code === 'SERVICE_UNAVAILABLE'
              ? message || 'Registration is temporarily unavailable. Please try again later.'
              : code === 'PROFILE_SETUP_FAILED'
                ? `${message} Reference: ${data?.requestId || 'unavailable'}.`
                : 'Something went wrong on our server. Please try again.'
        throw new Error(safeMessage)
      }

      // Registration succeeded — user must verify their email before signing in.
      if (data.requiresEmailVerification) {
        showToast({
          type: 'success',
          message: data.message || 'Please check your email and click the verification link to activate your account.',
        })
      }

      // We do NOT sign in automatically after registration.
      // The user must verify their email first, then sign in.
    } catch (err: unknown) {
      const isTimeout = err instanceof DOMException && err.name === 'AbortError'
      const isNetworkFailure = err instanceof TypeError
      const errMsg = isTimeout
        ? 'The request took too long. Check your connection and try again.'
        : isNetworkFailure
          ? "We couldn't reach the server. Check your connection and try again."
          : err instanceof Error
            ? err.message
            : 'Something went wrong on our server. Please try again.'
      showToast({ type: 'error', message: errMsg })
      throw new Error(errMsg)
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  const signInWithPassword = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase()
    
    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (error) {
      showToast({ type: 'error', message: error.message })
      throw error
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

  const completeProfile = async (params: CompleteProfileParams): Promise<UserProfile> => {
    if (!user) throw new Error('Not authenticated')

    const res = await fetch('/api/profile/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        fullName: params.fullName || profile?.full_name || user.user_metadata?.full_name || '',
      }),
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      const errMsg = data.error || 'Failed to complete profile'
      showToast({ type: 'error', message: errMsg })
      throw new Error(errMsg)
    }

    const updatedProfile = data.profile as UserProfile
    // Authoritatively set profile immediately so that route guards see it without race condition
    setProfile(updatedProfile)
    showToast({ type: 'success', message: 'Profile completed successfully!' })
    return updatedProfile
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

    // If all academic onboarding fields are present, route through atomic server completion
    if (data.program_id && data.branch_id && data.mobile_number) {
      await completeProfile({
        fullName: data.full_name,
        mobileNumber: data.mobile_number,
        programId: data.program_id,
        branchId: data.branch_id,
        currentYear: data.current_year ?? 1,
        currentSemester: data.current_semester ?? 1,
      })
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

    const formData = new FormData()
    formData.set('file', file)
    const response = await fetch('/api/profile/avatar', { method: 'POST', body: formData })
    const data = await response.json().catch(() => null) as { avatarUrl?: string; error?: string } | null
    if (!response.ok || !data?.avatarUrl) {
      const message = data?.error || 'Unable to upload the profile picture. Please try again.'
      showToast({ type: 'error', message })
      throw new Error(message)
    }

    await fetchProfile(user.id, user)
    showToast({ type: 'success', message: 'Profile picture updated.' })
    return data.avatarUrl
  }

  const removeAvatar = async (): Promise<void> => {
    if (!user) throw new Error('Not authenticated')

    const response = await fetch('/api/profile/avatar', { method: 'DELETE' })
    const data = await response.json().catch(() => null) as { error?: string } | null
    if (!response.ok) {
      const message = data?.error || 'Unable to remove the profile picture. Please try again.'
      showToast({ type: 'error', message })
      throw new Error(message)
    }

    await fetchProfile(user.id, user)
    showToast({ type: 'success', message: 'Profile picture removed.' })
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
    const base = getBaseUrl()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${base}/auth?type=recovery`,
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
      const callbackUrl = getAuthCallbackUrl()
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl,
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
        signInWithPassword,
        signUp,
        signOut,
        updateProfile,
        completeProfile,
        uploadAvatar,
        removeAvatar,
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
