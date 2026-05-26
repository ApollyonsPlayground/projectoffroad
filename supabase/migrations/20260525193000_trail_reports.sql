-- Structured trail condition reports with optional completed-run context.

CREATE TABLE IF NOT EXISTS public.trail_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id text NOT NULL,
  run_id uuid REFERENCES public.runs (id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  condition_status text NOT NULL DEFAULT 'unknown',
  difficulty_today text NOT NULL DEFAULT 'unknown',
  surface_conditions text[] NOT NULL DEFAULT '{}',
  hazards text[] NOT NULL DEFAULT '{}',
  hazards_note text,
  weather text,
  body text NOT NULL CHECK (char_length(trim(body)) >= 1 AND char_length(body) <= 4000),
  photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  feed_post_id uuid REFERENCES public.posts (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trail_reports_condition_status_check
    CHECK (condition_status IN ('open', 'limited', 'closed', 'unknown')),
  CONSTRAINT trail_reports_difficulty_today_check
    CHECK (difficulty_today IN ('easy', 'moderate', 'hard', 'extreme', 'unknown')),
  CONSTRAINT trail_reports_photo_urls_array_check
    CHECK (jsonb_typeof(photo_urls) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_trail_reports_trail_created
  ON public.trail_reports (trail_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trail_reports_run
  ON public.trail_reports (run_id, created_at DESC)
  WHERE run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trail_reports_user
  ON public.trail_reports (user_id, created_at DESC);

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS trail_report_id uuid REFERENCES public.trail_reports (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trail_id text;

CREATE INDEX IF NOT EXISTS idx_posts_trail_report_id
  ON public.posts (trail_report_id)
  WHERE trail_report_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_trail_id
  ON public.posts (trail_id)
  WHERE trail_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.trail_reports_touch_updated()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_trail_reports_updated ON public.trail_reports;
CREATE TRIGGER tr_trail_reports_updated
  BEFORE UPDATE ON public.trail_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.trail_reports_touch_updated();

ALTER TABLE public.trail_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trail_reports_select_public" ON public.trail_reports;
CREATE POLICY "trail_reports_select_public"
  ON public.trail_reports FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "trail_reports_insert_authenticated" ON public.trail_reports;
CREATE POLICY "trail_reports_insert_authenticated"
  ON public.trail_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.trails t
      WHERE t.id::text = trail_reports.trail_id
    )
    AND (
      (
        run_id IS NULL
      )
      OR (
        EXISTS (
          SELECT 1 FROM public.runs r
          WHERE r.id = trail_reports.run_id
            AND r.status = 'completed'
            AND r.trail_id::text = trail_reports.trail_id
            AND (
              r.host_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.run_participants rp
                WHERE rp.run_id = r.id
                  AND rp.user_id = auth.uid()
              )
            )
        )
      )
    )
  );

DROP POLICY IF EXISTS "trail_reports_update_own" ON public.trail_reports;
CREATE POLICY "trail_reports_update_own"
  ON public.trail_reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "trail_reports_delete_own" ON public.trail_reports;
CREATE POLICY "trail_reports_delete_own"
  ON public.trail_reports FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.trail_reports IS
  'Structured trail condition reports, either general community reports or linked to completed runs.';
