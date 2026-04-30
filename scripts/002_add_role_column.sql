-- Add role column to users table for platform-level roles (owner, admin, user)
-- Run this in Supabase SQL Editor

-- Add role column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
CHECK (role IN ('owner', 'admin', 'user'));

-- Add role column to posts table (denormalized for feed performance)
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- RLS: Allow users to read role but not update it (only owner can update via dashboard)
-- The existing "Users can update own profile" policy already handles this,
-- but we want to ensure role can only be changed by owners.
-- We do this by creating a function that checks if the updater is an owner.

CREATE OR REPLACE FUNCTION public.can_update_user_role(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updater_role TEXT;
BEGIN
  SELECT role INTO updater_role FROM public.users WHERE id = auth.uid();
  -- Only owners can change roles
  RETURN updater_role = 'owner';
END;
$$;

-- Update RLS policy for users table to prevent non-owners from changing role
-- First, we need a more restrictive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can update own profile except role"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND (
      -- If role is being changed, user must be an owner
      role = (SELECT role FROM public.users WHERE id = auth.uid())
      OR public.can_update_user_role(id)
    )
  );

-- Allow owners to update any user's role
CREATE POLICY "Owners can update any user role"
  ON public.users FOR UPDATE
  USING (public.can_update_user_role(id));

-- IMPORTANT: After running this migration, manually set your user as owner:
-- UPDATE public.users SET role = 'owner' WHERE email = 'your-email@example.com';
-- Or by user ID:
-- UPDATE public.users SET role = 'owner' WHERE id = '99402a05-42c1-47d1-978d-568b3c787b09';

COMMENT ON COLUMN public.users.role IS 'Platform role: owner (site admin), admin (moderator), user (default)';
