CREATE OR REPLACE FUNCTION get_ranking_with_trend(p_league_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  username TEXT,
  avatar_url TEXT,
  gesamt_punkte INTEGER,
  exakte_treffer INTEGER,
  achievements_count INTEGER,
  is_admin BOOLEAN,
  trend INTEGER
) AS $$
DECLARE
  latest_spieltag INTEGER;
BEGIN
  -- Get the latest finished spieltag
  SELECT MAX(spieltag) INTO latest_spieltag
  FROM matches
  WHERE status = 'FINISHED';

  IF latest_spieltag IS NULL THEN
    latest_spieltag := 0;
  END IF;

  RETURN QUERY
  WITH current_ranking AS (
    SELECT 
      p.id as user_id,
      p.gesamt_punkte,
      p.exakte_treffer,
      ROW_NUMBER() OVER(ORDER BY p.gesamt_punkte DESC, p.exakte_treffer DESC, p.username ASC) as current_rank
    FROM profiles p
    WHERE p_league_id IS NULL OR EXISTS (SELECT 1 FROM league_members lm WHERE lm.user_id = p.id AND lm.league_id = p_league_id)
  ),
  old_points AS (
    SELECT 
      p.id as user_id,
      COALESCE(SUM(t.punkte), 0) as old_punkte,
      COALESCE(COUNT(t.id) FILTER (WHERE t.punkte = 4), 0) as old_exakte
    FROM profiles p
    LEFT JOIN tipps t ON t.user_id = p.id
    LEFT JOIN matches m ON m.id = t.match_id AND m.status = 'FINISHED' AND m.spieltag < latest_spieltag
    WHERE p_league_id IS NULL OR EXISTS (SELECT 1 FROM league_members lm WHERE lm.user_id = p.id AND lm.league_id = p_league_id)
    GROUP BY p.id
  ),
  old_ranking AS (
    SELECT 
      user_id,
      ROW_NUMBER() OVER(ORDER BY old_punkte DESC, old_exakte DESC, p.username ASC) as old_rank
    FROM old_points
    JOIN profiles p ON p.id = old_points.user_id
  )
  SELECT 
    p.id,
    p.username,
    p.avatar_url,
    p.gesamt_punkte,
    p.exakte_treffer,
    COALESCE(
      (SELECT count::integer FROM (SELECT COUNT(*) as count FROM user_achievements ua WHERE ua.user_id = p.id) sub),
      0
    ) as achievements_count,
    p.is_admin,
    (COALESCE(o.old_rank, c.current_rank) - c.current_rank)::INTEGER as trend
  FROM profiles p
  JOIN current_ranking c ON c.user_id = p.id
  JOIN old_ranking o ON o.user_id = p.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
