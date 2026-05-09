-- Platform staff (owner/admin) can join any club immediately (no approval).

CREATE OR REPLACE FUNCTION public.is_platform_staff(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = p_user_id
      AND lower(coalesce(u.role::text, '')) IN ('owner', 'admin')
  );
$$;

-- Auto-approve staff self-joins even if caller sends pending.
CREATE OR REPLACE FUNCTION public.club_members_autofill_staff_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS tr_club_members_autofill_staff_status ON public.club_members;
CREATE TRIGGER tr_club_members_autofill_staff_status
BEFORE INSERT ON public.club_members
FOR EACH ROW
EXECUTE FUNCTION public.club_members_autofill_staff_status();

-- Update insert policy: allow staff self-join with approved status.
DROP POLICY IF EXISTS "club_members_insert" ON public.club_members;
CREATE POLICY "club_members_insert"
  ON public.club_members FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      -- Self join request (pending for normal users; staff may be approved immediately)
      user_id = auth.uid()
      AND lower(coalesce(role, 'member')) = 'member'
      AND (
        status = 'pending'
        OR (status = 'approved' AND public.is_platform_staff(auth.uid()))
      )
    )
    OR (
      -- Managers can add/approve members directly
      public.club_can_manage_membership(club_id, auth.uid())
    )
  );

