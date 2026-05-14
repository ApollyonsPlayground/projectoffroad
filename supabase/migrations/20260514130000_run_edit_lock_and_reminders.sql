-- Lock run detail edits within 24h of scheduled start (status workflow updates still allowed).
-- Run reminder delivery log for server-side 72h / 48h / 24h notifications (cron + future push).
-- Per-user preference for time-based run reminders.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notify_run_time_reminders boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.users.notify_run_time_reminders IS
  'When true, user may receive scheduled reminders before runs they host or join (app + future push).';

CREATE TABLE IF NOT EXISTS public.run_reminder_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.runs (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  bucket text NOT NULL CHECK (bucket IN ('72h', '48h', '24h')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, user_id, bucket)
);

CREATE INDEX IF NOT EXISTS idx_run_reminder_deliveries_run ON public.run_reminder_deliveries (run_id);
CREATE INDEX IF NOT EXISTS idx_run_reminder_deliveries_user ON public.run_reminder_deliveries (user_id);

ALTER TABLE public.run_reminder_deliveries ENABLE ROW LEVEL SECURITY;

-- No client policies: rows are written by service role (cron). Authenticated users have no direct access.

CREATE OR REPLACE FUNCTION public.runs_enforce_edit_lock_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND lower(coalesce(u.role::text, '')) IN ('owner', 'admin')
  )
  INTO is_admin;

  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF old.status IN ('completed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  -- Allow lifecycle transitions without unlocking arbitrary field edits.
  IF new.status IS DISTINCT FROM old.status AND new.status IN ('completed', 'cancelled', 'active') THEN
    RETURN NEW;
  END IF;

  -- Postpone: new start is far enough out that the edit window opens again.
  IF new.date IS DISTINCT FROM old.date AND new.date > now() + interval '24 hours' THEN
    RETURN NEW;
  END IF;

  IF now() >= (old.date - interval '24 hours') THEN
    RAISE EXCEPTION 'run_edit_locked_within_24h'
      USING MESSAGE = 'Run details are locked within 24 hours of the scheduled start.',
            ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_runs_enforce_edit_lock ON public.runs;
CREATE TRIGGER tr_runs_enforce_edit_lock
  BEFORE UPDATE ON public.runs
  FOR EACH ROW
  EXECUTE FUNCTION public.runs_enforce_edit_lock_before_update();
