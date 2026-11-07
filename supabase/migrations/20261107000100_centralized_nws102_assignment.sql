-- ============================================================================
-- MIGRATION: CENTRALIZED NWS-102 WORKSHOP PRACTICE ACADEMIC ASSIGNMENT
-- Centralized PDF upload with multi-branch database-driven assignments
-- Applicable branches: LFT, BC, CHE, CHY, MDS, PHY
-- ============================================================================

-- 1. Ensure public.notes has an index on file_path and status
CREATE INDEX IF NOT EXISTS idx_notes_file_path ON public.notes(file_path);
CREATE INDEX IF NOT EXISTS idx_notes_subject_status ON public.notes(subject_id, status);

-- 2. Ensure RLS policies on public.notes permit published notes to be read by all authenticated & anon users
DROP POLICY IF EXISTS "Published notes are publicly readable" ON public.notes;
CREATE POLICY "Published notes are publicly readable"
  ON public.notes FOR SELECT
  USING (status = 'published');

-- 3. Document the canonical resource mapping
COMMENT ON TABLE public.notes IS 'Curriculum study notes mapped to subjects and branches';

