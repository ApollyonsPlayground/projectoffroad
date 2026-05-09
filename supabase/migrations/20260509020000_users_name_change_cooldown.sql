-- Limit display name / username changes to once per 24h (anti-spam).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_identity_change_at timestamptz;

COMMENT ON COLUMN public.users.last_identity_change_at IS
  'Timestamp of last user-initiated change to name/username. Used to rate limit identity churn.';

CREATE OR REPLACE FUNCTION public.enforce_identity_change_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS tr_users_identity_change_cooldown ON public.users;
CREATE TRIGGER tr_users_identity_change_cooldown
BEFORE UPDATE OF name, username ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.enforce_identity_change_cooldown();

