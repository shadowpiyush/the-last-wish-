import type { UserProfile } from '@/components/providers/AuthProvider'

/**
 * Authoritative Profile Completeness Checker
 *
 * A profile is considered complete if and only if:
 * 1. An authoritative profile object exists.
 * 2. Mobile number is present, non-empty, and at least 10 digits.
 * 3. Academic program_id is present and non-empty.
 * 4. Academic branch_id is present and non-empty.
 */
export function isProfileComplete(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false

  const hasMobile = Boolean(
    profile.mobile_number &&
    typeof profile.mobile_number === 'string' &&
    profile.mobile_number.trim().length >= 10
  )

  const hasProgram = Boolean(
    profile.program_id &&
    typeof profile.program_id === 'string' &&
    profile.program_id.trim().length > 0
  )

  const hasBranch = Boolean(
    profile.branch_id &&
    typeof profile.branch_id === 'string' &&
    profile.branch_id.trim().length > 0
  )

  return hasMobile && hasProgram && hasBranch
}
