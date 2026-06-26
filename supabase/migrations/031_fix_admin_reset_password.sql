-- ================================================================
-- Migration 031: Fix admin_reset_password — use cost=10 + add verify
-- ================================================================

-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Update admin_reset_password: use bcrypt cost=10 (matches GoTrue)
CREATE OR REPLACE FUNCTION admin_reset_password(target_username TEXT, new_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  target_user_id UUID;
  rows_affected INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Nur Administratoren dürfen Passwörter zurücksetzen.';
  END IF;

  SELECT id INTO target_user_id FROM profiles WHERE username = target_username;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Benutzer "%" nicht gefunden.', target_username;
  END IF;

  -- Use cost=10 (matching GoTrue default) and also update updated_at
  UPDATE auth.users
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf', 10)),
    updated_at = now(),
    last_sign_in_at = NULL  -- force fresh login, avoid stale session issues
  WHERE id = target_user_id;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;

  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Konnte auth.users für "%" nicht aktualisieren — fehlt pgcrypto?', target_username;
  END IF;

  UPDATE profiles
  SET muss_passwort_aendern = true
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Passwort für ' || target_username || ' zurückgesetzt.'
  );
END;
$$;

-- Diagnose: prüft auth.users + identities für einen User
CREATE OR REPLACE FUNCTION diagnose_user_auth(target_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  target_user_id UUID;
  pw_hash TEXT;
  pw_length INT;
  has_identity BOOLEAN;
  last_sign_in TIMESTAMPTZ;
  email TEXT;
  meta JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Nur Admins.';
  END IF;

  SELECT id INTO target_user_id FROM profiles WHERE username = target_username;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Benutzer nicht gefunden.';
  END IF;

  SELECT encrypted_password, length(encrypted_password), last_sign_in_at, email, raw_app_meta_data
  INTO pw_hash, pw_length, last_sign_in, email, meta
  FROM auth.users WHERE id = target_user_id;

  SELECT EXISTS(SELECT 1 FROM auth.identities WHERE user_id = target_user_id) INTO has_identity;

  RETURN jsonb_build_object(
    'user_id', target_user_id,
    'email', email,
    'has_password', pw_hash IS NOT NULL,
    'password_hash_length', pw_length,
    'password_hash_preview', CASE WHEN pw_hash IS NOT NULL THEN left(pw_hash, 10) || '...' ELSE NULL END,
    'has_identity', has_identity,
    'has_meta', meta IS NOT NULL,
    'last_sign_in', last_sign_in,
    'verdict', CASE 
      WHEN pw_hash IS NULL THEN 'KEIN_PASSWORT'
      WHEN NOT has_identity THEN 'IDENTITY_FEHLT — Migration 029 nötig!'
      WHEN pw_length < 30 THEN 'HASH_ZU_KURZ'
      WHEN meta IS NULL THEN 'META_NULL — raw_app_meta_data fehlt!'
      ELSE 'OK'
    END
  );
END;
$$;
