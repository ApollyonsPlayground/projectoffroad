-- Convert a linked anonymous guest into a full member (clears run-scoped guest lock).

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
