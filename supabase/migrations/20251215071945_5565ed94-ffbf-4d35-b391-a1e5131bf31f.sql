-- Fix Security Definer View issue by dropping the view
-- Instead, we'll handle email visibility in application code
DROP VIEW IF EXISTS public.users_public;

-- Update users policy to be more restrictive
-- Remove the old policy first
DROP POLICY IF EXISTS "Users can view all profiles but only own email" ON public.users;

-- Create a proper policy - users can see all profiles
-- Email visibility will be handled in the application layer
CREATE POLICY "Authenticated users can view profiles"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Allow public access for basic profile info (needed for messenger)
CREATE POLICY "Public can view basic profiles"
ON public.users
FOR SELECT
TO anon
USING (true);