-- User UI theme (dark | light | blue), club garage photos, club delete for owners.

-- ── users.ui_theme ────────────────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ui_theme text NOT NULL DEFAULT 'dark';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_ui_theme_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_ui_theme_check
      CHECK (ui_theme IN ('dark', 'light', 'blue'));
  END IF;
END $$;

UPDATE public.users SET ui_theme = 'dark' WHERE ui_theme IS NULL OR trim(ui_theme) = '';

-- ── Club garage (rig photos per club) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.club_garage_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_club_garage_photos_club ON public.club_garage_photos (club_id, created_at DESC);

ALTER TABLE public.club_garage_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_garage_photos_select_public" ON public.club_garage_photos;
CREATE POLICY "club_garage_photos_select_public"
  ON public.club_garage_photos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "club_garage_photos_insert_members" ON public.club_garage_photos;
CREATE POLICY "club_garage_photos_insert_members"
  ON public.club_garage_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.owner_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.club_members m
        WHERE m.club_id = club_garage_photos.club_id AND m.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "club_garage_photos_delete_own_or_club_owner" ON public.club_garage_photos;
CREATE POLICY "club_garage_photos_delete_own_or_club_owner"
  ON public.club_garage_photos FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_garage_photos.club_id AND c.owner_id = auth.uid())
  );

-- ── Storage: public bucket for club garage images ─────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'club-garage',
  'club-garage',
  true,
  10485760,
  ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text, 'image/gif'::text]
)
ON CONFLICT (id) DO NOTHING;

-- Path shape: {club_id}/{user_id}/{filename} — second segment must match uploader.
CREATE OR REPLACE FUNCTION public.can_upload_club_garage_object(path_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN path_name IS NULL OR trim(path_name) = '' THEN false
    WHEN split_part(trim(path_name), '/', 2) <> auth.uid()::text THEN false
    ELSE (
      EXISTS (
        SELECT 1
        FROM public.clubs c
        WHERE c.id::text = split_part(trim(path_name), '/', 1)
          AND c.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.club_members m
        WHERE m.club_id::text = split_part(trim(path_name), '/', 1)
          AND m.user_id = auth.uid()
      )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_delete_club_garage_object(path_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN path_name IS NULL OR trim(path_name) = '' THEN false
    ELSE (
      EXISTS (
        SELECT 1
        FROM public.clubs c
        WHERE c.id::text = split_part(trim(path_name), '/', 1)
          AND c.owner_id = auth.uid()
      )
      OR split_part(trim(path_name), '/', 2) = auth.uid()::text
    )
  END;
$$;

DROP POLICY IF EXISTS "club_garage_storage_select_public" ON storage.objects;
CREATE POLICY "club_garage_storage_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'club-garage');

DROP POLICY IF EXISTS "club_garage_storage_insert_members" ON storage.objects;
CREATE POLICY "club_garage_storage_insert_members"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'club-garage'
    AND public.can_upload_club_garage_object(name)
  );

DROP POLICY IF EXISTS "club_garage_storage_delete_authorized" ON storage.objects;
CREATE POLICY "club_garage_storage_delete_authorized"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'club-garage'
    AND public.can_delete_club_garage_object(name)
  );

-- ── Delete club (owner, optional platform staff) ──────────────────────────────
DROP POLICY IF EXISTS "clubs_delete_owner" ON public.clubs;
CREATE POLICY "clubs_delete_owner"
  ON public.clubs FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND lower(trim(coalesce(u.role, ''))) IN ('admin', 'owner')
    )
  );
