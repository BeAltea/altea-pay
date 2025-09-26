-- Multi-tenant structure setup with proper policy handling
-- This script safely handles existing policies and data

BEGIN;

-- Step 1: Remove all existing policies that depend on the role column
DO $$
BEGIN
    -- Drop all known policies that might exist on profiles table
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Allow profile access" ON public.profiles;
    DROP POLICY IF EXISTS "Allow profile updates" ON public.profiles;
    DROP POLICY IF EXISTS "Allow profile inserts" ON public.profiles;
    DROP POLICY IF EXISTS "Allow profile deletes" ON public.profiles;
    DROP POLICY IF EXISTS "Service role full access" ON public.profiles;
    DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
    DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;
    DROP POLICY IF EXISTS "Allow profile read for auth" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
    
    RAISE NOTICE 'All existing policies dropped successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some policies may not have existed: %', SQLERRM;
END $$;

-- Step 2: Temporarily disable RLS to allow schema changes
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop helper functions that might cause issues
DROP FUNCTION IF EXISTS public.is_admin();

-- Step 4: Create the user_role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');
        RAISE NOTICE 'Created user_role enum';
    ELSE
        RAISE NOTICE 'user_role enum already exists';
    END IF;
END $$;

-- Step 5: Create companies table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Add company_id to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN company_id UUID REFERENCES public.companies(id);
        RAISE NOTICE 'Added company_id column to profiles';
    ELSE
        RAISE NOTICE 'company_id column already exists in profiles';
    END IF;
END $$;

-- Step 7: Handle role column conversion safely
DO $$
BEGIN
    -- Check if role column exists and what type it is
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        -- Get current column type
        DECLARE
            current_type TEXT;
        BEGIN
            SELECT data_type INTO current_type
            FROM information_schema.columns 
            WHERE table_name = 'profiles' AND column_name = 'role';
            
            IF current_type != 'USER-DEFINED' THEN
                -- Remove default value temporarily
                ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
                
                -- Update any incompatible values
                UPDATE public.profiles SET role = 'user' WHERE role NOT IN ('user', 'admin', 'super_admin');
                
                -- Convert column type
                ALTER TABLE public.profiles ALTER COLUMN role TYPE user_role USING role::user_role;
                
                -- Set new default
                ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user'::user_role;
                
                RAISE NOTICE 'Converted role column to user_role enum';
            ELSE
                RAISE NOTICE 'Role column is already user_role type';
            END IF;
        END;
    ELSE
        -- Add role column if it doesn't exist
        ALTER TABLE public.profiles ADD COLUMN role user_role DEFAULT 'user'::user_role;
        RAISE NOTICE 'Added role column to profiles';
    END IF;
END $$;

-- Step 8: Add company_id to other tables
DO $$
BEGIN
    -- Add to customers table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE public.customers ADD COLUMN company_id UUID REFERENCES public.companies(id);
        RAISE NOTICE 'Added company_id to customers';
    END IF;
    
    -- Add to debts table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'debts' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE public.debts ADD COLUMN company_id UUID REFERENCES public.companies(id);
        RAISE NOTICE 'Added company_id to debts';
    END IF;
    
    -- Add to agreements table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agreements') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'agreements' AND column_name = 'company_id'
        ) THEN
            ALTER TABLE public.agreements ADD COLUMN company_id UUID REFERENCES public.companies(id);
            RAISE NOTICE 'Added company_id to agreements';
        END IF;
    END IF;
    
    -- Add to payments table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'company_id'
        ) THEN
            ALTER TABLE public.payments ADD COLUMN company_id UUID REFERENCES public.companies(id);
            RAISE NOTICE 'Added company_id to payments';
        END IF;
    END IF;
END $$;

-- Step 9: Create a default company for existing data
DO $$
DECLARE
    default_company_id UUID;
BEGIN
    -- Insert default company if no companies exist
    IF NOT EXISTS (SELECT 1 FROM public.companies) THEN
        INSERT INTO public.companies (name, slug) 
        VALUES ('Empresa Padrão', 'empresa-padrao')
        RETURNING id INTO default_company_id;
        
        -- Update existing records to use default company
        UPDATE public.profiles SET company_id = default_company_id WHERE company_id IS NULL;
        UPDATE public.customers SET company_id = default_company_id WHERE company_id IS NULL;
        UPDATE public.debts SET company_id = default_company_id WHERE company_id IS NULL;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agreements') THEN
            UPDATE public.agreements SET company_id = default_company_id WHERE company_id IS NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
            UPDATE public.payments SET company_id = default_company_id WHERE company_id IS NULL;
        END IF;
        
        RAISE NOTICE 'Created default company and updated existing records';
    END IF;
END $$;

-- Step 10: Re-enable RLS and create new policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create helper function for admin check (non-recursive)
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(
        (SELECT role IN ('admin', 'super_admin') FROM public.profiles WHERE id = auth.uid()),
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(
        (SELECT role = 'super_admin' FROM public.profiles WHERE id = auth.uid()),
        false
    );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin_or_super() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Step 11: Create new RLS policies for multi-tenant access
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (but not role or company_id)
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND 
        role = COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'user'::user_role) AND
        company_id = COALESCE((SELECT company_id FROM public.profiles WHERE id = auth.uid()), company_id)
    );

-- Admins can view profiles in their company
CREATE POLICY "Admins can view company profiles" ON public.profiles
    FOR SELECT USING (
        public.is_admin_or_super() AND (
            public.is_super_admin() OR 
            company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        )
    );

-- Admins can update profiles in their company
CREATE POLICY "Admins can update company profiles" ON public.profiles
    FOR UPDATE USING (
        public.is_admin_or_super() AND (
            public.is_super_admin() OR 
            company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        )
    );

-- Admins can insert profiles in their company
CREATE POLICY "Admins can insert company profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        public.is_admin_or_super() AND (
            public.is_super_admin() OR 
            company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        )
    );

-- Super admins can delete any profile, regular admins can delete in their company
CREATE POLICY "Admins can delete company profiles" ON public.profiles
    FOR DELETE USING (
        public.is_admin_or_super() AND (
            public.is_super_admin() OR 
            company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        )
    );

-- Step 12: Enable RLS on companies table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Super admins can see all companies
CREATE POLICY "Super admins can view all companies" ON public.companies
    FOR SELECT USING (public.is_super_admin());

-- Admins can see their own company
CREATE POLICY "Admins can view own company" ON public.companies
    FOR SELECT USING (
        id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

-- Only super admins can modify companies
CREATE POLICY "Super admins can modify companies" ON public.companies
    FOR ALL USING (public.is_super_admin());

-- Step 13: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_debts_company_id ON public.debts(company_id);

COMMIT;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '=== Multi-tenant structure created successfully! ===';
    RAISE NOTICE 'Created user_role enum with values: user, admin, super_admin';
    RAISE NOTICE 'Created companies table with RLS policies';
    RAISE NOTICE 'Added company_id to all relevant tables';
    RAISE NOTICE 'Created comprehensive RLS policies for multi-tenant access';
    RAISE NOTICE 'Ready to run populate scripts!';
END $$;
