-- Adding role system to profiles table
-- Add role column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user'));

-- Set the existing user as admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'pedromb303@gmail.com';

-- Create index for better performance on role queries
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Add comment to document the role column
COMMENT ON COLUMN public.profiles.role IS 'User role: admin or user (default: user)';
