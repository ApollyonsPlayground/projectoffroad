-- =============================================================================
-- Supabase Schema & Storage Setup for Project Offroad
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CREATE POSTS TABLE
-- -----------------------------------------------------------------------------

-- Drop existing table if exists (comment this out to preserve data)
DROP TABLE IF EXISTS posts CASCADE;

CREATE TABLE posts (
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

-- Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. STORAGE BUCKET FOR RIG PHOTOS
-- -----------------------------------------------------------------------------

-- Delete existing bucket if you want to recreate it
DELETE FROM storage.buckets WHERE id = 'rig-photos';

-- Create the rig-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rig-photos',
  'rig-photos',
  true,  -- public bucket
  10485760,  -- 10MB limit (adjust as needed)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Enable RLS on storage.objects for this bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. RLS POLICIES FOR POSTS TABLE
-- -----------------------------------------------------------------------------

-- Anyone can view posts (read)
CREATE POLICY "Public posts are viewable by everyone"
ON posts FOR SELECT
USING (true);

-- Authenticated users can insert posts
CREATE POLICY "Users can create posts"
ON posts FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
ON posts FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
ON posts FOR DELETE
USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 4. RLS POLICIES FOR STORAGE
-- -----------------------------------------------------------------------------

-- Anyone can view/download images from rig-photos bucket
CREATE POLICY "Public access to view rig photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'rig-photos'
);

-- Authenticated users can upload to rig-photos bucket
CREATE POLICY "Authenticated users can upload rig photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'rig-photos' 
  AND auth.role() = 'authenticated'
);

-- Users can update their own uploads
CREATE POLICY "Users can update own rig photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'rig-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own uploads
CREATE POLICY "Users can delete own rig photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'rig-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- -----------------------------------------------------------------------------
-- 5. INDEXES FOR PERFORMANCE
-- -----------------------------------------------------------------------------

CREATE INDEX posts_created_at_idx ON posts(created_at DESC);
CREATE INDEX posts_user_id_idx ON posts(user_id);
CREATE INDEX posts_likes_idx ON posts(likes DESC);

-- -----------------------------------------------------------------------------
-- 6. FUNCTION TO AUTO-SET USER ON INSERT
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

-- Trigger to auto-set user info
DROP TRIGGER IF EXISTS set_post_user_trigger ON posts;
CREATE TRIGGER set_post_user_trigger
BEFORE INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION set_post_user();

-- =============================================================================
-- DONE! Your Supabase backend is now ready for photo uploads.
-- =============================================================================