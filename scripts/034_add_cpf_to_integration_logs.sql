-- Adicionar coluna cpf à tabela integration_logs se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'integration_logs' 
        AND column_name = 'cpf'
    ) THEN
        ALTER TABLE public.integration_logs 
        ADD COLUMN cpf VARCHAR(14);
        
        -- Criar índice para a nova coluna
        CREATE INDEX IF NOT EXISTS idx_integration_logs_cpf ON public.integration_logs(cpf);
        
        RAISE NOTICE 'Coluna cpf adicionada à tabela integration_logs';
    ELSE
        RAISE NOTICE 'Coluna cpf já existe na tabela integration_logs';
    END IF;
END $$;

COMMENT ON COLUMN public.integration_logs.cpf IS 'CPF do cliente relacionado à operação de integração';
