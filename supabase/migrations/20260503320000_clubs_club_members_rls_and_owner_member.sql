-- Clubs + club_members: RLS that keeps directory, club pages, and HostRunWizard working.
-- - Anyone can read clubs (staff club directory + public listing).
-- - Anyone can read club_members (member list on club page; embed clubs on membership query).
-- - Authenticated users create clubs they own; owners update their row; platform staff can update (e.g. verified).
-- - Membership insert: self-join or club owner adding rows; delete/update rules for owners and self-leave.

-- Allow HostRunWizard role filter to include "leader" (matches app UI copy).
DO $$
BEGIN
  ALTER TABLE public.club_members DROP CONSTRAINT club_members_role_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

UPDATE public.club_members
SET role = 'member'
WHERE role IS NULL OR trim(role) NOT IN ('owner', 'admin', 'leader', 'member');

ALTER TABLE public.club_members
  ADD CONSTRAINT club_members_role_check
  CHECK (role IS NOT NULL AND role IN ('owner', 'admin', 'leader', 'member'));

-- Ensure every club has an owner row in club_members (HostRunWizard keys off this table).
INSERT INTO public.club_members (club_id, user_id, role)
SELECT c.id, c.owner_id, 'owner'::text
FROM public.clubs c
WHERE c.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.club_members m
    WHERE m.club_id = c.id AND m.user_id = c.owner_id
  );

CREATE OR REPLACE FUNCTION public.clubs_after_insert_add_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS trg_clubs_after_insert_owner_member ON public.clubs;
CREATE TRIGGER trg_clubs_after_insert_owner_member
  AFTER INSERT ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.clubs_after_insert_add_owner_membership();

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- clubs: replace / normalize policies (idempotent names used by repo + legacy SQL).
DROP POLICY IF EXISTS "Clubs are viewable by everyone" ON public.clubs;
DROP POLICY IF EXISTS "Anyone can read clubs" ON public.clubs;
DROP POLICY IF EXISTS "clubs_select_public" ON public.clubs;
DROP POLICY IF EXISTS "Club owners can update their club" ON public.clubs;
DROP POLICY IF EXISTS "Admins can update verified status" ON public.clubs;
DROP POLICY IF EXISTS "clubs_insert_authenticated_owner" ON public.clubs;
DROP POLICY IF EXISTS "clubs_update_owner" ON public.clubs;
DROP POLICY IF EXISTS "clubs_update_platform_staff" ON public.clubs;

CREATE POLICY "clubs_select_public"
  ON public.clubs FOR SELECT
  USING (true);

CREATE POLICY "clubs_insert_authenticated_owner"
  ON public.clubs FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "clubs_update_owner"
  ON public.clubs FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "clubs_update_platform_staff"
  ON public.clubs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND lower(trim(coalesce(u.role, ''))) IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND lower(trim(coalesce(u.role, ''))) IN ('admin', 'owner')
    )
  );

-- club_members
DROP POLICY IF EXISTS "club_members_select_public" ON public.club_members;
DROP POLICY IF EXISTS "club_members_insert" ON public.club_members;
DROP POLICY IF EXISTS "club_members_delete_self_or_owner" ON public.club_members;
DROP POLICY IF EXISTS "club_members_update_club_owner" ON public.club_members;

CREATE POLICY "club_members_select_public"
  ON public.club_members FOR SELECT
  USING (true);

CREATE POLICY "club_members_insert"
  ON public.club_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = club_id
        AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "club_members_delete_self_or_owner"
  ON public.club_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = club_id
        AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "club_members_update_club_owner"
  ON public.club_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = club_id
        AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = club_id
        AND c.owner_id = auth.uid()
    )
  );
