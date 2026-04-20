-- SoCal Offroaders App Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  experience_level TEXT DEFAULT 'Beginner' CHECK (experience_level IN ('Beginner', 'Intermediate', 'Expert')),
  location TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- VEHICLES TABLE
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  modifications TEXT,
  photo_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CLUBS TABLE
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo TEXT,
  description TEXT,
  location TEXT,
  website TEXT,
  instagram TEXT,
  verified BOOLEAN DEFAULT false,
  premium BOOLEAN DEFAULT false,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CLUB MEMBERS TABLE
CREATE TABLE club_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);

-- RUNS TABLE
CREATE TABLE runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  trail_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  meetup_location TEXT,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Moderate', 'Challenging', 'Extreme')),
  max_participants INTEGER DEFAULT 20,
  vehicle_requirements TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RUN PARTICIPANTS TABLE
CREATE TABLE run_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rsvp_status TEXT DEFAULT 'going' CHECK (rsvp_status IN ('going', 'maybe', 'not_going')),
  location_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(run_id, user_id)
);

-- MESSAGES (Run Chat) TABLE
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CLUB MESSAGES TABLE
CREATE TABLE club_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FOLLOWS TABLE
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- ACHIEVEMENTS TABLE
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  requirement INTEGER
);

-- USER ACHIEVEMENTS TABLE
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id),
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- REVIEWS TABLE
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trail_id TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SUBSCRIPTIONS TABLE (Premium Clubs)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  status TEXT DEFAULT 'active',
  plan TEXT DEFAULT 'basic',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USER LOCATIONS (Live GPS during runs)
CREATE TABLE user_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(5, 2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- VOICE SESSIONS (Voice chat rooms)
CREATE TABLE voice_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  provider TEXT DEFAULT 'livekit', -- livekit, daily, etc.
  active BOOLEAN DEFAULT true,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- SOS ALERTS (Emergency alerts during runs)
CREATE TABLE sos_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  message TEXT,
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic - can be expanded)
CREATE POLICY "Users can read all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Anyone can create users" ON users FOR INSERT WITH CHECK (true);

CREATE POLICY "Vehicles are viewable by everyone" ON vehicles FOR SELECT USING (true);
CREATE POLICY "Users can manage own vehicles" ON vehicles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Clubs are viewable by everyone" ON clubs FOR SELECT USING (true);
CREATE POLICY "Club owners can update their club" ON clubs FOR UPDATE USING (auth.uid() = owner_id);

-- Create default achievements
INSERT INTO achievements (name, description, icon) VALUES
  ('First Run', 'Attended your first run', '🏁'),
  ('Trail Blazer', 'Completed 10 trails', '🥾'),
  ('Social Butterfly', 'Added 10 friends', '🦋'),
  ('Club Founder', 'Created a club', '🏠'),
  ('Offroad Veteran', 'Attended 50 runs', '🎖️'),
  ('Wheelin Master', 'Completed an extreme run', '🚙'),
  ('Lifesaver', 'Sent an SOS alert that helped someone', '🆘'),
  ('Voice Commander', 'Used voice chat during a run', '🎙️');


-- Add status column to runs for run lifecycle
ALTER TABLE runs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled'));

-- Create indexes for performance
CREATE INDEX idx_runs_date ON runs(date);
CREATE INDEX idx_runs_club ON runs(club_id);
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_messages_run ON messages(run_id);
CREATE INDEX idx_club_members_user ON club_members(user_id);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_user_locations_run ON user_locations(run_id);
CREATE INDEX idx_user_locations_updated ON user_locations(updated_at);
CREATE INDEX idx_sos_alerts_run ON sos_alerts(run_id);
