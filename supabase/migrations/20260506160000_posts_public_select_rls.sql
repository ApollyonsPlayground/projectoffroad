-- Feed + profiles + liked/reposted resolution query posts across users. If RLS only allows
-- SELECT where auth.uid() = user_id, viewers cannot load another member's rows or foreign
-- post IDs — thumbnails disappear / grids empty except on your own account.

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_public_select_anon_authenticated" ON public.posts;

CREATE POLICY "posts_public_select_anon_authenticated"
  ON public.posts
  FOR SELECT
  TO anon, authenticated
  USING (true);
