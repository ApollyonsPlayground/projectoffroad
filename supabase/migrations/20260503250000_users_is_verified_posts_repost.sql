-- Remote DBs created without legacy scripts may lack columns the app + triggers expect.
-- Fixes: "record NEW has no field is_verified" on users UPDATE, and PostgREST 400 on repost filters.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS repost_of_id uuid REFERENCES public.posts (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_repost_of_id ON public.posts (repost_of_id)
  WHERE repost_of_id IS NOT NULL;
