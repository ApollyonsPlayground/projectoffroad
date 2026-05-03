-- Add is_verified column to clubs table
-- Run this in Supabase SQL Editor

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Enable RLS and add policy if needed
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Create policy for reading clubs (public read)
DROP POLICY IF EXISTS "Anyone can read clubs" ON clubs;
CREATE POLICY "Anyone can read clubs" ON clubs FOR SELECT USING (true);

-- Create policy for updating verified status (only auth users can update)
DROP POLICY IF EXISTS "Admins can update verified status" ON clubs;
CREATE POLICY "Admins can update verified status" ON clubs FOR UPDATE USING (auth.role() = 'authenticated');