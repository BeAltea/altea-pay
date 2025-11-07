-- Add separate fields for government and Assertiva data
ALTER TABLE credit_profiles
ADD COLUMN IF NOT EXISTS data_gov JSONB,
ADD COLUMN IF NOT EXISTS data_assertiva JSONB,
ADD COLUMN IF NOT EXISTS score_gov NUMERIC,
ADD COLUMN IF NOT EXISTS score_assertiva NUMERIC,
ADD COLUMN IF NOT EXISTS is_consolidated BOOLEAN DEFAULT FALSE;

-- Update existing records to move data to appropriate field
UPDATE credit_profiles
SET 
  data_gov = CASE WHEN source = 'gov' THEN data ELSE NULL END,
  data_assertiva = CASE WHEN source = 'assertiva' THEN data ELSE NULL END,
  score_gov = CASE WHEN source = 'gov' THEN score ELSE NULL END,
  score_assertiva = CASE WHEN source = 'assertiva' THEN score ELSE NULL END;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_credit_profiles_cpf_company ON credit_profiles(cpf, company_id);
