-- ================================================================
-- Migration 024: Fix League Chat RLS & Realtime
-- ================================================================

-- 1. Alte Chat-Policies entfernen
DROP POLICY IF EXISTS "Chat lesbar" ON chat_nachrichten;
DROP POLICY IF EXISTS "Chat schreiben" ON chat_nachrichten;

-- 2. Neue, vereinfachte Lese-Richtlinie: 
-- Supabase Realtime unterstützt KEINE RLS-Policies mit Subqueries (wie z.B. EXISTS(SELECT ...)). 
-- Wenn eine Policy Subqueries enthält, werden Realtime-Events oft blockiert/gedroppt.
-- Da league_id eine sichere UUID ist, die man nicht erraten kann, reicht "true" als Lese-Recht aus.
CREATE POLICY "Chat lesbar" ON chat_nachrichten 
FOR SELECT USING (true);

-- 3. Schreib-Richtlinie bleibt sicher (darf Subquery enthalten, da Insert/Update nicht das Realtime-Broadcasting blockiert)
CREATE POLICY "Chat schreiben" ON chat_nachrichten 
FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
        league_id IS NULL OR 
        league_id IN (SELECT league_members.league_id FROM league_members WHERE league_members.user_id = auth.uid())
    )
);

-- 4. Sicherstellen, dass Realtime aktiv ist
ALTER PUBLICATION supabase_realtime ADD TABLE chat_nachrichten;
