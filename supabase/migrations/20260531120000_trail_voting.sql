-- Community trail voting: 14-day blind vote for upcoming run trail selection.

-- ── voting_events ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.voting_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT voting_events_status_check
    CHECK (status IN ('draft', 'active', 'closed')),
  CONSTRAINT voting_events_ends_after_start_check
    CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_voting_events_status ON public.voting_events (status);
CREATE INDEX IF NOT EXISTS idx_voting_events_starts_at ON public.voting_events (starts_at);
CREATE INDEX IF NOT EXISTS idx_voting_events_ends_at ON public.voting_events (ends_at);

COMMENT ON TABLE public.voting_events IS
  'Time-boxed community votes (e.g. pick trail for next group run). Staff sets starts_at/ends_at and flips status to active.';

-- ── trail_options ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.trail_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voting_event_id uuid NOT NULL REFERENCES public.voting_events (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  difficulty text NOT NULL,
  trail_id text,
  image_url text,
  is_night_run boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trail_options_event_sort_unique UNIQUE (voting_event_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_trail_options_event ON public.trail_options (voting_event_id);

-- ── votes ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voting_event_id uuid NOT NULL REFERENCES public.voting_events (id) ON DELETE CASCADE,
  trail_option_id uuid NOT NULL REFERENCES public.trail_options (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT votes_one_per_user_per_event UNIQUE (voting_event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_event ON public.votes (voting_event_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON public.votes (user_id);

-- ── staff helper ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_voting_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND lower(coalesce(u.role::text, '')) IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_voting_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_voting_staff() TO authenticated;

-- ── blind results (only after ends_at or status closed) ──────────────────────

CREATE OR REPLACE FUNCTION public.get_voting_results(p_event_id uuid)
RETURNS TABLE (
  option_id uuid,
  title text,
  vote_count bigint,
  is_winner boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH event_row AS (
    SELECT e.id, e.ends_at, e.status
    FROM public.voting_events e
    WHERE e.id = p_event_id
  ),
  allowed AS (
    SELECT 1
    FROM event_row er
    WHERE er.status = 'closed'
       OR (er.status = 'active' AND now() >= er.ends_at)
  ),
  counts AS (
    SELECT
      o.id AS option_id,
      o.title,
      count(v.id)::bigint AS vote_count
    FROM public.trail_options o
    LEFT JOIN public.votes v ON v.trail_option_id = o.id
    WHERE o.voting_event_id = p_event_id
      AND EXISTS (SELECT 1 FROM allowed)
    GROUP BY o.id, o.title, o.sort_order
    ORDER BY o.sort_order ASC
  ),
  max_count AS (
    SELECT max(c.vote_count) AS top FROM counts c
  )
  SELECT
    c.option_id,
    c.title,
    c.vote_count,
    (c.vote_count = mc.top AND mc.top > 0) AS is_winner
  FROM counts c
  CROSS JOIN max_count mc;
$$;

REVOKE ALL ON FUNCTION public.get_voting_results(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_voting_results(uuid) TO anon, authenticated;

-- ── RLS: voting_events ───────────────────────────────────────────────────────

ALTER TABLE public.voting_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voting_events_select_public" ON public.voting_events;
CREATE POLICY "voting_events_select_public"
  ON public.voting_events FOR SELECT TO anon, authenticated
  USING (status IN ('draft', 'active', 'closed'));

DROP POLICY IF EXISTS "voting_events_insert_staff" ON public.voting_events;
CREATE POLICY "voting_events_insert_staff"
  ON public.voting_events FOR INSERT TO authenticated
  WITH CHECK (public.is_voting_staff());

DROP POLICY IF EXISTS "voting_events_update_staff" ON public.voting_events;
CREATE POLICY "voting_events_update_staff"
  ON public.voting_events FOR UPDATE TO authenticated
  USING (public.is_voting_staff())
  WITH CHECK (public.is_voting_staff());

DROP POLICY IF EXISTS "voting_events_delete_staff" ON public.voting_events;
CREATE POLICY "voting_events_delete_staff"
  ON public.voting_events FOR DELETE TO authenticated
  USING (public.is_voting_staff());

-- ── RLS: trail_options ───────────────────────────────────────────────────────

ALTER TABLE public.trail_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trail_options_select_public" ON public.trail_options;
CREATE POLICY "trail_options_select_public"
  ON public.trail_options FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.voting_events e
      WHERE e.id = trail_options.voting_event_id
        AND e.status IN ('draft', 'active', 'closed')
    )
  );

DROP POLICY IF EXISTS "trail_options_insert_staff" ON public.trail_options;
CREATE POLICY "trail_options_insert_staff"
  ON public.trail_options FOR INSERT TO authenticated
  WITH CHECK (public.is_voting_staff());

DROP POLICY IF EXISTS "trail_options_update_staff" ON public.trail_options;
CREATE POLICY "trail_options_update_staff"
  ON public.trail_options FOR UPDATE TO authenticated
  USING (public.is_voting_staff())
  WITH CHECK (public.is_voting_staff());

DROP POLICY IF EXISTS "trail_options_delete_staff" ON public.trail_options;
CREATE POLICY "trail_options_delete_staff"
  ON public.trail_options FOR DELETE TO authenticated
  USING (public.is_voting_staff());

-- ── RLS: votes (blind — own row only; insert during active window) ─────────

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "votes_select_own" ON public.votes;
CREATE POLICY "votes_select_own"
  ON public.votes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "votes_insert_own_active" ON public.votes;
CREATE POLICY "votes_insert_own_active"
  ON public.votes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.voting_events e
      WHERE e.id = votes.voting_event_id
        AND e.status = 'active'
        AND now() >= e.starts_at
        AND now() < e.ends_at
    )
    AND EXISTS (
      SELECT 1
      FROM public.trail_options o
      WHERE o.id = votes.trail_option_id
        AND o.voting_event_id = votes.voting_event_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.votes v2
      WHERE v2.voting_event_id = votes.voting_event_id
        AND v2.user_id = auth.uid()
    )
  );

-- ── seed: first community run vote (draft — staff activates before launch) ───

DO $$
DECLARE
  v_event_id uuid;
  v_starts timestamptz := '2026-06-15 12:00:00+00';
  v_ends timestamptz := v_starts + interval '14 days';
BEGIN
  IF EXISTS (SELECT 1 FROM public.voting_events LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.voting_events (title, description, starts_at, ends_at, status)
  VALUES (
    'Community Run — Trail Vote',
    'Help pick the trail for our next big group run. Voting is blind — the winner is revealed when the 14-day timer ends.',
    v_starts,
    v_ends,
    'draft'
  )
  RETURNING id INTO v_event_id;

  INSERT INTO public.trail_options (
    voting_event_id, title, description, difficulty, trail_id, image_url, is_night_run, sort_order
  ) VALUES
  (
    v_event_id,
    'Lytle Creek',
    'Perfect for a quick run. Light water crossings and shaded campsites along the creek. Great for families and beginner groups looking to practice water crossing techniques.',
    'Beginner',
    'lytle-creek',
    'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&q=80',
    false,
    1
  ),
  (
    v_event_id,
    'Lytle Creek (Night Run)',
    'Perfect for a quick run. Light water crossings and shaded campsites along the creek. Great for families and beginner groups. Night run: headlights required, reduced visibility, and a slower pace with spotter support.',
    'Moderate',
    'lytle-creek',
    'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&q=80',
    true,
    2
  ),
  (
    v_event_id,
    'Cleghorn',
    'Ridge run with incredible views. The main road is 2WD friendly; offshoots require 4x4. Perfect introduction to mountain wheeling with panoramic vistas of the Cajon Pass.',
    'Beginner',
    'cleghorn-2n47',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
    false,
    3
  ),
  (
    v_event_id,
    'Cleghorn (Night Run)',
    'Ridge run with incredible views. The main road is 2WD friendly; offshoots require 4x4. Night run: catch sunset at the overlook, headlights required on technical sections, and a group campfire at the top.',
    'Moderate',
    'cleghorn-2n47',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
    true,
    4
  );
END $$;
