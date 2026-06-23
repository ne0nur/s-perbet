-- Admin-Spalten für profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS muss_passwort_aendern BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Bestehenden User zum Admin machen falls gewünscht
-- UPDATE profiles SET is_admin = true WHERE username = 'DEIN_USERNAME';
