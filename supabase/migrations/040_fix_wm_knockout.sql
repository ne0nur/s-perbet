-- ============================================================
-- Migration 040: WM 2026 KO-Phasen korrigieren
-- Entfernt 4 Fake-Matches + verschiebt 2 Matches in richtigen Spieltag
-- ============================================================

-- 1. Lösche 3 Fake-Sechzehntelfinal-Matches (von ESPN falsch importiert)
DELETE FROM tips WHERE match_id IN (
  SELECT id FROM matches 
  WHERE tournament = 'World Cup 2026' AND spieltag = 4
  AND (
    (heim_team = 'Colombia' AND gast_team = 'Portugal')
    OR (heim_team = 'Jordan' AND gast_team = 'Argentina')
    OR (heim_team = 'Algeria' AND gast_team = 'Austria')
    OR (heim_team = 'Congo DR' AND gast_team = 'Uzbekistan')
  )
);

DELETE FROM matches 
WHERE tournament = 'World Cup 2026' AND spieltag = 4
AND (
  (heim_team = 'Colombia' AND gast_team = 'Portugal')
  OR (heim_team = 'Jordan' AND gast_team = 'Argentina')
  OR (heim_team = 'Algeria' AND gast_team = 'Austria')
  OR (heim_team = 'Congo DR' AND gast_team = 'Uzbekistan')
);

-- 2. Verschiebe Argentina–Cape Verde von S5 nach S4 (laut echtem Spielplan)
UPDATE matches SET spieltag = 4
WHERE tournament = 'World Cup 2026' AND spieltag = 5
AND heim_team = 'Argentina' AND gast_team = 'Cape Verde';

-- 3. Verschiebe Colombia–Ghana von S5 nach S4
UPDATE matches SET spieltag = 4
WHERE tournament = 'World Cup 2026' AND spieltag = 5
AND heim_team = 'Colombia' AND gast_team = 'Ghana';

-- 4. Lösche Canada aus Achtelfinale (Canada hat gegen Südafrika verloren)
DELETE FROM tips WHERE match_id IN (
  SELECT id FROM matches
  WHERE tournament = 'World Cup 2026' AND spieltag = 5
  AND heim_team = 'Canada'
);

DELETE FROM matches
WHERE tournament = 'World Cup 2026' AND spieltag = 5
AND heim_team = 'Canada';

-- 5. Fehlenden Achtelfinale-Slot ergänzen (Südafrika-Slot)
INSERT INTO matches (tournament, season, spieltag, heim_team, gast_team, status, anpfiff)
VALUES ('World Cup 2026', 2026, 5, 'Round of 32 1 Winner', 'Round of 32 3 Winner', 'upcoming', '2026-07-04T17:00:00+00:00');

-- 6. Verifikation
SELECT spieltag, COUNT(*) as matches 
FROM matches 
WHERE tournament = 'World Cup 2026' 
GROUP BY spieltag 
ORDER BY spieltag;
