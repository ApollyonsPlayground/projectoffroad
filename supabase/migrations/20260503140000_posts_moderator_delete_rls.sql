-- ── posts DELETE (two policies = OR) ───────────────────────────────────────────
-- 1) Any authenticated author may delete rows where they are user_id.
-- 2) Only public.users.role owner|admin may delete any post (moderation).
-- Regular users never satisfy (2) alone for someone else's row; (1) fails on others'
-- rows because auth.uid() <> user_id.

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can delete own posts" ON public.posts;
DROP POLICY IF EXISTS "Owners and admins can delete posts" ON public.posts;
DROP POLICY IF EXISTS "Owners and admins can delete any post" ON public.posts;

CREATE POLICY "Authenticated users can delete own posts"
  ON public.posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners and admins can delete any post"
  ON public.posts FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND lower(coalesce(u.role::text, '')) IN ('owner', 'admin')
    )
  );
