-- ================================================================
-- Migration 020: Final Bugfixes & Rate Limiting
-- ================================================================

-- 1. Phantom Points Fix: 
-- Wenn ein Match gelöscht wird (Cascading Delete der Tipps), dürfen die Punkte 
-- des gelöschten Matches nicht mehr in der Summe für gesamt_punkte landen.
CREATE OR REPLACE FUNCTION aktualisiere_tipp_punkte()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_season INTEGER;
  v_match_id UUID;
  v_season INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_match_id := OLD.id;
    v_season := OLD.season;
  ELSE
    v_match_id := NEW.id;
    v_season := NEW.season;
  END IF;

  IF TG_OP != 'DELETE' AND NEW.status = 'finished' AND NEW.tore_heim IS NOT NULL AND NEW.tore_gast IS NOT NULL THEN
    UPDATE tips
    SET punkte = berechne_punkte(tipp_heim, tipp_gast, NEW.tore_heim, NEW.tore_gast)
    WHERE match_id = v_match_id;
  END IF;

  IF TG_OP != 'DELETE' AND NEW.status != 'finished' AND OLD.status = 'finished' THEN
    UPDATE tips SET punkte = 0 WHERE match_id = v_match_id;
  END IF;

  SELECT id INTO v_current_season FROM public.seasons WHERE is_current = true LIMIT 1;

  IF v_season = v_current_season THEN
    UPDATE profiles p
    SET
      gesamt_punkte = (
        SELECT COALESCE(SUM(t.punkte), 0)
        FROM tips t JOIN matches m ON t.match_id = m.id
        WHERE t.user_id = p.id AND m.status = 'finished' AND m.season = v_current_season 
        AND (TG_OP != 'DELETE' OR m.id != v_match_id) -- <--- FIX: Schließt das zu löschende Match aus
      ),
      exakte_treffer = (
        SELECT COUNT(*)
        FROM tips t JOIN matches m ON t.match_id = m.id
        WHERE t.user_id = p.id AND m.status = 'finished' AND t.punkte = 4 AND m.season = v_current_season
        AND (TG_OP != 'DELETE' OR m.id != v_match_id)
      )
    WHERE p.id IN (SELECT DISTINCT user_id FROM tips WHERE match_id = v_match_id);
  ELSE
    UPDATE user_season_points usp
    SET
      gesamt_punkte = (
        SELECT COALESCE(SUM(t.punkte), 0)
        FROM tips t JOIN matches m ON t.match_id = m.id
        WHERE t.user_id = usp.user_id AND m.status = 'finished' AND m.season = v_season
        AND (TG_OP != 'DELETE' OR m.id != v_match_id)
      ),
      exakte_treffer = (
        SELECT COUNT(*)
        FROM tips t JOIN matches m ON t.match_id = m.id
        WHERE t.user_id = usp.user_id AND m.status = 'finished' AND t.punkte = 4 AND m.season = v_season
        AND (TG_OP != 'DELETE' OR m.id != v_match_id)
      )
    WHERE usp.season = v_season
    AND usp.user_id IN (SELECT DISTINCT user_id FROM tips WHERE match_id = v_match_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. Brute-Force Protection für join_league_by_code
-- Durch ein pg_sleep(1) verlangsamen wir automatisierte Bruteforce-Angriffe.
CREATE OR REPLACE FUNCTION join_league_by_code(p_invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_league_id UUID;
BEGIN
  -- Anti-Bruteforce Delay
  PERFORM pg_sleep(1);

  SELECT id INTO v_league_id FROM leagues WHERE invite_code = p_invite_code;
  
  IF v_league_id IS NOT NULL THEN
    INSERT INTO league_members (league_id, user_id) 
    VALUES (v_league_id, auth.uid()) 
    ON CONFLICT DO NOTHING;
    RETURN v_league_id;
  END IF;
  
  RETURN NULL;
END;
$$;
