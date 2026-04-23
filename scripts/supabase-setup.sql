-- =============================================================================
-- Supabase Schema & Storage Setup for Project Offroad (Non-Destructive)
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CREATE POSTS TABLE (IF NOT EXISTS)
-- -----------------------------------------------------------------------------

-- Create table only if it doesn't exist
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  image_url TEXT NOT NULL,
  caption TEXT,
  rig_specs JSONB DEFAULT '{}'::jsonb,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security if not already enabled
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. CREATE STORAGE BUCKET (IF NOT EXISTS)
-- -----------------------------------------------------------------------------

-- Insert bucket only if it doesn't exist (Supabase will error if id already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 
  'rig-photos',
  'rig-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'rig-photos');

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. RLS POLICIES FOR POSTS TABLE
-- -----------------------------------------------------------------------------

-- Drop existing policies first (to avoid conflicts)
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

-- Create fresh policies
CREATE POLICY "Public posts are viewable by everyone"
ON posts FOR SELECT USING (true);

CREATE POLICY "Users can create posts"
ON posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own posts"
ON posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
ON posts FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 4. RLS POLICIES FOR STORAGE
-- -----------------------------------------------------------------------------

-- Drop existing storage policies first
DROP POLICY IF EXISTS "Public access to view rig photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload rig photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own rig photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own rig photos" ON storage.objects;

-- Create fresh storage policies
CREATE POLICY "Public access to view rig photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'rig-photos');

CREATE POLICY "Authenticated users can upload rig photos"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'rig-photos' AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own rig photos"
ON storage.objects FOR UPDATE USING (
  bucket_id = 'rig-photos' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own rig photos"
ON storage.objects FOR DELETE USING (
  bucket_id = 'rig-photos' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- -----------------------------------------------------------------------------
-- 5. INDEXES (IF NOT EXISTS)
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_likes_idx ON posts(likes DESC);

-- -----------------------------------------------------------------------------
-- 6. FUNCTION & TRIGGER FOR AUTO-SET USER (IF NOT EXISTS)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_post_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  IF NEW.user_name IS NULL OR NEW.user_name = '' THEN
    NEW.user_name := COALESCE(
      (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = auth.uid()),
      'Anonymous'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_post_user_trigger ON posts;
CREATE TRIGGER set_post_user_trigger
BEFORE INSERT ON posts
FOR EACH ROW EXECUTE FUNCTION set_post_user();

-- =============================================================================
-- DONE! Run this to set up or update your Supabase backend.
-- =============================================================================