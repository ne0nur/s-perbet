-- Mehrere Ligen/Tipprunden
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS league_members (
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (league_id, user_id)
);

-- RLS
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ligen lesbar" ON leagues FOR SELECT USING (true);
CREATE POLICY "Liga erstellen" ON leagues FOR INSERT WITH CHECK (auth.uid() = created_by);

ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mitglieder lesbar" ON league_members FOR SELECT USING (true);
CREATE POLICY "Beitreten" ON league_members FOR INSERT WITH CHECK (auth.uid() = user_id);
