-- Classify trails by typical rig type for explorer filtering (ATV/SXS vs full-size trucks).
-- Nullable legacy rows fall back to app-side text inference.

ALTER TABLE public.trails
  ADD COLUMN IF NOT EXISTS vehicle_scope text;

ALTER TABLE public.trails DROP CONSTRAINT IF EXISTS trails_vehicle_scope_check;

ALTER TABLE public.trails
  ADD CONSTRAINT trails_vehicle_scope_check
  CHECK (
    vehicle_scope IS NULL
    OR lower(trim(vehicle_scope)) IN ('atv', 'truck', 'both')
  );

COMMENT ON COLUMN public.trails.vehicle_scope IS
  'Explorer filter: atv (SXS/UTV/quad-focused), truck (pickups/full-size 4x4), both (either OK). NULL lets clients infer from text fields.';
