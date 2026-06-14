-- Tracks Apple OAuth client secret rotations for admin countdown (Supabase does not return the secret).

CREATE TABLE IF NOT EXISTS public.apple_sign_in_secret_rotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rotated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  rotated_by text NOT NULL CHECK (rotated_by IN ('cron', 'admin', 'cli')),
  services_id text,
  key_id text
);

CREATE INDEX IF NOT EXISTS apple_sign_in_secret_rotations_rotated_at_idx
  ON public.apple_sign_in_secret_rotations (rotated_at DESC);

ALTER TABLE public.apple_sign_in_secret_rotations ENABLE ROW LEVEL SECURITY;

-- No policies: only service role (server routes) reads/writes.
