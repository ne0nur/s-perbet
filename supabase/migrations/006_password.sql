-- PW-Spalte zu profiles hinzufügen
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS passwort_gesetzt BOOLEAN DEFAULT false;
