-- ============================================================================
-- MIGRATION: CLOUDFLARE R2 EBOOKS & ADMIN STORAGE ARCHITECTURE
-- ============================================================================

-- 1. Create the dedicated ebooks table for Cloudflare R2 files
CREATE TABLE IF NOT EXISTS public.ebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  author TEXT,
  file_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  total_pages INTEGER DEFAULT 0,
  cover_image_url TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for fast lookup by key and date
CREATE INDEX IF NOT EXISTS idx_ebooks_file_key ON public.ebooks(file_key);
CREATE INDEX IF NOT EXISTS idx_ebooks_created_at ON public.ebooks(created_at DESC);

-- 3. Add storage_provider and file_key to library_books if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'library_books' AND column_name = 'storage_provider'
  ) THEN
    ALTER TABLE public.library_books ADD COLUMN storage_provider TEXT DEFAULT 'supabase';
  END IF;
END $$;

-- 4. Enable Row Level Security (RLS) on public.ebooks
ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;

-- Policy A: All authenticated users can read ebook metadata
DROP POLICY IF EXISTS "Allow authenticated users to read ebooks" ON public.ebooks;
CREATE POLICY "Allow authenticated users to read ebooks"
  ON public.ebooks FOR SELECT
  TO authenticated
  USING (true);

-- Policy B: Only administrators can insert ebooks
DROP POLICY IF EXISTS "Allow admins to insert ebooks" ON public.ebooks;
CREATE POLICY "Allow admins to insert ebooks"
  ON public.ebooks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Policy C: Only administrators can update ebooks
DROP POLICY IF EXISTS "Allow admins to update ebooks" ON public.ebooks;
CREATE POLICY "Allow admins to update ebooks"
  ON public.ebooks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Policy D: Only administrators can delete ebooks
DROP POLICY IF EXISTS "Allow admins to delete ebooks" ON public.ebooks;
CREATE POLICY "Allow admins to delete ebooks"
  ON public.ebooks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Grant privileges to authenticated and service_role
GRANT ALL ON public.ebooks TO service_role;
GRANT SELECT ON public.ebooks TO authenticated;
