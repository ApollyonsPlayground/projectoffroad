-- Engagement tables expected by the app (`post_likes`, `saved_posts`).
-- Safe IF NOT EXISTS. Requires `public.posts(id uuid)` like the rest of this repo.

CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id uuid NOT NULL REFERENCES public.posts (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_user ON public.post_likes (user_id);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read post likes" ON public.post_likes;
CREATE POLICY "Public read post likes"
  ON public.post_likes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Users insert own post likes" ON public.post_likes;
CREATE POLICY "Users insert own post likes"
  ON public.post_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own post likes" ON public.post_likes;
CREATE POLICY "Users delete own post likes"
  ON public.post_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── saved_posts / bookmarks naming used in UI ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_posts (
  post_id uuid NOT NULL REFERENCES public.posts (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON public.saved_posts (user_id);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read saved posts" ON public.saved_posts;
CREATE POLICY "Public read saved posts"
  ON public.saved_posts FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Users insert own saved posts" ON public.saved_posts;
CREATE POLICY "Users insert own saved posts"
  ON public.saved_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own saved posts" ON public.saved_posts;
CREATE POLICY "Users delete own saved posts"
  ON public.saved_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
