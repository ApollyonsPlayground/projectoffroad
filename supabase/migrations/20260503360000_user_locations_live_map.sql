-- Live positions on an active run (opt-in from the client). Visible only to the host
-- and RSVPed participants for that run — mirrors public.messages access.

CREATE TABLE IF NOT EXISTS public.user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.runs (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_locations_run ON public.user_locations (run_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_updated ON public.user_locations (updated_at DESC);

COMMENT ON TABLE public.user_locations IS
  'Latest GPS fix per user per run while sharing is on. Removed when the rider stops sharing.';

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_locations_select_run_members" ON public.user_locations;
CREATE POLICY "user_locations_select_run_members"
  ON public.user_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.runs r WHERE r.id = user_locations.run_id AND r.host_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.run_participants rp
      WHERE rp.run_id = user_locations.run_id AND rp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "user_locations_insert_run_members" ON public.user_locations;
CREATE POLICY "user_locations_insert_run_members"
  ON public.user_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (SELECT 1 FROM public.runs r WHERE r.id = user_locations.run_id AND r.host_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.run_participants rp
        WHERE rp.run_id = user_locations.run_id AND rp.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "user_locations_update_own_run_members" ON public.user_locations;
CREATE POLICY "user_locations_update_own_run_members"
  ON public.user_locations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (SELECT 1 FROM public.runs r WHERE r.id = user_locations.run_id AND r.host_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.run_participants rp
        WHERE rp.run_id = user_locations.run_id AND rp.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "user_locations_delete_own" ON public.user_locations;
CREATE POLICY "user_locations_delete_own"
  ON public.user_locations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_locations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
