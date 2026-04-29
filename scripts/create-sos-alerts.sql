-- sos_alerts table for the SOS system
-- Stores emergency alerts sent by participants during active runs

CREATE TABLE IF NOT EXISTS sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by run
CREATE INDEX IF NOT EXISTS idx_sos_alerts_run_id ON sos_alerts(run_id);

-- Enable Row Level Security
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read SOS alerts (participants need to see them)
CREATE POLICY "Authenticated users can read SOS alerts"
  ON sos_alerts FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert SOS alerts
CREATE POLICY "Authenticated users can insert SOS alerts"
  ON sos_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE sos_alerts;
