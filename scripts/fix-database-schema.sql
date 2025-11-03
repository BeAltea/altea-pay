-- Fix integration_logs table: make integration_id nullable
ALTER TABLE integration_logs ALTER COLUMN integration_id DROP NOT NULL;

-- Add unique constraint to credit_profiles for upsert to work
ALTER TABLE credit_profiles 
ADD CONSTRAINT credit_profiles_cpf_company_unique 
UNIQUE (cpf, company_id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_credit_profiles_cpf_company 
ON credit_profiles(cpf, company_id);

-- Add index on integration_logs for better query performance
CREATE INDEX IF NOT EXISTS idx_integration_logs_operation_type 
ON integration_logs(operation_type, created_at DESC);
