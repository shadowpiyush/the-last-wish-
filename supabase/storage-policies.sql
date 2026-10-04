-- ============================================================================
-- SUPABASE STORAGE: RLS POLICIES FOR BUCKETS
-- Run this in your Supabase SQL Editor after creating buckets
-- ============================================================================

-- ─── AVATARS BUCKET (public read, owner write) ─────────────────────────────

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── NOTES BUCKET (owner + admin access) ───────────────────────────────────

CREATE POLICY "Published notes are downloadable by authenticated users"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'notes'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can upload notes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'notes'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Admins can delete notes files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'notes'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ─── PYQS BUCKET (public read, admin write) ────────────────────────────────

CREATE POLICY "PYQ papers are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pyqs');

CREATE POLICY "Only admins can upload PYQs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pyqs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete PYQs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pyqs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ─── EBOOKS BUCKET (authenticated read, admin write) ───────────────────────

CREATE POLICY "Authenticated users can read ebooks"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ebooks'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Only admins can upload ebooks"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ebooks'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete ebooks"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ebooks'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ─── COVERS BUCKET (public read, admin write) ──────────────────────────────

CREATE POLICY "Book covers are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

CREATE POLICY "Only admins can upload covers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'covers'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete covers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'covers'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
