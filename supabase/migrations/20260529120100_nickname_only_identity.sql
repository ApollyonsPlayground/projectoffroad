-- Nickname-only public identity: auto-backfill @usernames, hide real names, refresh snapshots.

ALTER TABLE public.users
  ALTER COLUMN hide_display_name SET DEFAULT true;

UPDATE public.users
SET hide_display_name = true
WHERE hide_display_name IS DISTINCT FROM true;

-- Deterministic unique username backfill for rows missing a handle.
DO $$
DECLARE
  r record;
  candidate text;
  suffix int;
  id_frag text;
BEGIN
  FOR r IN SELECT id FROM public.users WHERE username IS NULL LOOP
    id_frag := lower(replace(substr(r.id::text, 1, 8), '-', ''));
    suffix := 0;
    LOOP
      IF suffix = 0 THEN
        candidate := 'rider_' || id_frag;
      ELSE
        candidate := 'rider_' || id_frag || '_' || suffix::text;
      END IF;
      candidate := left(candidate, 24);
      IF candidate ~ '^[a-z0-9_]{3,24}$'
         AND NOT EXISTS (
           SELECT 1 FROM public.users u
           WHERE lower(u.username) = lower(candidate)
         ) THEN
        UPDATE public.users SET username = candidate WHERE id = r.id;
        EXIT;
      END IF;
      suffix := suffix + 1;
      IF suffix > 99 THEN
        candidate := 'rider_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
        candidate := left(candidate, 24);
        UPDATE public.users SET username = candidate WHERE id = r.id;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- App denormalizes author label on posts/comments; columns may be missing on older DBs.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS user_name text;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS user_name text;

-- Refresh denormalized author labels so stale real names don't leak on fallback paths.
UPDATE public.posts p
SET user_name = '@' || u.username
FROM public.users u
WHERE p.user_id = u.id
  AND u.username IS NOT NULL;

UPDATE public.comments c
SET user_name = '@' || u.username
FROM public.users u
WHERE c.user_id = u.id
  AND u.username IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'caelum_chat_queue'
      AND column_name = 'user_name'
  ) THEN
    UPDATE public.caelum_chat_queue q
    SET user_name = '@' || u.username
    FROM public.users u
    WHERE q.user_id = u.id
      AND u.username IS NOT NULL;
  END IF;
END $$;
