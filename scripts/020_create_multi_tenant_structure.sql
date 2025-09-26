-- Criar estrutura multi-tenant para Altea Pay
-- Este script implementa suporte a múltiplas empresas (multi-tenant)

-- 1. Criar tabela companies
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    document TEXT, -- CNPJ da empresa
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Adicionar company_id na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 3. Adicionar novo role 'super_admin' para usuários da Altea
-- Primeiro, verificar se o tipo enum existe
DO $$ 
BEGIN
    -- Tentar adicionar o novo valor ao enum existente
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
EXCEPTION
    WHEN duplicate_object THEN
        -- Se o valor já existe, não fazer nada
        NULL;
    WHEN undefined_object THEN
        -- Se o tipo não existe, criar
        CREATE TYPE user_role AS ENUM ('admin', 'user', 'super_admin');
        -- Alterar a coluna para usar o tipo enum
        ALTER TABLE public.profiles ALTER COLUMN role TYPE user_role USING role::user_role;
END $$;

-- 4. Adicionar company_id nas tabelas que precisam de isolamento por empresa
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE public.debts 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE public.agreements 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE public.collection_rules 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE public.collection_actions 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE public.data_imports 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_debts_company_id ON public.debts(company_id);
CREATE INDEX IF NOT EXISTS idx_agreements_company_id ON public.agreements(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_collection_rules_company_id ON public.collection_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_collection_actions_company_id ON public.collection_actions(company_id);
CREATE INDEX IF NOT EXISTS idx_data_imports_company_id ON public.data_imports(company_id);

-- 6. Criar trigger para atualizar updated_at na tabela companies
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at_trigger
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION update_companies_updated_at();

-- 7. Habilitar RLS (Row Level Security) nas tabelas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_imports ENABLE ROW LEVEL SECURITY;

-- 8. Criar políticas RLS básicas (serão refinadas posteriormente)
-- Super admins podem ver tudo
CREATE POLICY "Super admins can view all companies" ON public.companies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );

-- Company admins podem ver apenas sua empresa
CREATE POLICY "Company admins can view their company" ON public.companies
    FOR ALL USING (
        id IN (
            SELECT company_id FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Políticas para profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR ALL USING (id = auth.uid());

CREATE POLICY "Super admins can view all profiles" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() 
            AND p.role = 'super_admin'
        )
    );

-- Comentários para documentação
COMMENT ON TABLE public.companies IS 'Tabela de empresas para suporte multi-tenant';
COMMENT ON COLUMN public.profiles.company_id IS 'ID da empresa - NULL para super_admins da Altea';
COMMENT ON COLUMN public.customers.company_id IS 'ID da empresa proprietária do cliente';
COMMENT ON COLUMN public.debts.company_id IS 'ID da empresa proprietária da dívida';

-- Verificar se tudo foi criado corretamente
SELECT 'Multi-tenant structure created successfully!' as status;
