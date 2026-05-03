-- Meetup transparency: exact coordinates required for new pins (app enforces map selection).
-- Host may permanently delete their own run (participants/messages cascade where configured).

ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS meetup_latitude double precision;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS meetup_longitude double precision;

COMMENT ON COLUMN public.runs.meetup_latitude IS 'Staging/meetup latitude chosen on map by host.';
COMMENT ON COLUMN public.runs.meetup_longitude IS 'Staging/meetup longitude chosen on map by host.';
COMMENT ON COLUMN public.runs.meetup_location IS 'Human-readable meetup label; coordinates stored in meetup_latitude/longitude when set by map picker.';

DROP POLICY IF EXISTS "runs_delete_host" ON public.runs;
CREATE POLICY "runs_delete_host"
  ON public.runs FOR DELETE
  TO authenticated
  USING (auth.uid() = host_id);
