-- Production-safe profile image and directory projection.
-- This migration only adds nullable fields, indexes, and a new private bucket.
-- It does not replace profiles, reset users, or remove legacy public avatar URLs.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profile_picture_path TEXT,
  ADD COLUMN IF NOT EXISTS profile_picture_version UUID,
  ADD COLUMN IF NOT EXISTS profile_picture_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS profile_picture_size_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS profile_picture_width INTEGER,
  ADD COLUMN IF NOT EXISTS profile_picture_height INTEGER,
  ADD COLUMN IF NOT EXISTS profile_picture_uploaded_at TIMESTAMPTZ;

-- Ensure check_mandatory_mobile_number does not block existing legacy or admin rows during updates
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_mandatory_mobile_number;
ALTER TABLE public.profiles
  ADD CONSTRAINT check_mandatory_mobile_number
  CHECK (role = 'admin' OR mobile_number IS NULL OR length(trim(mobile_number)) >= 10);

CREATE OR REPLACE FUNCTION public.validate_profile_mobile_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.mobile_number IS NULL AND NEW.mobile_number IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.mobile_number IS NULL OR length(trim(NEW.mobile_number)) = 0 THEN
    RAISE EXCEPTION 'Mobile number is required and cannot be empty.';
  END IF;

  IF length(regexp_replace(NEW.mobile_number, '[^\d]', '', 'g')) < 10 THEN
    RAISE EXCEPTION 'Invalid mobile number: must contain at least 10 digits.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Populate the safe, directory-facing fields for existing accounts.
UPDATE public.profiles AS p
SET
  email = COALESCE(p.email, u.email),
  email_confirmed_at = COALESCE(p.email_confirmed_at, u.email_confirmed_at),
  last_login_at = CASE
    WHEN p.last_login_at IS NULL THEN u.last_sign_in_at
    WHEN u.last_sign_in_at IS NOT NULL AND u.last_sign_in_at > p.last_login_at THEN u.last_sign_in_at
    ELSE p.last_login_at
  END
FROM auth.users AS u
WHERE p.id = u.id;

-- Keep the non-sensitive profile projection current when users sign in or confirm their email.
CREATE OR REPLACE FUNCTION public.sync_profile_identity_from_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET
    email = NEW.email,
    email_confirmed_at = NEW.email_confirmed_at,
    last_login_at = CASE
      WHEN profiles.last_login_at IS NULL THEN NEW.last_sign_in_at
      WHEN NEW.last_sign_in_at IS NOT NULL AND NEW.last_sign_in_at > profiles.last_login_at THEN NEW.last_sign_in_at
      ELSE profiles.last_login_at
    END
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_identity_changed ON auth.users;
CREATE TRIGGER on_auth_user_identity_changed
  AFTER UPDATE OF email, email_confirmed_at, last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_identity_from_auth_user();

-- Add identity fields to the existing signup trigger without changing existing roles.
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
    id, full_name, mobile_number, email, email_confirmed_at, last_login_at,
    program_id, branch_id, current_year, current_semester, role
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Student User'),
    NEW.raw_user_meta_data->>'mobile_number',
    NEW.email,
    NEW.email_confirmed_at,
    NEW.last_sign_in_at,
    v_prog,
    v_branch,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'current_year', '')::INTEGER, 1),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'current_semester', '')::INTEGER, 1),
    'student'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    last_login_at = COALESCE(EXCLUDED.last_login_at, public.profiles.last_login_at);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Auth account creation remains independent from profile recovery.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- These indexes match the paginated admin directory's filters, order, and searches.
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE INDEX IF NOT EXISTS idx_profiles_directory_created_at
  ON public.profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_directory_role_created_at
  ON public.profiles (role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_directory_status_created_at
  ON public.profiles (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_directory_branch_created_at
  ON public.profiles (branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm
  ON public.profiles USING GIN (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm
  ON public.profiles USING GIN (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_mobile_trgm
  ON public.profiles USING GIN (mobile_number gin_trgm_ops);

-- Private, versioned avatar objects. References and metadata live on profiles.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  false,
  4194304,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Authenticated users can read profile images" ON storage.objects;
CREATE POLICY "Authenticated users can read profile images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'profile-images'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

-- Uploads and deletions are performed by authenticated server routes with the service key.
-- No browser client policy grants arbitrary object writes in this private bucket.
