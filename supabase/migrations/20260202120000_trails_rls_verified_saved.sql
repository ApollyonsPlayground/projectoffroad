-- Run in Supabase SQL Editor (or via supabase db push) once per project.
-- Trails: public read, optional is_verified; user_saved_trails for authenticated users.

-- ── trails: optional verification flag (editorial / ranger-confirmed, etc.) ─
ALTER TABLE public.trails
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- ── RLS: trails readable by everyone; writes via service role / dashboard only ─
ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read trails" ON public.trails;
CREATE POLICY "Public read trails"
  ON public.trails
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role full access on trails" ON public.trails;
CREATE POLICY "Service role full access on trails"
  ON public.trails
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users cannot INSERT/UPDATE/DELETE trails by default (no policy = deny).
-- Seed with service role or SQL editor.

-- ── Saved trails (per user) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_saved_trails (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  trail_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, trail_id)
);

CREATE INDEX IF NOT EXISTS idx_user_saved_trails_user
  ON public.user_saved_trails (user_id);

ALTER TABLE public.user_saved_trails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own saved trails" ON public.user_saved_trails;
CREATE POLICY "Users select own saved trails"
  ON public.user_saved_trails
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own saved trails" ON public.user_saved_trails;
CREATE POLICY "Users insert own saved trails"
  ON public.user_saved_trails
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own saved trails" ON public.user_saved_trails;
CREATE POLICY "Users delete own saved trails"
  ON public.user_saved_trails
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Optional: allow users to see save counts is NOT required for MVP.
