-- ============================================================
-- Fußball-Tippspiel: Initiales Datenbank-Schema
-- Phase 1: Tabellen, RLS, Trigger
-- ============================================================

-- 1. Profile (erweitert auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  gesamt_punkte INTEGER DEFAULT 0,
  exakte_treffer INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger: Auto-Profil bei neuer Registrierung
CREATE OR REPLACE FUNCTION erstelle_profil()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_erstelle_profil ON auth.users;
CREATE TRIGGER trigger_erstelle_profil
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION erstelle_profil();

-- 2. Spiele
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spieltag INTEGER NOT NULL CHECK (spieltag > 0),
  heim_team TEXT NOT NULL,
  gast_team TEXT NOT NULL,
  anpfiff TIMESTAMPTZ NOT NULL,
  tore_heim INTEGER,
  tore_gast INTEGER,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'finished', 'postponed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index für spieltag-basierte Queries
CREATE INDEX IF NOT EXISTS idx_matches_spieltag ON matches(spieltag);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_anpfiff ON matches(anpfiff);

-- 3. Tipps
CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  tipp_heim INTEGER NOT NULL CHECK (tipp_heim >= 0),
  tipp_gast INTEGER NOT NULL CHECK (tipp_gast >= 0),
  punkte INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_tips_user ON tips(user_id);
CREATE INDEX IF NOT EXISTS idx_tips_match ON tips(match_id);

-- 4. Bonus-Tipps (Saison-Fragen)
CREATE TABLE IF NOT EXISTS bonus_tipps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  frage_id INTEGER NOT NULL CHECK (frage_id BETWEEN 1 AND 5),
  antwort TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, frage_id)
);

CREATE INDEX IF NOT EXISTS idx_bonus_tipps_user ON bonus_tipps(user_id);

-- 5. Chat-Nachrichten (Trash-Talk)
CREATE TABLE IF NOT EXISTS chat_nachrichten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nachricht TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_match ON chat_nachrichten(match_id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_nachrichten(created_at);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profile sind lesbar" ON profiles;
CREATE POLICY "Profile sind lesbar" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Eigenes Profil editierbar" ON profiles;
CREATE POLICY "Eigenes Profil editierbar" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Eigenes Profil anlegen" ON profiles;
CREATE POLICY "Eigenes Profil anlegen" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- matches: jeder authentifizierte kann lesen
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Spiele sind lesbar" ON matches;
CREATE POLICY "Spiele sind lesbar" ON matches
  FOR SELECT USING (auth.role() = 'authenticated');

-- tips: komplexe RLS (eigene immer, fremde nur nach Anpfiff)
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

-- Eigene Tipps immer lesbar
DROP POLICY IF EXISTS "Eigene Tipps immer lesbar" ON tips;
CREATE POLICY "Eigene Tipps immer lesbar" ON tips
  FOR SELECT USING (auth.uid() = user_id);

-- Fremde Tipps nur nach Anpfiff lesbar
DROP POLICY IF EXISTS "Fremde Tipps nach Anpfiff lesbar" ON tips;
CREATE POLICY "Fremde Tipps nach Anpfiff lesbar" ON tips
  FOR SELECT USING (
    auth.uid() != user_id
    AND EXISTS (
      SELECT 1 FROM matches WHERE matches.id = tips.match_id AND matches.anpfiff <= now()
    )
  );

-- Tipp abgeben: nur vor Anpfiff, nur eigener
DROP POLICY IF EXISTS "Tipp abgeben vor Anpfiff" ON tips;
CREATE POLICY "Tipp abgeben vor Anpfiff" ON tips
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches WHERE matches.id = tips.match_id AND matches.anpfiff > now()
    )
  );

-- Tipp ändern: nur vor Anpfiff, nur eigener
DROP POLICY IF EXISTS "Tipp aendern vor Anpfiff" ON tips;
CREATE POLICY "Tipp aendern vor Anpfiff" ON tips
  FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches WHERE matches.id = tips.match_id AND matches.anpfiff > now()
    )
  );

-- bonus_tipps: jeder lesbar, nur eigener schreibbar
ALTER TABLE bonus_tipps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bonus-Tipps lesbar" ON bonus_tipps;
CREATE POLICY "Bonus-Tipps lesbar" ON bonus_tipps
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Eigene Bonus-Tipps schreiben" ON bonus_tipps;
CREATE POLICY "Eigene Bonus-Tipps schreiben" ON bonus_tipps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Eigene Bonus-Tipps aendern" ON bonus_tipps;
CREATE POLICY "Eigene Bonus-Tipps aendern" ON bonus_tipps
  FOR UPDATE USING (auth.uid() = user_id);

-- chat_nachrichten: jeder lesbar, jeder schreibbar
ALTER TABLE chat_nachrichten ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chat lesbar" ON chat_nachrichten;
CREATE POLICY "Chat lesbar" ON chat_nachrichten
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Chat schreiben" ON chat_nachrichten;
CREATE POLICY "Chat schreiben" ON chat_nachrichten
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- POSTGRESQL TRIGGER: Automatische Punkteberechnung
-- ============================================================

CREATE OR REPLACE FUNCTION berechne_punkte()
RETURNS TRIGGER AS $$
DECLARE
  tip RECORD;
  punkte_val INTEGER;
  tipp_diff INTEGER;
  ergebnis_diff INTEGER;
BEGIN
  -- Nur feuern wenn Status auf 'finished' wechselt und Ergebnisse da sind
  IF NEW.status = 'finished'
     AND (OLD.status IS NULL OR OLD.status != 'finished')
     AND NEW.tore_heim IS NOT NULL
     AND NEW.tore_gast IS NOT NULL THEN

    ergebnis_diff := NEW.tore_heim - NEW.tore_gast;

    FOR tip IN SELECT * FROM tips WHERE match_id = NEW.id LOOP
      tipp_diff := tip.tipp_heim - tip.tipp_gast;

      -- 4 Punkte: Exaktes Ergebnis
      IF tip.tipp_heim = NEW.tore_heim AND tip.tipp_gast = NEW.tore_gast THEN
        punkte_val := 4;

      -- 3 Punkte: Richtige Tordifferenz (inkl. nicht-exaktes Unentschieden)
      ELSIF tipp_diff = ergebnis_diff THEN
        punkte_val := 3;

      -- 2 Punkte: Richtige Tendenz
      ELSIF SIGN(tipp_diff) = SIGN(ergebnis_diff) THEN
        punkte_val := 2;

      -- 0 Punkte: Falsch
      ELSE
        punkte_val := 0;
      END IF;

      -- Tipp aktualisieren
      UPDATE tips SET punkte = punkte_val, updated_at = now()
      WHERE id = tip.id;

      -- Profil-Punkte addieren
      UPDATE profiles
      SET
        gesamt_punkte = gesamt_punkte + punkte_val,
        exakte_treffer = exakte_treffer + CASE WHEN punkte_val = 4 THEN 1 ELSE 0 END
      WHERE id = tip.user_id;

    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_punkteberechnung ON matches;
CREATE TRIGGER trigger_punkteberechnung
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION berechne_punkte();

-- ============================================================
-- HILFSFUNKTION: Punkte für einen einzelnen Tipp berechnen
-- (für Client-seitige Vorschau, ruft NICHT den Trigger auf)
-- ============================================================

CREATE OR REPLACE FUNCTION berechne_punkte_einzeln(
  tipp_heim INTEGER,
  tipp_gast INTEGER,
  tore_heim INTEGER,
  tore_gast INTEGER
) RETURNS INTEGER AS $$
DECLARE
  tipp_diff INTEGER;
  ergebnis_diff INTEGER;
BEGIN
  IF tipp_heim = tore_heim AND tipp_gast = tore_gast THEN
    RETURN 4;
  END IF;

  tipp_diff := tipp_heim - tipp_gast;
  ergebnis_diff := tore_heim - tore_gast;

  IF tipp_diff = ergebnis_diff THEN
    RETURN 3;
  END IF;

  IF SIGN(tipp_diff) = SIGN(ergebnis_diff) THEN
    RETURN 2;
  END IF;

  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- TESTDATEN: Süper Lig Teams + 5 Spieltage
-- ============================================================

-- Teams (für Referenz, nicht als Tabelle — wird direkt in matches genutzt)
-- Fenerbahçe, Galatasaray, Beşiktaş, Trabzonspor, Başakşehir,
-- Adana Demirspor, Antalyaspor, Konyaspor, Sivasspor, Kayserispor,
-- Gaziantep FK, Hatayspor, Alanyaspor, Kasımpaşa, Ankaragücü,
-- Samsunspor, Pendikspor, Rizespor, Karagümrük

-- Spieltag 1
INSERT INTO matches (spieltag, heim_team, gast_team, anpfiff, tore_heim, tore_gast, status) VALUES
(1, 'Fenerbahçe', 'Adana Demirspor',   now() - interval '30 days', 2, 1, 'finished'),
(1, 'Galatasaray', 'Trabzonspor',       now() - interval '30 days', 3, 0, 'finished'),
(1, 'Beşiktaş', 'Konyaspor',            now() - interval '30 days', 1, 1, 'finished'),
(1, 'Başakşehir', 'Sivasspor',          now() - interval '30 days', 0, 1, 'finished'),
(1, 'Antalyaspor', 'Kayserispor',       now() - interval '30 days', 2, 2, 'finished'),
(1, 'Gaziantep FK', 'Hatayspor',        now() - interval '30 days', 1, 0, 'finished'),
(1, 'Alanyaspor', 'Kasımpaşa',          now() - interval '30 days', 3, 1, 'finished'),
(1, 'Ankaragücü', 'Samsunspor',         now() - interval '30 days', 0, 0, 'finished'),
(1, 'Pendikspor', 'Rizespor',           now() - interval '30 days', 1, 2, 'finished');

-- Spieltag 2
INSERT INTO matches (spieltag, heim_team, gast_team, anpfiff, tore_heim, tore_gast, status) VALUES
(2, 'Trabzonspor', 'Fenerbahçe',         now() - interval '23 days', 1, 3, 'finished'),
(2, 'Konyaspor', 'Galatasaray',          now() - interval '23 days', 0, 2, 'finished'),
(2, 'Sivasspor', 'Beşiktaş',             now() - interval '23 days', 1, 0, 'finished'),
(2, 'Kayserispor', 'Başakşehir',         now() - interval '23 days', 2, 1, 'finished'),
(2, 'Adana Demirspor', 'Antalyaspor',    now() - interval '23 days', 3, 2, 'finished'),
(2, 'Hatayspor', 'Alanyaspor',           now() - interval '23 days', 0, 1, 'finished'),
(2, 'Kasımpaşa', 'Gaziantep FK',         now() - interval '23 days', 1, 1, 'finished'),
(2, 'Samsunspor', 'Pendikspor',          now() - interval '23 days', 2, 0, 'finished'),
(2, 'Rizespor', 'Ankaragücü',            now() - interval '23 days', 0, 0, 'finished');

-- Spieltag 3 (vor 16 Tagen)
INSERT INTO matches (spieltag, heim_team, gast_team, anpfiff, tore_heim, tore_gast, status) VALUES
(3, 'Fenerbahçe', 'Başakşehir',          now() - interval '16 days', 4, 0, 'finished'),
(3, 'Galatasaray', 'Sivasspor',          now() - interval '16 days', 2, 0, 'finished'),
(3, 'Beşiktaş', 'Adana Demirspor',       now() - interval '16 days', 2, 1, 'finished'),
(3, 'Trabzonspor', 'Kayserispor',        now() - interval '16 days', 1, 1, 'finished'),
(3, 'Antalyaspor', 'Konyaspor',          now() - interval '16 days', 0, 0, 'finished'),
(3, 'Gaziantep FK', 'Alanyaspor',        now() - interval '16 days', 1, 2, 'finished'),
(3, 'Ankaragücü', 'Kasımpaşa',           now() - interval '16 days', 3, 1, 'finished'),
(3, 'Pendikspor', 'Hatayspor',           now() - interval '16 days', 0, 1, 'finished'),
(3, 'Samsunspor', 'Rizespor',            now() - interval '16 days', 1, 1, 'finished');

-- Spieltag 4 (vor 9 Tagen)
INSERT INTO matches (spieltag, heim_team, gast_team, anpfiff, tore_heim, tore_gast, status) VALUES
(4, 'Konyaspor', 'Fenerbahçe',           now() - interval '9 days', 0, 3, 'finished'),
(4, 'Sivasspor', 'Trabzonspor',          now() - interval '9 days', 1, 2, 'finished'),
(4, 'Kayserispor', 'Beşiktaş',           now() - interval '9 days', 0, 1, 'finished'),
(4, 'Başakşehir', 'Galatasaray',         now() - interval '9 days', 1, 4, 'finished'),
(4, 'Adana Demirspor', 'Gaziantep FK',   now() - interval '9 days', 2, 0, 'finished'),
(4, 'Hatayspor', 'Ankaragücü',           now() - interval '9 days', 1, 1, 'finished'),
(4, 'Alanyaspor', 'Pendikspor',          now() - interval '9 days', 3, 0, 'finished'),
(4, 'Kasımpaşa', 'Samsunspor',           now() - interval '9 days', 2, 2, 'finished'),
(4, 'Rizespor', 'Antalyaspor',           now() - interval '9 days', 1, 0, 'finished');

-- Spieltag 5: 2 Spiele live, 3 upcoming, 4 finished
INSERT INTO matches (spieltag, heim_team, gast_team, anpfiff, tore_heim, tore_gast, status) VALUES
-- Live-Spiele (vor 30-60 Min angepfiffen)
(5, 'Fenerbahçe', 'Galatasaray',         now() - interval '45 minutes', 1, 0, 'live'),
(5, 'Beşiktaş', 'Trabzonspor',           now() - interval '30 minutes', 0, 1, 'live'),
-- Beendet (vor 2-3 Stunden)
(5, 'Başakşehir', 'Antalyaspor',         now() - interval '3 hours', 2, 1, 'finished'),
(5, 'Sivasspor', 'Adana Demirspor',      now() - interval '2.5 hours', 0, 2, 'finished'),
(5, 'Kayserispor', 'Gaziantep FK',       now() - interval '2 hours', 1, 1, 'finished'),
(5, 'Konyaspor', 'Hatayspor',            now() - interval '2 hours', 3, 0, 'finished'),
-- Upcoming (heute Abend / morgen)
(5, 'Alanyaspor', 'Ankaragücü',          now() + interval '2 hours', NULL, NULL, 'upcoming'),
(5, 'Kasımpaşa', 'Pendikspor',           now() + interval '4 hours', NULL, NULL, 'upcoming'),
(5, 'Samsunspor', 'Rizespor',            now() + interval '20 hours', NULL, NULL, 'upcoming');
