-- ================================================================
-- Migration 032: Fix admin_create_user — match GoTrue's exact format
-- Root cause: Missing fields (confirmation_token, recovery_token,
-- is_super_admin=NULL, identity id≠user_id, etc.)
-- ================================================================

CREATE OR REPLACE FUNCTION admin_create_user(
  new_username TEXT,
  new_password TEXT,
  target_league_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
  identity_id UUID;
  encrypted_pw TEXT;
BEGIN
  -- Admin check
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Zugriff verweigert: Nur Administratoren können Benutzer anlegen.';
  END IF;

  -- Username already taken?
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username) THEN
    RAISE EXCEPTION 'Dieser Username ist bereits vergeben.';
  END IF;

  new_user_id := gen_random_uuid();
  identity_id := gen_random_uuid();
  encrypted_pw := crypt(new_password, gen_salt('bf', 10));

  -- Insert into auth.users — ALL fields matching GoTrue's native signup
  -- Note: confirmed_at is a generated column and MUST NOT be inserted!
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change_token_current, email_change,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, is_sso_user, is_anonymous,
    created_at, updated_at,
    last_sign_in_at, phone, phone_confirmed_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    new_username || '@tipp.local',
    encrypted_pw,
    now(),
    '', '', '',
    '', '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('username', new_username, 'email_verified', true),
    NULL, false, false,
    now(), now(),
    NULL, NULL, NULL
  );

  -- Insert identity with DIFFERENT UUID from user_id (matches GoTrue)
  -- Note: auth.identities.email is a GENERATED column from identity_data, DO NOT INSERT
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data,
    provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    identity_id,
    new_user_id,
    new_user_id::text,
    jsonb_build_object(
      'sub', new_user_id::text,
      'email', new_username || '@tipp.local',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    NULL, now(), now()
  );

  -- Profile already created by trigger — update username
  UPDATE public.profiles
  SET username = new_username, muss_passwort_aendern = true
  WHERE id = new_user_id;

  -- Optional league join
  IF target_league_id IS NOT NULL THEN
    INSERT INTO public.league_members (league_id, user_id)
    VALUES (target_league_id, new_user_id);
  END IF;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, auth;


-- Also fix admin_reset_password: use gen_salt('bf', 10) + proper fields
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
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Nur Administratoren dürfen Passwörter zurücksetzen.';
  END IF;

  SELECT id INTO target_user_id FROM profiles WHERE username = target_username;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Benutzer "%" nicht gefunden.', target_username;
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf', 10)),
      updated_at = now(),
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, '')
  WHERE id = target_user_id;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Konnte auth.users für "%" nicht aktualisieren.', target_username;
  END IF;

  UPDATE profiles SET muss_passwort_aendern = true WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'OK: ' || target_username);
END;
$$;
