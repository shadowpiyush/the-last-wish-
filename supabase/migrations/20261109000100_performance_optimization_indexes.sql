-- ============================================================================
-- MIGRATION: HARCOURTIAN STUDY HUB — COMPLETE DATABASE PERFORMANCE INDEXES
-- Targets: Student IDs, Program/Branch IDs, Year/Semester, Resource Mappings,
-- Attendance Records, Publication Status, and Search Filters.
-- ============================================================================

-- 1. Study Notes Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notes_status_created_at
  ON public.notes(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notes_subject_status_created
  ON public.notes(subject_id, status, created_at DESC);

-- 2. Canonical Subjects Hierarchical Indexes
CREATE INDEX IF NOT EXISTS idx_subjects_branch_sem_year
  ON public.subjects(branch_id, semester_number, year_number);

CREATE INDEX IF NOT EXISTS idx_subjects_code_trgm
  ON public.subjects USING GIN (subject_code gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_subjects_name_trgm
  ON public.subjects USING GIN (subject_name gin_trgm_ops);

-- 3. Attendance High-Velocity Performance Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_date_class
  ON public.attendance_records(user_id, date DESC, class_number DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_records_user_subject_status
  ON public.attendance_records(user_id, subject_id, status);

CREATE INDEX IF NOT EXISTS idx_attendance_settings_user
  ON public.attendance_settings(user_id);

-- 4. Digital Library & eBook Academic Mapping Indexes
CREATE INDEX IF NOT EXISTS idx_library_books_created_at
  ON public.library_books(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ebook_mappings_branch_sem_sub
  ON public.ebook_academic_mappings(branch_id, semester_number, subject_id);

CREATE INDEX IF NOT EXISTS idx_ebook_mappings_program_branch_sem
  ON public.ebook_academic_mappings(program_id, branch_id, semester_number);

-- 5. Curriculum & Syllabus Indexes
CREATE INDEX IF NOT EXISTS idx_curriculum_nodes_branch_sem
  ON public.curriculum_nodes(branch_id, semester_number);

CREATE INDEX IF NOT EXISTS idx_pyqs_status_exam_year
  ON public.pyqs(status, exam_year DESC);

CREATE INDEX IF NOT EXISTS idx_pyqs_subject_status
  ON public.pyqs(subject_id, status);

-- 6. Student Academic Profile Context Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_branch_year_sem
  ON public.profiles(branch_id, current_year, current_semester);

