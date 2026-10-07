// 4 MB leaves room for multipart overhead within Vercel's request-body limit.
export const PROFILE_IMAGE_MAX_BYTES = 4 * 1024 * 1024
export const PROFILE_IMAGE_MAX_DIMENSION = 4096
export const PROFILE_IMAGE_MAX_PIXELS = 16_000_000

type ProfileImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp'

export interface ProfileImageMetadata {
  mimeType: ProfileImageMimeType
  extension: 'jpg' | 'png' | 'webp'
  width: number
  height: number
}

export type ProfileImageInspection =
  | { ok: true; image: ProfileImageMetadata }
  | { ok: false; error: string }

const extensionToMime: Record<string, ProfileImageMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

function fail(error: string): ProfileImageInspection {
  return { ok: false, error }
}

function isSafeDimension(width: number, height: number) {
  return Number.isInteger(width)
    && Number.isInteger(height)
    && width >= 32
    && height >= 32
    && width <= PROFILE_IMAGE_MAX_DIMENSION
    && height <= PROFILE_IMAGE_MAX_DIMENSION
    && width * height <= PROFILE_IMAGE_MAX_PIXELS
}

function readPngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (bytes.length < 33 || !signature.every((value, index) => bytes[index] === value)) return null

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const ihdr = String.fromCharCode(...bytes.slice(12, 16))
  if (view.getUint32(8) !== 13 || ihdr !== 'IHDR') return null

  const hasIend = bytes.length >= 12 && String.fromCharCode(...bytes.slice(-8, -4)) === 'IEND'
  if (!hasIend) return null

  return { width: view.getUint32(16), height: view.getUint32(20) }
}

function readJpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 10 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null

  let offset = 2
  let dimensions: { width: number; height: number } | null = null
  let reachedEnd = false

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return null
    while (bytes[offset] === 0xff) offset += 1
    const marker = bytes[offset++]

    if (marker === 0xd9) {
      reachedEnd = true
      break
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) continue
    if (offset + 1 >= bytes.length) return null

    const length = (bytes[offset] << 8) | bytes[offset + 1]
    if (length < 2 || offset + length > bytes.length) return null

    const isStartOfFrame = marker >= 0xc0 && marker <= 0xc3
      || marker >= 0xc5 && marker <= 0xc7
      || marker >= 0xc9 && marker <= 0xcb
      || marker >= 0xcd && marker <= 0xcf
    if (isStartOfFrame) {
      if (length < 8) return null
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4]
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6]
      dimensions = { width, height }
    }

    if (marker === 0xda) {
      // The entropy stream is opaque. A valid image must still terminate in EOI.
      reachedEnd = bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9
      break
    }
    offset += length
  }

  return reachedEnd ? dimensions : null
}

function readWebpDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 30 || String.fromCharCode(...bytes.slice(0, 4)) !== 'RIFF' || String.fromCharCode(...bytes.slice(8, 12)) !== 'WEBP') {
    return null
  }

  const chunkType = String.fromCharCode(...bytes.slice(12, 16))
  if (chunkType === 'VP8 ' && bytes.length >= 30) {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null
    return {
      width: ((bytes[27] & 0x3f) << 8) | bytes[26],
      height: ((bytes[29] & 0x3f) << 8) | bytes[28],
    }
  }
  if (chunkType === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  if (chunkType === 'VP8X' && bytes.length >= 30) {
    return {
      width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
      height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
    }
  }
  return null
}

/**
 * Verifies the filename, declared MIME type, binary signature, and intrinsic dimensions.
 * This intentionally excludes SVG and GIF because avatars are rendered in multiple contexts.
 */
export function inspectProfileImage(
  fileName: string,
  declaredMimeType: string,
  bytes: Uint8Array,
): ProfileImageInspection {
  if (bytes.length === 0 || bytes.length > PROFILE_IMAGE_MAX_BYTES) {
    return fail('Profile pictures must be no larger than 4 MB.')
  }

  const extension = fileName.split('.').pop()?.toLowerCase() || ''
  const expectedMime = extensionToMime[extension]
  if (!expectedMime) return fail('Use a JPG, PNG, or WebP image.')
  if (declaredMimeType !== expectedMime) return fail('The image type does not match its filename.')

  const detected = readPngDimensions(bytes)
    ? { mimeType: 'image/png' as const, extension: 'png' as const, dimensions: readPngDimensions(bytes)! }
    : readJpegDimensions(bytes)
      ? { mimeType: 'image/jpeg' as const, extension: 'jpg' as const, dimensions: readJpegDimensions(bytes)! }
      : readWebpDimensions(bytes)
        ? { mimeType: 'image/webp' as const, extension: 'webp' as const, dimensions: readWebpDimensions(bytes)! }
        : null

  if (!detected || detected.mimeType !== expectedMime) {
    return fail('The file contents are not a valid image of the selected type.')
  }
  if (!isSafeDimension(detected.dimensions.width, detected.dimensions.height)) {
    return fail('Use an image between 32×32 and 4096×4096 pixels.')
  }

  return {
    ok: true,
    image: {
      mimeType: detected.mimeType,
      extension: detected.extension,
      width: detected.dimensions.width,
      height: detected.dimensions.height,
    },
  }
}
