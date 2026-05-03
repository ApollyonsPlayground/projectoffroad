-- Display identity: optional @username, hide legal/display name from others, optional Google name sync.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS hide_display_name boolean NOT NULL DEFAULT false;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS sync_display_name_from_google boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_username_format_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_username_format_check
      CHECK (
        username IS NULL
        OR (username ~ '^[a-z0-9_]{3,24}$')
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_key
  ON public.users (lower(username))
  WHERE username IS NOT NULL;
