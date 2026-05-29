-- Club logo/photo for directory cards and club profile (public URL on clubs.logo).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'club-logos',
  'club-logos',
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

-- Path: club-logos / {club_id} / {filename}
-- Reuses club_owner_controls_banner_path (same {club_id}/… ownership rule).

DROP POLICY IF EXISTS "club_logos_select_public" ON storage.objects;
CREATE POLICY "club_logos_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'club-logos');

DROP POLICY IF EXISTS "club_logos_insert_owner" ON storage.objects;
CREATE POLICY "club_logos_insert_owner"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'club-logos'
    AND array_length(string_to_array(name, '/'), 1) >= 2
    AND public.club_owner_controls_banner_path(name, auth.uid())
  );

DROP POLICY IF EXISTS "club_logos_update_owner" ON storage.objects;
CREATE POLICY "club_logos_update_owner"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'club-logos'
    AND public.club_owner_controls_banner_path(name, auth.uid())
  )
  WITH CHECK (
    bucket_id = 'club-logos'
    AND public.club_owner_controls_banner_path(name, auth.uid())
  );

DROP POLICY IF EXISTS "club_logos_delete_owner" ON storage.objects;
CREATE POLICY "club_logos_delete_owner"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'club-logos'
    AND public.club_owner_controls_banner_path(name, auth.uid())
  );
