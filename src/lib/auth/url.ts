/**
 * Canonical Application URL & Redirect Architecture
 * 
 * Provides unified, enterprise-grade URL resolution for Harcoutian Study Hub.
 * Ensures authentication flows, OAuth callbacks, and post-login redirects
 * remain strictly within the Harcoutian Study Hub application and never
 * leak or redirect to external platforms (such as vercel.com).
 */

export const CANONICAL_PRODUCTION_URL = 'https://harcourtian-study-hub.vercel.app'
const FALLBACK_URL = 'http://localhost:3000'

/**
 * Returns the canonical base URL of the application without a trailing slash.
 * 
 * Priority:
 * 1. Client-side: window.location.origin (preserves current host/port accurately)
 * 2. Server-side: NEXT_PUBLIC_APP_URL (production custom domain or explicit canonical URL)
 * 3. Server-side Vercel Production: VERCEL_PROJECT_PRODUCTION_URL or CANONICAL_PRODUCTION_URL
 * 4. Fallback: http://localhost:3000
 */
export function getBaseUrl(): string {
  // 1. In the browser, always respect the active origin if valid
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin
    if (isValidAppOrigin(origin)) {
      return origin.replace(/\/+$/, '')
    }
  }

  // 2. Explicitly configured canonical app URL
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (envAppUrl && isValidAppOrigin(envAppUrl)) {
    return normalizeUrl(envAppUrl)
  }

  // 3. Vercel project production domain
  const vercelProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercelProdUrl && isValidAppOrigin(vercelProdUrl)) {
    return normalizeUrl(vercelProdUrl)
  }

  // 4. Default to canonical production URL when deployed on Vercel
  if (process.env.VERCEL === '1') {
    return CANONICAL_PRODUCTION_URL
  }

  return FALLBACK_URL
}

/**
 * Extracts the canonical base URL from an incoming server HTTP Request,
 * respecting reverse-proxy headers (x-forwarded-host, x-forwarded-proto).
 */
export function getBaseUrlFromRequest(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'

  if (forwardedHost && isValidHost(forwardedHost)) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, '')
  }

  const host = request.headers.get('host')
  if (host && isValidHost(host)) {
    const proto = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https'
    return `${proto}://${host}`.replace(/\/+$/, '')
  }

  try {
    const { origin } = new URL(request.url)
    if (isValidAppOrigin(origin)) {
      return origin.replace(/\/+$/, '')
    }
  } catch {
    // ignore parse error and use getBaseUrl()
  }

  return getBaseUrl()
}

/**
 * Returns the absolute OAuth / email confirmation callback URL.
 */
export function getAuthCallbackUrl(customBase?: string): string {
  const base = customBase || getBaseUrl()
  return `${base}/auth/callback`
}

/**
 * Validates that an origin/URL belongs to the application and is NOT an external
 * platform site (e.g. vercel.com or malicious domain).
 */
function isValidAppOrigin(urlOrHost: string): boolean {
  if (!urlOrHost) return false

  const lower = urlOrHost.toLowerCase().trim()

  // STRICT BLOCK: Never allow redirecting to the Vercel management platform or SSO endpoint
  if (
    lower === 'vercel.com' ||
    lower.startsWith('https://vercel.com') ||
    lower.startsWith('http://vercel.com') ||
    lower.includes('vercel.com/login') ||
    lower.includes('vercel.com/dashboard') ||
    lower.includes('vercel.com/sso-api')
  ) {
    return false
  }

  // Block the SSO-protected duplicate preview URL
  if (lower.includes('harcourtian-study-hub-harcourtian-study-hub.vercel.app')) {
    return false
  }

  return true
}

function isValidHost(host: string): boolean {
  if (!host) return false
  const lower = host.toLowerCase().trim()
  if (
    lower === 'vercel.com' ||
    lower.endsWith('.vercel.com') ||
    lower.includes('harcourtian-study-hub-harcourtian-study-hub.vercel.app')
  ) {
    return false
  }
  return true
}

/**
 * Ensures protocol is prepended and trailing slashes are removed.
 */
function normalizeUrl(url: string): string {
  let normalized = url.trim()
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`
  }
  return normalized.replace(/\/+$/, '')
}

/**
 * Strict path sanitization to prevent open redirect vulnerabilities.
 * Ensures the destination is strictly an internal, relative path within
 * Harcoutian Study Hub.
 * 
 * Rejects:
 * - External protocols (http://, https://, ftp://, javascript:, data:)
 * - Protocol-relative paths (//evil.com)
 * - Backslash-encoded paths (\evil.com, /\evil.com)
 * - Vercel platform URLs (vercel.com)
 * - Control characters and CRLF injection
 */
export function sanitizeInternalPath(
  path: string | null | undefined,
  fallback: string = '/dashboard'
): string {
  if (!path || typeof path !== 'string') {
    return fallback
  }

  const trimmed = path.trim()
  if (!trimmed) return fallback

  // Disallow any path containing protocol schemes (http:, https:, javascript:, data:)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return fallback
  }

  // Must begin with a single forward slash and NOT followed by slash or backslash
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback
  }

  // Reject backslashes anywhere in the path
  if (trimmed.includes('\\')) {
    return fallback
  }

  // Reject CRLF injection
  if (/[\r\n]/.test(trimmed)) {
    return fallback
  }

  // Disallow direct mentions of vercel.com in internal relative paths
  if (trimmed.toLowerCase().includes('vercel.com')) {
    return fallback
  }

  return trimmed
}
