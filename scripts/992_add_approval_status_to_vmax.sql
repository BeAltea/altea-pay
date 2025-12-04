-- Adiciona colunas de aprovação e análise de crédito na tabela VMAX
-- Baseado nas regras de negócio do AlteaPay

-- Adicionar colunas de status de aprovação
ALTER TABLE "VMAX" 
ADD COLUMN IF NOT EXISTS approval_status TEXT CHECK (approval_status IN ('ACEITA', 'ACEITA_ESPECIAL', 'REJEITA', 'PENDENTE')),
ADD COLUMN IF NOT EXISTS approval_reason TEXT,
ADD COLUMN IF NOT EXISTS credit_score NUMERIC,
ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
ADD COLUMN IF NOT EXISTS behavior_classification TEXT CHECK (behavior_classification IN ('BOM', 'RUIM')),
ADD COLUMN IF NOT EXISTS presumed_income NUMERIC,
ADD COLUMN IF NOT EXISTS presumed_limit NUMERIC,
ADD COLUMN IF NOT EXISTS last_analysis_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS analysis_metadata JSONB,
ADD COLUMN IF NOT EXISTS auto_collection_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_collection_attempt TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS collection_count INTEGER DEFAULT 0;

-- Comentários nas colunas
COMMENT ON COLUMN "VMAX".approval_status IS 'Status de aprovação: ACEITA, ACEITA_ESPECIAL, REJEITA, PENDENTE';
COMMENT ON COLUMN "VMAX".approval_reason IS 'Motivo da decisão (ex: R1_SCORE_ALTO, R5_RENDA_BAIXA)';
COMMENT ON COLUMN "VMAX".credit_score IS 'Score de crédito da Assertiva (0-1000)';
COMMENT ON COLUMN "VMAX".risk_level IS 'Nível de risco: LOW (<490), MEDIUM (350-490), HIGH (<350)';
COMMENT ON COLUMN "VMAX".behavior_classification IS 'Classificação de comportamento: BOM ou RUIM';
COMMENT ON COLUMN "VMAX".presumed_income IS 'Renda presumida mensal em R$';
COMMENT ON COLUMN "VMAX".presumed_limit IS 'Limite de crédito presumido em R$';
COMMENT ON COLUMN "VMAX".auto_collection_enabled IS 'Se true, cliente pode entrar na régua automática';
COMMENT ON COLUMN "VMAX".collection_count IS 'Número de vezes que foi cobrado';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_vmax_approval_status ON "VMAX"(approval_status);
CREATE INDEX IF NOT EXISTS idx_vmax_risk_level ON "VMAX"(risk_level);
CREATE INDEX IF NOT EXISTS idx_vmax_auto_collection ON "VMAX"(auto_collection_enabled) WHERE auto_collection_enabled = true;
CREATE INDEX IF NOT EXISTS idx_vmax_last_analysis ON "VMAX"(last_analysis_date);

-- Atualizar registros existentes para status PENDENTE
UPDATE "VMAX" SET approval_status = 'PENDENTE' WHERE approval_status IS NULL;

-- Forçar reload do schema cache
NOTIFY pgrst, 'reload schema';
