


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."caelum_chat_rate_touch"("p_bucket" "text", "p_max" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  cur_min bigint := floor(extract(epoch from now()) / 60)::bigint;
  new_count integer;
BEGIN
  INSERT INTO public.caelum_chat_rate_limits (bucket_key, minute_epoch, count)
  VALUES (p_bucket, cur_min, 1)
  ON CONFLICT (bucket_key, minute_epoch)
  DO UPDATE SET count = public.caelum_chat_rate_limits.count + 1
  RETURNING count INTO new_count;

  RETURN jsonb_build_object(
    'allowed', new_count <= p_max,
    'count', new_count,
    'minute_epoch', cur_min
  );
END;
$$;


ALTER FUNCTION "public"."caelum_chat_rate_touch"("p_bucket" "text", "p_max" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."caelum_chat_rate_touch"("p_bucket" "text", "p_max" integer) IS 'Atomically increment chat sends per UTC minute bucket; returns allowed=false when count exceeds p_max.';



CREATE OR REPLACE FUNCTION "public"."can_delete_club_garage_object"("path_name" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."can_delete_club_garage_object"("path_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_upload_club_garage_object"("path_name" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."can_upload_club_garage_object"("path_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."club_can_manage_membership"("p_club_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_members m
    WHERE m.club_id = p_club_id
      AND m.user_id = p_user_id
      AND m.status = 'approved'
      AND lower(m.role) IN ('owner', 'admin', 'officer', 'leader')
  )
  OR EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.owner_id = p_user_id
  );
$$;


ALTER FUNCTION "public"."club_can_manage_membership"("p_club_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."club_is_approved_member"("p_club_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_members m
    WHERE m.club_id = p_club_id
      AND m.user_id = p_user_id
      AND m.status = 'approved'
  )
  OR EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.owner_id = p_user_id
  );
$$;


ALTER FUNCTION "public"."club_is_approved_member"("p_club_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."club_member_controls_chat_media_path"("path_name" "text", "uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    array_length(string_to_array(trim(path_name), '/'), 1) >= 3
    AND public.club_is_approved_member(split_part(trim(path_name), '/', 1)::uuid, uid)
    AND split_part(trim(path_name), '/', 2) = uid::text;
$$;


ALTER FUNCTION "public"."club_member_controls_chat_media_path"("path_name" "text", "uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."club_members_autofill_staff_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NOT NULL
    AND NEW.user_id = auth.uid()
    AND lower(coalesce(NEW.role, 'member')) = 'member'
    AND public.is_platform_staff(auth.uid())
  THEN
    NEW.status := 'approved';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."club_members_autofill_staff_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."club_owner_controls_banner_path"("path_name" "text", "uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.id::text = split_part(trim(path_name), '/', 1)
      AND c.owner_id = uid
  );
$$;


ALTER FUNCTION "public"."club_owner_controls_banner_path"("path_name" "text", "uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clubs_after_insert_add_owner_membership"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.club_members (club_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (club_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."clubs_after_insert_add_owner_membership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_run_guest_invite"("p_run_id" "uuid", "p_max_guests" integer DEFAULT 5) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_run public.runs%ROWTYPE;
  v_token text;
  v_hash text;
  v_max integer;
  v_recent integer;
  v_invite_id uuid;
  v_expires timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  IF NOT public.run_can_manage_guest_invites(p_run_id, v_uid) THEN
    RAISE EXCEPTION 'Not allowed to create guest invites for this run';
  END IF;

  SELECT * INTO v_run FROM public.runs r WHERE r.id = p_run_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Run not found';
  END IF;

  IF v_run.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot invite guests to a finished run';
  END IF;

  SELECT count(*)::integer INTO v_recent
  FROM public.run_guest_invites i
  WHERE i.run_id = p_run_id
    AND i.created_at > now() - interval '1 hour';

  IF v_recent >= 3 THEN
    RAISE EXCEPTION 'Too many invite links created recently. Try again in an hour.';
  END IF;

  v_max := LEAST(GREATEST(COALESCE(p_max_guests, 5), 1), 50);
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := public.hash_guest_invite_token(v_token);
  v_expires := public.run_guest_invite_expires_for_run(p_run_id);

  UPDATE public.run_guest_invites
  SET revoked_at = now(), updated_at = now()
  WHERE run_id = p_run_id
    AND revoked_at IS NULL;

  INSERT INTO public.run_guest_invites (run_id, created_by, token_hash, max_redemptions, expires_at)
  VALUES (p_run_id, v_uid, v_hash, v_max, v_expires)
  RETURNING id INTO v_invite_id;

  RETURN json_build_object(
    'invite_id', v_invite_id,
    'token', v_token,
    'max_redemptions', v_max,
    'expires_at', v_expires
  );
END;
$$;


ALTER FUNCTION "public"."create_run_guest_invite"("p_run_id" "uuid", "p_max_guests" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dm_is_conversation_participant"("p_conversation_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id AND cp.user_id = p_user_id
  );
$$;


ALTER FUNCTION "public"."dm_is_conversation_participant"("p_conversation_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_identity_change_cooldown"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid uuid;
  v_is_staff boolean;
  v_changing boolean;
  v_last timestamptz;
BEGIN
  -- Only apply to the current user updating their own row (admins can still edit others).
  v_uid := auth.uid();
  IF v_uid IS NULL OR v_uid <> NEW.id THEN
    RETURN NEW;
  END IF;

  SELECT lower(coalesce(role, '')) IN ('owner', 'admin')
    INTO v_is_staff
  FROM public.users
  WHERE id = v_uid;

  IF v_is_staff THEN
    -- Staff can fix bad data without cooldown.
    IF (coalesce(NEW.name, '') IS DISTINCT FROM coalesce(OLD.name, ''))
      OR (coalesce(NEW.username, '') IS DISTINCT FROM coalesce(OLD.username, '')) THEN
      NEW.last_identity_change_at := now();
    END IF;
    RETURN NEW;
  END IF;

  v_changing :=
    (coalesce(NEW.name, '') IS DISTINCT FROM coalesce(OLD.name, ''))
    OR (coalesce(NEW.username, '') IS DISTINCT FROM coalesce(OLD.username, ''));

  IF NOT v_changing THEN
    RETURN NEW;
  END IF;

  v_last := OLD.last_identity_change_at;
  IF v_last IS NOT NULL AND now() - v_last < interval '24 hours' THEN
    RAISE EXCEPTION 'You can change your display name / username once every 24 hours.' USING ERRCODE = 'P0001';
  END IF;

  NEW.last_identity_change_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_identity_change_cooldown"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_run_guest_invite_status"("p_run_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_invite public.run_guest_invites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.run_can_manage_guest_invites(p_run_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed to manage guest invites for this run';
  END IF;
  SELECT * INTO v_invite FROM public.run_guest_invites i
  WHERE i.run_id = p_run_id AND i.revoked_at IS NULL ORDER BY i.created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('active', false); END IF;
  RETURN json_build_object(
    'active', true, 'invite_id', v_invite.id,
    'max_redemptions', v_invite.max_redemptions,
    'redemption_count', v_invite.redemption_count,
    'expires_at', v_invite.expires_at, 'created_at', v_invite.created_at
  );
END;
$$;


ALTER FUNCTION "public"."get_run_guest_invite_status"("p_run_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_voting_results"("p_event_id" "uuid") RETURNS TABLE("option_id" "uuid", "title" "text", "vote_count" bigint, "is_winner" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH event_row AS (
    SELECT e.id, e.ends_at, e.status
    FROM public.voting_events e
    WHERE e.id = p_event_id
  ),
  allowed AS (
    SELECT 1
    FROM event_row er
    WHERE er.status = 'closed'
       OR (er.status = 'active' AND now() >= er.ends_at)
  ),
  counts AS (
    SELECT
      o.id AS option_id,
      o.title,
      count(v.id)::bigint AS vote_count
    FROM public.trail_options o
    LEFT JOIN public.votes v ON v.trail_option_id = o.id
    WHERE o.voting_event_id = p_event_id
      AND EXISTS (SELECT 1 FROM allowed)
    GROUP BY o.id, o.title, o.sort_order
    ORDER BY o.sort_order ASC
  ),
  max_count AS (
    SELECT max(c.vote_count) AS top FROM counts c
  )
  SELECT
    c.option_id,
    c.title,
    c.vote_count,
    (c.vote_count = mc.top AND mc.top > 0) AS is_winner
  FROM counts c
  CROSS JOIN max_count mc;
$$;


ALTER FUNCTION "public"."get_voting_results"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hash_guest_invite_token"("p_token" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public', 'extensions'
    AS $$
  SELECT encode(extensions.digest(trim(p_token), 'sha256'::text), 'hex');
$$;


ALTER FUNCTION "public"."hash_guest_invite_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_run_guest_participant"("p_run_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.run_guest_participants gp
    JOIN public.runs r ON r.id = gp.run_id
    WHERE gp.run_id = p_run_id AND gp.user_id = p_user_id
      AND gp.expires_at > now() AND r.status NOT IN ('completed', 'cancelled')
  );
$$;


ALTER FUNCTION "public"."is_active_run_guest_participant"("p_run_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_own_avatars_object_path"("path_name" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT coalesce(trim(path_name), '') <> ''
    AND split_part(trim(path_name), '/', 1) = auth.uid()::text;
$$;


ALTER FUNCTION "public"."is_own_avatars_object_path"("path_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_own_post_images_object_path"("path_name" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT coalesce(trim(path_name), '') <> ''
    AND split_part(trim(path_name), '/', 1) = auth.uid()::text;
$$;


ALTER FUNCTION "public"."is_own_post_images_object_path"("path_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_own_post_media_object_path"("path_name" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT coalesce(trim(path_name), '') <> ''
    AND split_part(trim(path_name), '/', 1) = auth.uid()::text;
$$;


ALTER FUNCTION "public"."is_own_post_media_object_path"("path_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_platform_staff"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = p_user_id
      AND lower(coalesce(u.role::text, '')) IN ('owner', 'admin')
  );
$$;


ALTER FUNCTION "public"."is_platform_staff"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_voting_staff"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND lower(coalesce(u.role::text, '')) IN ('owner', 'admin')
  );
$$;


ALTER FUNCTION "public"."is_voting_staff"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preview_run_guest_invite"("p_token" "text") RETURNS json
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_invite public.run_guest_invites%ROWTYPE; v_run public.runs%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN RETURN NULL; END IF;
  SELECT * INTO v_invite FROM public.run_guest_invites i
  WHERE i.token_hash = public.hash_guest_invite_token(p_token)
    AND i.revoked_at IS NULL AND i.expires_at > now() LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_run FROM public.runs r WHERE r.id = v_invite.run_id;
  IF NOT FOUND OR v_run.status IN ('completed', 'cancelled') THEN RETURN NULL; END IF;
  RETURN json_build_object(
    'run_id', v_run.id, 'title', v_run.title, 'date', v_run.date,
    'meetup_location', v_run.meetup_location, 'status', v_run.status,
    'max_redemptions', v_invite.max_redemptions,
    'redemption_count', v_invite.redemption_count,
    'spots_remaining', GREATEST(0, v_invite.max_redemptions - v_invite.redemption_count)
  );
END;
$$;


ALTER FUNCTION "public"."preview_run_guest_invite"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."push_device_tokens_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."push_device_tokens_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_run_guest_invite"("p_token" "text", "p_display_name" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid(); v_name text; v_invite public.run_guest_invites%ROWTYPE;
  v_run public.runs%ROWTYPE; v_participant_count integer; v_guest_count integer;
  v_expires timestamptz; v_email text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  v_name := public.validate_guest_display_name(p_display_name);
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN RAISE EXCEPTION 'Invalid invite link'; END IF;
  SELECT * INTO v_invite FROM public.run_guest_invites i
  WHERE i.token_hash = public.hash_guest_invite_token(p_token)
    AND i.revoked_at IS NULL AND i.expires_at > now() LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This invite link is invalid or has expired'; END IF;
  SELECT * INTO v_run FROM public.runs r WHERE r.id = v_invite.run_id;
  IF NOT FOUND OR v_run.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'This run is no longer accepting guests';
  END IF;
  IF v_invite.redemption_count >= v_invite.max_redemptions THEN
    RAISE EXCEPTION 'This invite link has reached its guest limit';
  END IF;
  IF EXISTS (SELECT 1 FROM public.run_participants rp WHERE rp.run_id = v_invite.run_id AND rp.user_id = v_uid) THEN
    RAISE EXCEPTION 'You already joined this run with a full account';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.run_guest_participants gp
    WHERE gp.run_id = v_invite.run_id AND gp.user_id = v_uid AND gp.expires_at > now()
  ) THEN
    RETURN json_build_object('run_id', v_invite.run_id, 'already_joined', true);
  END IF;
  SELECT count(*)::integer INTO v_participant_count FROM public.run_participants rp WHERE rp.run_id = v_invite.run_id;
  SELECT count(*)::integer INTO v_guest_count FROM public.run_guest_participants gp
  WHERE gp.run_id = v_invite.run_id AND gp.expires_at > now();
  IF v_run.max_participants IS NOT NULL AND (v_participant_count + v_guest_count) >= v_run.max_participants THEN
    RAISE EXCEPTION 'This run is full';
  END IF;
  v_expires := public.run_guest_invite_expires_for_run(v_invite.run_id);
  v_email := v_uid::text || '@guest.socaloffroaders.local';
  INSERT INTO public.users (id, email, name, is_guest, guest_run_id, hide_display_name)
  VALUES (v_uid, v_email, v_name, true, v_invite.run_id, true)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_guest = true,
    guest_run_id = EXCLUDED.guest_run_id, hide_display_name = true, updated_at = now();
  INSERT INTO public.run_guest_participants (run_id, user_id, invite_id, display_name, expires_at)
  VALUES (v_invite.run_id, v_uid, v_invite.id, v_name, v_expires);
  UPDATE public.run_guest_invites SET redemption_count = redemption_count + 1, updated_at = now() WHERE id = v_invite.id;
  RETURN json_build_object('run_id', v_invite.run_id, 'display_name', v_name, 'expires_at', v_expires);
END;
$$;


ALTER FUNCTION "public"."redeem_run_guest_invite"("p_token" "text", "p_display_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_run_guest_invite"("p_run_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.run_can_manage_guest_invites(p_run_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE public.run_guest_invites SET revoked_at = now(), updated_at = now()
  WHERE run_id = p_run_id AND revoked_at IS NULL;
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."revoke_run_guest_invite"("p_run_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_can_access_run"("p_run_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.run_is_visible_to_user(p_run_id, p_user_id)
    OR public.is_active_run_guest_participant(p_run_id, p_user_id);
$$;


ALTER FUNCTION "public"."run_can_access_run"("p_run_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_can_manage_guest_invites"("p_run_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.runs r
    WHERE r.id = p_run_id AND (
      r.host_id = p_user_id
      OR (r.club_id IS NOT NULL AND public.club_can_manage_membership(r.club_id, p_user_id))
    )
  );
$$;


ALTER FUNCTION "public"."run_can_manage_guest_invites"("p_run_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_guest_invite_expires_for_run"("p_run_id" "uuid") RETURNS timestamp with time zone
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT r.date + interval '2 days' FROM public.runs r WHERE r.id = p_run_id),
    now() + interval '7 days'
  );
$$;


ALTER FUNCTION "public"."run_guest_invite_expires_for_run"("p_run_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_host_controls_flyer_path"("path_name" "text", "uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."run_host_controls_flyer_path"("path_name" "text", "uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_is_participant"("p_run_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.runs r WHERE r.id = p_run_id AND r.host_id = p_user_id)
    OR EXISTS (SELECT 1 FROM public.run_participants rp WHERE rp.run_id = p_run_id AND rp.user_id = p_user_id)
    OR public.is_active_run_guest_participant(p_run_id, p_user_id);
$$;


ALTER FUNCTION "public"."run_is_participant"("p_run_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_is_visible_to_user"("p_run_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."run_is_visible_to_user"("p_run_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_reflections_set_trail_from_run"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.trail_id := (SELECT r.trail_id::text FROM public.runs r WHERE r.id = NEW.run_id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."run_reflections_set_trail_from_run"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_reflections_touch_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."run_reflections_touch_updated"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."runs_enforce_edit_lock_before_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  is_admin boolean;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND lower(coalesce(u.role::text, '')) IN ('owner', 'admin')
  )
  INTO is_admin;

  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF old.status IN ('completed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  -- Allow lifecycle transitions without unlocking arbitrary field edits.
  IF new.status IS DISTINCT FROM old.status AND new.status IN ('completed', 'cancelled', 'active') THEN
    RETURN NEW;
  END IF;

  -- Postpone: new start is far enough out that the edit window opens again.
  IF new.date IS DISTINCT FROM old.date AND new.date > now() + interval '24 hours' THEN
    RETURN NEW;
  END IF;

  IF now() >= (old.date - interval '24 hours') THEN
    RAISE EXCEPTION 'run_edit_locked_within_24h'
      USING MESSAGE = 'Run details are locked within 24 hours of the scheduled start.',
            ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."runs_enforce_edit_lock_before_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_guest_expiry_on_run_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.run_guest_participants SET expires_at = LEAST(expires_at, now())
    WHERE run_id = NEW.id AND expires_at > now();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_guest_expiry_on_run_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trail_reports_touch_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trail_reports_touch_updated"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upgrade_guest_to_member"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_auth public.users%ROWTYPE;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND coalesce(u.is_anonymous, false)
  ) THEN
    RAISE EXCEPTION 'Connect Google or Apple to your guest session before upgrading';
  END IF;

  SELECT * INTO v_auth FROM public.users u WHERE u.id = auth.uid();
  IF NOT FOUND OR NOT coalesce(v_auth.is_guest, false) THEN
    RETURN json_build_object('upgraded', false, 'already_member', true);
  END IF;

  SELECT nullif(trim(u.email), '')
  INTO v_email
  FROM auth.users u
  WHERE u.id = auth.uid();

  UPDATE public.users
  SET
    is_guest = false,
    guest_run_id = NULL,
    email = coalesce(v_email, email),
    hide_display_name = true,
    updated_at = now()
  WHERE id = auth.uid()
    AND is_guest = true;

  RETURN json_build_object('upgraded', true);
END;
$$;


ALTER FUNCTION "public"."upgrade_guest_to_member"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."users_block_guest_escalation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF COALESCE(OLD.is_guest, false) THEN
    IF NEW.is_guest IS DISTINCT FROM OLD.is_guest OR NEW.guest_run_id IS DISTINCT FROM OLD.guest_run_id THEN
      RAISE EXCEPTION 'Guest accounts cannot change guest status';
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role OR NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Guest accounts have limited profile updates';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."users_block_guest_escalation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."users_protect_privileged_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.users adm
    WHERE adm.id = auth.uid()
      AND COALESCE(adm.role, 'user') IN ('owner', 'admin')
  ) THEN
    RETURN NEW;
  END IF;
  NEW.role := OLD.role;
  NEW.is_verified := OLD.is_verified;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."users_protect_privileged_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_guest_display_name"("p_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $_$
DECLARE v text;
BEGIN
  v := trim(both from p_name);
  IF length(v) < 3 OR length(v) > 24 THEN
    RAISE EXCEPTION 'Trail name must be 3–24 characters';
  END IF;
  IF v !~ '^[a-zA-Z0-9][a-zA-Z0-9 ]*[a-zA-Z0-9]$' AND v !~ '^[a-zA-Z0-9]{3,24}$' THEN
    RAISE EXCEPTION 'Use letters and numbers only for your trail name';
  END IF;
  IF lower(v) ~ '(fuck|shit|asshole|nazi|rape)' THEN
    RAISE EXCEPTION 'Please choose a different trail name';
  END IF;
  RETURN v;
END;
$_$;


ALTER FUNCTION "public"."validate_guest_display_name"("p_name" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "requirement" integer
);


ALTER TABLE "public"."achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."caelum_chat_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "user_name" "text",
    "message" "text" NOT NULL,
    "reply" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "current_page" "text",
    CONSTRAINT "caelum_chat_queue_message_check" CHECK (("char_length"("message") <= 4000)),
    CONSTRAINT "caelum_chat_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'done'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."caelum_chat_queue" OWNER TO "postgres";


COMMENT ON TABLE "public"."caelum_chat_queue" IS 'Queued Ask Caelum chat turns. POST /api/caelum/chat inserts; cron processes pending rows; replies visible via Realtime (authenticated).';



CREATE TABLE IF NOT EXISTS "public"."caelum_chat_rate_limits" (
    "bucket_key" "text" NOT NULL,
    "minute_epoch" bigint NOT NULL,
    "count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."caelum_chat_rate_limits" OWNER TO "postgres";


COMMENT ON TABLE "public"."caelum_chat_rate_limits" IS 'Server-side Ask Caelum chat rate limit buckets; accessed only via caelum_chat_rate_touch.';



CREATE TABLE IF NOT EXISTS "public"."club_garage_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "club_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "caption" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."club_garage_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."club_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "club_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'approved'::"text" NOT NULL,
    CONSTRAINT "club_members_role_check" CHECK ((("role" IS NOT NULL) AND ("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'officer'::"text", 'leader'::"text", 'member'::"text"])))),
    CONSTRAINT "club_members_status_check" CHECK (("status" = ANY (ARRAY['approved'::"text", 'pending'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."club_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."club_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "club_id" "uuid",
    "user_id" "uuid",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."club_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clubs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "logo" "text",
    "description" "text",
    "location" "text",
    "website" "text",
    "instagram" "text",
    "verified" boolean DEFAULT false,
    "premium" boolean DEFAULT false,
    "owner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_verified" boolean DEFAULT false,
    "banner_image" "text"
);


ALTER TABLE "public"."clubs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."clubs"."banner_image" IS 'Public URL for uploaded club flyer/poster; shown on club cards and as hero image for official club runs.';



CREATE TABLE IF NOT EXISTS "public"."comment_flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."comment_flags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comment_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."comment_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "post_id" "uuid",
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_name" "text"
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_read" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "last_message_content" "text",
    "last_message_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."direct_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "media_type" "text",
    "media_path" "text",
    CONSTRAINT "direct_messages_media_type_check" CHECK ((("media_type" IS NULL) OR ("media_type" = ANY (ARRAY['image'::"text", 'video'::"text"])))),
    CONSTRAINT "dm_content_or_media_body_chk" CHECK ((("length"(TRIM(BOTH FROM COALESCE("content", ''::"text"))) > 0) OR ("media_path" IS NOT NULL))),
    CONSTRAINT "dm_content_or_media_pair_chk" CHECK (((("media_path" IS NULL) AND ("media_type" IS NULL)) OR (("media_path" IS NOT NULL) AND ("media_type" IS NOT NULL))))
);


ALTER TABLE "public"."direct_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follows" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "follower_id" "uuid",
    "following_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."follows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "post_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "run_id" "uuid",
    "user_id" "uuid",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."post_flags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_likes" (
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."post_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "caption" "text",
    "image_url" "text",
    "likes_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_flagged" boolean DEFAULT false,
    "hidden" boolean DEFAULT false NOT NULL,
    "moderation_status" "text" DEFAULT 'approved'::"text" NOT NULL,
    "repost_of_id" "uuid",
    "media_type" "text",
    "media_bucket" "text",
    "media_path" "text",
    "thumbnail_path" "text",
    "duration_ms" integer,
    "media_width" integer,
    "media_height" integer,
    "processed_status" "text" DEFAULT 'ready'::"text",
    "trail_report_id" "uuid",
    "trail_id" "text",
    "user_name" "text",
    CONSTRAINT "posts_media_type_check" CHECK ((("media_type" IS NULL) OR ("media_type" = ANY (ARRAY['image'::"text", 'video'::"text"]))))
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."posts"."moderation_status" IS 'approved | rejected | pending_no_engine | flagged';



CREATE TABLE IF NOT EXISTS "public"."push_device_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "platform" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "push_device_tokens_platform_check" CHECK (("platform" = ANY (ARRAY['ios'::"text", 'android'::"text", 'web'::"text"])))
);


ALTER TABLE "public"."push_device_tokens" OWNER TO "postgres";


COMMENT ON TABLE "public"."push_device_tokens" IS 'FCM/APNs device tokens for remote push. Populated by native app on sign-in. No pushes sent until PUSH_SEND_ENABLED=true on server.';



CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid",
    "post_id" "uuid",
    "reason" "text" NOT NULL,
    "details" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "trail_id" "text" NOT NULL,
    "rating" integer,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."run_guest_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "token_hash" "text" NOT NULL,
    "max_redemptions" integer DEFAULT 5 NOT NULL,
    "redemption_count" integer DEFAULT 0 NOT NULL,
    "revoked_at" timestamp with time zone,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "run_guest_invites_max_redemptions_check" CHECK ((("max_redemptions" >= 1) AND ("max_redemptions" <= 50))),
    CONSTRAINT "run_guest_invites_redemption_count_check" CHECK (("redemption_count" >= 0))
);


ALTER TABLE "public"."run_guest_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."run_guest_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "invite_id" "uuid",
    "display_name" "text" NOT NULL,
    "disclaimer_accepted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."run_guest_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."run_participants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "run_id" "uuid",
    "user_id" "uuid",
    "rsvp_status" "text" DEFAULT 'going'::"text",
    "location_shared" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "run_participants_rsvp_status_check" CHECK (("rsvp_status" = ANY (ARRAY['going'::"text", 'maybe'::"text", 'not_going'::"text"])))
);


ALTER TABLE "public"."run_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."run_reflections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "trail_id" "text",
    "user_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "run_reflections_body_check" CHECK ((("char_length"(TRIM(BOTH FROM "body")) >= 1) AND ("char_length"("body") <= 4000)))
);


ALTER TABLE "public"."run_reflections" OWNER TO "postgres";


COMMENT ON TABLE "public"."run_reflections" IS 'Post-run written reflections from participants. Public read for completed runs; no numeric ratings.';



CREATE TABLE IF NOT EXISTS "public"."run_reminder_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "bucket" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "run_reminder_deliveries_bucket_check" CHECK (("bucket" = ANY (ARRAY['72h'::"text", '48h'::"text", '24h'::"text"])))
);


ALTER TABLE "public"."run_reminder_deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."runs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "club_id" "uuid",
    "trail_id" "text",
    "title" "text" NOT NULL,
    "description" "text",
    "date" timestamp with time zone NOT NULL,
    "meetup_location" "text",
    "difficulty" "text",
    "max_participants" integer DEFAULT 20,
    "vehicle_requirements" "text",
    "status" "text" DEFAULT 'upcoming'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "run_source" "text" DEFAULT 'user_submitted'::"text" NOT NULL,
    "host_id" "uuid",
    "user_acknowledged_disclaimer_at" timestamp with time zone,
    "meetup_latitude" double precision,
    "meetup_longitude" double precision,
    "comms_note" "text",
    "flyer_image" "text",
    "visibility" "text" DEFAULT 'public'::"text" NOT NULL,
    CONSTRAINT "runs_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['Easy'::"text", 'Moderate'::"text", 'Challenging'::"text", 'Extreme'::"text"]))),
    CONSTRAINT "runs_run_source_check" CHECK (("run_source" = ANY (ARRAY['club_official'::"text", 'user_submitted'::"text"]))),
    CONSTRAINT "runs_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'active'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "runs_visibility_check" CHECK (("visibility" = ANY (ARRAY['public'::"text", 'club_only'::"text"])))
);


ALTER TABLE "public"."runs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."runs"."meetup_location" IS 'Human-readable meetup label; coordinates stored in meetup_latitude/longitude when set by map picker.';



COMMENT ON COLUMN "public"."runs"."run_source" IS 'club_official = posted by verified club leadership (listed as official). user_submitted = community listing with separate legal treatment.';



COMMENT ON COLUMN "public"."runs"."user_acknowledged_disclaimer_at" IS 'Set when the host accepts community-run disclaimer (user_submitted only).';



COMMENT ON COLUMN "public"."runs"."meetup_latitude" IS 'Staging/meetup latitude chosen on map by host.';



COMMENT ON COLUMN "public"."runs"."meetup_longitude" IS 'Staging/meetup longitude chosen on map by host.';



COMMENT ON COLUMN "public"."runs"."comms_note" IS 'Host-visible comms hint for the group (e.g. GMRS channel, tone, call). Not a score or rating.';



COMMENT ON COLUMN "public"."runs"."flyer_image" IS 'Public URL for uploaded run flyer/poster; shown on the run detail and run cards when set.';



COMMENT ON COLUMN "public"."runs"."visibility" IS 'public = listed globally; club_only = visible only to approved members of runs.club_id';



CREATE TABLE IF NOT EXISTS "public"."saved_posts" (
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."saved_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sos_alerts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "run_id" "uuid",
    "user_id" "uuid",
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "message" "text",
    "acknowledged" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."sos_alerts" REPLICA IDENTITY FULL;


ALTER TABLE "public"."sos_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "club_id" "uuid",
    "stripe_customer_id" "text",
    "status" "text" DEFAULT 'active'::"text",
    "plan" "text" DEFAULT 'basic'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trail_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "voting_event_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "difficulty" "text" NOT NULL,
    "trail_id" "text",
    "image_url" "text",
    "is_night_run" boolean DEFAULT false NOT NULL,
    "sort_order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trail_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trail_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trail_id" "text" NOT NULL,
    "run_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "condition_status" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "difficulty_today" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "surface_conditions" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "hazards" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "hazards_note" "text",
    "weather" "text",
    "body" "text" NOT NULL,
    "photo_urls" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "feed_post_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "trail_reports_body_check" CHECK ((("char_length"(TRIM(BOTH FROM "body")) >= 1) AND ("char_length"("body") <= 4000))),
    CONSTRAINT "trail_reports_condition_status_check" CHECK (("condition_status" = ANY (ARRAY['open'::"text", 'limited'::"text", 'closed'::"text", 'unknown'::"text"]))),
    CONSTRAINT "trail_reports_difficulty_today_check" CHECK (("difficulty_today" = ANY (ARRAY['easy'::"text", 'moderate'::"text", 'hard'::"text", 'extreme'::"text", 'unknown'::"text"]))),
    CONSTRAINT "trail_reports_photo_urls_array_check" CHECK (("jsonb_typeof"("photo_urls") = 'array'::"text"))
);


ALTER TABLE "public"."trail_reports" OWNER TO "postgres";


COMMENT ON TABLE "public"."trail_reports" IS 'Structured trail condition reports, either general community reports or linked to completed runs.';



CREATE TABLE IF NOT EXISTS "public"."trails" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "location" "text",
    "difficulty" "text",
    "distance" "text",
    "description" "text",
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "latitude" double precision,
    "longitude" double precision,
    "estimated_time" "text",
    "elevation_gain" "text",
    "route_type" "text",
    "image_url" "text",
    "maps_url" "text",
    "technical_rating" "text",
    "scenery_rating" "text",
    "tags" "text"[],
    "status" "text" DEFAULT 'open'::"text",
    "onx_url" "text",
    "vehicle_scope" "text",
    CONSTRAINT "trails_vehicle_scope_check" CHECK ((("vehicle_scope" IS NULL) OR ("lower"(TRIM(BOTH FROM "vehicle_scope")) = ANY (ARRAY['atv'::"text", 'truck'::"text", 'both'::"text"]))))
);


ALTER TABLE "public"."trails" OWNER TO "postgres";


COMMENT ON COLUMN "public"."trails"."maps_url" IS 'Google Maps URL for trail area or trailhead (seed-generated when coords missing).';



COMMENT ON COLUMN "public"."trails"."onx_url" IS 'Canonical onX Offroad trail URL for deep linking from the app.';



COMMENT ON COLUMN "public"."trails"."vehicle_scope" IS 'Explorer filter: atv (SXS/UTV/quad-focused), truck (pickups/full-size 4x4), both (either OK). NULL lets clients infer from text fields.';



CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "achievement_id" "uuid",
    "earned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "blocker_id" "uuid" NOT NULL,
    "blocked_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_blocks_check" CHECK (("blocker_id" <> "blocked_id"))
);


ALTER TABLE "public"."user_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_locations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "run_id" "uuid",
    "user_id" "uuid",
    "latitude" numeric(10,8) NOT NULL,
    "longitude" numeric(11,8) NOT NULL,
    "accuracy" numeric(5,2),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_locations" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_locations" IS 'Latest GPS fix per user per run while sharing is on. Removed when the rider stops sharing.';



CREATE TABLE IF NOT EXISTS "public"."user_saved_trails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "trail_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_saved_trails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_stories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "media_type" "text" NOT NULL,
    "media_path" "text" NOT NULL,
    "caption" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_stories_media_type_check" CHECK (("media_type" = ANY (ARRAY['image'::"text", 'video'::"text"])))
);


ALTER TABLE "public"."user_stories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "avatar_url" "text",
    "bio" "text",
    "experience_level" "text" DEFAULT 'Beginner'::"text",
    "location" "text",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "role" "text" DEFAULT 'user'::"text",
    "notify_runs" boolean DEFAULT true NOT NULL,
    "notify_clubs" boolean DEFAULT true NOT NULL,
    "notify_messages" boolean DEFAULT false NOT NULL,
    "dm_allow_from" "text" DEFAULT 'everyone'::"text" NOT NULL,
    "username" "text",
    "hide_display_name" boolean DEFAULT true NOT NULL,
    "sync_display_name_from_google" boolean DEFAULT false NOT NULL,
    "is_verified" boolean DEFAULT false NOT NULL,
    "ui_theme" "text" DEFAULT 'midnight-orange'::"text" NOT NULL,
    "last_identity_change_at" timestamp with time zone,
    "notify_run_time_reminders" boolean DEFAULT true NOT NULL,
    "is_guest" boolean DEFAULT false NOT NULL,
    "guest_run_id" "uuid",
    "ui_shell" "text" DEFAULT 'dark'::"text" NOT NULL,
    "ui_primary_color" "text",
    "ui_secondary_color" "text",
    "onboarding_completed_at" timestamp with time zone,
    "theme_prompt_seen_at" timestamp with time zone,
    CONSTRAINT "users_dm_allow_from_check" CHECK (("dm_allow_from" = ANY (ARRAY['everyone'::"text", 'nobody'::"text"]))),
    CONSTRAINT "users_experience_level_check" CHECK (("experience_level" = ANY (ARRAY['Beginner'::"text", 'Intermediate'::"text", 'Expert'::"text"]))),
    CONSTRAINT "users_ui_shell_check" CHECK (("ui_shell" = ANY (ARRAY['dark'::"text", 'light'::"text"]))),
    CONSTRAINT "users_ui_theme_check" CHECK (("ui_theme" = ANY (ARRAY['midnight-orange'::"text", 'paper-crimson'::"text", 'navy-sage'::"text", 'void-violet'::"text", 'desert-amber'::"text", 'slate-cyan'::"text", 'custom'::"text"]))),
    CONSTRAINT "users_username_format_check" CHECK ((("username" IS NULL) OR ("username" ~ '^[a-z0-9_]{3,24}$'::"text")))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."last_identity_change_at" IS 'Timestamp of last user-initiated change to name/username. Used to rate limit identity churn.';



COMMENT ON COLUMN "public"."users"."notify_run_time_reminders" IS 'When true, user may receive scheduled reminders before runs they host or join (app + future push).';



COMMENT ON COLUMN "public"."users"."ui_shell" IS 'App shell brightness: dark or light';



COMMENT ON COLUMN "public"."users"."ui_primary_color" IS 'Custom theme primary accent (#RRGGBB) when ui_theme = custom';



COMMENT ON COLUMN "public"."users"."ui_secondary_color" IS 'Custom theme secondary accent (#RRGGBB)';



COMMENT ON COLUMN "public"."users"."onboarding_completed_at" IS 'Profile onboarding wizard completed (username + theme)';



COMMENT ON COLUMN "public"."users"."theme_prompt_seen_at" IS 'One-time theme picker modal dismissed for existing users';



CREATE TABLE IF NOT EXISTS "public"."vehicles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "year" integer NOT NULL,
    "make" "text" NOT NULL,
    "model" "text" NOT NULL,
    "modifications" "text",
    "photo_url" "text",
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "trim" "text"
);


ALTER TABLE "public"."vehicles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voice_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "run_id" "uuid",
    "room_id" "text" NOT NULL,
    "provider" "text" DEFAULT 'livekit'::"text",
    "active" boolean DEFAULT true,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "ended_at" timestamp with time zone
);


ALTER TABLE "public"."voice_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "voting_event_id" "uuid" NOT NULL,
    "trail_option_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voting_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "voting_events_ends_after_start_check" CHECK (("ends_at" > "starts_at")),
    CONSTRAINT "voting_events_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."voting_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."voting_events" IS 'Time-boxed community votes (e.g. pick trail for next group run). Staff sets starts_at/ends_at and flips status to active.';



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."caelum_chat_queue"
    ADD CONSTRAINT "caelum_chat_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."caelum_chat_rate_limits"
    ADD CONSTRAINT "caelum_chat_rate_limits_pkey" PRIMARY KEY ("bucket_key", "minute_epoch");



ALTER TABLE ONLY "public"."club_garage_photos"
    ADD CONSTRAINT "club_garage_photos_club_id_storage_path_key" UNIQUE ("club_id", "storage_path");



ALTER TABLE ONLY "public"."club_garage_photos"
    ADD CONSTRAINT "club_garage_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."club_members"
    ADD CONSTRAINT "club_members_club_id_user_id_key" UNIQUE ("club_id", "user_id");



ALTER TABLE ONLY "public"."club_members"
    ADD CONSTRAINT "club_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."club_messages"
    ADD CONSTRAINT "club_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."comment_flags"
    ADD CONSTRAINT "comment_flags_comment_id_user_id_key" UNIQUE ("comment_id", "user_id");



ALTER TABLE ONLY "public"."comment_flags"
    ADD CONSTRAINT "comment_flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_comment_id_user_id_key" UNIQUE ("comment_id", "user_id");



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."direct_messages"
    ADD CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_id_following_id_key" UNIQUE ("follower_id", "following_id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_post_id_key" UNIQUE ("user_id", "post_id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_flags"
    ADD CONSTRAINT "post_flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_flags"
    ADD CONSTRAINT "post_flags_post_id_user_id_key" UNIQUE ("post_id", "user_id");



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_pkey" PRIMARY KEY ("post_id", "user_id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_device_tokens"
    ADD CONSTRAINT "push_device_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_device_tokens"
    ADD CONSTRAINT "push_device_tokens_token_unique" UNIQUE ("token");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."run_guest_invites"
    ADD CONSTRAINT "run_guest_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."run_guest_participants"
    ADD CONSTRAINT "run_guest_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."run_guest_participants"
    ADD CONSTRAINT "run_guest_participants_run_id_user_id_key" UNIQUE ("run_id", "user_id");



ALTER TABLE ONLY "public"."run_participants"
    ADD CONSTRAINT "run_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."run_participants"
    ADD CONSTRAINT "run_participants_run_id_user_id_key" UNIQUE ("run_id", "user_id");



ALTER TABLE ONLY "public"."run_reflections"
    ADD CONSTRAINT "run_reflections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."run_reflections"
    ADD CONSTRAINT "run_reflections_run_id_user_id_key" UNIQUE ("run_id", "user_id");



ALTER TABLE ONLY "public"."run_reminder_deliveries"
    ADD CONSTRAINT "run_reminder_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."run_reminder_deliveries"
    ADD CONSTRAINT "run_reminder_deliveries_run_id_user_id_bucket_key" UNIQUE ("run_id", "user_id", "bucket");



ALTER TABLE ONLY "public"."runs"
    ADD CONSTRAINT "runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_posts"
    ADD CONSTRAINT "saved_posts_pkey" PRIMARY KEY ("post_id", "user_id");



ALTER TABLE ONLY "public"."sos_alerts"
    ADD CONSTRAINT "sos_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trail_options"
    ADD CONSTRAINT "trail_options_event_sort_unique" UNIQUE ("voting_event_id", "sort_order");



ALTER TABLE ONLY "public"."trail_options"
    ADD CONSTRAINT "trail_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trail_reports"
    ADD CONSTRAINT "trail_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trails"
    ADD CONSTRAINT "trails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_achievement_id_key" UNIQUE ("user_id", "achievement_id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_blocked_id_key" UNIQUE ("blocker_id", "blocked_id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_locations"
    ADD CONSTRAINT "user_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_saved_trails"
    ADD CONSTRAINT "user_saved_trails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_saved_trails"
    ADD CONSTRAINT "user_saved_trails_user_id_trail_id_key" UNIQUE ("user_id", "trail_id");



ALTER TABLE ONLY "public"."user_stories"
    ADD CONSTRAINT "user_stories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voice_sessions"
    ADD CONSTRAINT "voice_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_one_per_user_per_event" UNIQUE ("voting_event_id", "user_id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voting_events"
    ADD CONSTRAINT "voting_events_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_caelum_chat_queue_pending_created" ON "public"."caelum_chat_queue" USING "btree" ("created_at") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_club_garage_photos_club" ON "public"."club_garage_photos" USING "btree" ("club_id", "created_at" DESC);



CREATE INDEX "idx_club_members_user" ON "public"."club_members" USING "btree" ("user_id");



CREATE INDEX "idx_club_messages_club_created" ON "public"."club_messages" USING "btree" ("club_id", "created_at" DESC);



CREATE INDEX "idx_comment_likes_user" ON "public"."comment_likes" USING "btree" ("user_id");



CREATE INDEX "idx_comments_post_created" ON "public"."comments" USING "btree" ("post_id", "created_at");



CREATE INDEX "idx_conversation_participants_user" ON "public"."conversation_participants" USING "btree" ("user_id");



CREATE INDEX "idx_conversations_created_by" ON "public"."conversations" USING "btree" ("created_by");



CREATE INDEX "idx_conversations_last_message_at" ON "public"."conversations" USING "btree" ("last_message_at" DESC NULLS LAST);



CREATE INDEX "idx_direct_messages_conversation" ON "public"."direct_messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_direct_messages_created_at" ON "public"."direct_messages" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "idx_follows_follower" ON "public"."follows" USING "btree" ("follower_id");



CREATE INDEX "idx_follows_following" ON "public"."follows" USING "btree" ("following_id");



CREATE INDEX "idx_messages_run" ON "public"."messages" USING "btree" ("run_id");



CREATE INDEX "idx_post_likes_user" ON "public"."post_likes" USING "btree" ("user_id");



CREATE INDEX "idx_posts_repost_of_id" ON "public"."posts" USING "btree" ("repost_of_id") WHERE ("repost_of_id" IS NOT NULL);



CREATE INDEX "idx_posts_trail_id" ON "public"."posts" USING "btree" ("trail_id") WHERE ("trail_id" IS NOT NULL);



CREATE INDEX "idx_posts_trail_report_id" ON "public"."posts" USING "btree" ("trail_report_id") WHERE ("trail_report_id" IS NOT NULL);



CREATE INDEX "idx_push_device_tokens_user" ON "public"."push_device_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_run_guest_invites_token_hash" ON "public"."run_guest_invites" USING "btree" ("token_hash") WHERE ("revoked_at" IS NULL);



CREATE INDEX "idx_run_guest_participants_run" ON "public"."run_guest_participants" USING "btree" ("run_id");



CREATE INDEX "idx_run_guest_participants_user" ON "public"."run_guest_participants" USING "btree" ("user_id");



CREATE INDEX "idx_run_reflections_run" ON "public"."run_reflections" USING "btree" ("run_id", "created_at" DESC);



CREATE INDEX "idx_run_reflections_trail" ON "public"."run_reflections" USING "btree" ("trail_id");



CREATE INDEX "idx_run_reminder_deliveries_run" ON "public"."run_reminder_deliveries" USING "btree" ("run_id");



CREATE INDEX "idx_run_reminder_deliveries_user" ON "public"."run_reminder_deliveries" USING "btree" ("user_id");



CREATE INDEX "idx_runs_club" ON "public"."runs" USING "btree" ("club_id");



CREATE INDEX "idx_runs_club_visibility_date" ON "public"."runs" USING "btree" ("club_id", "visibility", "date");



CREATE INDEX "idx_runs_date" ON "public"."runs" USING "btree" ("date");



CREATE INDEX "idx_runs_status" ON "public"."runs" USING "btree" ("status");



CREATE INDEX "idx_saved_posts_user" ON "public"."saved_posts" USING "btree" ("user_id");



CREATE INDEX "idx_sos_alerts_run" ON "public"."sos_alerts" USING "btree" ("run_id");



CREATE INDEX "idx_trail_options_event" ON "public"."trail_options" USING "btree" ("voting_event_id");



CREATE INDEX "idx_trail_reports_run" ON "public"."trail_reports" USING "btree" ("run_id", "created_at" DESC) WHERE ("run_id" IS NOT NULL);



CREATE INDEX "idx_trail_reports_trail_created" ON "public"."trail_reports" USING "btree" ("trail_id", "created_at" DESC);



CREATE INDEX "idx_trail_reports_user" ON "public"."trail_reports" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_user_blocks_blocked" ON "public"."user_blocks" USING "btree" ("blocked_id");



CREATE INDEX "idx_user_blocks_blocker" ON "public"."user_blocks" USING "btree" ("blocker_id");



CREATE INDEX "idx_user_locations_run" ON "public"."user_locations" USING "btree" ("run_id");



CREATE INDEX "idx_user_locations_updated" ON "public"."user_locations" USING "btree" ("updated_at");



CREATE INDEX "idx_user_saved_trails_user" ON "public"."user_saved_trails" USING "btree" ("user_id");



CREATE INDEX "idx_user_stories_user_created" ON "public"."user_stories" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_votes_event" ON "public"."votes" USING "btree" ("voting_event_id");



CREATE INDEX "idx_votes_user" ON "public"."votes" USING "btree" ("user_id");



CREATE INDEX "idx_voting_events_ends_at" ON "public"."voting_events" USING "btree" ("ends_at");



CREATE INDEX "idx_voting_events_starts_at" ON "public"."voting_events" USING "btree" ("starts_at");



CREATE INDEX "idx_voting_events_status" ON "public"."voting_events" USING "btree" ("status");



CREATE UNIQUE INDEX "run_guest_invites_one_active_per_run" ON "public"."run_guest_invites" USING "btree" ("run_id") WHERE ("revoked_at" IS NULL);



CREATE UNIQUE INDEX "users_username_lower_key" ON "public"."users" USING "btree" ("lower"("username")) WHERE ("username" IS NOT NULL);



CREATE INDEX "vehicles_user_id_idx" ON "public"."vehicles" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "tr_club_members_autofill_staff_status" BEFORE INSERT ON "public"."club_members" FOR EACH ROW EXECUTE FUNCTION "public"."club_members_autofill_staff_status"();



CREATE OR REPLACE TRIGGER "tr_run_reflections_trail" BEFORE INSERT OR UPDATE OF "run_id" ON "public"."run_reflections" FOR EACH ROW EXECUTE FUNCTION "public"."run_reflections_set_trail_from_run"();



CREATE OR REPLACE TRIGGER "tr_run_reflections_updated" BEFORE UPDATE ON "public"."run_reflections" FOR EACH ROW EXECUTE FUNCTION "public"."run_reflections_touch_updated"();



CREATE OR REPLACE TRIGGER "tr_runs_enforce_edit_lock" BEFORE UPDATE ON "public"."runs" FOR EACH ROW EXECUTE FUNCTION "public"."runs_enforce_edit_lock_before_update"();



CREATE OR REPLACE TRIGGER "tr_sync_guest_expiry_on_run_status" AFTER INSERT OR UPDATE OF "status" ON "public"."runs" FOR EACH ROW EXECUTE FUNCTION "public"."sync_guest_expiry_on_run_status"();



CREATE OR REPLACE TRIGGER "tr_trail_reports_updated" BEFORE UPDATE ON "public"."trail_reports" FOR EACH ROW EXECUTE FUNCTION "public"."trail_reports_touch_updated"();



CREATE OR REPLACE TRIGGER "tr_users_block_guest_escalation" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."users_block_guest_escalation"();



CREATE OR REPLACE TRIGGER "tr_users_identity_change_cooldown" BEFORE UPDATE OF "name", "username" ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_identity_change_cooldown"();



CREATE OR REPLACE TRIGGER "tr_users_protect_privileged" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."users_protect_privileged_columns"();



CREATE OR REPLACE TRIGGER "trg_clubs_after_insert_owner_member" AFTER INSERT ON "public"."clubs" FOR EACH ROW EXECUTE FUNCTION "public"."clubs_after_insert_add_owner_membership"();



CREATE OR REPLACE TRIGGER "trg_push_device_tokens_updated_at" BEFORE UPDATE ON "public"."push_device_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."push_device_tokens_set_updated_at"();



ALTER TABLE ONLY "public"."caelum_chat_queue"
    ADD CONSTRAINT "caelum_chat_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."club_garage_photos"
    ADD CONSTRAINT "club_garage_photos_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."club_garage_photos"
    ADD CONSTRAINT "club_garage_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."club_members"
    ADD CONSTRAINT "club_members_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."club_members"
    ADD CONSTRAINT "club_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."club_messages"
    ADD CONSTRAINT "club_messages_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."club_messages"
    ADD CONSTRAINT "club_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."comment_flags"
    ADD CONSTRAINT "comment_flags_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_flags"
    ADD CONSTRAINT "comment_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."direct_messages"
    ADD CONSTRAINT "direct_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."direct_messages"
    ADD CONSTRAINT "direct_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_flags"
    ADD CONSTRAINT "post_flags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_flags"
    ADD CONSTRAINT "post_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_repost_of_id_fkey" FOREIGN KEY ("repost_of_id") REFERENCES "public"."posts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_trail_report_id_fkey" FOREIGN KEY ("trail_report_id") REFERENCES "public"."trail_reports"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."push_device_tokens"
    ADD CONSTRAINT "push_device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."run_guest_invites"
    ADD CONSTRAINT "run_guest_invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."run_guest_invites"
    ADD CONSTRAINT "run_guest_invites_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."run_guest_participants"
    ADD CONSTRAINT "run_guest_participants_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "public"."run_guest_invites"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."run_guest_participants"
    ADD CONSTRAINT "run_guest_participants_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."run_guest_participants"
    ADD CONSTRAINT "run_guest_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."run_participants"
    ADD CONSTRAINT "run_participants_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."run_participants"
    ADD CONSTRAINT "run_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."run_reflections"
    ADD CONSTRAINT "run_reflections_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."run_reflections"
    ADD CONSTRAINT "run_reflections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."run_reminder_deliveries"
    ADD CONSTRAINT "run_reminder_deliveries_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."run_reminder_deliveries"
    ADD CONSTRAINT "run_reminder_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."runs"
    ADD CONSTRAINT "runs_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."runs"
    ADD CONSTRAINT "runs_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."saved_posts"
    ADD CONSTRAINT "saved_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_posts"
    ADD CONSTRAINT "saved_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sos_alerts"
    ADD CONSTRAINT "sos_alerts_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sos_alerts"
    ADD CONSTRAINT "sos_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trail_options"
    ADD CONSTRAINT "trail_options_voting_event_id_fkey" FOREIGN KEY ("voting_event_id") REFERENCES "public"."voting_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trail_reports"
    ADD CONSTRAINT "trail_reports_feed_post_id_fkey" FOREIGN KEY ("feed_post_id") REFERENCES "public"."posts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trail_reports"
    ADD CONSTRAINT "trail_reports_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trail_reports"
    ADD CONSTRAINT "trail_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_locations"
    ADD CONSTRAINT "user_locations_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_locations"
    ADD CONSTRAINT "user_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_saved_trails"
    ADD CONSTRAINT "user_saved_trails_trail_id_fkey" FOREIGN KEY ("trail_id") REFERENCES "public"."trails"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_saved_trails"
    ADD CONSTRAINT "user_saved_trails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_stories"
    ADD CONSTRAINT "user_stories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_guest_run_id_fkey" FOREIGN KEY ("guest_run_id") REFERENCES "public"."runs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voice_sessions"
    ADD CONSTRAINT "voice_sessions_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_trail_option_id_fkey" FOREIGN KEY ("trail_option_id") REFERENCES "public"."trail_options"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_voting_event_id_fkey" FOREIGN KEY ("voting_event_id") REFERENCES "public"."voting_events"("id") ON DELETE CASCADE;



CREATE POLICY "Allow public read access" ON "public"."trails" FOR SELECT USING (true);



CREATE POLICY "Anyone can read comments" ON "public"."comments" FOR SELECT USING (true);



CREATE POLICY "Anyone can read likes" ON "public"."likes" FOR SELECT USING (true);



CREATE POLICY "Anyone can read posts" ON "public"."posts" FOR SELECT USING (true);



CREATE POLICY "Authenticated can comment" ON "public"."comments" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated can like" ON "public"."likes" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated insert comment likes" ON "public"."comment_likes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated insert comments" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can create posts" ON "public"."posts" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can delete own posts" ON "public"."posts" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can report" ON "public"."reports" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Mods delete comment flags" ON "public"."comment_flags" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("lower"(COALESCE("u"."role", ''::"text")) = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Mods delete post flags" ON "public"."post_flags" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("lower"(COALESCE("u"."role", ''::"text")) = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Mods select comment flags" ON "public"."comment_flags" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("lower"(COALESCE("u"."role", ''::"text")) = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Mods select post flags" ON "public"."post_flags" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("lower"(COALESCE("u"."role", ''::"text")) = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Owners and admins can delete any post" ON "public"."posts" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("lower"(COALESCE("u"."role", ''::"text")) = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Owners and admins read all reports" ON "public"."reports" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("lower"(COALESCE("u"."role", ''::"text")) = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Public read comment likes" ON "public"."comment_likes" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read comments" ON "public"."comments" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read post likes" ON "public"."post_likes" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read trails" ON "public"."trails" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Service role full access on trails" ON "public"."trails" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can delete own SOS alerts" ON "public"."sos_alerts" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own vehicles" ON "public"."vehicles" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can save their own trails" ON "public"."user_saved_trails" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can see their own saved trails" ON "public"."user_saved_trails" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can unlike own likes" ON "public"."likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users delete own comment likes" ON "public"."comment_likes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users delete own comments" ON "public"."comments" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users delete own post likes" ON "public"."post_likes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users delete own saved posts" ON "public"."saved_posts" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users delete own saved trails" ON "public"."user_saved_trails" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users insert own comment flags" ON "public"."comment_flags" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users insert own post flags" ON "public"."post_flags" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users insert own post likes" ON "public"."post_likes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users insert own saved posts" ON "public"."saved_posts" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users insert own saved trails" ON "public"."user_saved_trails" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users read own reports" ON "public"."reports" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users select own saved trails" ON "public"."user_saved_trails" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Vehicles are viewable by everyone" ON "public"."vehicles" FOR SELECT USING (true);



ALTER TABLE "public"."achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."caelum_chat_queue" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "caelum_chat_queue_select_own" ON "public"."caelum_chat_queue" FOR SELECT TO "authenticated" USING ((("user_id" IS NOT NULL) AND ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."caelum_chat_rate_limits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "caelum_chat_rate_limits_deny_clients" ON "public"."caelum_chat_rate_limits" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."club_garage_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "club_garage_photos_delete_own_or_club_owner" ON "public"."club_garage_photos" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."clubs" "c"
  WHERE (("c"."id" = "club_garage_photos"."club_id") AND ("c"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "club_garage_photos_insert_approved" ON "public"."club_garage_photos" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND ((EXISTS ( SELECT 1
   FROM "public"."clubs" "c"
  WHERE (("c"."id" = "club_garage_photos"."club_id") AND ("c"."owner_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."club_members" "m"
  WHERE (("m"."club_id" = "club_garage_photos"."club_id") AND ("m"."user_id" = "auth"."uid"()) AND (COALESCE("m"."status", 'approved'::"text") = 'approved'::"text")))))));



CREATE POLICY "club_garage_photos_select_public" ON "public"."club_garage_photos" FOR SELECT USING (true);



ALTER TABLE "public"."club_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "club_members_delete_self_or_owner" ON "public"."club_members" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."clubs" "c"
  WHERE (("c"."id" = "club_members"."club_id") AND ("c"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "club_members_insert" ON "public"."club_members" FOR INSERT TO "authenticated" WITH CHECK (((("user_id" = "auth"."uid"()) AND ("lower"(COALESCE("role", 'member'::"text")) = 'member'::"text") AND (("status" = 'pending'::"text") OR (("status" = 'approved'::"text") AND "public"."is_platform_staff"("auth"."uid"())))) OR "public"."club_can_manage_membership"("club_id", "auth"."uid"())));



CREATE POLICY "club_members_select_public" ON "public"."club_members" FOR SELECT USING (true);



CREATE POLICY "club_members_update_managers_or_self_pending" ON "public"."club_members" FOR UPDATE TO "authenticated" USING (("public"."club_can_manage_membership"("club_id", "auth"."uid"()) OR (("user_id" = "auth"."uid"()) AND ("status" = 'pending'::"text")))) WITH CHECK (("public"."club_can_manage_membership"("club_id", "auth"."uid"()) OR (("user_id" = "auth"."uid"()) AND ("status" = 'pending'::"text"))));



ALTER TABLE "public"."club_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "club_messages_delete_author_or_manager" ON "public"."club_messages" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."club_can_manage_membership"("club_id", "auth"."uid"())));



CREATE POLICY "club_messages_insert_members" ON "public"."club_messages" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."club_is_approved_member"("club_id", "auth"."uid"())));



CREATE POLICY "club_messages_select_members" ON "public"."club_messages" FOR SELECT TO "authenticated" USING ("public"."club_is_approved_member"("club_id", "auth"."uid"()));



ALTER TABLE "public"."clubs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clubs_delete_owner" ON "public"."clubs" FOR DELETE TO "authenticated" USING ((("owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("lower"(TRIM(BOTH FROM COALESCE("u"."role", ''::"text"))) = ANY (ARRAY['admin'::"text", 'owner'::"text"])))))));



CREATE POLICY "clubs_insert_authenticated_owner" ON "public"."clubs" FOR INSERT TO "authenticated" WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "clubs_select_public" ON "public"."clubs" FOR SELECT USING (true);



CREATE POLICY "clubs_update_owner" ON "public"."clubs" FOR UPDATE TO "authenticated" USING (("owner_id" = "auth"."uid"())) WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "clubs_update_platform_staff" ON "public"."clubs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("lower"(TRIM(BOTH FROM COALESCE("u"."role", ''::"text"))) = ANY (ARRAY['admin'::"text", 'owner'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("lower"(TRIM(BOTH FROM COALESCE("u"."role", ''::"text"))) = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))));



ALTER TABLE "public"."comment_flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comment_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversation_participants_insert_self_or_creator_invite" ON "public"."conversation_participants" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR (("user_id" <> "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "conversation_participants"."conversation_id") AND ("c"."created_by" = "auth"."uid"())))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "cp"."conversation_id") AND ("cp"."user_id" <> "auth"."uid"()))))))));



CREATE POLICY "conversation_participants_select_same_conv" ON "public"."conversation_participants" FOR SELECT TO "authenticated" USING ("public"."dm_is_conversation_participant"("conversation_id", "auth"."uid"()));



CREATE POLICY "conversation_participants_update_member" ON "public"."conversation_participants" FOR UPDATE TO "authenticated" USING ("public"."dm_is_conversation_participant"("conversation_id", "auth"."uid"())) WITH CHECK ("public"."dm_is_conversation_participant"("conversation_id", "auth"."uid"()));



ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversations_insert_as_creator" ON "public"."conversations" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "conversations_select_member_or_creator" ON "public"."conversations" FOR SELECT TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."dm_is_conversation_participant"("id", "auth"."uid"())));



CREATE POLICY "conversations_update_member" ON "public"."conversations" FOR UPDATE TO "authenticated" USING ("public"."dm_is_conversation_participant"("id", "auth"."uid"())) WITH CHECK ("public"."dm_is_conversation_participant"("id", "auth"."uid"()));



ALTER TABLE "public"."direct_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "direct_messages_insert_member_as_sender" ON "public"."direct_messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = "auth"."uid"()) AND "public"."dm_is_conversation_participant"("conversation_id", "auth"."uid"())));



CREATE POLICY "direct_messages_select_member" ON "public"."direct_messages" FOR SELECT TO "authenticated" USING ("public"."dm_is_conversation_participant"("conversation_id", "auth"."uid"()));



ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "follows_delete_self" ON "public"."follows" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "follower_id"));



CREATE POLICY "follows_insert_self" ON "public"."follows" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "follower_id"));



CREATE POLICY "follows_select_public" ON "public"."follows" FOR SELECT USING (true);



ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_insert_run_members" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."run_is_participant"("run_id", "auth"."uid"())));



CREATE POLICY "messages_select_run_members" ON "public"."messages" FOR SELECT TO "authenticated" USING ("public"."run_is_participant"("run_id", "auth"."uid"()));



ALTER TABLE "public"."post_flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "posts_insert_own" ON "public"."posts" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "posts_select_visible" ON "public"."posts" FOR SELECT TO "authenticated", "anon" USING (((NOT COALESCE("hidden", false)) AND (COALESCE("moderation_status", 'approved'::"text") <> ALL (ARRAY['rejected'::"text", 'flagged'::"text"]))));



CREATE POLICY "posts_update_own" ON "public"."posts" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."push_device_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "push_device_tokens_delete_own" ON "public"."push_device_tokens" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "push_device_tokens_insert_own" ON "public"."push_device_tokens" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "push_device_tokens_select_own" ON "public"."push_device_tokens" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "push_device_tokens_update_own" ON "public"."push_device_tokens" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."run_guest_invites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "run_guest_invites_select_manager" ON "public"."run_guest_invites" FOR SELECT TO "authenticated" USING ("public"."run_can_manage_guest_invites"("run_id", "auth"."uid"()));



ALTER TABLE "public"."run_guest_participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "run_guest_participants_select_run" ON "public"."run_guest_participants" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."run_is_participant"("run_id", "auth"."uid"())));



ALTER TABLE "public"."run_participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "run_participants_delete_self" ON "public"."run_participants" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "run_participants_insert_self_visible_run" ON "public"."run_participants" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."run_is_visible_to_user"("run_id", "auth"."uid"())));



CREATE POLICY "run_participants_select_visible_runs" ON "public"."run_participants" FOR SELECT TO "authenticated", "anon" USING (("public"."run_is_visible_to_user"("run_id", "auth"."uid"()) OR (("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"()))));



CREATE POLICY "run_participants_update_self" ON "public"."run_participants" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."run_reflections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "run_reflections_delete_own" ON "public"."run_reflections" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "run_reflections_insert_participant" ON "public"."run_reflections" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."runs" "r"
  WHERE (("r"."id" = "run_reflections"."run_id") AND ("r"."status" = 'completed'::"text")))) AND ((EXISTS ( SELECT 1
   FROM "public"."runs" "r"
  WHERE (("r"."id" = "run_reflections"."run_id") AND ("r"."host_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."run_participants" "rp"
  WHERE (("rp"."run_id" = "run_reflections"."run_id") AND ("rp"."user_id" = "auth"."uid"())))))));



CREATE POLICY "run_reflections_select_completed" ON "public"."run_reflections" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."runs" "r"
  WHERE (("r"."id" = "run_reflections"."run_id") AND ("r"."status" = 'completed'::"text")))));



CREATE POLICY "run_reflections_update_own" ON "public"."run_reflections" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."run_reminder_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "runs_delete_host" ON "public"."runs" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "host_id"));



CREATE POLICY "runs_insert_as_host" ON "public"."runs" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "host_id") AND ((COALESCE("run_source", 'user_submitted'::"text") <> 'club_official'::"text") OR "public"."is_platform_staff"("auth"."uid"()) OR (("club_id" IS NOT NULL) AND "public"."club_can_manage_membership"("club_id", "auth"."uid"())))));



CREATE POLICY "runs_select_public" ON "public"."runs" FOR SELECT TO "authenticated", "anon" USING (((COALESCE("visibility", 'public'::"text") = 'public'::"text") OR (("auth"."uid"() IS NOT NULL) AND ("host_id" = "auth"."uid"())) OR ((COALESCE("visibility", 'public'::"text") = 'club_only'::"text") AND ("auth"."uid"() IS NOT NULL) AND ("club_id" IS NOT NULL) AND "public"."club_is_approved_member"("club_id", "auth"."uid"())) OR (("auth"."uid"() IS NOT NULL) AND "public"."is_platform_staff"("auth"."uid"()))));



CREATE POLICY "runs_update_host" ON "public"."runs" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "host_id")) WITH CHECK (("auth"."uid"() = "host_id"));



CREATE POLICY "runs_update_owner_admin" ON "public"."runs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("lower"(COALESCE("u"."role", ''::"text")) = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("lower"(COALESCE("u"."role", ''::"text")) = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."saved_posts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "saved_posts_select_own" ON "public"."saved_posts" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."sos_alerts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sos_alerts_insert_self_on_run" ON "public"."sos_alerts" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."run_is_participant"("run_id", "auth"."uid"())));



CREATE POLICY "sos_alerts_select_run_members" ON "public"."sos_alerts" FOR SELECT TO "authenticated" USING ("public"."run_is_participant"("run_id", "auth"."uid"()));



ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trail_options" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trail_options_delete_staff" ON "public"."trail_options" FOR DELETE TO "authenticated" USING ("public"."is_voting_staff"());



CREATE POLICY "trail_options_insert_staff" ON "public"."trail_options" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_voting_staff"());



CREATE POLICY "trail_options_select_public" ON "public"."trail_options" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."voting_events" "e"
  WHERE (("e"."id" = "trail_options"."voting_event_id") AND ("e"."status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'closed'::"text"]))))));



CREATE POLICY "trail_options_update_staff" ON "public"."trail_options" FOR UPDATE TO "authenticated" USING ("public"."is_voting_staff"()) WITH CHECK ("public"."is_voting_staff"());



ALTER TABLE "public"."trail_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trail_reports_delete_own" ON "public"."trail_reports" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "trail_reports_insert_authenticated" ON "public"."trail_reports" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."trails" "t"
  WHERE ("t"."id" = "trail_reports"."trail_id"))) AND (("run_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."runs" "r"
  WHERE (("r"."id" = "trail_reports"."run_id") AND ("r"."status" = 'completed'::"text") AND ("r"."trail_id" = "trail_reports"."trail_id") AND (("r"."host_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."run_participants" "rp"
          WHERE (("rp"."run_id" = "r"."id") AND ("rp"."user_id" = "auth"."uid"())))))))))));



CREATE POLICY "trail_reports_select_public" ON "public"."trail_reports" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "trail_reports_update_own" ON "public"."trail_reports" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."trails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_blocks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_blocks_delete_own" ON "public"."user_blocks" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "blocker_id"));



CREATE POLICY "user_blocks_insert_own" ON "public"."user_blocks" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "blocker_id"));



CREATE POLICY "user_blocks_select_own" ON "public"."user_blocks" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "blocker_id"));



ALTER TABLE "public"."user_locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_locations_delete_own" ON "public"."user_locations" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_locations_insert_run_members" ON "public"."user_locations" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."run_is_participant"("run_id", "auth"."uid"())));



CREATE POLICY "user_locations_select_run_members" ON "public"."user_locations" FOR SELECT TO "authenticated" USING ("public"."run_is_participant"("run_id", "auth"."uid"()));



CREATE POLICY "user_locations_update_own_run_members" ON "public"."user_locations" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."run_is_participant"("run_id", "auth"."uid"())));



ALTER TABLE "public"."user_saved_trails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_stories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_stories_delete_self" ON "public"."user_stories" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_stories_insert_self" ON "public"."user_stories" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_stories_select_own_or_followed_recent" ON "public"."user_stories" FOR SELECT TO "authenticated" USING ((("created_at" > ("now"() - '24:00:00'::interval)) AND (("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."follows" "f"
  WHERE (("f"."follower_id" = "auth"."uid"()) AND ("f"."following_id" = "user_stories"."user_id")))))));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_insert_own" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "users_select_anon" ON "public"."users" FOR SELECT TO "anon" USING (false);



CREATE POLICY "users_select_authenticated" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."vehicles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."voice_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."votes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "votes_insert_own_active" ON "public"."votes" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."voting_events" "e"
  WHERE (("e"."id" = "votes"."voting_event_id") AND ("e"."status" = 'active'::"text") AND ("now"() >= "e"."starts_at") AND ("now"() < "e"."ends_at")))) AND (EXISTS ( SELECT 1
   FROM "public"."trail_options" "o"
  WHERE (("o"."id" = "votes"."trail_option_id") AND ("o"."voting_event_id" = "votes"."voting_event_id")))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."votes" "v2"
  WHERE (("v2"."voting_event_id" = "votes"."voting_event_id") AND ("v2"."user_id" = "auth"."uid"())))))));



CREATE POLICY "votes_select_own" ON "public"."votes" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."voting_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "voting_events_delete_staff" ON "public"."voting_events" FOR DELETE TO "authenticated" USING ("public"."is_voting_staff"());



CREATE POLICY "voting_events_insert_staff" ON "public"."voting_events" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_voting_staff"());



CREATE POLICY "voting_events_select_public" ON "public"."voting_events" FOR SELECT TO "authenticated", "anon" USING (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'closed'::"text"])));



CREATE POLICY "voting_events_update_staff" ON "public"."voting_events" FOR UPDATE TO "authenticated" USING ("public"."is_voting_staff"()) WITH CHECK ("public"."is_voting_staff"());



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."caelum_chat_rate_touch"("p_bucket" "text", "p_max" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."caelum_chat_rate_touch"("p_bucket" "text", "p_max" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."caelum_chat_rate_touch"("p_bucket" "text", "p_max" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."caelum_chat_rate_touch"("p_bucket" "text", "p_max" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."can_delete_club_garage_object"("path_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_delete_club_garage_object"("path_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_delete_club_garage_object"("path_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_upload_club_garage_object"("path_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_upload_club_garage_object"("path_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_upload_club_garage_object"("path_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."club_can_manage_membership"("p_club_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."club_can_manage_membership"("p_club_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."club_can_manage_membership"("p_club_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."club_is_approved_member"("p_club_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."club_is_approved_member"("p_club_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."club_is_approved_member"("p_club_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."club_is_approved_member"("p_club_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."club_member_controls_chat_media_path"("path_name" "text", "uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."club_member_controls_chat_media_path"("path_name" "text", "uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."club_member_controls_chat_media_path"("path_name" "text", "uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."club_members_autofill_staff_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."club_members_autofill_staff_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."club_members_autofill_staff_status"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."club_owner_controls_banner_path"("path_name" "text", "uid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."club_owner_controls_banner_path"("path_name" "text", "uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."club_owner_controls_banner_path"("path_name" "text", "uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."club_owner_controls_banner_path"("path_name" "text", "uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."clubs_after_insert_add_owner_membership"() TO "anon";
GRANT ALL ON FUNCTION "public"."clubs_after_insert_add_owner_membership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clubs_after_insert_add_owner_membership"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_run_guest_invite"("p_run_id" "uuid", "p_max_guests" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_run_guest_invite"("p_run_id" "uuid", "p_max_guests" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_run_guest_invite"("p_run_id" "uuid", "p_max_guests" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_run_guest_invite"("p_run_id" "uuid", "p_max_guests" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dm_is_conversation_participant"("p_conversation_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dm_is_conversation_participant"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."dm_is_conversation_participant"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dm_is_conversation_participant"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_identity_change_cooldown"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_identity_change_cooldown"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_identity_change_cooldown"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_run_guest_invite_status"("p_run_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_run_guest_invite_status"("p_run_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_run_guest_invite_status"("p_run_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_run_guest_invite_status"("p_run_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_voting_results"("p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_voting_results"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_voting_results"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_voting_results"("p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."hash_guest_invite_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."hash_guest_invite_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hash_guest_invite_token"("p_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_active_run_guest_participant"("p_run_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_active_run_guest_participant"("p_run_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_active_run_guest_participant"("p_run_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_run_guest_participant"("p_run_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_own_avatars_object_path"("path_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_own_avatars_object_path"("path_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_own_avatars_object_path"("path_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_own_post_images_object_path"("path_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_own_post_images_object_path"("path_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_own_post_images_object_path"("path_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_own_post_media_object_path"("path_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_own_post_media_object_path"("path_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_own_post_media_object_path"("path_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_platform_staff"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_platform_staff"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_platform_staff"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_platform_staff"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_voting_staff"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_voting_staff"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_voting_staff"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_voting_staff"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."preview_run_guest_invite"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."preview_run_guest_invite"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."preview_run_guest_invite"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."preview_run_guest_invite"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."push_device_tokens_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."push_device_tokens_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."push_device_tokens_set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."redeem_run_guest_invite"("p_token" "text", "p_display_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."redeem_run_guest_invite"("p_token" "text", "p_display_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."redeem_run_guest_invite"("p_token" "text", "p_display_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_run_guest_invite"("p_token" "text", "p_display_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."revoke_run_guest_invite"("p_run_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revoke_run_guest_invite"("p_run_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_run_guest_invite"("p_run_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_run_guest_invite"("p_run_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."run_can_access_run"("p_run_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."run_can_access_run"("p_run_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."run_can_access_run"("p_run_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_can_access_run"("p_run_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."run_can_manage_guest_invites"("p_run_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."run_can_manage_guest_invites"("p_run_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_can_manage_guest_invites"("p_run_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."run_guest_invite_expires_for_run"("p_run_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."run_guest_invite_expires_for_run"("p_run_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_guest_invite_expires_for_run"("p_run_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."run_host_controls_flyer_path"("path_name" "text", "uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."run_host_controls_flyer_path"("path_name" "text", "uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_host_controls_flyer_path"("path_name" "text", "uid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."run_is_participant"("p_run_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."run_is_participant"("p_run_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."run_is_participant"("p_run_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_is_participant"("p_run_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."run_is_visible_to_user"("p_run_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."run_is_visible_to_user"("p_run_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."run_is_visible_to_user"("p_run_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_is_visible_to_user"("p_run_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."run_reflections_set_trail_from_run"() TO "anon";
GRANT ALL ON FUNCTION "public"."run_reflections_set_trail_from_run"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_reflections_set_trail_from_run"() TO "service_role";



GRANT ALL ON FUNCTION "public"."run_reflections_touch_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."run_reflections_touch_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_reflections_touch_updated"() TO "service_role";



GRANT ALL ON FUNCTION "public"."runs_enforce_edit_lock_before_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."runs_enforce_edit_lock_before_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."runs_enforce_edit_lock_before_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_guest_expiry_on_run_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_guest_expiry_on_run_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_guest_expiry_on_run_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trail_reports_touch_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."trail_reports_touch_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trail_reports_touch_updated"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."upgrade_guest_to_member"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upgrade_guest_to_member"() TO "anon";
GRANT ALL ON FUNCTION "public"."upgrade_guest_to_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."upgrade_guest_to_member"() TO "service_role";



GRANT ALL ON FUNCTION "public"."users_block_guest_escalation"() TO "anon";
GRANT ALL ON FUNCTION "public"."users_block_guest_escalation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."users_block_guest_escalation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."users_protect_privileged_columns"() TO "anon";
GRANT ALL ON FUNCTION "public"."users_protect_privileged_columns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."users_protect_privileged_columns"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_guest_display_name"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_guest_display_name"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_guest_display_name"("p_name" "text") TO "service_role";



GRANT ALL ON TABLE "public"."achievements" TO "anon";
GRANT ALL ON TABLE "public"."achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."achievements" TO "service_role";



GRANT ALL ON TABLE "public"."caelum_chat_queue" TO "anon";
GRANT ALL ON TABLE "public"."caelum_chat_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."caelum_chat_queue" TO "service_role";



GRANT ALL ON TABLE "public"."caelum_chat_rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."caelum_chat_rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."caelum_chat_rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."club_garage_photos" TO "anon";
GRANT ALL ON TABLE "public"."club_garage_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."club_garage_photos" TO "service_role";



GRANT ALL ON TABLE "public"."club_members" TO "anon";
GRANT ALL ON TABLE "public"."club_members" TO "authenticated";
GRANT ALL ON TABLE "public"."club_members" TO "service_role";



GRANT ALL ON TABLE "public"."club_messages" TO "anon";
GRANT ALL ON TABLE "public"."club_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."club_messages" TO "service_role";



GRANT ALL ON TABLE "public"."clubs" TO "anon";
GRANT ALL ON TABLE "public"."clubs" TO "authenticated";
GRANT ALL ON TABLE "public"."clubs" TO "service_role";



GRANT ALL ON TABLE "public"."comment_flags" TO "anon";
GRANT ALL ON TABLE "public"."comment_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_flags" TO "service_role";



GRANT ALL ON TABLE "public"."comment_likes" TO "anon";
GRANT ALL ON TABLE "public"."comment_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_likes" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_participants" TO "anon";
GRANT ALL ON TABLE "public"."conversation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."direct_messages" TO "anon";
GRANT ALL ON TABLE "public"."direct_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."direct_messages" TO "service_role";



GRANT ALL ON TABLE "public"."follows" TO "anon";
GRANT ALL ON TABLE "public"."follows" TO "authenticated";
GRANT ALL ON TABLE "public"."follows" TO "service_role";



GRANT ALL ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."post_flags" TO "anon";
GRANT ALL ON TABLE "public"."post_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."post_flags" TO "service_role";



GRANT ALL ON TABLE "public"."post_likes" TO "anon";
GRANT ALL ON TABLE "public"."post_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."post_likes" TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON TABLE "public"."push_device_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_device_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_device_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."run_guest_invites" TO "anon";
GRANT ALL ON TABLE "public"."run_guest_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."run_guest_invites" TO "service_role";



GRANT ALL ON TABLE "public"."run_guest_participants" TO "anon";
GRANT ALL ON TABLE "public"."run_guest_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."run_guest_participants" TO "service_role";



GRANT ALL ON TABLE "public"."run_participants" TO "anon";
GRANT ALL ON TABLE "public"."run_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."run_participants" TO "service_role";



GRANT ALL ON TABLE "public"."run_reflections" TO "anon";
GRANT ALL ON TABLE "public"."run_reflections" TO "authenticated";
GRANT ALL ON TABLE "public"."run_reflections" TO "service_role";



GRANT ALL ON TABLE "public"."run_reminder_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."run_reminder_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."run_reminder_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."runs" TO "anon";
GRANT ALL ON TABLE "public"."runs" TO "authenticated";
GRANT ALL ON TABLE "public"."runs" TO "service_role";



GRANT ALL ON TABLE "public"."saved_posts" TO "anon";
GRANT ALL ON TABLE "public"."saved_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_posts" TO "service_role";



GRANT ALL ON TABLE "public"."sos_alerts" TO "anon";
GRANT ALL ON TABLE "public"."sos_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."sos_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."trail_options" TO "anon";
GRANT ALL ON TABLE "public"."trail_options" TO "authenticated";
GRANT ALL ON TABLE "public"."trail_options" TO "service_role";



GRANT ALL ON TABLE "public"."trail_reports" TO "anon";
GRANT ALL ON TABLE "public"."trail_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."trail_reports" TO "service_role";



GRANT ALL ON TABLE "public"."trails" TO "anon";
GRANT ALL ON TABLE "public"."trails" TO "authenticated";
GRANT ALL ON TABLE "public"."trails" TO "service_role";



GRANT ALL ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."user_blocks" TO "anon";
GRANT ALL ON TABLE "public"."user_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."user_locations" TO "anon";
GRANT ALL ON TABLE "public"."user_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_locations" TO "service_role";



GRANT ALL ON TABLE "public"."user_saved_trails" TO "anon";
GRANT ALL ON TABLE "public"."user_saved_trails" TO "authenticated";
GRANT ALL ON TABLE "public"."user_saved_trails" TO "service_role";



GRANT ALL ON TABLE "public"."user_stories" TO "anon";
GRANT ALL ON TABLE "public"."user_stories" TO "authenticated";
GRANT ALL ON TABLE "public"."user_stories" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."vehicles" TO "anon";
GRANT ALL ON TABLE "public"."vehicles" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicles" TO "service_role";



GRANT ALL ON TABLE "public"."voice_sessions" TO "anon";
GRANT ALL ON TABLE "public"."voice_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."voice_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."votes" TO "anon";
GRANT ALL ON TABLE "public"."votes" TO "authenticated";
GRANT ALL ON TABLE "public"."votes" TO "service_role";



GRANT ALL ON TABLE "public"."voting_events" TO "anon";
GRANT ALL ON TABLE "public"."voting_events" TO "authenticated";
GRANT ALL ON TABLE "public"."voting_events" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







