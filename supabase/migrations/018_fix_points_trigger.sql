-- ================================================================
-- Migration 018: Fix points trigger for seasons
-- ================================================================

-- Die bisherige Funktion hat immer über ALLE Matches summiert.
-- Dadurch würden beim Update eines Matches in der neuen Saison
-- alle historischen Punkte wieder ins aktuelle Profil geladen.
-- Wir passen die Funktion an, sodass sie nur die Punkte der 
-- jeweiligen Saison summiert.

CREATE OR REPLACE FUNCTION aktualisiere_tipp_punkte()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_season INTEGER;
  v_match_id UUID;
  v_season INTEGER;
BEGIN
  -- Ermittle die Match-ID und Saison (bei DELETE gibt es kein NEW)
  IF TG_OP = 'DELETE' THEN
    v_match_id := OLD.id;
    v_season := OLD.season;
  ELSE
    v_match_id := NEW.id;
    v_season := NEW.season;
  END IF;

  -- 1. Tipps aktualisieren, wenn das Match finished ist
  IF TG_OP != 'DELETE' AND NEW.status = 'finished' AND NEW.tore_heim IS NOT NULL AND NEW.tore_gast IS NOT NULL THEN
    UPDATE tips
    SET punkte = berechne_punkte(tipp_heim, tipp_gast, NEW.tore_heim, NEW.tore_gast)
    WHERE match_id = v_match_id;
  END IF;

  -- Wenn das Match von "finished" auf etwas anderes gesetzt wird, setze Punkte auf 0
  IF TG_OP != 'DELETE' AND NEW.status != 'finished' AND OLD.status = 'finished' THEN
    UPDATE tips SET punkte = 0 WHERE match_id = v_match_id;
  END IF;

  -- 2. Aktuelle Saison ermitteln
  SELECT id INTO v_current_season FROM public.seasons WHERE is_current = true LIMIT 1;

  -- 3. Punkte für alle Nutzer, die diesen Tipp hatten (oder haben), neu summieren
  -- Selbst wenn der Tipp gelöscht wird (Cascading Delete), triggert dies danach
  IF v_season = v_current_season THEN
    UPDATE profiles p
    SET
      gesamt_punkte = (
        SELECT COALESCE(SUM(t.punkte), 0)
        FROM tips t JOIN matches m ON t.match_id = m.id
        WHERE t.user_id = p.id AND m.status = 'finished' AND m.season = v_current_season
      ),
      exakte_treffer = (
        SELECT COUNT(*)
        FROM tips t JOIN matches m ON t.match_id = m.id
        WHERE t.user_id = p.id AND m.status = 'finished' AND t.punkte = 4 AND m.season = v_current_season
      )
    WHERE p.id IN (SELECT DISTINCT user_id FROM tips WHERE match_id = v_match_id);
  ELSE
    UPDATE user_season_points usp
    SET
      gesamt_punkte = (
        SELECT COALESCE(SUM(t.punkte), 0)
        FROM tips t JOIN matches m ON t.match_id = m.id
        WHERE t.user_id = usp.user_id AND m.status = 'finished' AND m.season = v_season
      ),
      exakte_treffer = (
        SELECT COUNT(*)
        FROM tips t JOIN matches m ON t.match_id = m.id
        WHERE t.user_id = usp.user_id AND m.status = 'finished' AND t.punkte = 4 AND m.season = v_season
      )
    WHERE usp.season = v_season
    AND usp.user_id IN (SELECT DISTINCT user_id FROM tips WHERE match_id = v_match_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Den Trigger erweitern, um auch DELETE und Status-Reversionen (Un-finish) zu fangen
DROP TRIGGER IF EXISTS trigger_punkte_bei_ergebnis ON matches;
CREATE TRIGGER trigger_punkte_bei_ergebnis
  AFTER UPDATE OF tore_heim, tore_gast, status ON matches
  FOR EACH ROW EXECUTE FUNCTION aktualisiere_tipp_punkte();

DROP TRIGGER IF EXISTS trigger_punkte_bei_match_delete ON matches;
CREATE TRIGGER trigger_punkte_bei_match_delete
  BEFORE DELETE ON matches
  FOR EACH ROW EXECUTE FUNCTION aktualisiere_tipp_punkte();
