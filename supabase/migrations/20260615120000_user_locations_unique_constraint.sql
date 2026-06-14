-- user_locations may predate the UNIQUE(run_id, user_id) in CREATE TABLE IF NOT EXISTS.
-- upsert_my_run_location RPC requires this constraint for ON CONFLICT.

-- Keep the newest row per run + user before adding the constraint.
DELETE FROM public.user_locations ul
USING (
  SELECT id
  FROM (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY run_id, user_id
        ORDER BY updated_at DESC NULLS LAST, id DESC
      ) AS rn
    FROM public.user_locations
  ) ranked
  WHERE ranked.rn > 1
) dupes
WHERE ul.id = dupes.id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_locations_run_user_unique'
      AND conrelid = 'public.user_locations'::regclass
  ) THEN
    ALTER TABLE public.user_locations
      ADD CONSTRAINT user_locations_run_user_unique UNIQUE (run_id, user_id);
  END IF;
END $$;
