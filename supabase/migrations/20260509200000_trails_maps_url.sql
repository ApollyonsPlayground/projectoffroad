-- Google Maps search/deep link persisted from seed script (`maps_url`).
ALTER TABLE public.trails
  ADD COLUMN IF NOT EXISTS maps_url text;

COMMENT ON COLUMN public.trails.maps_url IS 'Google Maps URL for trail area or trailhead (seed-generated when coords missing).';
