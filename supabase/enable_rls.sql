-- Internal backend tables live in the public schema, so keep RLS enabled to
-- satisfy Supabase security checks. The backend should connect with the
-- DATABASE_URL service/database role, not the anon public API role.

ALTER TABLE public.section_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_cache ENABLE ROW LEVEL SECURITY;
