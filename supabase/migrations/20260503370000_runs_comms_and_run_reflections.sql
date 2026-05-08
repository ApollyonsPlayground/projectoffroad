-- Optional radio / comms line for run cards (GMRS, FRS, tone, etc.)
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS comms_note text;
COMMENT ON COLUMN public.runs.comms_note IS
  'Host-visible comms hint for the group (e.g. GMRS channel, tone, call). Not a score or rating.';

-- Written trip notes after a run ends — no star ratings, one note per person per run.
CREATE TABLE IF NOT EXISTS public.run_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.runs (id) ON DELETE CASCADE,
  trail_id text,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) >= 1 AND char_length(body) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_run_reflections_trail ON public.run_reflections (trail_id);
CREATE INDEX IF NOT EXISTS idx_run_reflections_run ON public.run_reflections (run_id, created_at DESC);

COMMENT ON TABLE public.run_reflections IS
  'Post-run written reflections from participants. Public read for completed runs; no numeric ratings.';

CREATE OR REPLACE FUNCTION public.run_reflections_set_trail_from_run()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.trail_id := (SELECT r.trail_id::text FROM public.runs r WHERE r.id = NEW.run_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_reflections_touch_updated()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_run_reflections_trail ON public.run_reflections;
CREATE TRIGGER tr_run_reflections_trail
  BEFORE INSERT OR UPDATE OF run_id ON public.run_reflections
  FOR EACH ROW
  EXECUTE FUNCTION public.run_reflections_set_trail_from_run();

DROP TRIGGER IF EXISTS tr_run_reflections_updated ON public.run_reflections;
CREATE TRIGGER tr_run_reflections_updated
  BEFORE UPDATE ON public.run_reflections
  FOR EACH ROW
  EXECUTE FUNCTION public.run_reflections_touch_updated();

ALTER TABLE public.run_reflections ENABLE ROW LEVEL SECURITY;

-- Anyone can read notes tied to a completed run (trip reports for planning).
DROP POLICY IF EXISTS "run_reflections_select_completed" ON public.run_reflections;
CREATE POLICY "run_reflections_select_completed"
  ON public.run_reflections FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.runs r
      WHERE r.id = run_reflections.run_id
        AND r.status = 'completed'
    )
  );

-- Host or RSVPed participant, run must be completed, own row only.
DROP POLICY IF EXISTS "run_reflections_insert_participant" ON public.run_reflections;
CREATE POLICY "run_reflections_insert_participant"
  ON public.run_reflections FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.runs r
      WHERE r.id = run_reflections.run_id
        AND r.status = 'completed'
    )
    AND (
      EXISTS (SELECT 1 FROM public.runs r WHERE r.id = run_reflections.run_id AND r.host_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.run_participants rp
        WHERE rp.run_id = run_reflections.run_id AND rp.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "run_reflections_update_own" ON public.run_reflections;
CREATE POLICY "run_reflections_update_own"
  ON public.run_reflections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "run_reflections_delete_own" ON public.run_reflections;
CREATE POLICY "run_reflections_delete_own"
  ON public.run_reflections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
