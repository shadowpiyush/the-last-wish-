# Production Cloudflare R2 Admin eBook Upload Setup Guide

This guide details the complete configuration required to support **145 MB+ admin-only eBook uploads** using **Cloudflare R2** and **Supabase Auth / Postgres**.

---

## Architecture Overview

```
                      [ Admin User in Browser ]
                                  │
         1. File Selection & Metadata (Title, Author, Size)
                                  │
                                  ▼
                     [ Next.js API Routes ]
             - /api/admin/ebooks/upload/initiate
             - /api/admin/ebooks/upload/sign-part
                                  │
            2. Strict Server-Side Admin Verification
            3. R2 CreateMultipartUpload & Signed Part URLs
                                  │
                                  ▼
                      [ Admin User in Browser ]
                                  │
         4. Direct Sliced Chunk Uploads (10 MB parts via PUT)
            (Bypasses Next.js server; no memory/proxy bottleneck)
                                  │
                                  ▼
                    [ Cloudflare R2 Bucket ]
                   (Private Storage for PDFs)
                                  │
         5. Chunks completed -> Send ETags to Next.js
                                  │
                                  ▼
                     [ Next.js API Routes ]
             - /api/admin/ebooks/upload/complete
                                  │
            6. CompleteMultipartUpload in Cloudflare R2
            7. Insert Metadata into Supabase Postgres
                                  │
                                  ▼
                  [ Supabase Database (Postgres) ]
             (public.ebooks & public.library_books)
```

---

## 1. Create Cloudflare Account & Enable R2
1. Log in or create an account at [dash.cloudflare.com](https://dash.cloudflare.com/).
2. In the left sidebar, navigate to **R2**.
3. If you have not enabled R2 before, complete the activation (Cloudflare offers 10 GB/month free storage with zero egress fees).

---

## 2. Create the R2 Bucket
1. In Cloudflare R2, click **Create bucket**.
2. Name your bucket (e.g. `harcoutian-ebooks`).
3. Set the location to **Automatic** (or closest region to your users).
4. Click **Create Bucket**.
5. **Keep the bucket private**: Do **NOT** enable public bucket access or connect a public domain. Private presigned URLs will be generated on-demand for authorized users.

---

## 3. Configure CORS on the R2 Bucket (CRITICAL)
For the browser to upload chunks directly to Cloudflare R2 and read the `ETag` response header required for multipart completion:

1. Select your bucket (`harcoutian-ebooks`) in the Cloudflare dashboard.
2. Go to **Settings** > **CORS Policy** > **Edit CORS Policy**.
3. Paste the following JSON policy:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-production-domain.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD",
      "POST",
      "DELETE"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type"
    ],
    "MaxAgeSeconds": 3600
  }
]
```
> **IMPORTANT**: `ExposeHeaders: ["ETag"]` is mandatory. Without this header exposed, the browser's `fetch()` cannot read the chunk's ETag to assemble the multipart upload.

---

## 4. Generate Cloudflare R2 API Tokens
1. In the R2 Overview page, click **Manage R2 API Tokens** (on the right sidebar).
2. Click **Create API token**.
3. Configure the token:
   - **Token Name**: `Antigravity-Ebook-Admin`
   - **Permissions**: **Object Read & Write** (Scoped to your eBook bucket)
   - **TTL**: Specify an expiration or leave ongoing according to your security policy.
4. Click **Create API Token**.
5. Copy the following credentials immediately (they will not be shown again):
   - **Account ID** (visible on R2 Overview page or in endpoint URL)
   - **Access Key ID**
   - **Secret Access Key**
   - **Endpoint** (format: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`)

---

## 5. Configure Environment Variables

Add these server-only variables to `.env.local` in development, and to your production deployment environment (e.g. Vercel, Railway, Docker):

```env
# Cloudflare R2 Storage (Server-only credentials)
R2_ACCOUNT_ID=your_cloudflare_account_id_here
R2_ACCESS_KEY_ID=your_r2_access_key_id_here
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key_here
R2_BUCKET_NAME=harcoutian-ebooks
```

> **SECURITY CHECK**:
> - Never prefix these variables with `NEXT_PUBLIC_`.
> - R2 credentials are strictly utilized server-side by `@aws-sdk/client-s3` to sign short-lived presigned URLs.
> - The browser only receives presigned upload/view URLs.

---

## 6. Run Supabase Database Migration

Execute the migration file located at:
`supabase/migrations/20261003_r2_ebooks.sql`

In the **Supabase Dashboard** > **SQL Editor**, run the script. It sets up:
1. `public.ebooks` table:
   - `id uuid primary key`
   - `title text not null`
   - `description text`
   - `file_key text not null unique`
   - `file_name text not null`
   - `file_size bigint not null`
   - `mime_type text not null default 'application/pdf'`
   - `total_pages int default 0`
   - `cover_image_url text`
   - `uploaded_by uuid references auth.users(id)`
   - `created_at timestamptz default now()`
   - `updated_at timestamptz default now()`
2. Strict Row-Level Security (RLS) policies:
   - **SELECT**: Any authenticated user can view eBook metadata.
   - **INSERT / UPDATE / DELETE**: Strictly limited to administrators (`profiles.role = 'admin'`).

---

## 7. Admin Authorization & Roles
The application validates admin status via `src/lib/auth/admin.ts`:
1. Verifies the caller has a valid Supabase JWT session cookie.
2. Checks `public.profiles.role = 'admin'` using the Supabase Service Role client.
3. Fallback checks app metadata / user metadata for `role = 'admin'`.

To grant admin privileges to a user, run in the Supabase SQL editor:
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = '<USER_UUID>';
```

---

## 8. Verification & Testing

### Test 1: Upload a 145 MB PDF as Admin
1. Log in to the application as an admin.
2. Navigate to **Admin Dashboard** (`/admin`).
3. Under the **Library / Upload eBook** tab:
   - Enter **Title**: `Higher Engineering Mathematics`
   - Enter **Author**: `Dr. B.S. Grewal`
   - Select your **145 MB PDF file**.
   - (Optional) Select a cover thumbnail image and academic mappings.
   - Click **Publish eBook via Cloudflare R2 (145 MB+ Direct Upload)**.
4. Watch the progress bar advance chunk by chunk (10 MB per chunk, 2 parallel uploads directly to R2).
5. Confirm completion message: `✅ eBook uploaded directly to Cloudflare R2 and published successfully`.

### Test 2: In-App Reading as Normal Authenticated User
1. Log in as a normal student / user.
2. Open the **Library** (`/library`).
3. Locate the uploaded eBook and click **Read Online**.
4. The application calls `/api/storage/view-url` or `/api/ebooks/[id]/access` which generates a 1-hour presigned R2 GET URL with `Content-Disposition: inline`.
5. The PDF streams directly from Cloudflare R2 to the browser PDF viewer without downloading the entire 145 MB file through Next.js server memory.

### Test 3: Unauthorized Access Prevention
1. As a normal non-admin user or unauthenticated client, send a `POST` request to `/api/admin/ebooks/upload/initiate`:
   ```bash
   curl -X POST http://localhost:3000/api/admin/ebooks/upload/initiate \
     -H "Content-Type: application/json" \
     -d '{"title":"Test","fileName":"test.pdf","fileSize":1024}'
   ```
2. Verify response:
   ```json
   { "error": "Unauthorized. You do not have administrator permissions." }
   ```
   HTTP Status: `401 Unauthorized` or `403 Forbidden`.

### Test 4: Delete Flow
1. In the admin management tab, click **Delete eBook**.
2. The server:
   - Verifies admin role.
   - Issues `DeleteObjectCommand` to Cloudflare R2 to purge the object.
   - Removes the metadata records from `library_books` and `public.ebooks`.
