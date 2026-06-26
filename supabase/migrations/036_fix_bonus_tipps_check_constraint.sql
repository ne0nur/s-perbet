-- Migration 036: Fix bonus_tipps frage_id check constraint
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/ynkdtqhhnxmpqvdbzzqk/sql

ALTER TABLE public.bonus_tipps DROP CONSTRAINT IF EXISTS bonus_tipps_frage_id_check;
ALTER TABLE public.bonus_tipps ADD CONSTRAINT bonus_tipps_frage_id_check CHECK (frage_id >= 1);

-- Verify:
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.bonus_tipps'::regclass 
AND conname LIKE '%frage_id%';
