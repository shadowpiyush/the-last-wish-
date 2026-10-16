/**
 * eBook & Academic Mapping Validation Utilities
 * Shared between Client and Server for strict schema consistency.
 */

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidUuid(val: unknown): val is string {
  return typeof val === 'string' && UUID_REGEX.test(val.trim())
}

export function cleanUuidOrNull(val: unknown): string | null {
  if (typeof val !== 'string') return null
  const trimmed = val.trim()
  if (!trimmed) return null
  return UUID_REGEX.test(trimmed) ? trimmed : null
}

export const ALLOWED_ACADEMIC_CATEGORIES = [
  'Textbook',
  'Reference Manual',
  'Question Bank',
  'Lab Manual',
  'Handout',
  'Monograph',
] as const

export type AcademicCategory = typeof ALLOWED_ACADEMIC_CATEGORIES[number]

export interface ValidatedMappingGroup {
  programId: string | null
  branchIds: string[]
  year: number | null
  semesters: number[]
  subjectIds: string[]
  category: string
}

export interface EbookMetadataInput {
  title: string
  subtitle?: string | null
  author: string
  publisher?: string | null
  edition?: string | null
  publicationYear?: number | string | null
  totalPages?: number | string | null
  description?: string | null
  coverImageUrl?: string | null
  fileName?: string | null
  fileSize?: number | null
  mappings?: unknown[]
}

export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
  field?: string
}

/**
 * Validates core book metadata fields.
 */
export function validateEbookMetadata(input: EbookMetadataInput): ValidationResult<{
  title: string
  subtitle: string | null
  author: string
  publisher: string | null
  edition: string | null
  publicationYear: number
  totalPages: number
  description: string | null
  coverImageUrl: string | null
}> {
  // 1. Title (Required)
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title) {
    return {
      success: false,
      error: 'eBook title is required and cannot be empty.',
      code: 'INVALID_BOOK_METADATA',
      field: 'title',
    }
  }
  if (title.length > 255) {
    return {
      success: false,
      error: 'eBook title must not exceed 255 characters.',
      code: 'INVALID_BOOK_METADATA',
      field: 'title',
    }
  }

  // 2. Author (Required)
  const author = typeof input.author === 'string' ? input.author.trim() : ''
  if (!author) {
    return {
      success: false,
      error: 'Author name is required.',
      code: 'INVALID_BOOK_METADATA',
      field: 'author',
    }
  }
  if (author.length > 255) {
    return {
      success: false,
      error: 'Author name must not exceed 255 characters.',
      code: 'INVALID_BOOK_METADATA',
      field: 'author',
    }
  }

  // 3. Subtitle (Optional)
  const subtitle = typeof input.subtitle === 'string' && input.subtitle.trim() ? input.subtitle.trim() : null
  if (subtitle && subtitle.length > 255) {
    return {
      success: false,
      error: 'Subtitle must not exceed 255 characters.',
      code: 'INVALID_BOOK_METADATA',
      field: 'subtitle',
    }
  }

  // 4. Publisher (Optional)
  const publisher = typeof input.publisher === 'string' && input.publisher.trim() ? input.publisher.trim() : null
  if (publisher && publisher.length > 255) {
    return {
      success: false,
      error: 'Publisher name must not exceed 255 characters.',
      code: 'INVALID_BOOK_METADATA',
      field: 'publisher',
    }
  }

  // 5. Edition (Optional)
  const edition = typeof input.edition === 'string' && input.edition.trim() ? input.edition.trim() : null
  if (edition && edition.length > 100) {
    return {
      success: false,
      error: 'Edition must not exceed 100 characters.',
      code: 'INVALID_BOOK_METADATA',
      field: 'edition',
    }
  }

  // 6. Publication Year (Optional, sensible integer)
  const currentYear = new Date().getFullYear()
  let publicationYear = currentYear
  if (input.publicationYear !== undefined && input.publicationYear !== null && input.publicationYear !== '') {
    const parsedYear = Number(input.publicationYear)
    if (!Number.isInteger(parsedYear) || parsedYear < 1800 || parsedYear > currentYear + 5) {
      return {
        success: false,
        error: `Publication year must be a valid 4-digit year between 1800 and ${currentYear + 5}.`,
        code: 'INVALID_BOOK_METADATA',
        field: 'publicationYear',
      }
    }
    publicationYear = parsedYear
  }

  // 7. Total Pages (Optional, sensible integer)
  let totalPages = 100
  if (input.totalPages !== undefined && input.totalPages !== null && input.totalPages !== '') {
    const parsedPages = Number(input.totalPages)
    if (!Number.isInteger(parsedPages) || parsedPages < 1 || parsedPages > 50000) {
      return {
        success: false,
        error: 'Estimated pages must be a positive integer between 1 and 50,000.',
        code: 'INVALID_BOOK_METADATA',
        field: 'totalPages',
      }
    }
    totalPages = parsedPages
  }

  // 8. Description (Optional)
  const description = typeof input.description === 'string' && input.description.trim() ? input.description.trim() : null

  // 9. Cover Image URL (Optional)
  let coverImageUrl: string | null = null
  if (typeof input.coverImageUrl === 'string' && input.coverImageUrl.trim()) {
    const trimmedCover = input.coverImageUrl.trim()
    // Must be relative URL or valid HTTP/HTTPS URL
    if (trimmedCover.startsWith('/') || /^https?:\/\//i.test(trimmedCover)) {
      coverImageUrl = trimmedCover
    }
  }

  return {
    success: true,
    data: {
      title,
      subtitle,
      author,
      publisher,
      edition,
      publicationYear,
      totalPages,
      description,
      coverImageUrl,
    },
  }
}

/**
 * Validates and sanitizes academic mapping groups.
 * Academic mapping is 100% optional: empty array = General Library eBook.
 * Empty strings are safely converted to null or filtered out without causing pattern errors.
 */
export function validateAcademicMappings(rawMappings: unknown): ValidationResult<ValidatedMappingGroup[]> {
  if (!rawMappings || !Array.isArray(rawMappings) || rawMappings.length === 0) {
    return { success: true, data: [] }
  }

  const validated: ValidatedMappingGroup[] = []

  for (let i = 0; i < rawMappings.length; i++) {
    const grp = rawMappings[i]
    if (!grp || typeof grp !== 'object') continue

    const g = grp as Record<string, unknown>

    // 1. Program ID (Optional UUID or null)
    let programId: string | null = null
    if (g.programId !== undefined && g.programId !== null && g.programId !== '') {
      if (typeof g.programId === 'string' && UUID_REGEX.test(g.programId.trim())) {
        programId = g.programId.trim()
      } else {
        return {
          success: false,
          error: `Mapping group #${i + 1} has an invalid Program ID. Must be a valid UUID or omitted.`,
          code: 'INVALID_ACADEMIC_MAPPING',
          field: `mappings[${i}].programId`,
        }
      }
    }

    // 2. Branch IDs (Array of UUIDs, optional)
    const branchIds: string[] = []
    if (Array.isArray(g.branchIds)) {
      for (const bId of g.branchIds) {
        if (!bId || typeof bId !== 'string' || !bId.trim()) continue
        const trimmed = bId.trim()
        if (UUID_REGEX.test(trimmed)) {
          if (!branchIds.includes(trimmed)) branchIds.push(trimmed)
        } else {
          return {
            success: false,
            error: `Mapping group #${i + 1} contains an invalid Branch ID: "${bId}".`,
            code: 'INVALID_ACADEMIC_MAPPING',
            field: `mappings[${i}].branchIds`,
          }
        }
      }
    }

    // 3. Year Number (Optional integer 1-5)
    let year: number | null = null
    if (g.year !== undefined && g.year !== null && g.year !== '') {
      const yrNum = Number(g.year)
      if (Number.isInteger(yrNum) && yrNum >= 1 && yrNum <= 6) {
        year = yrNum
      }
    }

    // 4. Semesters (Array of integers 1-12)
    const semesters: number[] = []
    if (Array.isArray(g.semesters)) {
      for (const sem of g.semesters) {
        const sNum = Number(sem)
        if (Number.isInteger(sNum) && sNum >= 1 && sNum <= 12) {
          if (!semesters.includes(sNum)) semesters.push(sNum)
        }
      }
    }
    semesters.sort((a, b) => a - b)

    // 5. Subject IDs (Array of UUIDs, optional)
    const subjectIds: string[] = []
    if (Array.isArray(g.subjectIds)) {
      for (const sId of g.subjectIds) {
        if (!sId || typeof sId !== 'string' || !sId.trim()) continue
        const trimmed = sId.trim()
        if (UUID_REGEX.test(trimmed)) {
          if (!subjectIds.includes(trimmed)) subjectIds.push(trimmed)
        } else {
          return {
            success: false,
            error: `Mapping group #${i + 1} contains an invalid Subject ID: "${sId}".`,
            code: 'INVALID_ACADEMIC_MAPPING',
            field: `mappings[${i}].subjectIds`,
          }
        }
      }
    }

    // 6. Category
    let category = 'Textbook'
    if (typeof g.category === 'string' && g.category.trim()) {
      const catTrim = g.category.trim()
      if (ALLOWED_ACADEMIC_CATEGORIES.includes(catTrim as AcademicCategory)) {
        category = catTrim
      }
    }

    // If mapping has at least one specification, include it
    if (programId || branchIds.length > 0 || subjectIds.length > 0 || semesters.length > 0) {
      validated.push({
        programId,
        branchIds,
        year,
        semesters,
        subjectIds,
        category,
      })
    }
  }

  return { success: true, data: validated }
}
