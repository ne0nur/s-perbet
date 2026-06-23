-- ================================================================
-- Migration 011: Automatische Punkte-Berechnung via Trigger
-- Hält profiles.gesamt_punkte und profiles.exakte_treffer aktuell
-- ================================================================

-- Hilfsfunktion: Punkte berechnen (Spiegelung der Frontend-Logik)
CREATE OR REPLACE FUNCTION berechne_punkte(
  tipp_heim INT,
  tipp_gast INT,
  tore_heim INT,
  tore_gast INT
) RETURNS INT
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  -- Exaktes Ergebnis
  IF tipp_heim = tore_heim AND tipp_gast = tore_gast THEN
    RETURN 4;
  END IF;
  -- Richtige Tordifferenz
  IF (tipp_heim - tipp_gast) = (tore_heim - tore_gast) THEN
    RETURN 3;
  END IF;
  -- Richtige Tendenz
  IF SIGN(tipp_heim - tipp_gast) = SIGN(tore_heim - tore_gast) THEN
    RETURN 2;
  END IF;
  RETURN 0;
END;
$$;

-- Trigger-Funktion: Punkte in tips.punkte setzen und Profile aktualisieren
CREATE OR REPLACE FUNCTION aktualisiere_tipp_punkte()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match RECORD;
  v_punkte INT;
BEGIN
  -- Nur bei UPDATE auf matches (wenn Ergebnis eingetragen wird)
  -- Alle Tipps für dieses Match aktualisieren
  IF TG_TABLE_NAME = 'matches' THEN
    -- Nur wenn Ergebnis jetzt vollständig und Status finished
    IF NEW.status = 'finished' AND NEW.tore_heim IS NOT NULL AND NEW.tore_gast IS NOT NULL THEN
      -- Jeden Tipp für dieses Match neu berechnen
      UPDATE tips
      SET punkte = berechne_punkte(tipp_heim, tipp_gast, NEW.tore_heim, NEW.tore_gast)
      WHERE match_id = NEW.id;

      -- Gesamtpunkte aller betroffenen User neu berechnen
      UPDATE profiles p
      SET
        gesamt_punkte = (
          SELECT COALESCE(SUM(t.punkte), 0)
          FROM tips t
          JOIN matches m ON t.match_id = m.id
          WHERE t.user_id = p.id AND m.status = 'finished'
        ),
        exakte_treffer = (
          SELECT COUNT(*)
          FROM tips t
          JOIN matches m ON t.match_id = m.id
          WHERE t.user_id = p.id AND m.status = 'finished' AND t.punkte = 4
        )
      WHERE p.id IN (
        SELECT DISTINCT user_id FROM tips WHERE match_id = NEW.id
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger auf matches: wenn Ergebnis eingetragen wird
DROP TRIGGER IF EXISTS trigger_punkte_bei_ergebnis ON matches;
CREATE TRIGGER trigger_punkte_bei_ergebnis
  AFTER UPDATE OF tore_heim, tore_gast, status ON matches
  FOR EACH ROW
  EXECUTE FUNCTION aktualisiere_tipp_punkte();

-- Einmalige Neuberechnung aller bestehenden Punkte (für den Fall, 
-- dass Ergebnisse bereits vor diesem Trigger eingetragen wurden)
DO $$
DECLARE
  v_match RECORD;
BEGIN
  FOR v_match IN
    SELECT id, tore_heim, tore_gast
    FROM matches
    WHERE status = 'finished'
      AND tore_heim IS NOT NULL
      AND tore_gast IS NOT NULL
  LOOP
    UPDATE tips
    SET punkte = berechne_punkte(tipp_heim, tipp_gast, v_match.tore_heim, v_match.tore_gast)
    WHERE match_id = v_match.id;
  END LOOP;

  -- Alle Profile aktualisieren
  UPDATE profiles p
  SET
    gesamt_punkte = (
      SELECT COALESCE(SUM(t.punkte), 0)
      FROM tips t
      JOIN matches m ON t.match_id = m.id
      WHERE t.user_id = p.id AND m.status = 'finished'
    ),
    exakte_treffer = (
      SELECT COUNT(*)
      FROM tips t
      JOIN matches m ON t.match_id = m.id
      WHERE t.user_id = p.id AND m.status = 'finished' AND t.punkte = 4
    );
END;
$$;
