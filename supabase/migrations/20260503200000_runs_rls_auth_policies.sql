-- RLS for public.runs: allow reads and allow authenticated hosts to create/update their runs.
-- Without INSERT policy, PostgREST returns 403 Forbidden on POST /rest/v1/runs.

ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "runs_select_public" ON public.runs;
CREATE POLICY "runs_select_public"
  ON public.runs FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "runs_insert_as_host" ON public.runs;
CREATE POLICY "runs_insert_as_host"
  ON public.runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "runs_update_host" ON public.runs;
CREATE POLICY "runs_update_host"
  ON public.runs FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- Platform owners/admins may update any run (moderation, status, corrections).
DROP POLICY IF EXISTS "runs_update_owner_admin" ON public.runs;
CREATE POLICY "runs_update_owner_admin"
  ON public.runs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND lower(coalesce(u.role::text, '')) IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND lower(coalesce(u.role::text, '')) IN ('owner', 'admin')
    )
  );
