-- create_run_guest_invite used gen_random_bytes() with search_path = public only.
-- On Supabase, pgcrypto lives in the extensions schema (same as digest fix).

CREATE OR REPLACE FUNCTION public.create_run_guest_invite(p_run_id uuid, p_max_guests integer DEFAULT 5)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

REVOKE ALL ON FUNCTION public.create_run_guest_invite(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_run_guest_invite(uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.create_run_guest_invite(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_run_guest_invite(uuid, integer) TO service_role;
