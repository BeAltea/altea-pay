-- Migration to remove GOV analysis and rename Assertiva to "Análise de Crédito"

-- Step 1: Remove all GOV analysis data from credit_profiles
DELETE FROM credit_profiles WHERE source = 'gov';

-- Step 2: Remove the old constraint FIRST (before updating values)
ALTER TABLE credit_profiles DROP CONSTRAINT IF EXISTS credit_profiles_source_check;

-- Step 3: Update ALL remaining records to 'credit_analysis'
-- This includes 'assertiva', 'free', 'detailed', and any other values
UPDATE credit_profiles 
SET source = 'credit_analysis' 
WHERE source != 'credit_analysis';

-- Step 4: Add the NEW constraint that only allows 'credit_analysis'
ALTER TABLE credit_profiles 
ADD CONSTRAINT credit_profiles_source_check 
CHECK (source IN ('credit_analysis'));

-- Step 5: Drop GOV-related columns
ALTER TABLE credit_profiles 
DROP COLUMN IF EXISTS data_gov,
DROP COLUMN IF EXISTS score_gov;

-- Step 6: Add comment
COMMENT ON COLUMN credit_profiles.source IS 
'Fonte da análise: credit_analysis (análise de crédito)';

-- Step 7: Clean up integration_logs (remove GOV operations)
-- Removida tentativa de atualizar coluna 'source' que não existe em integration_logs
DELETE FROM integration_logs 
WHERE operation LIKE '%GOV%' 
   OR operation LIKE '%PORTAL%' 
   OR operation LIKE '%government%';
