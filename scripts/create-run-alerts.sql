-- Migration: create run_alerts table for SOS broadcast system
-- Run this once against your Supabase project via the SQL editor.

CREATE TABLE IF NOT EXISTS public.run_alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name   text,
  alert_type  text NOT NULL DEFAULT 'sos',   -- 'sos' | 'info'
  latitude    double precision,
  longitude   double precision,
  message     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by run
CREATE INDEX IF NOT EXISTS run_alerts_run_id_idx ON public.run_alerts(run_id);

-- Enable Row Level Security
ALTER TABLE public.run_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: any authenticated user can insert (to send alerts)
CREATE POLICY "Authenticated users can insert alerts"
  ON public.run_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: participants can read alerts for their runs
CREATE POLICY "Anyone can read run alerts"
  ON public.run_alerts
  FOR SELECT
  TO authenticated
  USING (true);

-- Enable Realtime on this table so subscriptions receive INSERT events
ALTER PUBLICATION supabase_realtime ADD TABLE public.run_alerts;
