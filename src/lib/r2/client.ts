import { S3Client } from '@aws-sdk/client-s3'

/**
 * Server-only Cloudflare R2 configuration helper.
 * Never expose these credentials to the client.
 */
export function getR2Config() {
  let accountId = process.env.R2_ACCOUNT_ID?.trim()
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim()
  let bucketName = process.env.R2_BUCKET_NAME?.trim() || 'ebookslib'

  // Support full S3 API endpoint URL if provided (e.g. https://256794dcffabfe02a101f3bb238ea870.r2.cloudflarestorage.com/ebookslib)
  const endpointEnv = process.env.R2_ENDPOINT?.trim()
  let endpoint = accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined

  if (endpointEnv) {
    try {
      const parsed = new URL(endpointEnv)
      const pathParts = parsed.pathname.split('/').filter(Boolean)
      if (pathParts.length > 0 && !process.env.R2_BUCKET_NAME) {
        bucketName = pathParts[0]
      }
      endpoint = `${parsed.protocol}//${parsed.host}`
      if (!accountId) {
        accountId = parsed.hostname.split('.')[0]
      }
    } catch {
      endpoint = endpointEnv
    }
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint: endpoint || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : ''),
    isConfigured: Boolean(accountId && accessKeyId && secretAccessKey),
  }
}

/**
 * Creates and returns a reusable S3-compatible client for Cloudflare R2.
 */
export function getR2Client(): S3Client {
  const { accountId, accessKeyId, secretAccessKey, endpoint, isConfigured } = getR2Config()

  if (!isConfigured) {
    throw new Error(
      'Cloudflare R2 credentials are not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in your environment variables.'
    )
  }

  return new S3Client({
    region: 'auto',
    endpoint: endpoint || `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
  })
}
