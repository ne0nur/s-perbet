-- Add tournament column to matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS tournament TEXT DEFAULT 'Süper Lig';

-- Add active_tournaments column to leagues
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS active_tournaments TEXT[] DEFAULT ARRAY['Süper Lig'];

-- Create an enum or just use text constraints if needed, but text is fine for now.
