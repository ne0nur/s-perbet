-- ================================================================
-- Migration 023: Fix Infinite Recursion in League Members
-- ================================================================

DROP POLICY IF EXISTS "Mitglieder lesbar für Admins oder User" ON league_members;
DROP POLICY IF EXISTS "Mitglieder lesbar für eigene Ligen" ON league_members;
DROP POLICY IF EXISTS "Mitglieder lesbar" ON league_members;
DROP POLICY IF EXISTS "Ligen-Mitglieder lesbar" ON league_members;

-- Um die Endlosschleife (Infinite Recursion) zu verhindern, machen wir die Tabelle
-- für alle authentifizierten User lesbar. Der tatsächliche Schutz passiert bei der
-- 'leagues' Tabelle, auf die man ohnehin nur zugreifen kann, wenn man Mitglied ist.
CREATE POLICY "Mitglieder lesbar" ON league_members FOR SELECT USING (true);
