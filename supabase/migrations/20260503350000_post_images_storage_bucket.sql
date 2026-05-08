-- Community feed images (`posts.image_url` uses public URL).
-- App uploads to `post-images/{user_id}/{timestamp}.{ext}` from src/app/feed/page.tsx.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-images',
  'post-images',
  true,
  10485760,
  ARRAY[
    'image/jpeg'::text,
    'image/png'::text,
    'image/webp'::text,
    'image/gif'::text,
    'image/heic'::text,
    'image/heif'::text
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_own_post_images_object_path(path_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(trim(path_name), '') <> ''
    AND split_part(trim(path_name), '/', 1) = auth.uid()::text;
$$;

DROP POLICY IF EXISTS "post_images_storage_select_public" ON storage.objects;
CREATE POLICY "post_images_storage_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'post-images');

DROP POLICY IF EXISTS "post_images_storage_insert_own_folder" ON storage.objects;
CREATE POLICY "post_images_storage_insert_own_folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'post-images'
    AND public.is_own_post_images_object_path(name)
  );

DROP POLICY IF EXISTS "post_images_storage_update_own_folder" ON storage.objects;
CREATE POLICY "post_images_storage_update_own_folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'post-images'
    AND public.is_own_post_images_object_path(name)
  )
  WITH CHECK (
    bucket_id = 'post-images'
    AND public.is_own_post_images_object_path(name)
  );

DROP POLICY IF EXISTS "post_images_storage_delete_own_folder" ON storage.objects;
CREATE POLICY "post_images_storage_delete_own_folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'post-images'
    AND public.is_own_post_images_object_path(name)
  );
