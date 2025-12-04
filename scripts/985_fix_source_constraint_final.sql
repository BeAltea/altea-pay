-- Passo 1: Remover constraint antiga (se existir)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'credit_profiles_source_check'
  ) THEN
    ALTER TABLE credit_profiles DROP CONSTRAINT credit_profiles_source_check;
    RAISE NOTICE 'Constraint antiga removida';
  END IF;
END $$;

-- Passo 2: Atualizar TODOS os registros existentes para garantir que source='assertiva'
UPDATE credit_profiles 
SET source = 'assertiva' 
WHERE source IS NULL OR source != 'assertiva';

-- Passo 3: Criar nova constraint que aceita APENAS 'assertiva'
ALTER TABLE credit_profiles 
ADD CONSTRAINT credit_profiles_source_check 
CHECK (source = 'assertiva');

-- Passo 4: Garantir que a coluna data_assertiva existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_profiles' 
    AND column_name = 'data_assertiva'
  ) THEN
    ALTER TABLE credit_profiles ADD COLUMN data_assertiva JSONB;
    RAISE NOTICE 'Coluna data_assertiva criada';
  END IF;
END $$;

-- Passo 5: Remover coluna data_gov (se existir)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_profiles' 
    AND column_name = 'data_gov'
  ) THEN
    ALTER TABLE credit_profiles DROP COLUMN data_gov;
    RAISE NOTICE 'Coluna data_gov removida';
  END IF;
END $$;

-- Confirmar sucesso
SELECT 'Schema credit_profiles atualizado com sucesso!' as status;
