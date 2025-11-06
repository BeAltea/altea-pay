-- Fix integration_logs table to add missing operation_type column
-- This replaces the 'operation' column with 'operation_type' for consistency

ALTER TABLE integration_logs 
DROP COLUMN IF EXISTS operation;

ALTER TABLE integration_logs 
ADD COLUMN IF NOT EXISTS operation_type TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_integration_logs_operation_type 
ON integration_logs(operation_type);
