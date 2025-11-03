-- Fix 1: Make customer_id nullable in credit_profiles
-- This allows us to store credit analysis without linking to a customer
ALTER TABLE credit_profiles ALTER COLUMN customer_id DROP NOT NULL;

-- Fix 2: Make company_id nullable in integration_logs
-- This allows us to store integration logs without requiring company_id
ALTER TABLE integration_logs ALTER COLUMN company_id DROP NOT NULL;

-- Fix 3: Add unique constraint for upsert to work
ALTER TABLE credit_profiles 
ADD CONSTRAINT credit_profiles_cpf_company_unique 
UNIQUE (cpf, company_id);

-- Fix 4: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_profiles_cpf_company 
ON credit_profiles(cpf, company_id);

CREATE INDEX IF NOT EXISTS idx_integration_logs_operation_type 
ON integration_logs(operation_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_logs_company 
ON integration_logs(company_id, created_at DESC);
