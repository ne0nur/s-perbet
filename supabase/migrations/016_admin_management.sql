-- RPC zum Zurücksetzen von Passwörtern
CREATE OR REPLACE FUNCTION admin_reset_password(target_username TEXT, new_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- 1. Ist der Ausführende ein Admin?
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Nur Administratoren dürfen Passwörter zurücksetzen.';
  END IF;

  -- 2. User ID ermitteln
  SELECT id INTO target_user_id FROM profiles WHERE username = target_username;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Benutzer % nicht gefunden.', target_username;
  END IF;

  -- 3. Passwort in auth.users updaten
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Passwort für ' || target_username || ' erfolgreich zurückgesetzt.');
END;
$$;

-- RPC zum Löschen von Nutzern
CREATE OR REPLACE FUNCTION admin_delete_user(target_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- 1. Ist der Ausführende ein Admin?
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Nur Administratoren dürfen Benutzer löschen.';
  END IF;

  -- 2. User ID ermitteln
  SELECT id INTO target_user_id FROM profiles WHERE username = target_username;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Benutzer % nicht gefunden.', target_username;
  END IF;

  -- 3. User aus auth.users löschen (löscht cascading auch profile, tipps, etc. wg. FK)
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Benutzer ' || target_username || ' erfolgreich gelöscht.');
END;
$$;

-- RPC zum Löschen von Ligen
CREATE OR REPLACE FUNCTION admin_delete_league(target_league_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Ist der Ausführende ein Admin?
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Nur Administratoren dürfen Ligen löschen.';
  END IF;

  -- 2. Löschen
  DELETE FROM leagues WHERE id = target_league_id;

  RETURN jsonb_build_object('success', true, 'message', 'Liga erfolgreich gelöscht.');
END;
$$;
