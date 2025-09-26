-- Script para criar tabelas que estão faltando para o sistema multi-tenant
-- Executa após o script 020

BEGIN;

-- Cria tabela clients (se não existir)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    document_type VARCHAR(10) CHECK (document_type IN ('CPF', 'CNPJ')),
    document_number VARCHAR(18) NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_number, company_id)
);

-- Cria índices para performance
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_document ON public.clients(document_number);

-- Habilita RLS na tabela clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Cria políticas RLS para clients
CREATE POLICY "Super admins can manage all clients" ON public.clients
    FOR ALL USING (public.is_super_admin());

CREATE POLICY "Users can manage clients from same company" ON public.clients
    FOR ALL USING (company_id = public.get_user_company_id());

-- Verifica se a tabela debts precisa de ajustes
DO $$
BEGIN
    -- Adiciona colunas que podem estar faltando na tabela debts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'debts' AND column_name = 'client_id') THEN
        ALTER TABLE public.debts ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_debts_client_id ON public.debts(client_id);
    END IF;
    
    -- Adiciona status se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'debts' AND column_name = 'status') THEN
        ALTER TABLE public.debts ADD COLUMN status debt_status DEFAULT 'pending';
    END IF;
END $$;

COMMIT;

SELECT 'Tabelas faltantes criadas com sucesso!' as status;
