-- Run flyer/poster image for per-run hero imagery (public URL on runs.flyer_image).

ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS flyer_image text;

COMMENT ON COLUMN public.runs.flyer_image IS
  'Public URL for uploaded run flyer/poster; shown on the run detail and run cards when set.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'run-flyers',
  'run-flyers',
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

-- Path: run-flyers / {run_id} / {filename}
CREATE OR REPLACE FUNCTION public.run_host_controls_flyer_path(path_name text, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.runs r
    WHERE r.id::text = split_part(trim(path_name), '/', 1)
      AND r.host_id = uid
  )
  OR EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = uid
      AND lower(coalesce(u.role::text, '')) IN ('owner', 'admin')
  );
$$;

DROP POLICY IF EXISTS "run_flyers_select_public" ON storage.objects;
CREATE POLICY "run_flyers_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'run-flyers');

DROP POLICY IF EXISTS "run_flyers_insert_host" ON storage.objects;
CREATE POLICY "run_flyers_insert_host"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'run-flyers'
    AND array_length(string_to_array(name, '/'), 1) >= 2
    AND public.run_host_controls_flyer_path(name, auth.uid())
  );

DROP POLICY IF EXISTS "run_flyers_update_host" ON storage.objects;
CREATE POLICY "run_flyers_update_host"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'run-flyers'
    AND public.run_host_controls_flyer_path(name, auth.uid())
  )
  WITH CHECK (
    bucket_id = 'run-flyers'
    AND public.run_host_controls_flyer_path(name, auth.uid())
  );

DROP POLICY IF EXISTS "run_flyers_delete_host" ON storage.objects;
CREATE POLICY "run_flyers_delete_host"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'run-flyers'
    AND public.run_host_controls_flyer_path(name, auth.uid())
  );

