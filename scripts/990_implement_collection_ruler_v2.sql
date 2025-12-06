-- Régua 2 - Régua de Cobrança Customizável por Cliente 1 (Company)
-- Esta régua permite que cada empresa customize totalmente seu fluxo de cobrança

-- Atualizar tabela collection_rules para suportar régua customizável completa
ALTER TABLE collection_rules
ADD COLUMN IF NOT EXISTS rule_version INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS execution_mode TEXT DEFAULT 'automatic' CHECK (execution_mode IN ('automatic', 'manual', 'scheduled')),
ADD COLUMN IF NOT EXISTS start_date_field TEXT DEFAULT 'due_date' CHECK (start_date_field IN ('due_date', 'first_overdue', 'analysis_date', 'custom')),
ADD COLUMN IF NOT EXISTS is_default_for_company BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_approval_status TEXT[] DEFAULT ARRAY['ACEITA', 'ACEITA_ESPECIAL'],
ADD COLUMN IF NOT EXISTS last_execution_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_execution_at TIMESTAMP WITH TIME ZONE;

-- Atualizar collection_rule_steps para suportar configuração completa
ALTER TABLE collection_rule_steps
ADD COLUMN IF NOT EXISTS execution_time TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS retry_on_failure BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Alterar colunas existentes se necessário
ALTER TABLE collection_rule_steps 
ALTER COLUMN action_type TYPE TEXT,
DROP CONSTRAINT IF EXISTS collection_rule_steps_action_type_check,
ADD CONSTRAINT collection_rule_steps_action_type_check 
  CHECK (action_type IN ('email', 'sms', 'whatsapp', 'call_automatic', 'call_human', 'task'));

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_collection_rules_company_default 
  ON collection_rules(company_id, is_default_for_company) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_collection_rules_next_execution 
  ON collection_rules(next_execution_at) 
  WHERE is_active = true AND execution_mode = 'automatic';

CREATE INDEX IF NOT EXISTS idx_collection_rule_steps_enabled 
  ON collection_rule_steps(rule_id, is_enabled, step_order) 
  WHERE is_enabled = true;

-- Criar tabela para tracking de execuções da régua
CREATE TABLE IF NOT EXISTS collection_rule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES collection_rules(id) ON DELETE CASCADE,
  debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  execution_date DATE NOT NULL,
  days_offset INTEGER NOT NULL,
  start_date DATE NOT NULL,
  
  step_id UUID REFERENCES collection_rule_steps(id) ON DELETE SET NULL,
  step_order INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para tracking
CREATE INDEX idx_rule_executions_pending 
  ON collection_rule_executions(execution_date, status) 
  WHERE status = 'pending';

CREATE INDEX idx_rule_executions_debt 
  ON collection_rule_executions(debt_id, execution_date);

CREATE INDEX idx_rule_executions_customer 
  ON collection_rule_executions(customer_id, company_id);

-- Enable RLS
ALTER TABLE collection_rule_executions ENABLE ROW LEVEL SECURITY;

-- Policies para collection_rule_executions
CREATE POLICY "Companies can view own executions" 
  ON collection_rule_executions FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert executions" 
  ON collection_rule_executions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update executions" 
  ON collection_rule_executions FOR UPDATE
  USING (true);

-- Criar trigger para updated_at
CREATE TRIGGER update_collection_rule_executions_updated_at 
  BEFORE UPDATE ON collection_rule_executions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE collection_rule_executions IS 'Tracking de execuções da régua de cobrança por dívida e step';
COMMENT ON COLUMN collection_rules.rule_version IS 'Versão da régua: 1=antiga, 2=nova customizável';
COMMENT ON COLUMN collection_rules.start_date_field IS 'Campo de referência para calcular dias: due_date, first_overdue, etc.';
COMMENT ON COLUMN collection_rules.is_default_for_company IS 'Se true, esta é a régua padrão da empresa';
COMMENT ON COLUMN collection_rules.requires_approval_status IS 'Quais status de aprovação são elegíveis (ACEITA, ACEITA_ESPECIAL)';
COMMENT ON COLUMN collection_rule_steps.execution_time IS 'Horário do dia para executar este step';
COMMENT ON COLUMN collection_rule_steps.is_enabled IS 'Se false, este step é pulado';
COMMENT ON COLUMN collection_rule_executions.days_offset IS 'Dias após a data de referência (D0, D1, D2, etc.)';
