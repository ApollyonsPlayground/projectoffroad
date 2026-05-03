-- App expects public.users.role for admin/moderation (optional if column already exists).
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

UPDATE public.users SET role = 'user' WHERE role IS NULL;
