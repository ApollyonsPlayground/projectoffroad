-- =============================================================================
-- 004_master_migration.sql
-- Single authoritative migration for SoCal Offroaders PWA.
-- Safe to run multiple times (all statements use IF NOT EXISTS / OR REPLACE).
-- Run this in your Supabase SQL Editor, then execute the SET OWNER line below.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- POSTS — add missing columns that the code expects
-- ---------------------------------------------------------------------------
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS body        TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS role        TEXT DEFAULT 'user';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS rig_model   TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS reposts_count INTEGER DEFAULT 0;

-- Backfill body from caption where body is null
UPDATE public.posts SET body = caption WHERE body IS NULL AND caption IS NOT NULL;

-- Allow owners/admins to delete any post
DROP POLICY IF EXISTS "Owners can delete any post" ON public.posts;
CREATE POLICY "Owners can delete any post" ON public.posts FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

-- ---------------------------------------------------------------------------
-- USERS — add missing columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role  TEXT DEFAULT 'user';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;

-- Fix trigger so new signups get role = 'user' (not NULL)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, name, avatar_url, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    'user'
  )
  ON CONFLICT (id) DO NOTHING;   -- never overwrite existing row (preserves role!)
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RLS: users can update their own row; owners can update any row
DROP POLICY IF EXISTS "Users can update own profile"      ON public.users;
DROP POLICY IF EXISTS "Only owners can update roles"      ON public.users;

CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- COMMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID        REFERENCES public.posts(id)     ON DELETE CASCADE,
  user_id     UUID        REFERENCES auth.users(id)       ON DELETE CASCADE,
  parent_id   UUID        REFERENCES public.comments(id)  ON DELETE CASCADE,
  user_name   TEXT,
  avatar_url  TEXT,
  content     TEXT        NOT NULL,   -- code references "content" not "body"
  body        TEXT,                   -- alias kept for backward compat; code maps c.content
  likes_count INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read comments"        ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can comment" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments"   ON public.comments;
DROP POLICY IF EXISTS "Owners can delete any comment"   ON public.comments;

CREATE POLICY "Anyone can read comments" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Single DELETE policy covering both author and owner
CREATE POLICY "Author or owner can delete comment" ON public.comments
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

-- Keep comments_count in sync
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

-- ---------------------------------------------------------------------------
-- COMMENT_LIKES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID        REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id    UUID        REFERENCES auth.users(id)      ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read comment likes"          ON public.comment_likes;
DROP POLICY IF EXISTS "Authenticated users can like comments"  ON public.comment_likes;
DROP POLICY IF EXISTS "Users can unlike comments"              ON public.comment_likes;

CREATE POLICY "Anyone can read comment likes"         ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like comments" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike comments"             ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- REPOSTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reposts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        REFERENCES public.posts(id)  ON DELETE CASCADE,
  user_id    UUID        REFERENCES auth.users(id)    ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reposts"          ON public.reposts;
DROP POLICY IF EXISTS "Authenticated users can repost"   ON public.reposts;
DROP POLICY IF EXISTS "Users can unrepost"               ON public.reposts;

CREATE POLICY "Anyone can read reposts"         ON public.reposts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can repost"  ON public.reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unrepost"              ON public.reposts FOR DELETE  USING (auth.uid() = user_id);

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

-- ---------------------------------------------------------------------------
-- TRAILS — column is "name" (not "title")
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trails (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,          -- <-- "name", not "title"
  slug         TEXT        UNIQUE,
  description  TEXT,
  difficulty   TEXT        CHECK (difficulty IN ('Easy','Moderate','Challenging','Extreme')),
  length_miles DECIMAL(5,2),
  location     TEXT,
  latitude     DECIMAL(10,8),
  longitude    DECIMAL(11,8),
  photo_url    TEXT,
  is_active    BOOLEAN     DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read trails"  ON public.trails;
DROP POLICY IF EXISTS "Owners can manage trails" ON public.trails;

CREATE POLICY "Anyone can read trails" ON public.trails FOR SELECT USING (true);
CREATE POLICY "Owners can manage trails" ON public.trails FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner'));

-- ---------------------------------------------------------------------------
-- TRAIL_SUGGESTIONS — column is "trail_name" (not "name")
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trail_suggestions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_by UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  trail_name   TEXT        NOT NULL,   -- <-- "trail_name", not "name"
  status       TEXT        DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes  TEXT,
  reviewed_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trail_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can suggest trails" ON public.trail_suggestions;
DROP POLICY IF EXISTS "Owners can read all suggestions"        ON public.trail_suggestions;
DROP POLICY IF EXISTS "Owners can update suggestions"          ON public.trail_suggestions;

CREATE POLICY "Authenticated users can suggest trails" ON public.trail_suggestions
  FOR INSERT WITH CHECK (auth.uid() = suggested_by);

CREATE POLICY "Owners can read all suggestions" ON public.trail_suggestions
  FOR SELECT USING (
    auth.uid() = suggested_by OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Owners can update suggestions" ON public.trail_suggestions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

-- ---------------------------------------------------------------------------
-- RUNS — add trail_id and proper RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS trail_id UUID;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS host_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- FK to trails (silent fail if data is incompatible)
DO $$
BEGIN
  ALTER TABLE public.runs
    ADD CONSTRAINT fk_runs_trail_id
    FOREIGN KEY (trail_id) REFERENCES public.trails(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN others          THEN NULL;
END $$;

-- RLS for runs: insert requires membership in a verified club
DROP POLICY IF EXISTS "Anyone can read runs"                    ON public.runs;
DROP POLICY IF EXISTS "Club members can create runs"            ON public.runs;
DROP POLICY IF EXISTS "Run hosts can update runs"               ON public.runs;
DROP POLICY IF EXISTS "Run hosts or owners can delete runs"     ON public.runs;

ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read runs" ON public.runs
  FOR SELECT USING (true);

CREATE POLICY "Club members can create runs" ON public.runs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      -- host must be owner/admin/leader of the club
      EXISTS (
        SELECT 1 FROM public.club_members cm
        JOIN public.clubs c ON c.id = cm.club_id
        WHERE cm.user_id = auth.uid()
          AND cm.club_id = club_id
          AND cm.role IN ('owner','admin','leader')
          AND c.is_verified = true
      )
      OR
      -- site owners can always create runs
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
    )
  );

CREATE POLICY "Run hosts or owners can update runs" ON public.runs
  FOR UPDATE USING (
    auth.uid() = host_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Run hosts or owners can delete runs" ON public.runs
  FOR DELETE USING (
    auth.uid() = host_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

-- ---------------------------------------------------------------------------
-- CONVERSATIONS & PARTICIPANTS & DIRECT_MESSAGES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES auth.users(id)            ON DELETE CASCADE,
  is_read         BOOLEAN     DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID        REFERENCES auth.users(id)            ON DELETE CASCADE,
  content         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: participant can read
DROP POLICY IF EXISTS "Participants can read conversations"   ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create convos" ON public.conversations;
CREATE POLICY "Participants can read conversations" ON public.conversations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = id AND user_id = auth.uid()));
CREATE POLICY "Authenticated users can create convos" ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Participants
DROP POLICY IF EXISTS "Users can read their participation"    ON public.conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.conversation_participants;
CREATE POLICY "Users can read their participation" ON public.conversation_participants
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.conversation_participants cp2
    WHERE cp2.conversation_id = conversation_id AND cp2.user_id = auth.uid()
  ));
CREATE POLICY "Authenticated users can add participants" ON public.conversation_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own participation" ON public.conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Direct messages
DROP POLICY IF EXISTS "Users can read messages in their conversations" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.direct_messages;
CREATE POLICY "Users can read messages in their conversations" ON public.direct_messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = direct_messages.conversation_id AND user_id = auth.uid()
  ));
CREATE POLICY "Users can send messages to their conversations" ON public.direct_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = direct_messages.conversation_id AND user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_comments_post_id          ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id        ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id  ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_reposts_post_id           ON public.reposts(post_id);
CREATE INDEX IF NOT EXISTS idx_trails_name               ON public.trails(name);
CREATE INDEX IF NOT EXISTS idx_trail_suggestions_status  ON public.trail_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_users_role                ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_convo     ON public.direct_messages(conversation_id);

-- =============================================================================
-- AFTER RUNNING: set yourself as owner
-- UPDATE public.users SET role = 'owner' WHERE id = '99402a05-42c1-47d1-978d-568b3c787b09';
-- =============================================================================
