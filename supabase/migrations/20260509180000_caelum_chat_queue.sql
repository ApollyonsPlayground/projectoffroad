-- Ask Caelum: enqueue messages here; worker hits webhook; clients subscribe via Realtime.

CREATE TABLE IF NOT EXISTS public.caelum_chat_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  user_name text,
  message text NOT NULL CHECK (char_length(message) <= 4000),
  reply text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  current_page text
);

CREATE INDEX IF NOT EXISTS idx_caelum_chat_queue_pending_created
  ON public.caelum_chat_queue (created_at ASC)
  WHERE status = 'pending';

COMMENT ON TABLE public.caelum_chat_queue IS
  'Queued Ask Caelum chat turns. POST /api/caelum/chat inserts; cron processes pending rows; replies visible via Realtime (authenticated).';

ALTER TABLE public.caelum_chat_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS caelum_chat_queue_select_own ON public.caelum_chat_queue;
CREATE POLICY caelum_chat_queue_select_own
  ON public.caelum_chat_queue FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.caelum_chat_queue;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
