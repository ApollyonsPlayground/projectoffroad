-- =============================================================================
-- 003_fix_schema.sql - Fix all schema issues for SoCal Offroaders PWA
-- Run this in Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ADD MISSING COLUMNS TO USERS TABLE
-- -----------------------------------------------------------------------------

-- Add role column (owner, admin, moderator, user)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
-- Add email column if missing
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;

-- -----------------------------------------------------------------------------
-- 2. FIX POSTS TABLE - Add missing columns
-- -----------------------------------------------------------------------------

-- The code uses 'body' but schema has 'caption' - add both for compatibility
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS rig_model TEXT;
-- Rename likes_count/comments_count if they exist differently
-- (handled by adding both variants)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS reposts_count INTEGER DEFAULT 0;

-- Update any NULL body values to use caption
UPDATE public.posts SET body = caption WHERE body IS NULL AND caption IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. CREATE COMMENTS TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  user_name TEXT,
  avatar_url TEXT,
  body TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read comments" ON public.comments;
CREATE POLICY "Anyone can read comments" ON public.comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can comment" ON public.comments;
CREATE POLICY "Authenticated users can comment" ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

-- Allow owners to delete any comment
DROP POLICY IF EXISTS "Owners can delete any comment" ON public.comments;
CREATE POLICY "Owners can delete any comment" ON public.comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Update comments_count trigger
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_change ON public.comments;
CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE public.update_post_comments_count();

-- -----------------------------------------------------------------------------
-- 4. CREATE COMMENT_LIKES TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read comment likes" ON public.comment_likes;
CREATE POLICY "Anyone can read comment likes" ON public.comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can like comments" ON public.comment_likes;
CREATE POLICY "Authenticated users can like comments" ON public.comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike comments" ON public.comment_likes;
CREATE POLICY "Users can unlike comments" ON public.comment_likes FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 5. CREATE REPOSTS TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reposts" ON public.reposts;
CREATE POLICY "Anyone can read reposts" ON public.reposts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can repost" ON public.reposts;
CREATE POLICY "Authenticated users can repost" ON public.reposts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unrepost" ON public.reposts;
CREATE POLICY "Users can unrepost" ON public.reposts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for reposts_count
CREATE OR REPLACE FUNCTION public.update_post_reposts_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET reposts_count = COALESCE(reposts_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET reposts_count = GREATEST(COALESCE(reposts_count, 0) - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_repost_change ON public.reposts;
CREATE TRIGGER on_repost_change
  AFTER INSERT OR DELETE ON public.reposts
  FOR EACH ROW EXECUTE PROCEDURE public.update_post_reposts_count();

-- -----------------------------------------------------------------------------
-- 6. CREATE TRAILS TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.trails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Moderate', 'Challenging', 'Extreme')),
  length_miles DECIMAL(5,2),
  location TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read trails" ON public.trails;
CREATE POLICY "Anyone can read trails" ON public.trails FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage trails" ON public.trails;
CREATE POLICY "Owners can manage trails" ON public.trails FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

-- -----------------------------------------------------------------------------
-- 7. CREATE TRAIL_SUGGESTIONS TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.trail_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trail_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trail_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can suggest trails" ON public.trail_suggestions;
CREATE POLICY "Authenticated users can suggest trails" ON public.trail_suggestions FOR INSERT
  WITH CHECK (auth.uid() = suggested_by);

DROP POLICY IF EXISTS "Owners can read all suggestions" ON public.trail_suggestions;
CREATE POLICY "Owners can read all suggestions" ON public.trail_suggestions FOR SELECT
  USING (
    auth.uid() = suggested_by OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

DROP POLICY IF EXISTS "Owners can update suggestions" ON public.trail_suggestions;
CREATE POLICY "Owners can update suggestions" ON public.trail_suggestions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

-- -----------------------------------------------------------------------------
-- 8. UPDATE RUNS TABLE - Add trail_id FK if trails table exists
-- -----------------------------------------------------------------------------

-- Ensure trail_id column exists
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS trail_id UUID;

-- Don't add FK constraint as trail_id might contain text IDs from legacy data

-- -----------------------------------------------------------------------------
-- 9. ROLE-BASED POLICIES FOR USERS TABLE
-- -----------------------------------------------------------------------------

-- Only owners can change roles
DROP POLICY IF EXISTS "Only owners can update roles" ON public.users;
CREATE POLICY "Only owners can update roles" ON public.users FOR UPDATE
  USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  )
  WITH CHECK (
    -- Non-owners can only update their own row and cannot change their role
    (auth.uid() = id AND (
      NEW.role IS NOT DISTINCT FROM OLD.role OR
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
    )) OR
    -- Owners can update anything
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

-- -----------------------------------------------------------------------------
-- 10. CREATE CONVERSATIONS TABLE (for DMs)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their conversations" ON public.conversations;
CREATE POLICY "Users can read their conversations" ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations" ON public.conversations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- 11. CREATE CONVERSATION_PARTICIPANTS TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their participation" ON public.conversation_participants;
CREATE POLICY "Users can read their participation" ON public.conversation_participants FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.conversation_participants cp 
    WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Authenticated users can add participants" ON public.conversation_participants;
CREATE POLICY "Authenticated users can add participants" ON public.conversation_participants FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own participation" ON public.conversation_participants;
CREATE POLICY "Users can update their own participation" ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 12. CREATE DIRECT_MESSAGES TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read messages in their conversations" ON public.direct_messages;
CREATE POLICY "Users can read messages in their conversations" ON public.direct_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_id = direct_messages.conversation_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.direct_messages;
CREATE POLICY "Users can send messages to their conversations" ON public.direct_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_id = direct_messages.conversation_id AND user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 13. ADD FK RELATIONSHIP BETWEEN RUNS AND TRAILS
-- -----------------------------------------------------------------------------

-- First, ensure trail_id is UUID type (it might be TEXT from legacy)
-- We'll add a new column if the existing one is wrong type
DO $$
BEGIN
  -- Check if runs.trail_id exists and is not UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'runs' AND column_name = 'trail_id' AND data_type != 'uuid'
  ) THEN
    -- Rename old column
    ALTER TABLE public.runs RENAME COLUMN trail_id TO trail_id_legacy;
    -- Add new UUID column
    ALTER TABLE public.runs ADD COLUMN trail_id UUID;
  END IF;
END $$;

-- Add FK constraint if not exists (will fail silently if already exists or data incompatible)
DO $$
BEGIN
  ALTER TABLE public.runs 
    ADD CONSTRAINT fk_runs_trail_id 
    FOREIGN KEY (trail_id) REFERENCES public.trails(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 14. CREATE INDEXES
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_reposts_post_id ON public.reposts(post_id);
CREATE INDEX IF NOT EXISTS idx_trails_name ON public.trails(name);
CREATE INDEX IF NOT EXISTS idx_trail_suggestions_status ON public.trail_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON public.direct_messages(conversation_id);

-- =============================================================================
-- DONE! After running this, set your user as owner:
-- UPDATE public.users SET role = 'owner' WHERE email = 'your-email@example.com';
-- Or by ID:
-- UPDATE public.users SET role = 'owner' WHERE id = '99402a05-42c1-47d1-978d-568b3c787b09';
-- =============================================================================
