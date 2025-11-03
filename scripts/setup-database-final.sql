-- ============================================
-- SCRIPT FINAL DE CONFIGURAÇÃO DO BANCO
-- Execute este script no Supabase SQL Editor
-- ============================================

-- 1. Recarregar o schema cache do PostgREST (OBRIGATÓRIO)
NOTIFY pgrst, 'reload schema';

-- 2. Verificar estrutura atual da tabela credit_profiles
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'credit_profiles'
ORDER BY ordinal_position;

-- 3. Tornar customer_id nullable (se ainda não for)
DO $$ 
BEGIN
    -- Verificar se a coluna customer_id é NOT NULL
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'credit_profiles' 
        AND column_name = 'customer_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE credit_profiles ALTER COLUMN customer_id DROP NOT NULL;
        RAISE NOTICE 'customer_id agora é nullable';
    ELSE
        RAISE NOTICE 'customer_id já é nullable';
    END IF;
END $$;

-- 4. Adicionar constraint UNIQUE para o upsert funcionar (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'credit_profiles_cpf_company_unique'
    ) THEN
        ALTER TABLE credit_profiles 
        ADD CONSTRAINT credit_profiles_cpf_company_unique 
        UNIQUE (cpf, company_id);
        RAISE NOTICE 'Constraint UNIQUE criada com sucesso';
    ELSE
        RAISE NOTICE 'Constraint UNIQUE já existe';
    END IF;
END $$;

-- 5. Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_credit_profiles_cpf_company 
ON credit_profiles(cpf, company_id);

CREATE INDEX IF NOT EXISTS idx_credit_profiles_source 
ON credit_profiles(source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_logs_operation_type 
ON integration_logs(operation_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_logs_company 
ON integration_logs(company_id, created_at DESC) 
WHERE company_id IS NOT NULL;

-- 6. Verificar se tudo está correto
SELECT 
    'credit_profiles' as tabela,
    COUNT(*) as total_registros
FROM credit_profiles
UNION ALL
SELECT 
    'integration_logs' as tabela,
    COUNT(*) as total_registros
FROM integration_logs;

-- 7. Mostrar últimas análises realizadas
SELECT 
    cpf,
    source,
    analysis_type,
    score,
    created_at
FROM credit_profiles
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- FIM DO SCRIPT
-- ============================================
