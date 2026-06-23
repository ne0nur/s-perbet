-- RLS-Fix: Anon-Role darf Spiele lesen (nötig für publishable key)
DROP POLICY IF EXISTS "Spiele sind lesbar" ON matches;
CREATE POLICY "Spiele sind lesbar" ON matches
  FOR SELECT USING (true);

-- Bonus-Tipps und Profile auch für anon lesbar machen
DROP POLICY IF EXISTS "Bonus-Tipps lesbar" ON bonus_tipps;
CREATE POLICY "Bonus-Tipps lesbar" ON bonus_tipps
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Profile sind lesbar" ON profiles;
CREATE POLICY "Profile sind lesbar" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Chat lesbar" ON chat_nachrichten;
CREATE POLICY "Chat lesbar" ON chat_nachrichten
  FOR SELECT USING (true);
