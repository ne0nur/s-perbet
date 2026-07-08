-- Migration: ESPN Enhancement — Logos, Venue, Event-IDs
-- Ausführen im Supabase SQL Editor

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS heim_logo TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS gast_logo TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS venue TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS espn_id TEXT;
