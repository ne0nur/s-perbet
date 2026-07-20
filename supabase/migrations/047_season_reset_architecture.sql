-- ──────────────────────────────────────────────────────────
-- Saison-Reset Architektur (Migration 047)
-- 
-- EXP bleibt, Punkte/Achievements reseten pro Saison.
-- profile_seasons speichert historische Daten.
-- ──────────────────────────────────────────────────────────

-- 1. Neue Tabelle: Profil-Snapshots pro Saison
CREATE TABLE IF NOT EXISTS profile_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  season INTEGER REFERENCES seasons(id) NOT NULL,
  gesamt_punkte INTEGER DEFAULT 0,
  achievements_count INTEGER DEFAULT 0,
  exakte_treffer INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, season)
);

-- 2. Saison-Zuordnung zu Liga-Mitgliedschaften
ALTER TABLE league_members ADD COLUMN IF NOT EXISTS season INTEGER REFERENCES seasons(id);

-- Bestehenden Mitgliedern aktuelle Saison zuweisen
UPDATE league_members SET season = (SELECT id FROM seasons WHERE is_current = true LIMIT 1) WHERE season IS NULL;

ALTER TABLE league_members ALTER COLUMN season SET NOT NULL;

-- 3. Funktion: Saison-Rollover (einmal pro Saison aufrufbar)
CREATE OR REPLACE FUNCTION saison_rollover()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_season INTEGER;
  v_new_season INTEGER;
BEGIN
  -- Aktuelle Saison holen
  SELECT id INTO v_current_season FROM seasons WHERE is_current = true LIMIT 1;
  IF v_current_season IS NULL THEN
    RAISE EXCEPTION 'Keine aktuelle Saison gefunden';
  END IF;

  -- Profile archivieren
  INSERT INTO profile_seasons (user_id, season, gesamt_punkte, achievements_count, exakte_treffer, level)
  SELECT id, v_current_season, gesamt_punkte, achievements_count, exakte_treffer, level
  FROM profiles
  ON CONFLICT (user_id, season) DO NOTHING;

  -- Profile zurücksetzen (EXP und Level bleiben!)
  UPDATE profiles SET
    gesamt_punkte = 0,
    achievements_count = 0,
    exakte_treffer = 0;

  -- Saison umschalten
  UPDATE seasons SET is_current = false WHERE id = v_current_season;
  
  -- Nächste Saison ermitteln (oder anlegen)
  SELECT id INTO v_new_season FROM seasons WHERE id = v_current_season + 1;
  IF v_new_season IS NULL THEN
    INSERT INTO seasons (id, name, is_current) 
    VALUES (v_current_season + 1, (v_current_season + 1) || '/' || (v_current_season + 2), true);
  ELSE
    UPDATE seasons SET is_current = true WHERE id = v_new_season;
  END IF;
END;
$$;
