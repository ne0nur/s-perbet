-- ================================================================
-- Migration 028: Distance-based scoring with negative penalties
-- Updates berechne_punkte SQL function and recalculates existing tips
-- ================================================================

CREATE OR REPLACE FUNCTION berechne_punkte(
  tipp_heim INT,
  tipp_gast INT,
  tore_heim INT,
  tore_gast INT
) RETURNS INT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_d INT;
  v_tendenz_stimmt BOOLEAN;
BEGIN
  v_d := ABS(tipp_heim - tore_heim) + ABS(tipp_gast - tore_gast);
  v_tendenz_stimmt := SIGN(tipp_heim - tipp_gast) = SIGN(tore_heim - tore_gast);

  IF v_tendenz_stimmt THEN
    IF v_d = 0 THEN
      RETURN 4;
    ELSIF v_d = 1 THEN
      RETURN 3;
    ELSIF v_d = 2 THEN
      RETURN 2;
    ELSE
      RETURN 1;
    END IF;
  ELSE
    IF v_d <= 1 THEN
      RETURN 0;
    ELSIF v_d <= 3 THEN
      RETURN -1;
    ELSE
      RETURN -2;
    END IF;
  END IF;
END;
$$;

-- Recalculate all points for finished matches
UPDATE tips t
SET punkte = berechne_punkte(t.tipp_heim, t.tipp_gast, m.tore_heim, m.tore_gast)
FROM matches m
WHERE t.match_id = m.id AND m.status = 'finished' AND m.tore_heim IS NOT NULL AND m.tore_gast IS NOT NULL;

-- Recalculate profiles gesamt_punkte and exakte_treffer
DO $$
DECLARE
  v_current_season INT;
BEGIN
  SELECT id INTO v_current_season FROM public.seasons WHERE is_current = true LIMIT 1;

  UPDATE profiles p
  SET
    gesamt_punkte = COALESCE((
      SELECT SUM(t.punkte)
      FROM tips t JOIN matches m ON t.match_id = m.id
      WHERE t.user_id = p.id AND m.status = 'finished' AND m.season = v_current_season
    ), 0),
    exakte_treffer = COALESCE((
      SELECT COUNT(*)
      FROM tips t JOIN matches m ON t.match_id = m.id
      WHERE t.user_id = p.id AND m.status = 'finished' AND t.punkte = 4 AND m.season = v_current_season
    ), 0);

  -- Update historical standings
  UPDATE user_season_points usp
  SET
    gesamt_punkte = COALESCE((
      SELECT SUM(t.punkte)
      FROM tips t JOIN matches m ON t.match_id = m.id
      WHERE t.user_id = usp.user_id AND m.status = 'finished' AND m.season = usp.season
    ), 0),
    exakte_treffer = COALESCE((
      SELECT COUNT(*)
      FROM tips t JOIN matches m ON t.match_id = m.id
      WHERE t.user_id = usp.user_id AND m.status = 'finished' AND t.punkte = 4 AND m.season = usp.season
    ), 0);
END $$;
