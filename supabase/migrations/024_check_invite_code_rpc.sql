-- ================================================================
-- Migration 024: Check Invite Code RPC
-- ================================================================

-- Create a secure RPC function to check if an invitation code is valid.
-- Using SECURITY DEFINER allows unauthenticated (anonymous) users to 
-- validate their invite codes during registration, even though the RLS
-- policy on the leagues table restricts SELECT access to league members.
CREATE OR REPLACE FUNCTION public.check_invite_code(p_invite_code TEXT)
RETURNS TABLE (league_id UUID, league_name TEXT)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT id, name 
  FROM public.leagues 
  WHERE UPPER(invite_code) = UPPER(p_invite_code);
END;
$$ LANGUAGE plpgsql;
