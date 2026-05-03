-- Post moderation + visibility (run in Supabase SQL editor)

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved';

COMMENT ON COLUMN public.posts.moderation_status IS 'approved | rejected | pending_no_engine | flagged';
