-- Migration: Create RPC to recalculate all tips and profiles
CREATE OR REPLACE FUNCTION recalc_all_points()
RETURNS TABLE(action text, count int)
LANGUAGE plpgsql AS $$
DECLARE
  v_tips_updated int;
  v_profiles_updated int;
  v_current_season int;
BEGIN
  SELECT id INTO v_current_season FROM public.seasons WHERE is_current = true LIMIT 1;

  -- Step 1: Recalculate all tips for finished matches
  UPDATE tips t
  SET punkte = berechne_punkte(t.tipp_heim, t.tipp_gast, m.tore_heim, m.tore_gast)
  FROM matches m
  WHERE t.match_id = m.id AND m.status = 'finished' AND m.tore_heim IS NOT NULL AND m.tore_gast IS NOT NULL;
  GET DIAGNOSTICS v_tips_updated = ROW_COUNT;

  -- Step 2: Recalculate profiles
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
  GET DIAGNOSTICS v_profiles_updated = ROW_COUNT;

  RETURN QUERY SELECT 'tips'::text, v_tips_updated;
  RETURN QUERY SELECT 'profiles'::text, v_profiles_updated;
END;
$$;
