-- Allow riders to retract their own SOS so all participants see it disappear (Realtime DELETE).
-- FULL replica identity so DELETE events include run_id for filtered realtime subscriptions.

ALTER TABLE public.sos_alerts REPLICA IDENTITY FULL;

CREATE POLICY "Users can delete own SOS alerts"
  ON public.sos_alerts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
