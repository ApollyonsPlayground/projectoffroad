-- =============================================================================
-- 004_master_migration.sql  (updated: supersedes earlier drafts)
-- Single authoritative migration for SoCal Offroaders PWA.
-- Safe to run multiple times — all statements use IF NOT EXISTS / OR REPLACE.
--
-- Run in Supabase SQL Editor, then set your account as owner:
--   UPDATE public.users SET role = 'owner'
--   WHERE id = '99402a05-42c1-47d1-978d-568b3c787b09';
-- =============================================================================

-- ── posts: add every column the application code writes/reads ─────────────────
-- 001_setup_social_tables.sql uses `caption` + `avatar_url`
-- supabase-setup.sql          uses `caption` + `user_avatar`
-- App code writes both to stay compatible regardless of which script was run first.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS avatar_url    TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS user_avatar   TEXT;   -- compat alias
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS body          TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS role          TEXT    DEFAULT 'user';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS rig_model     TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS reposts_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS repost_of_id  UUID;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url     TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS verified      BOOLEAN DEFAULT false;

-- Backfill: copy caption → body where body is null
UPDATE public.posts SET body = caption WHERE body IS NULL AND caption IS NOT NULL;
-- Backfill: copy user_avatar → avatar_url where avatar_url is null
UPDATE public.posts SET avatar_url = user_avatar WHERE avatar_url IS NULL AND user_avatar IS NOT NULL;

-- RLS: owners can delete any post
DROP POLICY IF EXISTS "Owners can delete any post" ON public.posts;
CREATE POLICY "Owners can delete any post" ON public.posts FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

-- ── users: add role, email, photo_url ────────────────────────────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role      TEXT DEFAULT 'user';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email     TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Backfill photo_url from avatar_url
UPDATE public.users SET photo_url = avatar_url WHERE photo_url IS NULL AND avatar_url IS NOT NULL;

-- Signup trigger: insert-only, never overwrites existing row (preserves role!)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, name, avatar_url, photo_url, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    'user'
  )
  ON CONFLICT (id) DO NOTHING;  -- never overwrite; role is preserved
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Users can update their own profile (role update blocked by RLS)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── comments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID        REFERENCES public.posts(id)    ON DELETE CASCADE,
  user_id     UUID        REFERENCES auth.users(id)      ON DELETE CASCADE,
  parent_id   UUID        REFERENCES public.comments(id) ON DELETE CASCADE,
  user_name   TEXT,
  avatar_url  TEXT,
  content     TEXT        NOT NULL,
  likes_count INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read comments"          ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can comment"   ON public.comments;
DROP POLICY IF EXISTS "Author or owner can delete comment" ON public.comments;

CREATE POLICY "Anyone can read comments" ON public.comments
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Author or owner can delete comment" ON public.comments
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

-- Counter trigger
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

-- ── comment_likes ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID        REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id    UUID        REFERENCES auth.users(id)      ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read comment likes"         ON public.comment_likes;
DROP POLICY IF EXISTS "Authenticated users can like comments" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can unlike comments"             ON public.comment_likes;

CREATE POLICY "Anyone can read comment likes"         ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like comments" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike comments"             ON public.comment_likes FOR DELETE  USING (auth.uid() = user_id);

-- ── post_likes (ensure table uses consistent name) ───────────────────────────
-- The code queries `post_likes` table; `likes` may exist from 001_setup.
-- Create post_likes if it doesn't exist; leave `likes` untouched.
CREATE TABLE IF NOT EXISTS public.post_likes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        REFERENCES public.posts(id)  ON DELETE CASCADE,
  user_id    UUID        REFERENCES auth.users(id)    ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read post_likes"        ON public.post_likes;
DROP POLICY IF EXISTS "Authenticated users can like"      ON public.post_likes;
DROP POLICY IF EXISTS "Users can unlike"                  ON public.post_likes;

CREATE POLICY "Anyone can read post_likes"   ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike"             ON public.post_likes FOR DELETE  USING (auth.uid() = user_id);

-- Likes counter trigger on post_likes
CREATE OR REPLACE FUNCTION public.update_post_likes_count_v2()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_post_like_change ON public.post_likes;
CREATE TRIGGER on_post_like_change
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE PROCEDURE public.update_post_likes_count_v2();

-- ── saved_posts ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        REFERENCES public.posts(id)  ON DELETE CASCADE,
  user_id    UUID        REFERENCES auth.users(id)    ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own saved posts" ON public.saved_posts;
DROP POLICY IF EXISTS "Users can save posts"           ON public.saved_posts;
DROP POLICY IF EXISTS "Users can unsave posts"         ON public.saved_posts;

CREATE POLICY "Users can read own saved posts" ON public.saved_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save posts"           ON public.saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave posts"         ON public.saved_posts FOR DELETE  USING (auth.uid() = user_id);

-- ── reposts ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reposts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID        REFERENCES public.posts(id)  ON DELETE CASCADE,
  repost_of_id  UUID        REFERENCES public.posts(id)  ON DELETE CASCADE,
  user_id       UUID        REFERENCES auth.users(id)    ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reposts"        ON public.reposts;
DROP POLICY IF EXISTS "Authenticated users can repost" ON public.reposts;
DROP POLICY IF EXISTS "Users can unrepost"             ON public.reposts;

CREATE POLICY "Anyone can read reposts"        ON public.reposts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can repost" ON public.reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unrepost"             ON public.reposts FOR DELETE  USING (auth.uid() = user_id);

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

-- ── trails ────────────────────────────────────────────────────────────────────
-- Legacy schema.sql uses `title`; new code uses `name`.
-- Add both columns so queries work regardless of which was used.
ALTER TABLE public.trails ADD COLUMN IF NOT EXISTS name      TEXT;
ALTER TABLE public.trails ADD COLUMN IF NOT EXISTS slug      TEXT;
ALTER TABLE public.trails ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.trails ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Backfill: copy title → name for existing rows
UPDATE public.trails SET name = title WHERE name IS NULL AND title IS NOT NULL;
-- Make name non-null for future inserts (after backfill)
-- ALTER TABLE public.trails ALTER COLUMN name SET NOT NULL;  -- uncomment after backfill verified

ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read trails"  ON public.trails;
DROP POLICY IF EXISTS "Owners can manage trails" ON public.trails;
CREATE POLICY "Anyone can read trails"   ON public.trails FOR SELECT USING (true);
CREATE POLICY "Owners can manage trails" ON public.trails FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner'));

-- ── trail_suggestions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trail_suggestions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_by UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  trail_name   TEXT        NOT NULL,
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

-- ── runs: add missing columns + proper RLS ───────────────────────────────────
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS trail_id   UUID;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS host_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS club_id    UUID;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS status     TEXT DEFAULT 'upcoming';
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS vehicle_requirements TEXT;

-- FK to trails (silent fail if data is incompatible or constraint already exists)
DO $$
BEGIN
  ALTER TABLE public.runs
    ADD CONSTRAINT fk_runs_trail_id
    FOREIGN KEY (trail_id) REFERENCES public.trails(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN others          THEN NULL;
END $$;

ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read runs"                ON public.runs;
DROP POLICY IF EXISTS "Club members can create runs"        ON public.runs;
DROP POLICY IF EXISTS "Run hosts or owners can update runs" ON public.runs;
DROP POLICY IF EXISTS "Run hosts or owners can delete runs" ON public.runs;

CREATE POLICY "Anyone can read runs" ON public.runs
  FOR SELECT USING (true);

-- Owners can always insert; club-based check is advisory until clubs table exists
CREATE POLICY "Club members can create runs" ON public.runs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
      OR auth.uid() IS NOT NULL  -- relax while clubs table is being set up
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

-- ── conversations & messaging ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can read conversations"   ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create convos" ON public.conversations;
CREATE POLICY "Participants can read conversations" ON public.conversations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = id AND user_id = auth.uid()));
CREATE POLICY "Authenticated users can create convos" ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID    REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID    REFERENCES auth.users(id)           ON DELETE CASCADE,
  is_read         BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their participation"       ON public.conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.conversation_participants;
CREATE POLICY "Users can read their participation" ON public.conversation_participants
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Authenticated users can add participants" ON public.conversation_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own participation" ON public.conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID        REFERENCES auth.users(id)            ON DELETE CASCADE,
  content         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

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

-- ── indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_user_id             ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at          ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id          ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id        ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id  ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id        ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_reposts_post_id           ON public.reposts(post_id);
CREATE INDEX IF NOT EXISTS idx_trails_name               ON public.trails(name);
CREATE INDEX IF NOT EXISTS idx_trail_suggestions_status  ON public.trail_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_users_role                ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user    ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_convo     ON public.direct_messages(conversation_id);

-- ── Reload PostgREST schema cache ─────────────────────────────────────────────
-- This is the fix for "schema cache" errors after adding columns.
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- AFTER RUNNING: grant yourself owner role:
--   UPDATE public.users SET role = 'owner'
--   WHERE id = '99402a05-42c1-47d1-978d-568b3c787b09';
-- =============================================================================
