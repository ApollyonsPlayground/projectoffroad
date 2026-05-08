-- Club membership approval + officer roles + official club run gating.
--
-- Goals:
-- 1) Allow users to request to join a club (pending), and owners/officers approve.
-- 2) Allow "official club runs" to be created by approved officers/owners (not platform admins only).
-- 3) Preserve backwards compatibility: existing rows become approved.

-- ── club_members: approval status + normalize roles ────────────────────────────

ALTER TABLE public.club_members
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

-- Normalize legacy role naming: prefer officer over leader.
UPDATE public.club_members
SET role = 'officer'
WHERE lower(trim(coalesce(role, ''))) = 'leader';

-- Normalize status values.
UPDATE public.club_members
SET status = 'approved'
WHERE status IS NULL OR trim(status) NOT IN ('approved', 'pending', 'rejected');

DO $$
BEGIN
  ALTER TABLE public.club_members DROP CONSTRAINT club_members_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.club_members
  ADD CONSTRAINT club_members_status_check
  CHECK (status IN ('approved', 'pending', 'rejected'));

-- Expand roles to include officer (and keep legacy names for safety).
DO $$
BEGIN
  ALTER TABLE public.club_members DROP CONSTRAINT club_members_role_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.club_members
  ADD CONSTRAINT club_members_role_check
  CHECK (role IS NOT NULL AND role IN ('owner', 'admin', 'officer', 'leader', 'member'));

-- Convenience function: can the current user manage membership for a club?
CREATE OR REPLACE FUNCTION public.club_can_manage_membership(p_club_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Update club_members policies to support approval flow.
-- Keep select public. Tighten insert so self-join becomes pending member.

DROP POLICY IF EXISTS "club_members_insert" ON public.club_members;
CREATE POLICY "club_members_insert"
  ON public.club_members FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      -- Self join request
      user_id = auth.uid()
      AND lower(coalesce(role, 'member')) = 'member'
      AND status = 'pending'
    )
    OR (
      -- Managers can add/approve members directly
      public.club_can_manage_membership(club_id, auth.uid())
    )
  );

-- Allow managers to approve/update roles/status. Also allow a user to withdraw their own pending request.
DROP POLICY IF EXISTS "club_members_update_club_owner" ON public.club_members;
CREATE POLICY "club_members_update_managers_or_self_pending"
  ON public.club_members FOR UPDATE
  TO authenticated
  USING (
    public.club_can_manage_membership(club_id, auth.uid())
    OR (user_id = auth.uid() AND status = 'pending')
  )
  WITH CHECK (
    public.club_can_manage_membership(club_id, auth.uid())
    OR (user_id = auth.uid() AND status = 'pending')
  );

-- ── runs: gate official club runs to approved officers/owners ─────────────────
-- Existing policy allows any authenticated user to insert where auth.uid() = host_id.
-- Update the insert check so:
-- - user_submitted: auth.uid() = host_id (as before)
-- - club_official: auth.uid() = host_id AND club_id is not null AND host is approved manager of that club

DROP POLICY IF EXISTS "runs_insert_as_host" ON public.runs;
CREATE POLICY "runs_insert_as_host"
  ON public.runs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = host_id
    AND (
      coalesce(run_source, 'user_submitted') <> 'club_official'
      OR (
        club_id IS NOT NULL
        AND public.club_can_manage_membership(club_id, auth.uid())
      )
    )
  );

