-- Private club chat: text + optional image/video media for approved members only.

-- ── club_messages ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.club_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  media_type text,
  media_bucket text,
  media_path text,
  thumbnail_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_messages_club_created
  ON public.club_messages (club_id, created_at DESC);

ALTER TABLE public.club_messages ENABLE ROW LEVEL SECURITY;

-- Read: approved club members only
DROP POLICY IF EXISTS "club_messages_select_members" ON public.club_messages;
CREATE POLICY "club_messages_select_members"
  ON public.club_messages FOR SELECT
  TO authenticated
  USING (
    public.club_is_approved_member(club_id, auth.uid())
  );

-- Insert: approved club members only
DROP POLICY IF EXISTS "club_messages_insert_members" ON public.club_messages;
CREATE POLICY "club_messages_insert_members"
  ON public.club_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.club_is_approved_member(club_id, auth.uid())
  );

-- Delete: author can delete own; managers can delete any
DROP POLICY IF EXISTS "club_messages_delete_author_or_manager" ON public.club_messages;
CREATE POLICY "club_messages_delete_author_or_manager"
  ON public.club_messages FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.club_can_manage_membership(club_id, auth.uid())
  );

-- ── Storage: club-chat-media bucket (private) ────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'club-chat-media',
  'club-chat-media',
  false,
  52428800,
  ARRAY[
    'image/jpeg'::text,
    'image/png'::text,
    'image/webp'::text,
    'video/mp4'::text,
    'video/quicktime'::text,
    'video/webm'::text
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Path: club-chat-media / {club_id} / {user_id} / {filename}
CREATE OR REPLACE FUNCTION public.club_member_controls_chat_media_path(path_name text, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    array_length(string_to_array(trim(path_name), '/'), 1) >= 3
    AND public.club_is_approved_member(split_part(trim(path_name), '/', 1)::uuid, uid)
    AND split_part(trim(path_name), '/', 2) = uid::text;
$$;

DROP POLICY IF EXISTS "club_chat_media_select_members" ON storage.objects;
CREATE POLICY "club_chat_media_select_members"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'club-chat-media'
    AND public.club_is_approved_member(split_part(name, '/', 1)::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "club_chat_media_insert_members" ON storage.objects;
CREATE POLICY "club_chat_media_insert_members"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'club-chat-media'
    AND public.club_member_controls_chat_media_path(name, auth.uid())
  );

DROP POLICY IF EXISTS "club_chat_media_update_members" ON storage.objects;
CREATE POLICY "club_chat_media_update_members"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'club-chat-media'
    AND public.club_member_controls_chat_media_path(name, auth.uid())
  )
  WITH CHECK (
    bucket_id = 'club-chat-media'
    AND public.club_member_controls_chat_media_path(name, auth.uid())
  );

DROP POLICY IF EXISTS "club_chat_media_delete_members" ON storage.objects;
CREATE POLICY "club_chat_media_delete_members"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'club-chat-media'
    AND public.club_member_controls_chat_media_path(name, auth.uid())
  );

