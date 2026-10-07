export interface AvatarReference {
  id: string
  profile_picture_path?: string | null
  profile_picture_version?: string | null
  profile_picture_url?: string | null
}

/** Returns a same-origin, authenticated image route for new private avatar objects. */
export function getAvatarUrl(profile: AvatarReference, size = 256): string | null {
  if (profile.profile_picture_path) {
    const params = new URLSearchParams({ userId: profile.id })
    if (profile.profile_picture_version) params.set('v', profile.profile_picture_version)
    params.set('size', String(size))
    return `/api/profile/avatar?${params.toString()}`
  }
  return profile.profile_picture_url || null
}
