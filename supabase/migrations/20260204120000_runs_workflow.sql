-- Runs: distinguish verified club-hosted listings vs community/user-submitted listings,
-- optional disclaimer acknowledgment timestamp for user-submitted runs.

ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS run_source text;

-- Backfill: runs tied to a club treated as club_official; standalone as user_submitted.
UPDATE public.runs
SET run_source = CASE WHEN club_id IS NOT NULL THEN 'club_official' ELSE 'user_submitted' END
WHERE run_source IS NULL;

ALTER TABLE public.runs ALTER COLUMN run_source SET DEFAULT 'user_submitted';

ALTER TABLE public.runs
  ALTER COLUMN run_source SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.runs ADD CONSTRAINT runs_run_source_check
    CHECK (run_source IN ('club_official', 'user_submitted'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.runs.run_source IS
  'club_official = posted by verified club leadership (listed as official). user_submitted = community listing with separate legal treatment.';

ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS host_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS user_acknowledged_disclaimer_at timestamptz;

COMMENT ON COLUMN public.runs.user_acknowledged_disclaimer_at IS
  'Set when the host accepts community-run disclaimer (user_submitted only).';
