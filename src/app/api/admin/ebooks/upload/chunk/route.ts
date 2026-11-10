import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * DEPRECATED & DISABLED ENDPOINT
 * 
 * Proxying PDF binary chunks through Vercel Functions violates Vercel's strict 4.5 MB
 * serverless payload limit (HTTP 413 FUNCTION_PAYLOAD_TOO_LARGE).
 * 
 * Cloudflare R2 uploads must always be performed directly from the client browser
 * to Cloudflare R2 using presigned URLs (single PUT or multipart UploadPart).
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Proxying eBook chunks through Vercel Functions is deprecated and disabled. Uploads must go directly to Cloudflare R2 via presigned URLs to prevent FUNCTION_PAYLOAD_TOO_LARGE (4.5 MB limit).',
      code: 'DIRECT_R2_UPLOAD_REQUIRED',
    },
    { status: 410 }
  )
}
