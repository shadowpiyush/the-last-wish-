-- ============================================================================
-- MIGRATION: EBOOK ACADEMIC MAPPINGS (Multi-Branch & Multi-Subject Support)
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/iatoiiuqezaeuvtkdpvg/sql
-- ============================================================================

-- 1. Make subject_id in library_books optional (for General Library eBooks)
ALTER TABLE public.library_books ALTER COLUMN subject_id DROP NOT NULL;

-- 2. Create the normalized ebook_academic_mappings table
CREATE TABLE IF NOT EXISTS public.ebook_academic_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  year_number INTEGER,
  semester_number INTEGER,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  academic_category TEXT DEFAULT 'Textbook',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for fast library filtering & student visibility queries
CREATE INDEX IF NOT EXISTS idx_ebook_mappings_book_id ON public.ebook_academic_mappings(book_id);
CREATE INDEX IF NOT EXISTS idx_ebook_mappings_branch ON public.ebook_academic_mappings(branch_id);
CREATE INDEX IF NOT EXISTS idx_ebook_mappings_subject ON public.ebook_academic_mappings(subject_id);
CREATE INDEX IF NOT EXISTS idx_ebook_mappings_context ON public.ebook_academic_mappings(program_id, branch_id, semester_number);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.ebook_academic_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on ebook_academic_mappings" ON public.ebook_academic_mappings;
CREATE POLICY "Allow public read access on ebook_academic_mappings"
  ON public.ebook_academic_mappings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow admin full access on ebook_academic_mappings" ON public.ebook_academic_mappings;
CREATE POLICY "Allow admin full access on ebook_academic_mappings"
  ON public.ebook_academic_mappings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Grant permissions to authenticated and service_role
GRANT ALL ON public.ebook_academic_mappings TO authenticated;
GRANT ALL ON public.ebook_academic_mappings TO service_role;
