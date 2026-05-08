-- DM attachments (images/videos) + user stories (24h, followers) + private storage buckets.

-- ─── direct_messages: optional media ───────────────────────────────────────────
ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS media_type text,
  ADD COLUMN IF NOT EXISTS media_path text;

ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_media_type_check;
ALTER TABLE public.direct_messages
  ADD CONSTRAINT direct_messages_media_type_check
  CHECK (media_type IS NULL OR media_type IN ('image', 'video'));

ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS dm_content_or_media_pair_chk;
ALTER TABLE public.direct_messages
  ADD CONSTRAINT dm_content_or_media_pair_chk
  CHECK (
    (media_path IS NULL AND media_type IS NULL)
    OR (media_path IS NOT NULL AND media_type IS NOT NULL)
  );

ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS dm_content_or_media_body_chk;
ALTER TABLE public.direct_messages
  ADD CONSTRAINT dm_content_or_media_body_chk
  CHECK (
    length(trim(coalesce(content, ''))) > 0
    OR media_path IS NOT NULL
  );

-- ─── user_stories (expire by created_at in queries: last 24h) ─────────────────
CREATE TABLE IF NOT EXISTS public.user_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  media_path text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_stories_user_created ON public.user_stories (user_id, created_at DESC);

ALTER TABLE public.user_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_stories_select_own_or_followed_recent" ON public.user_stories;
CREATE POLICY "user_stories_select_own_or_followed_recent"
  ON public.user_stories FOR SELECT
  TO authenticated
  USING (
    created_at > now() - interval '24 hours'
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = auth.uid()
          AND f.following_id = user_stories.user_id
      )
    )
  );

DROP POLICY IF EXISTS "user_stories_insert_self" ON public.user_stories;
CREATE POLICY "user_stories_insert_self"
  ON public.user_stories FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_stories_delete_self" ON public.user_stories;
CREATE POLICY "user_stories_delete_self"
  ON public.user_stories FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ─── Storage buckets (private — app uses signed URLs) ────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'dm-media',
    'dm-media',
    false,
    52428800,
    ARRAY[
      'image/jpeg'::text,
      'image/png'::text,
      'image/webp'::text,
      'image/gif'::text,
      'video/mp4'::text,
      'video/quicktime'::text,
      'video/webm'::text
    ]
  ),
  (
    'story-media',
    'story-media',
    false,
    52428800,
    ARRAY[
      'image/jpeg'::text,
      'image/png'::text,
      'image/webp'::text,
      'image/gif'::text,
      'video/mp4'::text,
      'video/quicktime'::text,
      'video/webm'::text
    ]
  )
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Path: dm-media / {conversation_id} / {user_id} / filename
DROP POLICY IF EXISTS "dm_media_select_participants" ON storage.objects;
CREATE POLICY "dm_media_select_participants"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'dm-media'
    AND array_length(string_to_array(name, '/'), 1) >= 2
    AND public.dm_is_conversation_participant(split_part(name, '/', 1)::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "dm_media_insert_own_segment" ON storage.objects;
CREATE POLICY "dm_media_insert_own_segment"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'dm-media'
    AND array_length(string_to_array(name, '/'), 1) >= 3
    AND split_part(name, '/', 2) = auth.uid()::text
    AND public.dm_is_conversation_participant(split_part(name, '/', 1)::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "dm_media_delete_sender" ON storage.objects;
CREATE POLICY "dm_media_delete_sender"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'dm-media'
    AND array_length(string_to_array(name, '/'), 1) >= 3
    AND split_part(name, '/', 2) = auth.uid()::text
  );

-- Path: story-media / {user_id} / filename
DROP POLICY IF EXISTS "story_media_select_own_or_followers" ON storage.objects;
CREATE POLICY "story_media_select_own_or_followers"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'story-media'
    AND array_length(string_to_array(name, '/'), 1) >= 2
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = auth.uid()
          AND f.following_id::text = split_part(name, '/', 1)
      )
    )
  );

DROP POLICY IF EXISTS "story_media_insert_own_folder" ON storage.objects;
CREATE POLICY "story_media_insert_own_folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'story-media'
    AND array_length(string_to_array(name, '/'), 1) >= 2
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "story_media_delete_own_folder" ON storage.objects;
CREATE POLICY "story_media_delete_own_folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'story-media'
    AND array_length(string_to_array(name, '/'), 1) >= 2
    AND split_part(name, '/', 1) = auth.uid()::text
  );
