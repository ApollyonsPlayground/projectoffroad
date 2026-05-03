# SYSTEM_CONTEXT.md

**Read this file at the start of every new session.**

---

## Project: Project Offroad PWA

Off-road social media app. Instagram-style feed for rig posts, trail listings, clubs, and runs.

---

## Supabase Database Schema

### Tables

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  experience_level TEXT CHECK (experience_level IN ('Beginner', 'Intermediate', 'Expert')),
  location TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER,
  make TEXT,
  model TEXT,
  modifications TEXT,
  photo_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts table (rig feed)
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT,
  caption TEXT,
  rig_specs JSONB DEFAULT '{}',
  location TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clubs table
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo TEXT,
  description TEXT,
  location TEXT,
  website TEXT,
  instagram TEXT,
  verified BOOLEAN DEFAULT false,
  premium BOOLEAN DEFAULT false,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Club members
CREATE TABLE club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Runs table
CREATE TABLE runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  trail_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE,
  meetup_location TEXT,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Moderate', 'Challenging', 'Extreme')),
  max_participants INTEGER DEFAULT 10,
  vehicle_requirements TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Run participants
CREATE TABLE run_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rsvp_status TEXT DEFAULT 'going' CHECK (rsvp_status IN ('going', 'maybe', 'not_going')),
  location_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follows (user to user)
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);
```

### Key Column Names (ACTUAL)

| AI Guesses | Actual Column |
|------------|---------------|
| `user_name` | N/A - use `users(id)` relation |
| `full_name` | `name` in users table |
| `profile_pic` | `avatar_url` |
| `rig_specs->vehicle` | `rig_specs->>vehicle` (text in JSONB) |

---

## Tailwind Color Palette

```javascript
// Custom colors in tailwind.config.js
colors: {
  'muted-gold': '#a89f6d',  // Primary accent
  'moss': '#4a5d23',        // Secondary accent / green
}

// Background
bg-[#050705]  // Near-black dark background

// Semantic classes
text-muted-gold    // Gold text
bg-muted-gold      // Gold buttons
text-moss          // Green text
bg-moss            // Green backgrounds
```

---

## File Structure

```
projectoffroad/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Home feed (rigs/trails toggle)
│   │   ├── posts/
│   │   │   └── create/         # Create post page
│   │   ├── clubs/              # Clubs pages
│   │   └── settings/           # Settings page
│   ├── components/             # React components
│   │   ├── LeftNav.tsx         # Navigation sidebar
│   │   ├── RightSidebar.tsx    # Right sidebar
│   │   ├── RigPost.tsx         # Individual post card
│   │   ├── FeaturedRigs.tsx    # Featured rigs grid
│   │   ├── TrailCard.tsx       # Trail display card
│   │   └── DisclaimerModal.tsx # Off-road warning
│   ├── lib/
│   │   └── db/
│   │       └── supabase.ts     # Supabase client + types
│   ├── data/
│   │   └── trails.json         # Static trail data
│   └── styles/
│       └── globals.css
├── public/                     # Static assets
├── supabase/                   # migrations/
├── package.json
├── next.config.ts
└── tailwind.config.js
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
```

---

## Key Notes

1. **No mock data** — Always query Supabase, show empty state if empty
2. **Dark mode** — Background is `#050705`, use `text-neutral-100` for primary, `text-neutral-300` for secondary
3. **Touch targets** — 44px minimum for mobile (Capacitor APK)
4. **RLS** — All writes must verify user ownership

---

*Last updated: 2026-04-23*