-- 1. Ligen-Tabelle erstellen
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Ligen-Mitglieder-Tabelle erstellen
CREATE TABLE IF NOT EXISTS league_members (
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (league_id, user_id)
);

-- 3. Spalte league_id zu chat_nachrichten hinzufügen für gruppenbasierte Chats
ALTER TABLE chat_nachrichten ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
ALTER TABLE chat_nachrichten ALTER COLUMN match_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_league ON chat_nachrichten(league_id);

-- 4. RLS aktivieren
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies für leagues
DROP POLICY IF EXISTS "Ligen sind lesbar für alle" ON leagues;
CREATE POLICY "Ligen sind lesbar für alle" ON leagues
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Eigene Liga erstellen" ON leagues;
CREATE POLICY "Eigene Liga erstellen" ON leagues
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- 6. RLS Policies für league_members
DROP POLICY IF EXISTS "Ligen-Mitglieder lesbar" ON league_members;
CREATE POLICY "Ligen-Mitglieder lesbar" ON league_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Eigener Beitritt" ON league_members;
CREATE POLICY "Eigener Beitritt" ON league_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Austritt / Entfernen" ON league_members;
CREATE POLICY "Austritt / Entfernen" ON league_members
  FOR DELETE USING (auth.uid() = user_id);

-- 7. RLS für Chat-Nachrichten anpassen (Mitgliedschafts-Prüfung für Lesen & Schreiben)
DROP POLICY IF EXISTS "Chat schreiben" ON chat_nachrichten;
CREATE POLICY "Chat schreiben" ON chat_nachrichten
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      league_id IS NULL
      OR EXISTS (
        SELECT 1 FROM league_members WHERE league_members.league_id = chat_nachrichten.league_id AND league_members.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Chat lesbar" ON chat_nachrichten;
CREATE POLICY "Chat lesbar" ON chat_nachrichten
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      league_id IS NULL
      OR EXISTS (
        SELECT 1 FROM league_members WHERE league_members.league_id = chat_nachrichten.league_id AND league_members.user_id = auth.uid()
      )
    )
  );

