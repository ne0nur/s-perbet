-- Fix missing auth.identities for manually created users
-- 1. Insert missing identities for existing users
INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider, created_at, updated_at
)
SELECT 
  gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email), 'email', created_at, updated_at
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM auth.identities);

-- 2. Update admin_create_user to correctly insert into auth.identities
CREATE OR REPLACE FUNCTION admin_create_user(
  new_username TEXT,
  new_password TEXT,
  target_league_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
  encrypted_pw TEXT;
BEGIN
  -- 1. Zugriffskontrolle: Prüfen, ob der Aufrufer Admin ist
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Zugriff verweigert: Nur Administratoren können Benutzer anlegen.';
  END IF;

  -- 2. Eingabe-Prüfung: Prüfen, ob der Username bereits vergeben ist
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE username = new_username
  ) THEN
    RAISE EXCEPTION 'Dieser Username ist bereits vergeben.';
  END IF;

  new_user_id := gen_random_uuid();
  encrypted_pw := crypt(new_password, gen_salt('bf'));

  -- 3. In auth.users einfügen (Supabase Auth Tabelle)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    last_sign_in_at,
    phone,
    phone_confirmed_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    new_username || '@tipp.local',
    encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('username', new_username),
    false,
    now(),
    now(),
    null,
    null,
    null
  );

  -- 3.5. In auth.identities einfügen (Zwingend erforderlich für GoTrue Login!)
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    new_user_id::text,
    jsonb_build_object('sub', new_user_id::text, 'email', new_username || '@tipp.local'),
    'email',
    now(),
    now()
  );

  -- 4. Profil anlegen lassen wir den existierenden Trigger trigger_erstelle_profil machen.
  -- Allerdings müssen wir warten, bis der Trigger durch ist, 
  -- ODER wir updaten das Profil danach direkt.
  
  -- 5. Profil anpassen (wurde per Trigger angelegt, wir erzwingen Passwortänderung)
  UPDATE public.profiles
  SET muss_passwort_aendern = true
  WHERE id = new_user_id;

  -- 6. Optional: Direkt in eine Liga einfügen
  IF target_league_id IS NOT NULL THEN
    INSERT INTO public.league_members (league_id, user_id)
    VALUES (target_league_id, new_user_id);
  END IF;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
