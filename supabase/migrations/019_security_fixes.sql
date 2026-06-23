-- ================================================================
-- Migration 019: Security & RLS Fixes
-- ================================================================

-- 1. Leagues RLS: Verhindern, dass Invite Codes für alle lesbar sind
DROP POLICY IF EXISTS "Ligen sind lesbar für alle" ON leagues;
CREATE POLICY "Ligen lesbar für Mitglieder" ON leagues
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM league_members WHERE league_members.league_id = leagues.id AND league_members.user_id = auth.uid())
    OR creator_id = auth.uid()
  );

-- Da die Ligen nun versteckt sind, brauchen wir eine SECURITY DEFINER
-- Funktion, damit Nutzer über einen Invite-Code beitreten können, 
-- ohne die Liga vorher "sehen" zu müssen.
CREATE OR REPLACE FUNCTION join_league_by_code(p_invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_league_id UUID;
BEGIN
  -- Liga anhand des Codes suchen
  SELECT id INTO v_league_id FROM leagues WHERE invite_code = p_invite_code;
  
  -- Wenn gefunden, Mitgliedschaft eintragen
  IF v_league_id IS NOT NULL THEN
    INSERT INTO league_members (league_id, user_id) 
    VALUES (v_league_id, auth.uid()) 
    ON CONFLICT DO NOTHING;
    
    RETURN v_league_id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 2. Tipps: Verhindern, dass Nutzer bei INSERT/UPDATE manuell "punkte = 100" setzen 
-- und somit das Ranking im Frontend verfälschen, bevor das Spiel beendet ist.
CREATE OR REPLACE FUNCTION enforce_tips_punkte_security()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_status TEXT;
BEGIN
  -- Status des Matches abfragen
  SELECT status INTO v_status FROM matches WHERE id = NEW.match_id;
  
  -- Wenn das Match noch nicht beendet ist, dürfen die Punkte NUR 0 sein.
  -- Das schützt davor, dass User im Client "punkte = 100" mitsenden.
  IF v_status != 'finished' THEN
    NEW.punkte := 0;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_tips_punkte ON tips;
CREATE TRIGGER trigger_enforce_tips_punkte
  BEFORE INSERT OR UPDATE ON tips
  FOR EACH ROW
  EXECUTE FUNCTION enforce_tips_punkte_security();
