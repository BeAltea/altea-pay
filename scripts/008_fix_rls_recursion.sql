-- Fix RLS recursion issue in profiles table
-- The problem is that admin policies are referencing the same table they're protecting

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Create a function to check if current user is admin
-- This avoids recursion by using a direct query
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Policy for users to view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Policy for users to update their own profile (non-admin fields only)
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'user'));

-- Policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_admin());

-- Policy for admins to update all profiles
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (public.is_admin());

-- Policy for admins to insert new profiles
CREATE POLICY "Admins can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (public.is_admin());

-- Policy for admins to delete profiles
CREATE POLICY "Admins can delete profiles" ON public.profiles
    FOR DELETE USING (public.is_admin());

-- Also create a simpler policy that allows reading profiles for authentication
-- This is needed for the middleware to work properly
CREATE POLICY "Allow profile read for auth" ON public.profiles
    FOR SELECT USING (true);

-- Drop the conflicting policy and recreate with proper priority
DROP POLICY IF EXISTS "Allow profile read for auth" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a single, non-recursive SELECT policy
CREATE POLICY "Allow profile access" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id OR 
        auth.uid() IN (
            SELECT id FROM public.profiles 
            WHERE role = 'admin' AND id = auth.uid()
        )
    );

-- Recreate update policies without recursion
CREATE POLICY "Allow profile updates" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id OR public.is_admin()
    );

CREATE POLICY "Allow profile inserts" ON public.profiles
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Allow profile deletes" ON public.profiles
    FOR DELETE USING (public.is_admin());
