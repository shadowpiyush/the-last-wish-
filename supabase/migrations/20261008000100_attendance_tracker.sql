-- ============================================================================
-- MIGRATION: ATTENDANCE TRACKER
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/iatoiiuqezaeuvtkdpvg/sql
-- ============================================================================

-- 1. ATTENDANCE RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  class_number INTEGER NOT NULL DEFAULT 1 CHECK (class_number >= 1 AND class_number <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, subject_id, date, class_number)
);

-- 2. ATTENDANCE SETTINGS TABLE (Configurable Target per Student)
CREATE TABLE IF NOT EXISTS public.attendance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  target_percentage REAL NOT NULL DEFAULT 75.0 CHECK (target_percentage >= 0 AND target_percentage <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. INDEXES FOR PERFORMANCE & FAST AGGREGATION
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id ON public.attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_subject_id ON public.attendance_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON public.attendance_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_subject ON public.attendance_records(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_date ON public.attendance_records(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_settings_user_id ON public.attendance_settings(user_id);

-- 4. ROW LEVEL SECURITY (RLS) FOR ATTENDANCE RECORDS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own attendance" ON public.attendance_records;
CREATE POLICY "Students can view own attendance"
  ON public.attendance_records FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can insert own attendance" ON public.attendance_records;
CREATE POLICY "Students can insert own attendance"
  ON public.attendance_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can update own attendance" ON public.attendance_records;
CREATE POLICY "Students can update own attendance"
  ON public.attendance_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can delete own attendance" ON public.attendance_records;
CREATE POLICY "Students can delete own attendance"
  ON public.attendance_records FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance_records;
CREATE POLICY "Admins can view all attendance"
  ON public.attendance_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage all attendance" ON public.attendance_records;
CREATE POLICY "Admins can manage all attendance"
  ON public.attendance_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 5. ROW LEVEL SECURITY (RLS) FOR ATTENDANCE SETTINGS
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own settings" ON public.attendance_settings;
CREATE POLICY "Students can view own settings"
  ON public.attendance_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can insert own settings" ON public.attendance_settings;
CREATE POLICY "Students can insert own settings"
  ON public.attendance_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can update own settings" ON public.attendance_settings;
CREATE POLICY "Students can update own settings"
  ON public.attendance_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all settings" ON public.attendance_settings;
CREATE POLICY "Admins can view all settings"
  ON public.attendance_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 6. PERMISSIONS
GRANT ALL ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;
GRANT ALL ON public.attendance_settings TO authenticated;
GRANT ALL ON public.attendance_settings TO service_role;
