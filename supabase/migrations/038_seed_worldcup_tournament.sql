-- ============================================================
-- Migration 038: seed_worldcup_tournament
-- Fügt World Cup 2026 als Turnier-Konfiguration hinzu
-- ============================================================

INSERT INTO tournament_configs (
  name, emoji, season, has_table, has_knockout,
  group_stage_matchdays,
  has_historical_data
) VALUES (
  'World Cup 2026', '🌍', 2026, true, true,
  3,
  false
) ON CONFLICT (name) DO UPDATE SET
  season = EXCLUDED.season,
  has_knockout = EXCLUDED.has_knockout,
  group_stage_matchdays = EXCLUDED.group_stage_matchdays;
