-- ── users.ui_theme: preset slugs (shell + accent packages) ───────────────────
-- Replaces legacy dark | light | blue with named presets; migrates existing rows.

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_ui_theme_check;

UPDATE public.users
SET ui_theme = CASE trim(lower(ui_theme))
  WHEN 'dark' THEN 'midnight-orange'
  WHEN 'light' THEN 'paper-crimson'
  WHEN 'blue' THEN 'navy-sage'
  WHEN 'midnight-orange' THEN 'midnight-orange'
  WHEN 'paper-crimson' THEN 'paper-crimson'
  WHEN 'navy-sage' THEN 'navy-sage'
  WHEN 'void-teal-violet' THEN 'void-teal-violet'
  ELSE 'midnight-orange'
END;

UPDATE public.users
SET ui_theme = 'midnight-orange'
WHERE ui_theme IS NULL
   OR trim(ui_theme) = ''
   OR ui_theme NOT IN (
     'midnight-orange',
     'paper-crimson',
     'navy-sage',
     'void-teal-violet'
   );

ALTER TABLE public.users
  ADD CONSTRAINT users_ui_theme_check CHECK (
    ui_theme IN (
      'midnight-orange',
      'paper-crimson',
      'navy-sage',
      'void-teal-violet'
    )
  );

ALTER TABLE public.users ALTER COLUMN ui_theme SET DEFAULT 'midnight-orange';
