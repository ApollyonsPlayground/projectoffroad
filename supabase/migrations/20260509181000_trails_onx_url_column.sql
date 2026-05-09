-- Ensure trail rows can store canonical onX links (seed script sends `onx_url`).
ALTER TABLE public.trails
  ADD COLUMN IF NOT EXISTS onx_url text;

COMMENT ON COLUMN public.trails.onx_url IS 'Canonical onX Offroad trail URL for deep linking from the app.';
