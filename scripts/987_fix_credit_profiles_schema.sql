-- Fix credit_profiles table schema and constraints
-- This script ensures the table accepts Assertiva data correctly

-- Step 1: Drop the old check constraint if it exists
ALTER TABLE IF EXISTS credit_profiles 
DROP CONSTRAINT IF EXISTS credit_profiles_source_check;

-- Step 2: Add new check constraint that includes 'assertiva'
ALTER TABLE credit_profiles
ADD CONSTRAINT credit_profiles_source_check 
CHECK (source IN ('gov', 'assertiva', 'consolidated'));

-- Step 3: Add data_gov column if it doesn't exist (for backwards compatibility)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_profiles' 
    AND column_name = 'data_gov'
  ) THEN
    ALTER TABLE credit_profiles ADD COLUMN data_gov JSONB;
    COMMENT ON COLUMN credit_profiles.data_gov IS 'Dados completos da análise Gov (Portal da Transparência)';
  END IF;
END $$;

-- Step 4: Ensure data_assertiva column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_profiles' 
    AND column_name = 'data_assertiva'
  ) THEN
    ALTER TABLE credit_profiles ADD COLUMN data_assertiva JSONB;
    COMMENT ON COLUMN credit_profiles.data_assertiva IS 'Dados completos da análise Assertiva';
  END IF;
END $$;

-- Step 5: Ensure score columns exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_profiles' 
    AND column_name = 'score_gov'
  ) THEN
    ALTER TABLE credit_profiles ADD COLUMN score_gov NUMERIC(10,2);
    COMMENT ON COLUMN credit_profiles.score_gov IS 'Score da análise Gov';
  END IF;
END $$;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_profiles_cpf_company ON credit_profiles(cpf, company_id);
CREATE INDEX IF NOT EXISTS idx_credit_profiles_source ON credit_profiles(source);
CREATE INDEX IF NOT EXISTS idx_credit_profiles_analysis_date ON credit_profiles(last_analysis_date DESC);

-- Step 7: Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '✅ credit_profiles schema fixed successfully!';
  RAISE NOTICE '- Check constraint updated to accept: gov, assertiva, consolidated';
  RAISE NOTICE '- Columns data_gov, data_assertiva, score_gov ensured';
  RAISE NOTICE '- Performance indexes created';
END $$;
