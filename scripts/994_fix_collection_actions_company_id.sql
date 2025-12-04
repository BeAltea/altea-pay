-- Fix collection_actions table schema
-- Adiciona coluna company_id se não existir e atualiza o schema cache

DO $$ 
BEGIN
    -- Adiciona coluna company_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collection_actions' 
        AND column_name = 'company_id'
    ) THEN
        ALTER TABLE collection_actions 
        ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Coluna company_id adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna company_id já existe';
    END IF;
END $$;

-- Atualiza o schema cache do PostgREST
NOTIFY pgrst, 'reload schema';

-- Verifica a estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'collection_actions'
ORDER BY ordinal_position;
