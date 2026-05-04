-- Public bucket for profile photos (`users.avatar_url` stores public URL).
-- App uploads to `avatars/{user_id}/avatar.{ext}` from src/app/profile/page.tsx.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY[
    'image/jpeg'::text,
    'image/png'::text,
    'image/webp'::text,
    'image/gif'::text
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_own_avatars_object_path(path_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(trim(path_name), '') <> ''
    AND split_part(trim(path_name), '/', 1) = auth.uid()::text;
$$;

DROP POLICY IF EXISTS "avatars_storage_select_public" ON storage.objects;
CREATE POLICY "avatars_storage_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_storage_insert_own_folder" ON storage.objects;
CREATE POLICY "avatars_storage_insert_own_folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND public.is_own_avatars_object_path(name)
  );

DROP POLICY IF EXISTS "avatars_storage_update_own_folder" ON storage.objects;
CREATE POLICY "avatars_storage_update_own_folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND public.is_own_avatars_object_path(name)
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND public.is_own_avatars_object_path(name)
  );

DROP POLICY IF EXISTS "avatars_storage_delete_own_folder" ON storage.objects;
CREATE POLICY "avatars_storage_delete_own_folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND public.is_own_avatars_object_path(name)
  );
