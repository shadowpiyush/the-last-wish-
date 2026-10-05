-- ============================================================================
-- NON-DESTRUCTIVE MIGRATION: OTP Challenges Table
-- 
-- This migration ONLY adds a new table. 
-- No existing tables are modified, dropped, or altered.
-- No existing users, admins, or data are affected.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_verified BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 10,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  invalidated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_otp_challenges_user_created
  ON public.otp_challenges(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_challenges_email_created
  ON public.otp_challenges(email, created_at DESC);

-- Enable RLS — no public policies means ONLY service role can access
ALTER TABLE public.otp_challenges ENABLE ROW LEVEL SECURITY;

-- Cleanup function: remove expired/used challenges older than 24 hours
-- Can be called via a Supabase cron job or manually
CREATE OR REPLACE FUNCTION public.cleanup_expired_otp_challenges()
RETURNS void AS $$
BEGIN
  DELETE FROM public.otp_challenges
  WHERE created_at < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
