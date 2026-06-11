-- Fix: guest redeem must not convert full member accounts; upgrade must clear guest flags.

-- ── 1) Allow upgrade_guest_to_member (and one-time restore) to clear guest flags
CREATE OR REPLACE FUNCTION public.users_block_guest_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.allow_guest_upgrade', true) = 'true' THEN
    RETURN NEW;
  END IF;

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

CREATE OR REPLACE FUNCTION public.upgrade_guest_to_member()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  PERFORM set_config('app.allow_guest_upgrade', 'true', true);

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

REVOKE ALL ON FUNCTION public.upgrade_guest_to_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upgrade_guest_to_member() TO authenticated;

-- ── 3) Restore full members accidentally marked guest (signed in while testing invite link)
DO $$
BEGIN
  PERFORM set_config('app.allow_guest_upgrade', 'true', true);

  UPDATE public.users u
  SET
    is_guest = false,
    guest_run_id = NULL,
    updated_at = now()
  FROM auth.users a
  WHERE u.id = a.id
    AND u.is_guest = true
    AND coalesce(a.is_anonymous, false) = false
    AND u.email NOT LIKE '%@guest.socaloffroaders.local';

  DELETE FROM public.run_guest_participants gp
  USING auth.users a
  WHERE gp.user_id = a.id
    AND coalesce(a.is_anonymous, false) = false
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = gp.user_id AND u.is_guest = false
    );
END $$;

-- ── 4) Guest redeem: anonymous session only — never overwrite a full member row
CREATE OR REPLACE FUNCTION public.redeem_run_guest_invite(p_token text, p_display_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_name text;
  v_invite public.run_guest_invites%ROWTYPE;
  v_run public.runs%ROWTYPE;
  v_participant_count integer;
  v_guest_count integer;
  v_expires timestamptz;
  v_email text;
  v_is_anonymous boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  SELECT coalesce(u.is_anonymous, false) INTO v_is_anonymous
  FROM auth.users u
  WHERE u.id = v_uid;

  IF NOT v_is_anonymous THEN
    RAISE EXCEPTION 'Sign out of your full account before joining as a guest. Use a private window or sign out, then open the invite link again.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = v_uid AND coalesce(u.is_guest, false) = false
  ) THEN
    RAISE EXCEPTION 'This account cannot join as a guest';
  END IF;

  v_name := public.validate_guest_display_name(p_display_name);
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RAISE EXCEPTION 'Invalid invite link';
  END IF;

  SELECT * INTO v_invite FROM public.run_guest_invites i
  WHERE i.token_hash = public.hash_guest_invite_token(p_token)
    AND i.revoked_at IS NULL AND i.expires_at > now()
  LIMIT 1 FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This invite link is invalid or has expired';
  END IF;

  SELECT * INTO v_run FROM public.runs r WHERE r.id = v_invite.run_id;
  IF NOT FOUND OR v_run.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'This run is no longer accepting guests';
  END IF;

  IF v_invite.redemption_count >= v_invite.max_redemptions THEN
    RAISE EXCEPTION 'This invite link has reached its guest limit';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.run_participants rp
    WHERE rp.run_id = v_invite.run_id AND rp.user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'You already joined this run with a full account';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.run_guest_participants gp
    WHERE gp.run_id = v_invite.run_id AND gp.user_id = v_uid AND gp.expires_at > now()
  ) THEN
    RETURN json_build_object('run_id', v_invite.run_id, 'already_joined', true);
  END IF;

  SELECT count(*)::integer INTO v_participant_count
  FROM public.run_participants rp WHERE rp.run_id = v_invite.run_id;

  SELECT count(*)::integer INTO v_guest_count
  FROM public.run_guest_participants gp
  WHERE gp.run_id = v_invite.run_id AND gp.expires_at > now();

  IF v_run.max_participants IS NOT NULL AND (v_participant_count + v_guest_count) >= v_run.max_participants THEN
    RAISE EXCEPTION 'This run is full';
  END IF;

  v_expires := public.run_guest_invite_expires_for_run(v_invite.run_id);
  v_email := v_uid::text || '@guest.socaloffroaders.local';

  INSERT INTO public.users (id, email, name, is_guest, guest_run_id, hide_display_name)
  VALUES (v_uid, v_email, v_name, true, v_invite.run_id, true)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_guest = true,
    guest_run_id = EXCLUDED.guest_run_id,
    hide_display_name = true,
    updated_at = now()
  WHERE public.users.is_guest = true;

  INSERT INTO public.run_guest_participants (run_id, user_id, invite_id, display_name, expires_at)
  VALUES (v_invite.run_id, v_uid, v_invite.id, v_name, v_expires);

  UPDATE public.run_guest_invites
  SET redemption_count = redemption_count + 1, updated_at = now()
  WHERE id = v_invite.id;

  RETURN json_build_object('run_id', v_invite.run_id, 'display_name', v_name, 'expires_at', v_expires);
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_run_guest_invite(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_run_guest_invite(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.redeem_run_guest_invite(text, text) TO authenticated;
