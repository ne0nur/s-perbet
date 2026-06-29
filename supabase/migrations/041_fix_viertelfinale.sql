-- Migration 041: Fehlenden Viertelfinale-Slot ergänzen
-- S6 = 4 Viertelfinal-Matches. Es fehlt: Achtelfinale-Sieger 7 vs 8

INSERT INTO matches (tournament, season, spieltag, heim_team, gast_team, status, anpfiff)
VALUES ('World Cup 2026', 2026, 6, 'Round of 16 7 Winner', 'Round of 16 8 Winner', 'upcoming', '2026-07-12T20:00:00+00:00');

-- Verifikation
SELECT spieltag, COUNT(*) as matches 
FROM matches 
WHERE tournament = 'World Cup 2026' 
GROUP BY spieltag 
ORDER BY spieltag;
