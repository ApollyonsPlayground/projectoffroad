-- Supabase Database Schema for socaloffroaders.org
-- Execute in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: trails
-- ============================================
CREATE TABLE IF NOT EXISTS trails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('Beginner', 'Moderate', 'Advanced', 'Extreme')),
    difficulty_level TEXT NOT NULL,
    rig_requirements TEXT NOT NULL,
    onx_slug TEXT NOT NULL UNIQUE,
    coordinates TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Open', 'Closed', 'Seasonal')),
    image_url TEXT NOT NULL,
    distance TEXT NOT NULL,
    time_estimate TEXT NOT NULL,
    description TEXT NOT NULL,
    terrain TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_trails_difficulty ON trails(difficulty);
CREATE INDEX IF NOT EXISTS idx_trails_status ON trails(status);

-- ============================================
-- TABLE: runs
-- ============================================
CREATE TABLE IF NOT EXISTS runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    meetup_location TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('Beginner', 'Moderate', 'Advanced', 'Extreme')),
    max_rigs INTEGER NOT NULL DEFAULT 10,
    rigs_joined INTEGER NOT NULL DEFAULT 0,
    trail_id UUID REFERENCES trails(id),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    organizer_name TEXT NOT NULL,
    organizer_instagram TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_runs_date ON runs(date);
CREATE INDEX IF NOT EXISTS idx_runs_is_verified ON runs(is_verified);

-- ============================================
-- TABLE: submissions
-- ============================================
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('run', 'trail')),
    content_payload JSONB NOT NULL,
    user_contact TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by TEXT
);

-- Index for admin dashboard
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_type ON submissions(type);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Trails: Everyone can read
ALTER TABLE trails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trails are viewable by everyone" ON trails
    FOR SELECT USING (true);

-- Runs: Everyone can read verified runs
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Verified runs are viewable by everyone" ON runs
    FOR SELECT USING (is_verified = true);

-- Submissions: Users can create, admins can read/update
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create submissions" ON submissions
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Submissions are viewable by admins only" ON submissions
    FOR SELECT USING (false); -- Change to auth check when auth is implemented

-- ============================================
-- SAMPLE DATA INSERTION (Optional)
-- ============================================

-- Insert sample trails (22 trails)
INSERT INTO trails (title, location, difficulty, difficulty_level, rig_requirements, onx_slug, coordinates, status, image_url, distance, time_estimate, description, terrain) VALUES
('Cleghorn Fire Road (2N47)', 'Cajon Pass / San Bernardino', 'Beginner', 'Easy to Moderate', 'Stock 4WD / High-Clearance Recommended', 'cleghorn-fire-road-2n47', '34.3031, -117.4524', 'Open', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80', '12 miles', '3-4 hours', 'Ridge run with incredible views. The main road is 2WD friendly; offshoots require 4x4. Perfect introduction to mountain wheeling with panoramic vistas of the Cajon Pass.', 'mountain'),
('Santiago Peak (Main Divide)', 'Cleveland National Forest', 'Advanced', 'Moderate to Advanced', 'Lifted / 33" Tires / Skid Plates', 'santiago-peak-main-divide', '33.7111, -117.5332', 'Seasonal', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', '18 miles', '5-6 hours', 'The highest point in Orange County. Rutted climbs and steep drop-offs. Epic panoramic views from the summit make the challenge worthwhile.', 'mountain'),
('Lytle Creek / Stockton Flats', 'Lytle Creek, CA', 'Beginner', 'Easy', 'Stock 4WD / All-Terrain Tires', 'stockton-flats', '34.2583, -117.5025', 'Open', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80', '10 miles', '2-3 hours', 'Perfect for a quick run. Light water crossings and shaded campsites along the creek. Great for families and beginner groups.', 'canyon');

-- Insert sample run (only verified run)
INSERT INTO runs (title, date, meetup_location, description, difficulty, max_rigs, rigs_joined, trail_id, is_verified, organizer_name, organizer_instagram) 
SELECT 
    '🌅 Sunset Ridge Run',
    '2026-03-28T16:00:00',
    'Cleghorn Trailhead',
    'Join us for a scenic evening run up Cleghorn Ridge. We''ll catch sunset at the overlook and have a group campfire at the top. Bring your own firewood and beverages.',
    'Beginner',
    15,
    7,
    id,
    true,
    'Noah',
    '@noah2131'
FROM trails WHERE onx_slug = 'cleghorn-fire-road-2n47';