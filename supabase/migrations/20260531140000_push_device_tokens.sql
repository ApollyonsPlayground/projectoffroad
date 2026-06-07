-- Remote push device tokens (FCM / APNs). Registration only — sending is gated server-side.

CREATE TABLE IF NOT EXISTS public.push_device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_device_tokens_platform_check
    CHECK (platform IN ('ios', 'android', 'web')),
  CONSTRAINT push_device_tokens_token_unique UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_push_device_tokens_user ON public.push_device_tokens (user_id);

COMMENT ON TABLE public.push_device_tokens IS
  'FCM/APNs device tokens for remote push. Populated by native app on sign-in. No pushes sent until PUSH_SEND_ENABLED=true on server.';

CREATE OR REPLACE FUNCTION public.push_device_tokens_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_device_tokens_updated_at ON public.push_device_tokens;
CREATE TRIGGER trg_push_device_tokens_updated_at
  BEFORE UPDATE ON public.push_device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.push_device_tokens_set_updated_at();

ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_device_tokens_select_own" ON public.push_device_tokens;
CREATE POLICY "push_device_tokens_select_own"
  ON public.push_device_tokens FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_device_tokens_insert_own" ON public.push_device_tokens;
CREATE POLICY "push_device_tokens_insert_own"
  ON public.push_device_tokens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_device_tokens_update_own" ON public.push_device_tokens;
CREATE POLICY "push_device_tokens_update_own"
  ON public.push_device_tokens FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_device_tokens_delete_own" ON public.push_device_tokens;
CREATE POLICY "push_device_tokens_delete_own"
  ON public.push_device_tokens FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
