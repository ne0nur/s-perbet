-- ================================================================
-- Migration 022: Admin Leagues RLS Fix
-- ================================================================

-- Erlaube Admins, alle Ligen zu lesen, auch wenn sie kein Mitglied sind
DROP POLICY IF EXISTS "Ligen lesbar für Mitglieder" ON leagues;
CREATE POLICY "Ligen lesbar für Mitglieder oder Admins" ON leagues
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM league_members WHERE league_members.league_id = leagues.id AND league_members.user_id = auth.uid())
    OR creator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND is_admin = true)
  );

-- Erlaube Admins, alle Liga-Mitglieder zu lesen
DROP POLICY IF EXISTS "Mitglieder lesbar für eigene Ligen" ON league_members;
DROP POLICY IF EXISTS "Mitglieder lesbar" ON league_members;
CREATE POLICY "Mitglieder lesbar für Admins oder User" ON league_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM league_members lm2 WHERE lm2.league_id = league_members.league_id AND lm2.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND is_admin = true)
  );
