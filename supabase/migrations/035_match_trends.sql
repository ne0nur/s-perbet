CREATE OR REPLACE FUNCTION get_match_trends(p_match_ids UUID[])
RETURNS TABLE (
  match_id UUID,
  home_tips BIGINT,
  draw_tips BIGINT,
  away_tips BIGINT,
  total_tips BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.match_id,
    COUNT(t.id) FILTER (WHERE t.tipp_heim > t.tipp_gast) as home_tips,
    COUNT(t.id) FILTER (WHERE t.tipp_heim = t.tipp_gast) as draw_tips,
    COUNT(t.id) FILTER (WHERE t.tipp_heim < t.tipp_gast) as away_tips,
    COUNT(t.id) as total_tips
  FROM tips t
  WHERE t.match_id = ANY(p_match_ids)
  GROUP BY t.match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
