CREATE OR REPLACE VIEW public.tips_status AS
SELECT id, user_id, match_id
FROM public.tips;

GRANT SELECT ON public.tips_status TO authenticated;
