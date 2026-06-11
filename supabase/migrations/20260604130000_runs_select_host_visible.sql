-- Hosts (and platform staff) must be able to read runs they create, including
-- club_only rows and RETURNING after insert.

DROP POLICY IF EXISTS "runs_select_public" ON public.runs;

CREATE POLICY "runs_select_public"
  ON public.runs FOR SELECT
  TO anon, authenticated
  USING (
    COALESCE(visibility, 'public') = 'public'
    OR (auth.uid() IS NOT NULL AND host_id = auth.uid())
    OR (
      COALESCE(visibility, 'public') = 'club_only'
      AND auth.uid() IS NOT NULL
      AND club_id IS NOT NULL
      AND public.club_is_approved_member(club_id, auth.uid())
    )
    OR (auth.uid() IS NOT NULL AND public.is_platform_staff(auth.uid()))
  );
