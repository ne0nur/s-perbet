-- Add Level and XP columns to profiles table to centralize level logic
ALTER TABLE profiles
ADD COLUMN achievements_count INTEGER DEFAULT 0,
ADD COLUMN level INTEGER DEFAULT 1,
ADD COLUMN xp_current INTEGER DEFAULT 0,
ADD COLUMN xp_required INTEGER DEFAULT 88,
ADD COLUMN total_exp INTEGER DEFAULT 0;

-- Update get_ranking_with_trend to read achievements_count from profiles
-- rather than counting from user_achievements table, which is deprecated.
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
  v_current_season INTEGER;
BEGIN
  -- Ermittle aktuelle Saison
  SELECT id INTO v_current_season FROM seasons WHERE is_current = true LIMIT 1;

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
      t.user_id,
      COALESCE(SUM(t.punkte), 0) as old_punkte,
      COALESCE(SUM(CASE WHEN t.punkte = 4 THEN 1 ELSE 0 END), 0) as old_exakte
    FROM tips t
    JOIN matches m ON t.match_id = m.id
    WHERE m.status = 'finished' 
      AND m.season = v_current_season
      AND m.spieltag < (
          SELECT MAX(spieltag) FROM matches WHERE status = 'finished' AND season = v_current_season
      )
    GROUP BY t.user_id
  ),
  old_ranking AS (
    SELECT
      cr.user_id,
      ROW_NUMBER() OVER(
        ORDER BY 
          COALESCE(op.old_punkte, 0) DESC, 
          COALESCE(op.old_exakte, 0) DESC, 
          p.username ASC
      ) as old_rank
    FROM current_ranking cr
    JOIN profiles p ON p.id = cr.user_id
    LEFT JOIN old_points op ON cr.user_id = op.user_id
  )
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    p.gesamt_punkte,
    p.exakte_treffer,
    COALESCE(p.achievements_count, 0) as achievements_count,
    p.is_admin,
    (COALESCE(o.old_rank, c.current_rank) - c.current_rank)::INTEGER as trend
  FROM profiles p
  JOIN current_ranking c ON p.id = c.user_id
  LEFT JOIN old_ranking o ON p.id = o.user_id
  ORDER BY c.current_rank ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
