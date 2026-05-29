-- Security hardening: RLS gaps, DM invites, posts, users, run participants, storage, SOS.

-- ── DM: only self, or conversation creator adding the other party once ────────

DROP POLICY IF EXISTS "conversation_participants_insert_self_or_inviter" ON public.conversation_participants;
CREATE POLICY "conversation_participants_insert_self_or_creator_invite"
  ON public.conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (
      user_id <> auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.conversations c
        WHERE c.id = conversation_id
          AND c.created_by = auth.uid()
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversation_id
          AND cp.user_id <> auth.uid()
      )
    )
  );

-- ── posts: INSERT/UPDATE ownership + hide moderated from public SELECT ───────

DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
DROP POLICY IF EXISTS "posts_public_select_anon_authenticated" ON public.posts;

CREATE POLICY "posts_select_visible"
  ON public.posts FOR SELECT
  TO anon, authenticated
  USING (
    NOT COALESCE(hidden, false)
    AND COALESCE(moderation_status, 'approved') NOT IN ('rejected', 'flagged')
  );

CREATE POLICY "posts_insert_own"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_update_own"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── users: tighten INSERT; keep SELECT for profiles (app avoids selecting email) ─

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create users" ON public.users;
DROP POLICY IF EXISTS "Users can read all users" ON public.users;

CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- SELECT remains for social surfaces; email stripped in client queries.
DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;
CREATE POLICY "users_select_authenticated"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "users_select_anon" ON public.users;
CREATE POLICY "users_select_anon"
  ON public.users FOR SELECT
  TO anon
  USING (false);

-- ── run visibility helper + participant scoping ─────────────────────────────

CREATE OR REPLACE FUNCTION public.run_is_visible_to_user(p_run_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.runs r
    WHERE r.id = p_run_id
      AND (
        COALESCE(r.visibility, 'public') = 'public'
        OR (p_user_id IS NOT NULL AND r.host_id = p_user_id)
        OR (
          p_user_id IS NOT NULL
          AND COALESCE(r.visibility, 'public') = 'club_only'
          AND r.club_id IS NOT NULL
          AND public.club_is_approved_member(r.club_id, p_user_id)
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.run_is_visible_to_user(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_is_visible_to_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_is_visible_to_user(uuid, uuid) TO service_role;

DROP POLICY IF EXISTS "run_participants_select_public" ON public.run_participants;
CREATE POLICY "run_participants_select_visible_runs"
  ON public.run_participants FOR SELECT
  TO anon, authenticated
  USING (
    public.run_is_visible_to_user(run_id, auth.uid())
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "run_participants_insert_self" ON public.run_participants;
CREATE POLICY "run_participants_insert_self_visible_run"
  ON public.run_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.run_is_visible_to_user(run_id, auth.uid())
  );

-- ── saved_posts: private bookmarks ───────────────────────────────────────────

DROP POLICY IF EXISTS "Public read saved posts" ON public.saved_posts;
CREATE POLICY "saved_posts_select_own"
  ON public.saved_posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ── post-media storage: owner folder or visible post media ───────────────────

DROP POLICY IF EXISTS "post_media_select_authenticated" ON storage.objects;
CREATE POLICY "post_media_select_owner_or_visible_post"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'post-media'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM public.posts p
        WHERE p.media_bucket = 'post-media'
          AND p.media_path = name
          AND NOT COALESCE(p.hidden, false)
          AND COALESCE(p.moderation_status, 'approved') NOT IN ('rejected', 'flagged')
      )
    )
  );

-- ── club garage: approved members only ───────────────────────────────────────

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
          AND COALESCE(m.status, 'approved') = 'approved'
      )
    )
  END;
$$;

DROP POLICY IF EXISTS "club_garage_photos_insert_members" ON public.club_garage_photos;
CREATE POLICY "club_garage_photos_insert_approved"
  ON public.club_garage_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.clubs c
        WHERE c.id = club_garage_photos.club_id AND c.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.club_members m
        WHERE m.club_id = club_garage_photos.club_id
          AND m.user_id = auth.uid()
          AND COALESCE(m.status, 'approved') = 'approved'
      )
    )
  );

-- ── SOS alerts: run participants + host only ─────────────────────────────────

ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read SOS alerts" ON public.sos_alerts;
DROP POLICY IF EXISTS "Authenticated users can insert SOS alerts" ON public.sos_alerts;
DROP POLICY IF EXISTS "sos_alerts_select_run_members" ON public.sos_alerts;
DROP POLICY IF EXISTS "sos_alerts_insert_self_on_run" ON public.sos_alerts;

CREATE POLICY "sos_alerts_select_run_members"
  ON public.sos_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.run_participants rp
      WHERE rp.run_id = sos_alerts.run_id
        AND rp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.runs r
      WHERE r.id = sos_alerts.run_id
        AND r.host_id = auth.uid()
    )
  );

CREATE POLICY "sos_alerts_insert_self_on_run"
  ON public.sos_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1
        FROM public.run_participants rp
        WHERE rp.run_id = sos_alerts.run_id
          AND rp.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.runs r
        WHERE r.id = sos_alerts.run_id
          AND r.host_id = auth.uid()
      )
    )
  );

-- ── Lock down SECURITY DEFINER helpers (policy use only) ─────────────────────

REVOKE ALL ON FUNCTION public.club_is_approved_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_is_approved_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_is_approved_member(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.club_owner_controls_banner_path(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_owner_controls_banner_path(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_owner_controls_banner_path(text, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.is_platform_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_staff(uuid) TO service_role;
