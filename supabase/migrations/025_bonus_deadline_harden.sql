-- Bonus-Tipp Deadline Härtung
-- Verhindert Bonus-Tipp-Abgabe nach dem 2. Spieltag
-- (Sobald das ERSTE Spiel von Spieltag 3 anpfiff hat oder Spieltag 2 vorbei ist)

-- Hilfsfunktion: Prüft ob Bonus-Tipps noch erlaubt sind
CREATE OR REPLACE FUNCTION bonus_tipps_erlaubt()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Bonus-Tipps sind erlaubt, solange noch kein Spiel von Spieltag 3 angepfiffen hat
  SELECT NOT EXISTS (
    SELECT 1 FROM matches
    WHERE spieltag >= 3 AND anpfiff <= now()
  );
$$;

-- DROP existierende Policies
DROP POLICY IF EXISTS "Eigene Bonus-Tipps schreiben" ON bonus_tipps;
DROP POLICY IF EXISTS "Eigene Bonus-Tipps aendern" ON bonus_tipps;

-- Neue Policies mit Deadline-Check
CREATE POLICY "Eigene Bonus-Tipps schreiben"
  ON bonus_tipps FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND bonus_tipps_erlaubt()
  );

CREATE POLICY "Eigene Bonus-Tipps aendern"
  ON bonus_tipps FOR UPDATE
  USING (auth.uid() = user_id AND bonus_tipps_erlaubt())
  WITH CHECK (auth.uid() = user_id AND bonus_tipps_erlaubt());
