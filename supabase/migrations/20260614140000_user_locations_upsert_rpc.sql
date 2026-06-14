-- Reliable location sharing: security-definer upsert + guest participant access.

CREATE OR REPLACE FUNCTION public.user_can_share_run_location(p_run_id uuid, p_user_id uuid)
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
      AND r.host_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.run_participants rp
    WHERE rp.run_id = p_run_id
      AND rp.user_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.run_guest_participants gp
    WHERE gp.run_id = p_run_id
      AND gp.user_id = p_user_id
      AND gp.expires_at > now()
  );
$$;

REVOKE ALL ON FUNCTION public.user_can_share_run_location(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_share_run_location(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_my_run_location(
  p_run_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy double precision DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  IF p_latitude IS NULL
    OR p_longitude IS NULL
    OR p_latitude < -90
    OR p_latitude > 90
    OR p_longitude < -180
    OR p_longitude > 180
  THEN
    RAISE EXCEPTION 'Invalid coordinates';
  END IF;

  IF NOT public.user_can_share_run_location(p_run_id, v_uid) THEN
    RAISE EXCEPTION 'Not allowed to share location on this run';
  END IF;

  INSERT INTO public.user_locations (run_id, user_id, latitude, longitude, accuracy, updated_at)
  VALUES (p_run_id, v_uid, p_latitude, p_longitude, p_accuracy, now())
  ON CONFLICT (run_id, user_id) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    accuracy = EXCLUDED.accuracy,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_my_run_location(uuid, double precision, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_my_run_location(uuid, double precision, double precision, double precision) TO authenticated;

-- Extend read/write policies for active guest participants (RPC already allows them).
DROP POLICY IF EXISTS "user_locations_select_run_members" ON public.user_locations;
CREATE POLICY "user_locations_select_run_members"
  ON public.user_locations FOR SELECT
  TO authenticated
  USING (public.user_can_share_run_location(run_id, auth.uid()));

DROP POLICY IF EXISTS "user_locations_insert_run_members" ON public.user_locations;
CREATE POLICY "user_locations_insert_run_members"
  ON public.user_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.user_can_share_run_location(run_id, auth.uid())
  );

DROP POLICY IF EXISTS "user_locations_update_own_run_members" ON public.user_locations;
CREATE POLICY "user_locations_update_own_run_members"
  ON public.user_locations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND public.user_can_share_run_location(run_id, auth.uid())
  );
