/**
 * Indian Mobile Number Validator and Normalizer
 *
 * Rules:
 * - Mobile number is mandatory (not null/empty).
 * - Must be a valid Indian mobile number: 10 digits starting with 6, 7, 8, or 9.
 * - Accepts formats such as:
 *   - "9876543210"
 *   - "+91 9876543210"
 *   - "+91-9876543210"
 *   - "+919876543210"
 *   - "09876543210"
 *   - "919876543210"
 * - Normalizes to "+91XXXXXXXXXX" for consistent database storage.
 */
export interface MobileValidationResult {
  valid: boolean
  normalized?: string
  digitsOnly?: string
  error?: string
}

export function validateAndNormalizeIndianMobile(input: unknown): MobileValidationResult {
  if (input === undefined || input === null) {
    return { valid: false, error: 'Mobile number is required.' }
  }

  if (typeof input !== 'string') {
    return { valid: false, error: 'Mobile number must be a valid text string.' }
  }

  const trimmed = input.trim()
  if (!trimmed) {
    return { valid: false, error: 'Mobile number is required.' }
  }

  // Strip spaces, dashes, parentheses, dots
  let cleaned = trimmed.replace(/[\s\-_().]/g, '')

  // Strip leading '+'
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }

  // Handle '91' country code prefix (e.g. 919876543210 -> 9876543210)
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2)
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    // Handle leading zero (e.g. 09876543210 -> 9876543210)
    cleaned = cleaned.substring(1)
  }

  // An Indian mobile number must be exactly 10 digits starting with 6, 7, 8, or 9
  const indianMobileRegex = /^[6-9]\d{9}$/
  if (!indianMobileRegex.test(cleaned)) {
    return {
      valid: false,
      error: 'Invalid mobile number. Please enter a valid 10-digit Indian mobile number (e.g., 9876543210 or +91 9876543210).',
    }
  }

  const normalized = `+91${cleaned}`
  return {
    valid: true,
    normalized,
    digitsOnly: cleaned,
  }
}
