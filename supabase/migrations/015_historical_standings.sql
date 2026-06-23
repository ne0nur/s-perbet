-- Create historical_standings table to cache past seasons
CREATE TABLE IF NOT EXISTS public.historical_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season INTEGER NOT NULL, -- e.g., 2021, 2022, 2023, 2024, 2025
  rank INTEGER NOT NULL,
  team_name TEXT NOT NULL,
  played INTEGER NOT NULL,
  won INTEGER NOT NULL,
  drawn INTEGER NOT NULL,
  lost INTEGER NOT NULL,
  goals_for INTEGER NOT NULL,
  goals_against INTEGER NOT NULL,
  goal_difference INTEGER NOT NULL,
  points INTEGER NOT NULL,
  form TEXT DEFAULT NULL, -- e.g., "WWDLD"
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (season, team_name)
);

-- Enable Row Level Security
ALTER TABLE public.historical_standings ENABLE ROW LEVEL SECURITY;

-- Allow select reads for everyone (authenticated and anonymous)
DROP POLICY IF EXISTS "Historical standings are readable by anyone" ON public.historical_standings;
CREATE POLICY "Historical standings are readable by anyone" ON public.historical_standings
  FOR SELECT USING (true);
