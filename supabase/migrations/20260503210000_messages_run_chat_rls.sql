-- Run-scoped chat (`public.messages`): members + host can read/write.

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_run_members" ON public.messages;
CREATE POLICY "messages_select_run_members"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.runs r WHERE r.id = messages.run_id AND r.host_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.run_participants rp
      WHERE rp.run_id = messages.run_id AND rp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_insert_run_members" ON public.messages;
CREATE POLICY "messages_insert_run_members"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (SELECT 1 FROM public.runs r WHERE r.id = messages.run_id AND r.host_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.run_participants rp
        WHERE rp.run_id = messages.run_id AND rp.user_id = auth.uid()
      )
    )
  );
