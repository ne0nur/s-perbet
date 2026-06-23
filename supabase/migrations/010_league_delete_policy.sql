-- Liga löschen / bearbeiten Policies (RLS)
-- Migration 010: Erlaubt dem Ersteller, seine Liga zu löschen oder zu bearbeiten

-- DELETE: Nur der Ersteller darf löschen
DROP POLICY IF EXISTS "Eigene Liga löschen" ON leagues;
CREATE POLICY "Eigene Liga löschen" ON leagues
  FOR DELETE USING (auth.uid() = creator_id);

-- UPDATE: Nur der Ersteller darf bearbeiten (Name ändern etc.)
DROP POLICY IF EXISTS "Eigene Liga bearbeiten" ON leagues;
CREATE POLICY "Eigene Liga bearbeiten" ON leagues
  FOR UPDATE USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);
