-- Custom UI theme columns, expanded presets, onboarding flags.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ui_shell text NOT NULL DEFAULT 'dark';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ui_primary_color text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ui_secondary_color text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS theme_prompt_seen_at timestamptz;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_ui_shell_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_ui_shell_check CHECK (ui_shell IN ('dark', 'light'));

-- Widen preset constraint before slug migration
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_ui_theme_check;

-- Migrate legacy preset slug
UPDATE public.users
SET ui_theme = 'void-violet'
WHERE trim(lower(ui_theme)) = 'void-teal-violet';

UPDATE public.users
SET ui_theme = 'midnight-orange'
WHERE ui_theme IS NULL
   OR trim(ui_theme) = '';

-- Existing accounts: skip username wizard; show one-time theme modal
UPDATE public.users
SET
  onboarding_completed_at = COALESCE(onboarding_completed_at, now()),
  theme_prompt_seen_at = NULL
WHERE onboarding_completed_at IS NULL;

ALTER TABLE public.users
  ADD CONSTRAINT users_ui_theme_check CHECK (
    ui_theme IN (
      'midnight-orange',
      'paper-crimson',
      'navy-sage',
      'void-violet',
      'desert-amber',
      'slate-cyan',
      'custom'
    )
  );

ALTER TABLE public.users ALTER COLUMN ui_theme SET DEFAULT 'midnight-orange';

COMMENT ON COLUMN public.users.ui_shell IS 'App shell brightness: dark or light';
COMMENT ON COLUMN public.users.ui_primary_color IS 'Custom theme primary accent (#RRGGBB) when ui_theme = custom';
COMMENT ON COLUMN public.users.ui_secondary_color IS 'Custom theme secondary accent (#RRGGBB)';
COMMENT ON COLUMN public.users.onboarding_completed_at IS 'Profile onboarding wizard completed (username + theme)';
COMMENT ON COLUMN public.users.theme_prompt_seen_at IS 'One-time theme picker modal dismissed for existing users';
