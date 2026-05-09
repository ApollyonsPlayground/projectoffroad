-- Club flyer/poster image for directory cards + club-branded run listings (public URL on clubs.banner_image).

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS banner_image text;

COMMENT ON COLUMN public.clubs.banner_image IS
  'Public URL for uploaded club flyer/poster; shown on club cards and as hero image for official club runs.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'club-banners',
  'club-banners',
  true,
  5242880,
  ARRAY[
    'image/jpeg'::text,
    'image/png'::text,
    'image/webp'::text
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Path: club-banners / {club_id} / {filename}
CREATE OR REPLACE FUNCTION public.club_owner_controls_banner_path(path_name text, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.id::text = split_part(trim(path_name), '/', 1)
      AND c.owner_id = uid
  );
$$;

DROP POLICY IF EXISTS "club_banners_select_public" ON storage.objects;
CREATE POLICY "club_banners_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'club-banners');

DROP POLICY IF EXISTS "club_banners_insert_owner" ON storage.objects;
CREATE POLICY "club_banners_insert_owner"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'club-banners'
    AND array_length(string_to_array(name, '/'), 1) >= 2
    AND public.club_owner_controls_banner_path(name, auth.uid())
  );

DROP POLICY IF EXISTS "club_banners_update_owner" ON storage.objects;
CREATE POLICY "club_banners_update_owner"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'club-banners'
    AND public.club_owner_controls_banner_path(name, auth.uid())
  )
  WITH CHECK (
    bucket_id = 'club-banners'
    AND public.club_owner_controls_banner_path(name, auth.uid())
  );

DROP POLICY IF EXISTS "club_banners_delete_owner" ON storage.objects;
CREATE POLICY "club_banners_delete_owner"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'club-banners'
    AND public.club_owner_controls_banner_path(name, auth.uid())
  );
