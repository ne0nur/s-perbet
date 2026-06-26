-- ============================================================
-- Migration 037: tournament_configs
-- Zentrale Konfigurationstabelle für alle Turniere.
-- Ermöglicht vollständig dynamische Darstellung von Tabellen,
-- Legenden, K.o.-Phasen und Bonus-Statistiken ohne Hardcodes.
-- ============================================================

CREATE TABLE IF NOT EXISTS tournament_configs (
  id                       SERIAL PRIMARY KEY,
  name                     TEXT NOT NULL UNIQUE,
  emoji                    TEXT DEFAULT '🏆',
  season                   INT NOT NULL,

  -- Tabellen-Anzeige
  has_table                BOOLEAN DEFAULT true,

  -- K.o.-Phasen
  has_knockout             BOOLEAN DEFAULT false,
  group_stage_matchdays    INT DEFAULT 100,     -- Spieltage <= dieser Zahl = Gruppenphase

  -- Qualifikations-/Relegationszonen (Anzahl Plätze)
  cl_spots                 INT DEFAULT 0,       -- Direkter CL-Einzug (grün)
  cl_playoff_spots         INT DEFAULT 0,       -- CL-Playoff (emerald)
  el_spots                 INT DEFAULT 0,       -- Europa League (blau)
  conf_spots               INT DEFAULT 0,       -- Conference League (sky)
  relegation_playoff_count INT DEFAULT 0,       -- Relegations-Playoffs (orange)
  relegation_count         INT DEFAULT 0,       -- Direkter Abstieg (rot)

  -- CL-interne K.o.-Spots (für Ligaphasen-Tabelle)
  ko_direct_spots          INT DEFAULT 0,
  ko_playoff_spots         INT DEFAULT 0,

  -- Historische Daten verfügbar?
  has_historical_data      BOOLEAN DEFAULT false,

  created_at               TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE tournament_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournament_configs_read" ON tournament_configs;
CREATE POLICY "tournament_configs_read"
  ON tournament_configs FOR SELECT
  TO authenticated
  USING (true);

-- ── Seed-Daten für aktuelle Saison 2026 ──────────────────────

-- Süper Lig
INSERT INTO tournament_configs (
  name, emoji, season, has_table, has_knockout,
  group_stage_matchdays,
  cl_spots, cl_playoff_spots, el_spots, conf_spots,
  relegation_playoff_count, relegation_count,
  ko_direct_spots, ko_playoff_spots,
  has_historical_data
) VALUES (
  'Süper Lig', '🇹🇷', 2026, true, false,
  100,
  1, 1, 1, 1,
  1, 3,
  0, 0,
  true
) ON CONFLICT (name) DO UPDATE SET
  season = EXCLUDED.season,
  cl_spots = EXCLUDED.cl_spots,
  cl_playoff_spots = EXCLUDED.cl_playoff_spots,
  el_spots = EXCLUDED.el_spots,
  conf_spots = EXCLUDED.conf_spots,
  relegation_playoff_count = EXCLUDED.relegation_playoff_count,
  relegation_count = EXCLUDED.relegation_count,
  has_historical_data = EXCLUDED.has_historical_data;

-- Champions League
INSERT INTO tournament_configs (
  name, emoji, season, has_table, has_knockout,
  group_stage_matchdays,
  cl_spots, cl_playoff_spots, el_spots, conf_spots,
  relegation_playoff_count, relegation_count,
  ko_direct_spots, ko_playoff_spots,
  has_historical_data
) VALUES (
  'Champions League', '⭐', 2026, true, true,
  8,
  0, 0, 0, 0,
  0, 0,
  8, 16,
  false
) ON CONFLICT (name) DO UPDATE SET
  season = EXCLUDED.season,
  has_knockout = EXCLUDED.has_knockout,
  group_stage_matchdays = EXCLUDED.group_stage_matchdays,
  ko_direct_spots = EXCLUDED.ko_direct_spots,
  ko_playoff_spots = EXCLUDED.ko_playoff_spots,
  has_historical_data = EXCLUDED.has_historical_data;
