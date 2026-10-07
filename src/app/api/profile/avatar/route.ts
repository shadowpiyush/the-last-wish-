import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/admin'
import { inspectProfileImage, PROFILE_IMAGE_MAX_BYTES } from '@/lib/validation/profile-image'
import { invalidateAuthCache } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

const AVATAR_BUCKET = 'profile-images'

interface CachedSignedAvatar {
  url: string
  path: string
  expiresAt: number
}

// In-memory signed avatar URL cache (TTL: 50s, signed URL lifetime: 90s)
const signedAvatarCache = new Map<string, CachedSignedAvatar>()

function clearAvatarCacheForUser(userId: string) {
  for (const key of signedAvatarCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      signedAvatarCache.delete(key)
    }
  }
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null
  return createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function requireCurrentUser() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return error ? null : user
}

export async function GET(request: Request) {
  try {
    const requester = await getAuthUser(request)
    if (!requester) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })

    const userId = new URL(request.url).searchParams.get('userId')
    const requestedSize = Number(new URL(request.url).searchParams.get('size') || 256)
    const size = [48, 96, 256, 512].includes(requestedSize) ? requestedSize : 256
    if (!userId || !/^[0-9a-fA-F-]{36}$/.test(userId)) {
      return NextResponse.json({ error: 'A valid profile is required.' }, { status: 400 })
    }
    if (requester.id !== userId && requester.role !== 'admin') {
      return NextResponse.json({ error: 'You do not have access to this profile image.' }, { status: 403 })
    }

    const cacheKey = `${userId}:${size}`
    const cached = signedAvatarCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.redirect(cached.url, {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=30',
          'Vary': 'Cookie',
          'X-Avatar-Cache': 'HIT',
        },
      })
    }

    const supabaseAdmin = getAdminClient()
    if (!supabaseAdmin) return NextResponse.json({ error: 'Storage is unavailable.' }, { status: 503 })

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('profile_picture_path')
      .eq('id', userId)
      .maybeSingle()
    if (profileError) throw profileError
    if (!profile?.profile_picture_path) return NextResponse.json({ error: 'No profile picture is available.' }, { status: 404 })

    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(profile.profile_picture_path, 90, {
        transform: { width: size, height: size, resize: 'cover', quality: 80 },
      })
    if (signedError || !signed?.signedUrl) throw signedError || new Error('Could not create image URL.')

    signedAvatarCache.set(cacheKey, {
      url: signed.signedUrl,
      path: profile.profile_picture_path,
      expiresAt: Date.now() + 50_000,
    })

    return NextResponse.redirect(signed.signedUrl, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=30',
        'Vary': 'Cookie',
        'X-Avatar-Cache': 'MISS',
      },
    })
  } catch (error) {
    console.error('Profile avatar read error:', error)
    return NextResponse.json({ error: 'Unable to load the profile picture.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser()
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })

    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > PROFILE_IMAGE_MAX_BYTES + 32_768) {
      return NextResponse.json({ error: 'Profile pictures must be no larger than 4 MB.' }, { status: 413 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 })
    }
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      return NextResponse.json({ error: 'Profile pictures must be no larger than 4 MB.' }, { status: 413 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const inspection = inspectProfileImage(file.name, file.type, bytes)
    if (!inspection.ok) return NextResponse.json({ error: inspection.error }, { status: 400 })

    const supabaseAdmin = getAdminClient()
    if (!supabaseAdmin) return NextResponse.json({ error: 'Storage is unavailable.' }, { status: 503 })

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('profiles')
      .select('profile_picture_path')
      .eq('id', user.id)
      .maybeSingle()
    if (existingError || !existing) {
      return NextResponse.json({ error: 'Your profile could not be found.' }, { status: 404 })
    }

    const imageVersion = crypto.randomUUID()
    const newPath = `${user.id}/${imageVersion}.${inspection.image.extension}`
    const { error: uploadError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .upload(newPath, bytes, {
        contentType: inspection.image.mimeType,
        cacheControl: '31536000',
        upsert: false,
      })
    if (uploadError) throw uploadError

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        profile_picture_url: null,
        profile_picture_path: newPath,
        profile_picture_version: imageVersion,
        profile_picture_mime_type: inspection.image.mimeType,
        profile_picture_size_bytes: file.size,
        profile_picture_width: inspection.image.width,
        profile_picture_height: inspection.image.height,
        profile_picture_uploaded_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    if (updateError) {
      await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([newPath])
      throw updateError
    }

    // The new reference is durable before the old object is touched. A failed cleanup
    // only leaves a retry-safe orphan and never makes the profile point to a missing image.
    if (existing.profile_picture_path) {
      const { error: removeError } = await supabaseAdmin.storage
        .from(AVATAR_BUCKET)
        .remove([existing.profile_picture_path])
      if (removeError) console.warn('Previous profile image cleanup failed:', removeError.message)
    }

    clearAvatarCacheForUser(user.id)
    invalidateAuthCache(user.id)

    return NextResponse.json({
      success: true,
      message: 'Profile picture updated.',
      avatarUrl: `/api/profile/avatar?userId=${encodeURIComponent(user.id)}&v=${imageVersion}&size=256`,
    })
  } catch (error) {
    console.error('Profile avatar upload error:', error)
    return NextResponse.json({ error: 'Unable to upload the profile picture. Please try again.' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const user = await requireCurrentUser()
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })

    const supabaseAdmin = getAdminClient()
    if (!supabaseAdmin) return NextResponse.json({ error: 'Storage is unavailable.' }, { status: 503 })

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('profile_picture_path')
      .eq('id', user.id)
      .maybeSingle()
    if (profileError || !profile) return NextResponse.json({ error: 'Your profile could not be found.' }, { status: 404 })

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        profile_picture_url: null,
        profile_picture_path: null,
        profile_picture_version: null,
        profile_picture_mime_type: null,
        profile_picture_size_bytes: null,
        profile_picture_width: null,
        profile_picture_height: null,
        profile_picture_uploaded_at: null,
      })
      .eq('id', user.id)
    if (updateError) throw updateError

    if (profile.profile_picture_path) {
      const { error: removeError } = await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([profile.profile_picture_path])
      if (removeError) console.warn('Profile image cleanup failed:', removeError.message)
    }

    clearAvatarCacheForUser(user.id)
    invalidateAuthCache(user.id)

    return NextResponse.json({ success: true, message: 'Profile picture removed.' })
  } catch (error) {
    console.error('Profile avatar removal error:', error)
    return NextResponse.json({ error: 'Unable to remove the profile picture. Please try again.' }, { status: 500 })
  }
}
