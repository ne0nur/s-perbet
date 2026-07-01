-- Migration 045: Remove duplicate points trigger that doubled all scores
-- Root cause: trigger_punkteberechnung (old 4-3-2-0 system, from migration 011)
-- ran AFTER trigger_punkte_bei_ergebnis (new distance-based system, migration 018).
-- The old trigger ADDED points (ges + X), the new one SETS to SUM(tips).
-- Result: profiles.gesamt_punkte was doubled for all users.

DROP TRIGGER IF EXISTS trigger_punkteberechnung ON matches;

-- Drop only the 0-arg trigger function variant (NOT the 4-arg helper!)
DROP FUNCTION IF EXISTS berechne_punkte();

-- Recalculate to fix previously doubled values
SELECT recalc_all_points();
