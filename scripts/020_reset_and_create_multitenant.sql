-- Script definitivo para criar estrutura multi-tenant
-- Remove tudo que pode causar conflito e reconstrói do zero

BEGIN;

-- 1. LIMPEZA COMPLETA - Remove todas as políticas e dependências
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Remove todas as políticas da tabela profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    END LOOP;
    
    -- Remove todas as políticas de outras tabelas que podem ter dependências
    FOR r IN (SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Desabilita RLS em todas as tabelas
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.debts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.agreements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.microcredit_offers DISABLE ROW LEVEL SECURITY;

-- Remove tipos enum existentes se houver conflito
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS debt_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS agreement_status CASCADE;

-- Remove colunas company_id se existirem
ALTER TABLE IF EXISTS public.profiles DROP COLUMN IF EXISTS company_id;
ALTER TABLE IF EXISTS public.customers DROP COLUMN IF EXISTS company_id;
ALTER TABLE IF EXISTS public.debts DROP COLUMN IF EXISTS company_id;
ALTER TABLE IF EXISTS public.payments DROP COLUMN IF EXISTS company_id;
ALTER TABLE IF EXISTS public.agreements DROP COLUMN IF EXISTS company_id;
ALTER TABLE IF EXISTS public.payment_plans DROP COLUMN IF EXISTS company_id;
ALTER TABLE IF EXISTS public.microcredit_offers DROP COLUMN IF EXISTS company_id;

-- Remove tabela companies se existir
DROP TABLE IF EXISTS public.companies CASCADE;

-- 2. RECRIAÇÃO COMPLETA DA ESTRUTURA

-- Cria tipos enum
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'user');
CREATE TYPE debt_status AS ENUM ('pending', 'overdue', 'paid', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE agreement_status AS ENUM ('active', 'completed', 'cancelled', 'defaulted');

-- Cria tabela de empresas
CREATE TABLE public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    sector VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Altera tabela profiles - remove coluna role existente e recria
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
ALTER TABLE public.profiles 
    ADD COLUMN role user_role DEFAULT 'user',
    ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Adiciona company_id às outras tabelas
ALTER TABLE public.customers ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.debts ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.agreements ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Adiciona company_id às tabelas se existirem
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_plans') THEN
        ALTER TABLE public.payment_plans ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'microcredit_offers') THEN
        ALTER TABLE public.microcredit_offers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Cria índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_debts_company_id ON public.debts(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_agreements_company_id ON public.agreements(company_id);

-- 3. FUNÇÕES HELPER PARA RLS
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_company_id UUID;
BEGIN
    SELECT company_id INTO user_company_id
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN user_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN user_role_val = 'super_admin';
END;
$$;

-- 4. HABILITA RLS E CRIA POLÍTICAS

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Users can view profiles from same company" ON public.profiles
    FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all customers" ON public.customers
    FOR ALL USING (public.is_super_admin());

CREATE POLICY "Users can manage customers from same company" ON public.customers
    FOR ALL USING (company_id = public.get_user_company_id());

-- Debts
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all debts" ON public.debts
    FOR ALL USING (public.is_super_admin());

CREATE POLICY "Users can manage debts from same company" ON public.debts
    FOR ALL USING (company_id = public.get_user_company_id());

-- Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all payments" ON public.payments
    FOR ALL USING (public.is_super_admin());

CREATE POLICY "Users can manage payments from same company" ON public.payments
    FOR ALL USING (company_id = public.get_user_company_id());

-- Agreements
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all agreements" ON public.agreements
    FOR ALL USING (public.is_super_admin());

CREATE POLICY "Users can manage agreements from same company" ON public.agreements
    FOR ALL USING (company_id = public.get_user_company_id());

-- Companies (apenas super admins podem gerenciar)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all companies" ON public.companies
    FOR ALL USING (public.is_super_admin());

CREATE POLICY "Users can view own company" ON public.companies
    FOR SELECT USING (id = public.get_user_company_id());

COMMIT;

-- Mensagem de sucesso
SELECT 'Estrutura multi-tenant criada com sucesso!' as status;
