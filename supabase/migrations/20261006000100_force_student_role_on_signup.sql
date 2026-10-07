-- Public self-registration must never assign privileged roles from user metadata.
-- Existing administrator profiles are left untouched; this only changes future signups.
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
  -- Auth account creation should remain independent from optional profile recovery;
  -- the registration API checks and completes the profile before returning success.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
