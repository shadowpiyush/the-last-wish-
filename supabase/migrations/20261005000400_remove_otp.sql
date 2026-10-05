-- ============================================================================
-- DEPRECATION MIGRATION: Remove OTP Challenges
-- 
-- OTP has been completely removed from the authentication flow in favor of 
-- standard Email + Password authentication.
-- This migration safely removes the obsolete otp_challenges table and related
-- cleanup functions. No existing users or core data are affected.
-- ============================================================================

DROP FUNCTION IF EXISTS public.cleanup_expired_otp_challenges();
DROP TABLE IF EXISTS public.otp_challenges CASCADE;
