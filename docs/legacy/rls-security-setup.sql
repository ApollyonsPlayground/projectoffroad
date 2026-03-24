-- ============================================================================
-- [PHASE 3: SECURITY PROTOCOL] - Row Level Security (RLS) Setup
-- socaloffroaders.org Supabase Database
-- ============================================================================

-- Execute these commands in your Supabase SQL Editor
-- https://supabase.com/dashboard/project/_/sql

-- ============================================================================
-- 1. ENABLE RLS ON SUBMISSIONS TABLE
-- ============================================================================

-- Enable RLS on submissions table
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (clean slate)
DROP POLICY IF EXISTS "Allow anonymous INSERT on submissions" ON submissions;
DROP POLICY IF EXISTS "Service role full access on submissions" ON submissions;
DROP POLICY IF EXISTS "Public read approved submissions" ON submissions;

-- ============================================================================
-- 2. CREATE POLICIES FOR SUBMISSIONS TABLE
-- ============================================================================

-- Policy: Allow anonymous INSERT operations
-- This lets anyone submit runs/trails without authentication
CREATE POLICY "Allow anonymous INSERT on submissions"
  ON submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Service role has full access (for your backend/admin tools)
CREATE POLICY "Service role full access on submissions"
  ON submissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Only service role can SELECT/UPDATE/DELETE submissions
-- Anonymous users cannot read pending submissions (prevents data leakage)
CREATE POLICY "Restrict public SELECT on submissions"
  ON submissions
  FOR SELECT
  TO anon
  USING (false);  -- Anonymous users cannot read any submissions

-- ============================================================================
-- 3. ENABLE RLS ON RUNS TABLE
-- ============================================================================

-- Enable RLS on runs table
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public read verified runs" ON runs;
DROP POLICY IF EXISTS "Service role full access on runs" ON runs;

-- ============================================================================
-- 4. CREATE POLICIES FOR RUNS TABLE
-- ============================================================================

-- Policy: Public can only read verified, future runs
CREATE POLICY "Public read verified runs"
  ON runs
  FOR SELECT
  TO anon, authenticated
  USING (is_verified = true AND date >= CURRENT_DATE);

-- Policy: Service role has full access
CREATE POLICY "Service role full access on runs"
  ON runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. ENABLE RLS ON TRAILS TABLE (if not already)
-- ============================================================================

-- Enable RLS on trails table
ALTER TABLE trails ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public read trails" ON trails;
DROP POLICY IF EXISTS "Service role full access on trails" ON trails;

-- ============================================================================
-- 6. CREATE POLICIES FOR TRAILS TABLE
-- ============================================================================

-- Policy: Public can read all trails (they're public data)
CREATE POLICY "Public read trails"
  ON trails
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Service role has full access
CREATE POLICY "Service role full access on trails"
  ON trails
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- VERIFICATION QUERIES (Run these to confirm setup)
-- ============================================================================

-- Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('submissions', 'runs', 'trails')
AND schemaname = 'public';

-- List all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('submissions', 'runs', 'trails')
ORDER BY tablename, policyname;
