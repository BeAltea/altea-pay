-- Adiciona campos para réguas customizadas
ALTER TABLE collection_rules 
ADD COLUMN IF NOT EXISTS min_score INTEGER,
ADD COLUMN IF NOT EXISTS max_score INTEGER,
ADD COLUMN IF NOT EXISTS process_type TEXT CHECK (process_type IN ('automatic', 'semi_automatic', 'manual')),
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS rule_type TEXT DEFAULT 'custom' CHECK (rule_type IN ('default', 'custom'));

COMMENT ON COLUMN collection_rules.min_score IS 'Score mínimo para aplicar esta régua';
COMMENT ON COLUMN collection_rules.max_score IS 'Score máximo para aplicar esta régua';
COMMENT ON COLUMN collection_rules.process_type IS 'Tipo de processo: automatic, semi_automatic, manual';
COMMENT ON COLUMN collection_rules.priority IS 'Prioridade da cobrança: low, medium, high, urgent';
COMMENT ON COLUMN collection_rules.rule_type IS 'Tipo de régua: default (padrão do sistema) ou custom (customizada)';

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_collection_rules_score_range ON collection_rules(min_score, max_score) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_collection_rules_customers ON collection_rules USING GIN(active_for_customers) WHERE is_active = true;

-- Forçar refresh do schema do PostgREST
NOTIFY pgrst, 'reload schema';
