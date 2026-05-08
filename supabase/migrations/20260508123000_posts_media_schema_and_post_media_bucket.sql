-- Add video-capable media fields to posts and create private `post-media` storage bucket.
--
-- The community feed currently uses `posts.image_url` + public `post-images` bucket.
-- This migration adds forward-compatible fields for video posts and a private bucket
-- for post media (videos + thumbnails) that can be served via signed URLs.

-- ── posts: add media fields (non-breaking) ─────────────────────────────────────
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS media_type text,
  ADD COLUMN IF NOT EXISTS media_bucket text,
  ADD COLUMN IF NOT EXISTS media_path text,
  ADD COLUMN IF NOT EXISTS thumbnail_path text,
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS media_width integer,
  ADD COLUMN IF NOT EXISTS media_height integer,
  ADD COLUMN IF NOT EXISTS processed_status text;

ALTER TABLE public.posts
  ALTER COLUMN processed_status SET DEFAULT 'ready';

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_media_type_check;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_media_type_check
  CHECK (media_type IS NULL OR media_type IN ('image', 'video'));

-- ── storage: private bucket for post videos + thumbnails ──────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  false,
  52428800,
  ARRAY[
    'image/jpeg'::text,
    'image/png'::text,
    'image/webp'::text,
    'image/gif'::text,
    'video/mp4'::text,
    'video/quicktime'::text
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.is_own_post_media_object_path(path_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(trim(path_name), '') <> ''
    AND split_part(trim(path_name), '/', 1) = auth.uid()::text;
$$;

-- For now: any authenticated user can read post-media objects.
-- (Feed is authenticated; moderation + admin tooling can remove abusive media.)
DROP POLICY IF EXISTS "post_media_select_authenticated" ON storage.objects;
CREATE POLICY "post_media_select_authenticated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'post-media');

DROP POLICY IF EXISTS "post_media_insert_own_folder" ON storage.objects;
CREATE POLICY "post_media_insert_own_folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'post-media'
    AND public.is_own_post_media_object_path(name)
  );

DROP POLICY IF EXISTS "post_media_update_own_folder" ON storage.objects;
CREATE POLICY "post_media_update_own_folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'post-media'
    AND public.is_own_post_media_object_path(name)
  )
  WITH CHECK (
    bucket_id = 'post-media'
    AND public.is_own_post_media_object_path(name)
  );

DROP POLICY IF EXISTS "post_media_delete_own_folder" ON storage.objects;
CREATE POLICY "post_media_delete_own_folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'post-media'
    AND public.is_own_post_media_object_path(name)
  );

