-- Tabela de configurações de integração ERP por empresa
CREATE TABLE IF NOT EXISTS erp_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  erp_type TEXT NOT NULL, -- 'totvs', 'sankhya', 'omie', 'custom'
  erp_name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  auth_token TEXT,
  auth_type TEXT DEFAULT 'bearer', -- 'bearer', 'basic', 'api_key'
  customers_endpoint TEXT,
  debts_endpoint TEXT,
  sync_endpoint TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_frequency TEXT DEFAULT 'manual', -- 'manual', 'hourly', 'daily', 'weekly'
  config JSONB DEFAULT '{}', -- Configurações adicionais específicas do ERP
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de logs de integração
CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES erp_integrations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL, -- 'sync_customers', 'sync_debts', 'post_results', 'test_connection'
  status TEXT NOT NULL, -- 'success', 'error', 'warning', 'in_progress'
  records_processed INTEGER DEFAULT 0,
  records_success INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  request_data JSONB,
  response_data JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar campo source_system nas tabelas existentes para rastrear origem dos dados
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source_system TEXT DEFAULT 'manual';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS source_system TEXT DEFAULT 'manual';
ALTER TABLE debts ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_erp_integrations_company ON erp_integrations(company_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_integration ON integration_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_company ON integration_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_source ON customers(source_system);
CREATE INDEX IF NOT EXISTS idx_customers_external_id ON customers(external_id);
CREATE INDEX IF NOT EXISTS idx_debts_source ON debts(source_system);
CREATE INDEX IF NOT EXISTS idx_debts_external_id ON debts(external_id);

-- Comentários para documentação
COMMENT ON TABLE erp_integrations IS 'Configurações de integração com ERPs externos por empresa';
COMMENT ON TABLE integration_logs IS 'Logs de todas as operações de integração com ERPs';
COMMENT ON COLUMN customers.source_system IS 'Sistema de origem dos dados (manual, totvs, sankhya, etc)';
COMMENT ON COLUMN customers.external_id IS 'ID do cliente no sistema externo';
COMMENT ON COLUMN debts.source_system IS 'Sistema de origem dos dados (manual, totvs, sankhya, etc)';
COMMENT ON COLUMN debts.external_id IS 'ID da dívida no sistema externo';
