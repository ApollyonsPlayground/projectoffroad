-- run_participants had RLS enabled in legacy setups but often had no policies → joins/RSVPs blocked.
-- Align with app: anyone signed in can RSVP as themselves; anyone can see who's going.

ALTER TABLE public.run_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "run_participants_select_public" ON public.run_participants;
CREATE POLICY "run_participants_select_public"
  ON public.run_participants FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "run_participants_insert_self" ON public.run_participants;
CREATE POLICY "run_participants_insert_self"
  ON public.run_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "run_participants_update_self" ON public.run_participants;
CREATE POLICY "run_participants_update_self"
  ON public.run_participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "run_participants_delete_self" ON public.run_participants;
CREATE POLICY "run_participants_delete_self"
  ON public.run_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
