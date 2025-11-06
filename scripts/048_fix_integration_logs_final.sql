-- Fix integration_logs table to have all required columns
DROP TABLE IF EXISTS integration_logs CASCADE;

CREATE TABLE integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  cpf TEXT NOT NULL,
  operation TEXT NOT NULL,
  status TEXT NOT NULL,
  details JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_integration_logs_company ON integration_logs(company_id);
CREATE INDEX idx_integration_logs_cpf ON integration_logs(cpf);
CREATE INDEX idx_integration_logs_created_at ON integration_logs(created_at DESC);
