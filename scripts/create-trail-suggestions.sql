-- Trail Suggestions table
-- Run this in Supabase SQL Editor to create the trail_suggestions table

CREATE TABLE IF NOT EXISTS trail_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  suggested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE trail_suggestions ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can insert a suggestion
CREATE POLICY "Authenticated users can suggest trails"
  ON trail_suggestions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can see their own suggestions; OWNERs can see all
CREATE POLICY "Users see own suggestions, admins see all"
  ON trail_suggestions FOR SELECT
  USING (
    suggested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'OWNER'
    )
  );

-- Only OWNERs can update (approve/reject)
CREATE POLICY "Only OWNERs can update trail suggestions"
  ON trail_suggestions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'OWNER'
    )
  );

-- Index for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_trail_suggestions_status ON trail_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_trail_suggestions_created ON trail_suggestions(created_at DESC);
