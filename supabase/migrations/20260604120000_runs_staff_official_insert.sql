-- Allow platform staff to publish club_official runs without a hosting club
-- (Staff verified listing) or with an optional club link they may not manage.

DROP POLICY IF EXISTS "runs_insert_as_host" ON public.runs;

CREATE POLICY "runs_insert_as_host"
  ON public.runs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = host_id
    AND (
      coalesce(run_source, 'user_submitted') <> 'club_official'
      OR public.is_platform_staff(auth.uid())
      OR (
        club_id IS NOT NULL
        AND public.club_can_manage_membership(club_id, auth.uid())
      )
    )
  );
