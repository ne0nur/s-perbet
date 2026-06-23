-- ================================================================
-- Migration 017: Seasons & Automatic Reset
-- ================================================================

-- 1. Create seasons table
CREATE TABLE IF NOT EXISTS public.seasons (
  id INTEGER PRIMARY KEY, -- e.g. 2023, 2024
  name TEXT NOT NULL,
  is_current BOOLEAN DEFAULT false,
  is_finished BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure only one season is current
CREATE UNIQUE INDEX idx_seasons_current ON public.seasons (is_current) WHERE is_current = true;

-- Insert initial season (assuming existing data is 2023/24 based on dates, or 2024/25)
-- Let's use 2023 as default for existing if they are old, but we will make 2024 the current if we want.
-- Actually, let's insert 2023 as finished and 2024 as current if we are in 2024.
-- The user said "Plane vorsichtig und Sinnvoll !!".
-- We will just insert 2023 as the baseline for existing matches.
INSERT INTO public.seasons (id, name, is_current, is_finished)
VALUES 
  (2026, 'Saison 2026/27', true, false)
ON CONFLICT (id) DO NOTHING;

-- 2. Add season to matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS season INTEGER REFERENCES public.seasons(id);

-- Set default season for existing matches
UPDATE public.matches SET season = 2026 WHERE season IS NULL;
ALTER TABLE public.matches ALTER COLUMN season SET NOT NULL;

-- 3. Create historical user points table
CREATE TABLE IF NOT EXISTS public.user_season_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season INTEGER NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  gesamt_punkte INTEGER DEFAULT 0,
  exakte_treffer INTEGER DEFAULT 0,
  UNIQUE(user_id, season)
);

-- RLS for user_season_points
ALTER TABLE public.user_season_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_season_points_lesbar" ON public.user_season_points FOR SELECT USING (true);

-- 4. Function to automatically end season
CREATE OR REPLACE FUNCTION check_and_end_season()
RETURNS TRIGGER AS $$
DECLARE
  v_season INTEGER;
  v_max_spieltag INTEGER;
  v_unfinished INTEGER;
  v_next_season INTEGER;
  v_is_already_finished BOOLEAN;
BEGIN
  -- We only care if a match was just finished
  IF NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status != 'finished') THEN
    v_season := NEW.season;
    
    -- Check if this season is already finished
    SELECT is_finished INTO v_is_already_finished FROM public.seasons WHERE id = v_season;
    IF v_is_already_finished THEN
      RETURN NEW;
    END IF;

    -- Check max spieltag in this season
    SELECT MAX(spieltag) INTO v_max_spieltag FROM public.matches WHERE season = v_season;
    
    -- In der Süper Lig hat eine Saison mittlerweile in der Regel 38 Spieltage (bei 20 Teams).
    -- Um ein vorzeitiges Beenden zu verhindern (z.B. wenn noch nicht alle Spiele eingetragen sind),
    -- setzen wir das Limit auf 38.
    IF v_max_spieltag >= 38 THEN
      -- Count unfinished matches in this season
      SELECT COUNT(*) INTO v_unfinished FROM public.matches WHERE season = v_season AND status != 'finished';
      
      -- If all matches are finished, the season ends!
      IF v_unfinished = 0 THEN
        -- 1. Mark season as finished and no longer current
        UPDATE public.seasons 
        SET is_finished = true, is_current = false 
        WHERE id = v_season;
        
        -- 2. Save current points to user_season_points
        INSERT INTO public.user_season_points (user_id, season, gesamt_punkte, exakte_treffer)
        SELECT id, v_season, gesamt_punkte, exakte_treffer
        FROM public.profiles
        ON CONFLICT (user_id, season) DO UPDATE 
        SET gesamt_punkte = EXCLUDED.gesamt_punkte,
            exakte_treffer = EXCLUDED.exakte_treffer;
            
        -- 3. Reset profiles points for the new season
        UPDATE public.profiles 
        SET gesamt_punkte = 0, exakte_treffer = 0;
        
        -- 4. Create the new season
        v_next_season := v_season + 1;
        INSERT INTO public.seasons (id, name, is_current, is_finished)
        VALUES (v_next_season, 'Saison ' || v_next_season || '/' || SUBSTRING((v_next_season + 1)::TEXT, 3, 2), true, false)
        ON CONFLICT (id) DO UPDATE SET is_current = true;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach the trigger to matches
DROP TRIGGER IF EXISTS trigger_check_season_end ON public.matches;
CREATE TRIGGER trigger_check_season_end
  AFTER UPDATE OF status ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION check_and_end_season();
