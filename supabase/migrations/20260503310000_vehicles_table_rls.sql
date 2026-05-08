-- User garage / rigs: table was documented in src/lib/db/schema.sql but never migrated.
-- Aligns with profile UI (trim, is_primary) and auth.uid()-scoped writes like posts.

CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year integer NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  trim text,
  modifications text,
  photo_url text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS trim text;

CREATE INDEX IF NOT EXISTS vehicles_user_id_idx ON public.vehicles(user_id);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vehicles are viewable by everyone" ON public.vehicles;
DROP POLICY IF EXISTS "Users can manage own vehicles" ON public.vehicles;

CREATE POLICY "Vehicles are viewable by everyone"
  ON public.vehicles FOR SELECT USING (true);

CREATE POLICY "Users can manage own vehicles"
  ON public.vehicles FOR ALL USING (auth.uid() = user_id);
