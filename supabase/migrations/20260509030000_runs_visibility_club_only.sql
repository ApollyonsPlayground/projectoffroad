-- Club-only runs: keep private runs invisible outside approved members.

-- ── runs: visibility flag ────────────────────────────────────────────────────

ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

DO $$
BEGIN
  ALTER TABLE public.runs DROP CONSTRAINT runs_visibility_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.runs
  ADD CONSTRAINT runs_visibility_check
  CHECK (visibility IN ('public', 'club_only'));

COMMENT ON COLUMN public.runs.visibility IS
  'public = listed globally; club_only = visible only to approved members of runs.club_id';

CREATE INDEX IF NOT EXISTS idx_runs_club_visibility_date
  ON public.runs (club_id, visibility, date);

-- ── helper: approved membership check ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.club_is_approved_member(p_club_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_members m
    WHERE m.club_id = p_club_id
      AND m.user_id = p_user_id
      AND m.status = 'approved'
  )
  OR EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.owner_id = p_user_id
  );
$$;

-- ── runs: tighten select policy to prevent leaks ─────────────────────────────
-- Replace the broad policy that previously allowed USING(true).

ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "runs_select_public" ON public.runs;
CREATE POLICY "runs_select_public"
  ON public.runs FOR SELECT
  TO anon, authenticated
  USING (
    visibility = 'public'
    OR (
      visibility = 'club_only'
      AND auth.uid() IS NOT NULL
      AND club_id IS NOT NULL
      AND public.club_is_approved_member(club_id, auth.uid())
    )
  );

