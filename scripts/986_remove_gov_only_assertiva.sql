-- Remove completamente qualquer referência ao GOV
-- Mantém APENAS Assertiva

-- PASSO 1: Atualizar TODOS os registros existentes PRIMEIRO para evitar violação de constraint
UPDATE credit_profiles SET source = 'assertiva' WHERE source IS NULL OR source != 'assertiva';

-- PASSO 2: Remover constraint antiga
ALTER TABLE credit_profiles DROP CONSTRAINT IF EXISTS credit_profiles_source_check;

-- PASSO 3: Criar nova constraint que aceita apenas 'assertiva'
ALTER TABLE credit_profiles ADD CONSTRAINT credit_profiles_source_check 
  CHECK (source = 'assertiva');

-- PASSO 4: Remover colunas relacionadas ao GOV (se existirem)
ALTER TABLE credit_profiles DROP COLUMN IF EXISTS data_gov CASCADE;
ALTER TABLE credit_profiles DROP COLUMN IF EXISTS score_gov CASCADE;

-- PASSO 5: Garantir que as colunas da Assertiva existem
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'credit_profiles' AND column_name = 'data_assertiva') THEN
    ALTER TABLE credit_profiles ADD COLUMN data_assertiva JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'credit_profiles' AND column_name = 'score_assertiva') THEN
    ALTER TABLE credit_profiles ADD COLUMN score_assertiva NUMERIC;
  END IF;
END $$;

-- PASSO 6: Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_credit_profiles_source ON credit_profiles(source);
CREATE INDEX IF NOT EXISTS idx_credit_profiles_assertiva_data ON credit_profiles USING gin(data_assertiva);

-- PASSO 7: Comentar as colunas
COMMENT ON COLUMN credit_profiles.data_assertiva IS 'Dados completos da análise Assertiva em formato JSON';
COMMENT ON COLUMN credit_profiles.score_assertiva IS 'Score de crédito calculado pela Assertiva';
COMMENT ON TABLE credit_profiles IS 'Perfis de crédito analisados pela Assertiva (GOV foi removido completamente)';
