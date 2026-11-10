/**
 * HARCOURTIAN STUDY HUB — DIGITAL LIBRARY EBOOK STORAGE CONFIGURATION
 * Centralized configuration for eBook PDF uploads, file size limits,
 * multipart thresholds, chunk sizes, and concurrency control.
 */

// Maximum permitted eBook PDF file size in Megabytes (Configurable)
export const MAX_EBOOK_PDF_SIZE_MB = 500
export const MAX_EBOOK_FILE_SIZE_BYTES = MAX_EBOOK_PDF_SIZE_MB * 1024 * 1024

// Threshold above which multipart upload must be used instead of single PUT
export const MULTIPART_THRESHOLD_MB = 100
export const MULTIPART_THRESHOLD_BYTES = MULTIPART_THRESHOLD_MB * 1024 * 1024

// Default chunk part size for Cloudflare R2 multipart uploads (16 MB)
// Note: S3 / Cloudflare R2 multipart upload requires each non-final part to be at least 5 MB.
export const DEFAULT_PART_SIZE_MB = 16
export const DEFAULT_PART_SIZE_BYTES = DEFAULT_PART_SIZE_MB * 1024 * 1024

// Maximum parallel chunk uploads (protects browser memory and network bandwidth)
export const MAX_PARALLEL_CHUNKS = 3

// Maximum retry attempts per individual failed chunk
export const MAX_CHUNK_RETRIES = 3

// Presigned URL expiry duration in seconds (2 hours)
export const PRESIGNED_URL_EXPIRES_IN_SECONDS = 7200

