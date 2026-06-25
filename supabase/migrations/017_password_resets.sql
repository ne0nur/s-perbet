-- Migration zum Anlegen der Passwort-Reset-Tabelle und Anpassen der RPC-Funktion
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  email_hint TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
  temporary_password TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- RLS aktivieren
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Anyone can create reset requests" ON password_reset_requests;
CREATE POLICY "Anyone can create reset requests" 
  ON password_reset_requests 
  FOR INSERT 
  TO public 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view reset request status" ON password_reset_requests;
CREATE POLICY "Anyone can view reset request status" 
  ON password_reset_requests 
  FOR SELECT 
  TO public 
  USING (true);

DROP POLICY IF EXISTS "Admins have full control over reset requests" ON password_reset_requests;
CREATE POLICY "Admins have full control over reset requests" 
  ON password_reset_requests 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RPC admin_reset_password anpassen, um muss_passwort_aendern = true zu setzen
CREATE OR REPLACE FUNCTION admin_reset_password(target_username TEXT, new_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Ist der Ausführende ein Admin?
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Nur Administratoren dürfen Passwörter zurücksetzen.';
  END IF;

  -- User ID ermitteln
  SELECT id INTO target_user_id FROM profiles WHERE username = target_username;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Benutzer % nicht gefunden.', target_username;
  END IF;

  -- 1. Passwort in auth.users updaten
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;

  -- 2. Setze muss_passwort_aendern = true in profiles
  UPDATE profiles
  SET muss_passwort_aendern = true
  WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Passwort für ' || target_username || ' erfolgreich zurückgesetzt.');
END;
$$;
