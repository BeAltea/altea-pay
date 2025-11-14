-- Make cpf column nullable in integration_logs table
-- This allows batch operations to log without requiring a specific CPF

ALTER TABLE integration_logs
ALTER COLUMN cpf DROP NOT NULL;

-- Add comment to explain
COMMENT ON COLUMN integration_logs.cpf IS 'CPF/CNPJ do cliente - NULL para operações em lote';

-- Add index for better performance on cpf queries
CREATE INDEX IF NOT EXISTS idx_integration_logs_cpf ON integration_logs(cpf) WHERE cpf IS NOT NULL;
