-- Fix integration_logs table to add missing columns
ALTER TABLE integration_logs
ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
ADD COLUMN IF NOT EXISTS details JSONB;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_integration_logs_duration ON integration_logs(duration_ms);
