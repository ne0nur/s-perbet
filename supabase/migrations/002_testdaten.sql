-- ============================================================
-- TESTDATEN: Süper Lig Spielplan (in SQL Editor ausführen!)
-- Nur nötig, falls die INSERTs aus 001_initial_schema.sql 
-- nicht ausgeführt wurden.
-- ============================================================

-- Spieltag 1
INSERT INTO matches (spieltag, heim_team, gast_team, anpfiff, tore_heim, tore_gast, status) VALUES
(1, 'Fenerbahçe', 'Adana Demirspor',   now() - interval '30 days', 2, 1, 'finished'),
(1, 'Galatasaray', 'Trabzonspor',       now() - interval '30 days', 3, 0, 'finished'),
(1, 'Beşiktaş', 'Konyaspor',            now() - interval '30 days', 1, 1, 'finished'),
(1, 'Başakşehir', 'Sivasspor',          now() - interval '30 days', 0, 1, 'finished'),
(1, 'Antalyaspor', 'Kayserispor',       now() - interval '30 days', 2, 2, 'finished'),
(1, 'Gaziantep FK', 'Hatayspor',        now() - interval '30 days', 1, 0, 'finished'),
(1, 'Alanyaspor', 'Kasımpaşa',          now() - interval '30 days', 3, 1, 'finished'),
(1, 'Ankaragücü', 'Samsunspor',         now() - interval '30 days', 0, 0, 'finished'),
(1, 'Pendikspor', 'Rizespor',           now() - interval '30 days', 1, 2, 'finished');

-- Spieltag 2
INSERT INTO matches (spieltag, heim_team, gast_team, anpfiff, tore_heim, tore_gast, status) VALUES
(2, 'Trabzonspor', 'Fenerbahçe',         now() - interval '23 days', 1, 3, 'finished'),
(2, 'Konyaspor', 'Galatasaray',          now() - interval '23 days', 0, 2, 'finished'),
(2, 'Sivasspor', 'Beşiktaş',             now() - interval '23 days', 1, 0, 'finished'),
(2, 'Kayserispor', 'Başakşehir',         now() - interval '23 days', 2, 1, 'finished'),
(2, 'Adana Demirspor', 'Antalyaspor',    now() - interval '23 days', 3, 2, 'finished'),
(2, 'Hatayspor', 'Alanyaspor',           now() - interval '23 days', 0, 1, 'finished'),
(2, 'Kasımpaşa', 'Gaziantep FK',         now() - interval '23 days', 1, 1, 'finished'),
(2, 'Samsunspor', 'Pendikspor',          now() - interval '23 days', 2, 0, 'finished'),
(2, 'Rizespor', 'Ankaragücü',            now() - interval '23 days', 0, 0, 'finished');

-- Spieltag 3
INSERT INTO matches (spieltag, heim_team, gast_team, anpfiff, tore_heim, tore_gast, status) VALUES
(3, 'Fenerbahçe', 'Başakşehir',          now() - interval '16 days', 4, 0, 'finished'),
(3, 'Galatasaray', 'Sivasspor',          now() - interval '16 days', 2, 0, 'finished'),
(3, 'Beşiktaş', 'Adana Demirspor',       now() - interval '16 days', 2, 1, 'finished'),
(3, 'Trabzonspor', 'Kayserispor',        now() - interval '16 days', 1, 1, 'finished'),
(3, 'Antalyaspor', 'Konyaspor',          now() - interval '16 days', 0, 0, 'finished'),
(3, 'Gaziantep FK', 'Alanyaspor',        now() - interval '16 days', 1, 2, 'finished'),
(3, 'Ankaragücü', 'Kasımpaşa',           now() - interval '16 days', 3, 1, 'finished'),
(3, 'Pendikspor', 'Hatayspor',           now() - interval '16 days', 0, 1, 'finished'),
(3, 'Samsunspor', 'Rizespor',            now() - interval '16 days', 1, 1, 'finished');

-- Spieltag 4
INSERT INTO matches (spieltag, heim_team, gast_team, anpfiff, tore_heim, tore_gast, status) VALUES
(4, 'Konyaspor', 'Fenerbahçe',           now() - interval '9 days', 0, 3, 'finished'),
(4, 'Sivasspor', 'Trabzonspor',          now() - interval '9 days', 1, 2, 'finished'),
(4, 'Kayserispor', 'Beşiktaş',           now() - interval '9 days', 0, 1, 'finished'),
(4, 'Başakşehir', 'Galatasaray',         now() - interval '9 days', 1, 4, 'finished'),
(4, 'Adana Demirspor', 'Gaziantep FK',   now() - interval '9 days', 2, 0, 'finished'),
(4, 'Hatayspor', 'Ankaragücü',           now() - interval '9 days', 1, 1, 'finished'),
(4, 'Alanyaspor', 'Pendikspor',          now() - interval '9 days', 3, 0, 'finished'),
(4, 'Kasımpaşa', 'Samsunspor',           now() - interval '9 days', 2, 2, 'finished'),
(4, 'Rizespor', 'Antalyaspor',           now() - interval '9 days', 1, 0, 'finished');

-- Spieltag 5 (Live + Finished + Upcoming)
INSERT INTO matches (spieltag, heim_team, gast_team, anpfiff, tore_heim, tore_gast, status) VALUES
(5, 'Fenerbahçe', 'Galatasaray',         now() - interval '45 minutes', 1, 0, 'live'),
(5, 'Beşiktaş', 'Trabzonspor',           now() - interval '30 minutes', 0, 1, 'live'),
(5, 'Başakşehir', 'Antalyaspor',         now() - interval '3 hours', 2, 1, 'finished'),
(5, 'Sivasspor', 'Adana Demirspor',      now() - interval '2.5 hours', 0, 2, 'finished'),
(5, 'Kayserispor', 'Gaziantep FK',       now() - interval '2 hours', 1, 1, 'finished'),
(5, 'Konyaspor', 'Hatayspor',            now() - interval '2 hours', 3, 0, 'finished'),
(5, 'Alanyaspor', 'Ankaragücü',          now() + interval '2 hours', NULL, NULL, 'upcoming'),
(5, 'Kasımpaşa', 'Pendikspor',           now() + interval '4 hours', NULL, NULL, 'upcoming'),
(5, 'Samsunspor', 'Rizespor',            now() + interval '20 hours', NULL, NULL, 'upcoming');
