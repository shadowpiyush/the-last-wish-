-- ============================================================================
-- HARCOUTIAN STUDY HUB: SUPABASE POSTGRESQL SCHEMA
-- Fully ordered schema: Extensions → Tables → Indexes → Functions → RLS Policies
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- Trigram-based fuzzy search

-- ============================================================================
-- 2. TABLES (Ordered by Foreign Key Dependencies)
-- ============================================================================

-- 2.1 ACADEMIC PROGRAMS
CREATE TABLE IF NOT EXISTS public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  duration_years INTEGER NOT NULL,
  total_semesters INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 BRANCHES
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(program_id, code)
);

-- 2.3 ACADEMIC SEMESTERS LOOKUP
CREATE TABLE IF NOT EXISTS public.academic_semesters (
  semester_number INTEGER PRIMARY KEY,
  year_number INTEGER NOT NULL,
  name TEXT NOT NULL
);

-- 2.4 USER PROFILES (Extends Supabase auth.users)
-- Created early so all subsequent policies and foreign keys can reference it
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  mobile_number TEXT,
  email TEXT,
  email_confirmed_at TIMESTAMPTZ,
  profile_picture_url TEXT,
  profile_picture_path TEXT,
  profile_picture_version UUID,
  profile_picture_mime_type TEXT,
  profile_picture_size_bytes INTEGER,
  profile_picture_width INTEGER,
  profile_picture_height INTEGER,
  profile_picture_uploaded_at TIMESTAMPTZ,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  current_year INTEGER DEFAULT 1,
  current_semester INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- 2.5 CANONICAL SUBJECTS
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  year_number INTEGER NOT NULL,
  semester_number INTEGER NOT NULL REFERENCES public.academic_semesters(semester_number) ON DELETE RESTRICT,
  credits REAL NOT NULL,
  hours INTEGER NOT NULL DEFAULT 40,
  category TEXT NOT NULL DEFAULT 'Core',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(subject_name, '') || ' ' || coalesce(subject_code, ''))
  ) STORED,
  UNIQUE(subject_code, branch_id, semester_number)
);

-- 2.6 SYLLABUS UNITS
CREATE TABLE IF NOT EXISTS public.syllabus_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  unit_number INTEGER NOT NULL,
  unit_title TEXT NOT NULL,
  hours INTEGER DEFAULT 8,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subject_id, unit_number)
);

-- 2.7 SYLLABUS TOPICS
CREATE TABLE IF NOT EXISTS public.syllabus_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.syllabus_units(id) ON DELETE CASCADE,
  topic_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(unit_id, topic_order)
);

-- 2.8 NOTES
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  rejection_reason TEXT,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED
);

-- 2.9 DIGITAL LIBRARY BOOKS
CREATE TABLE IF NOT EXISTS public.library_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  author TEXT NOT NULL,
  isbn TEXT,
  edition TEXT,
  publisher TEXT,
  publication_year INTEGER,
  language TEXT DEFAULT 'English',
  description TEXT,
  cover_image_url TEXT,
  book_type TEXT DEFAULT 'Textbook',
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL, -- Optional for General Library eBooks
  ebook_status TEXT NOT NULL DEFAULT 'available' CHECK (ebook_status IN ('available', 'unavailable')),
  ebook_file_path TEXT,
  total_pages INTEGER DEFAULT 120,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(author, '') || ' ' || coalesce(description, ''))
  ) STORED
);

-- 2.9.1 EBOOK ACADEMIC MAPPINGS (Multi-Branch & Multi-Subject Combinations)
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

-- 2.10 EBOOK REQUESTS
CREATE TABLE IF NOT EXISTS public.ebook_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.library_books(id) ON DELETE SET NULL,
  book_title_requested TEXT NOT NULL,
  author_requested TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'fulfilled', 'cancelled')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.11 READING PROGRESS
CREATE TABLE IF NOT EXISTS public.reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  last_read_page INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- 2.12 PYQS (Previous Year Questions)
CREATE TABLE IF NOT EXISTS public.pyqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  exam_year INTEGER NOT NULL,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('Mid-Sem', 'End-Sem', 'Carry-Over', 'Class Test')),
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT DEFAULT 'application/pdf',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.13 ADMIN AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.14 ACTIVITY EVENTS
CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  subject_id UUID,
  program_id UUID,
  branch_id UUID,
  semester_number INTEGER,
  resource_title TEXT,
  device_category TEXT DEFAULT 'Desktop',
  browser_category TEXT DEFAULT 'Chrome',
  os_category TEXT DEFAULT 'macOS',
  status TEXT DEFAULT 'success',
  last_page_viewed INTEGER,
  total_pages INTEGER,
  metadata JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_directory_created_at ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_directory_role_created_at ON public.profiles(role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_directory_status_created_at ON public.profiles(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_directory_branch_created_at ON public.profiles(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm ON public.profiles USING GIN (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm ON public.profiles USING GIN (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_mobile_trgm ON public.profiles USING GIN (mobile_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_subjects_search ON public.subjects USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_subjects_branch_sem ON public.subjects(branch_id, semester_number);
CREATE INDEX IF NOT EXISTS idx_subjects_program ON public.subjects(program_id);
CREATE INDEX IF NOT EXISTS idx_units_subject ON public.syllabus_units(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_unit ON public.syllabus_topics(unit_id);
CREATE INDEX IF NOT EXISTS idx_notes_subject_status ON public.notes(subject_id, status);
CREATE INDEX IF NOT EXISTS idx_notes_uploader ON public.notes(uploader_id);
CREATE INDEX IF NOT EXISTS idx_notes_search ON public.notes USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_books_subject ON public.library_books(subject_id);
CREATE INDEX IF NOT EXISTS idx_books_search ON public.library_books USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_ebook_requests_user ON public.ebook_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pyqs_subject ON public.pyqs(subject_id);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user_time ON public.activity_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user_event ON public.activity_events(user_id, event_type, occurred_at DESC);

-- ============================================================================
-- 4. HELPER FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to check admin status cleanly in RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER set_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER set_books_updated_at
  BEFORE UPDATE ON public.library_books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER set_requests_updated_at
  BEFORE UPDATE ON public.ebook_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER set_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_prog UUID := NULL;
  v_branch UUID := NULL;
BEGIN
  IF NEW.raw_user_meta_data->>'program_id' ~ '^[0-9a-fA-F-]{36}$' THEN
    v_prog := (NEW.raw_user_meta_data->>'program_id')::UUID;
  END IF;

  IF NEW.raw_user_meta_data->>'branch_id' ~ '^[0-9a-fA-F-]{36}$' THEN
    v_branch := (NEW.raw_user_meta_data->>'branch_id')::UUID;
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    mobile_number,
    program_id,
    branch_id,
    current_year,
    current_semester,
    role
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Student User'),
    NEW.raw_user_meta_data->>'mobile_number',
    v_prog,
    v_branch,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'current_year', '')::INTEGER, 1),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'current_semester', '')::INTEGER, 1),
    'student'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for any existing auth.users that don't have a profile yet
INSERT INTO public.profiles (id, full_name, role)
SELECT 
  u.id, 
  COALESCE(u.raw_user_meta_data->>'full_name', 'User'), 
  CASE WHEN u.email ILIKE '%admin%' OR u.raw_user_meta_data->>'role' = 'admin' THEN 'admin' ELSE 'student' END
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- 6.1 PROGRAMS POLICIES
DROP POLICY IF EXISTS "Programs are publicly readable" ON public.programs;
CREATE POLICY "Programs are publicly readable"
  ON public.programs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can manage programs" ON public.programs;
CREATE POLICY "Only admins can manage programs"
  ON public.programs FOR ALL
  USING (public.is_admin());

-- 6.2 BRANCHES POLICIES
DROP POLICY IF EXISTS "Branches are publicly readable" ON public.branches;
CREATE POLICY "Branches are publicly readable"
  ON public.branches FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can manage branches" ON public.branches;
CREATE POLICY "Only admins can manage branches"
  ON public.branches FOR ALL
  USING (public.is_admin());

-- 6.3 ACADEMIC SEMESTERS POLICIES
DROP POLICY IF EXISTS "Semesters are publicly readable" ON public.academic_semesters;
CREATE POLICY "Semesters are publicly readable"
  ON public.academic_semesters FOR SELECT
  USING (true);

-- 6.4 PROFILES POLICIES
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- 6.5 SUBJECTS POLICIES
DROP POLICY IF EXISTS "Subjects are publicly readable" ON public.subjects;
CREATE POLICY "Subjects are publicly readable"
  ON public.subjects FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can manage subjects" ON public.subjects;
CREATE POLICY "Only admins can manage subjects"
  ON public.subjects FOR ALL
  USING (public.is_admin());

-- 6.6 SYLLABUS UNITS POLICIES
DROP POLICY IF EXISTS "Syllabus units are publicly readable" ON public.syllabus_units;
CREATE POLICY "Syllabus units are publicly readable"
  ON public.syllabus_units FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can manage syllabus units" ON public.syllabus_units;
CREATE POLICY "Only admins can manage syllabus units"
  ON public.syllabus_units FOR ALL
  USING (public.is_admin());

-- 6.7 SYLLABUS TOPICS POLICIES
DROP POLICY IF EXISTS "Syllabus topics are publicly readable" ON public.syllabus_topics;
CREATE POLICY "Syllabus topics are publicly readable"
  ON public.syllabus_topics FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can manage syllabus topics" ON public.syllabus_topics;
CREATE POLICY "Only admins can manage syllabus topics"
  ON public.syllabus_topics FOR ALL
  USING (public.is_admin());

-- 6.8 NOTES POLICIES
DROP POLICY IF EXISTS "Published notes are publicly readable" ON public.notes;
CREATE POLICY "Published notes are publicly readable"
  ON public.notes FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Uploaders can read own notes" ON public.notes;
CREATE POLICY "Uploaders can read own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = uploader_id);

DROP POLICY IF EXISTS "Admins can read all notes" ON public.notes;
CREATE POLICY "Admins can read all notes"
  ON public.notes FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can submit notes" ON public.notes;
CREATE POLICY "Authenticated users can submit notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = uploader_id);

DROP POLICY IF EXISTS "Admins can update notes" ON public.notes;
CREATE POLICY "Admins can update notes"
  ON public.notes FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete notes" ON public.notes;
CREATE POLICY "Admins can delete notes"
  ON public.notes FOR DELETE
  USING (public.is_admin());

-- 6.9 DIGITAL LIBRARY BOOKS POLICIES
DROP POLICY IF EXISTS "Library books are publicly readable" ON public.library_books;
CREATE POLICY "Library books are publicly readable"
  ON public.library_books FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can manage library books" ON public.library_books;
CREATE POLICY "Only admins can manage library books"
  ON public.library_books FOR ALL
  USING (public.is_admin());

-- 6.10 EBOOK REQUESTS POLICIES
DROP POLICY IF EXISTS "Users can read own requests" ON public.ebook_requests;
CREATE POLICY "Users can read own requests"
  ON public.ebook_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all requests" ON public.ebook_requests;
CREATE POLICY "Admins can read all requests"
  ON public.ebook_requests FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can create requests" ON public.ebook_requests;
CREATE POLICY "Authenticated users can create requests"
  ON public.ebook_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update requests" ON public.ebook_requests;
CREATE POLICY "Admins can update requests"
  ON public.ebook_requests FOR UPDATE
  USING (public.is_admin());

-- 6.11 READING PROGRESS POLICIES
DROP POLICY IF EXISTS "Users can manage own reading progress" ON public.reading_progress;
CREATE POLICY "Users can manage own reading progress"
  ON public.reading_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6.12 PYQS POLICIES
DROP POLICY IF EXISTS "Published PYQs are publicly readable" ON public.pyqs;
CREATE POLICY "Published PYQs are publicly readable"
  ON public.pyqs FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Only admins can manage PYQs" ON public.pyqs;
CREATE POLICY "Only admins can manage PYQs"
  ON public.pyqs FOR ALL
  USING (public.is_admin());

-- 6.13 ADMIN AUDIT LOGS POLICIES
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  WITH CHECK (public.is_admin());

-- 6.14 ACTIVITY EVENTS POLICIES
DROP POLICY IF EXISTS "Users can read own activity" ON public.activity_events;
CREATE POLICY "Users can read own activity"
  ON public.activity_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all activity" ON public.activity_events;
CREATE POLICY "Admins can read all activity"
  ON public.activity_events FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can insert own activity" ON public.activity_events;
CREATE POLICY "Users can insert own activity"
  ON public.activity_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 7. DEFAULT SEED DATA
-- ============================================================================
INSERT INTO public.academic_semesters (semester_number, year_number, name) VALUES
  (1, 1, 'Semester 1 (Autumn)'),
  (2, 1, 'Semester 2 (Spring)'),
  (3, 2, 'Semester 3 (Autumn)'),
  (4, 2, 'Semester 4 (Spring)'),
  (5, 3, 'Semester 5 (Autumn)'),
  (6, 3, 'Semester 6 (Spring)'),
  (7, 4, 'Semester 7 (Autumn)'),
  (8, 4, 'Semester 8 (Spring)')
ON CONFLICT (semester_number) DO NOTHING;
