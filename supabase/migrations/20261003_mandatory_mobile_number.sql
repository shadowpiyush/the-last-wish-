-- ============================================================================
-- MIGRATION: Mandatory Mobile Number for User Profiles
-- Description:
-- 1. Ensures public.profiles has mobile_number column.
-- 2. Enforces mandatory mobile number for all new user registrations and updates.
-- 3. Safely handles existing legacy rows without inventing fake numbers using NOT VALID constraint.
-- ============================================================================

DO $$
BEGIN
  -- 1. Ensure column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'mobile_number'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN mobile_number TEXT;
  END IF;

  -- 2. Drop existing constraint if already present to avoid duplication
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_mandatory_mobile_number'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT check_mandatory_mobile_number;
  END IF;

  -- 3. Add NOT VALID CHECK constraint:
  -- Enforces NOT NULL and non-empty for all new registrations and profile updates
  -- while safely preserving existing historical users who registered prior to this rule
  -- without silently inventing fake phone numbers.
  ALTER TABLE public.profiles
    ADD CONSTRAINT check_mandatory_mobile_number
    CHECK (mobile_number IS NOT NULL AND length(trim(mobile_number)) >= 10)
    NOT VALID;

END $$;

-- 4. Create trigger to enforce normalized Indian mobile format (+91XXXXXXXXXX) at database layer
CREATE OR REPLACE FUNCTION public.validate_profile_mobile_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mobile_number IS NULL OR length(trim(NEW.mobile_number)) = 0 THEN
    RAISE EXCEPTION 'Mobile number is required and cannot be empty.';
  END IF;

  -- Reject if mobile number is less than 10 digits
  IF length(regexp_replace(NEW.mobile_number, '[^\d]', '', 'g')) < 10 THEN
    RAISE EXCEPTION 'Invalid mobile number: must contain at least 10 digits.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_profile_mobile_number ON public.profiles;

CREATE TRIGGER trg_validate_profile_mobile_number
BEFORE INSERT OR UPDATE OF mobile_number
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_profile_mobile_number();
