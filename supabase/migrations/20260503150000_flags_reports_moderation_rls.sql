-- Flags queue (home Moderation panel) + reports (⋯ Report Post).
-- Safe IF NOT EXISTS where tables may already exist from manual SQL.

-- ── post_flags ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.post_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own post flags" ON public.post_flags;
CREATE POLICY "Users insert own post flags"
  ON public.post_flags FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Mods select post flags" ON public.post_flags;
CREATE POLICY "Mods select post flags"
  ON public.post_flags FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND lower(coalesce(u.role::text, '')) IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Mods delete post flags" ON public.post_flags;
CREATE POLICY "Mods delete post flags"
  ON public.post_flags FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND lower(coalesce(u.role::text, '')) IN ('owner', 'admin')
    )
  );

-- ── comment_flags ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comment_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

ALTER TABLE public.comment_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own comment flags" ON public.comment_flags;
CREATE POLICY "Users insert own comment flags"
  ON public.comment_flags FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Mods select comment flags" ON public.comment_flags;
CREATE POLICY "Mods select comment flags"
  ON public.comment_flags FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND lower(coalesce(u.role::text, '')) IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Mods delete comment flags" ON public.comment_flags;
CREATE POLICY "Mods delete comment flags"
  ON public.comment_flags FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND lower(coalesce(u.role::text, '')) IN ('owner', 'admin')
    )
  );

-- ── reports (⋯ Report Post) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can report" ON public.reports;
CREATE POLICY "Authenticated users can report"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins can read reports" ON public.reports;
DROP POLICY IF EXISTS "Users read own reports" ON public.reports;
DROP POLICY IF EXISTS "Owners and admins read all reports" ON public.reports;

CREATE POLICY "Users read own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Owners and admins read all reports"
  ON public.reports FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND lower(coalesce(u.role::text, '')) IN ('owner', 'admin')
    )
  );
