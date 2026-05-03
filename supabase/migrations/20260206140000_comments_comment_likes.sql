-- Comments + comment likes (optional tables referenced by the feed UI).
-- Safe to run once; uses IF NOT EXISTS. Requires posts.id and auth.users.

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  user_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_created
  ON public.comments (post_id, created_at ASC);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read comments" ON public.comments;
CREATE POLICY "Public read comments"
  ON public.comments FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated insert comments" ON public.comments;
CREATE POLICY "Authenticated insert comments"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own comments" ON public.comments;
CREATE POLICY "Users delete own comments"
  ON public.comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── comment_likes ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON public.comment_likes (user_id);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read comment likes" ON public.comment_likes;
CREATE POLICY "Public read comment likes"
  ON public.comment_likes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated insert comment likes" ON public.comment_likes;
CREATE POLICY "Authenticated insert comment likes"
  ON public.comment_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own comment likes" ON public.comment_likes;
CREATE POLICY "Users delete own comment likes"
  ON public.comment_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
