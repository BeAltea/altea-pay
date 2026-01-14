-- Adicionar external_id para rastreio de análises assíncronas

ALTER TABLE credit_profiles
ADD COLUMN IF NOT EXISTS external_id TEXT;

COMMENT ON COLUMN credit_profiles.external_id IS 'ID externo da análise (UUID/protocolo Assertiva)';

-- Índice único para garantir idempotência
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_profiles_external_id ON credit_profiles (external_id) WHERE external_id IS NOT NULL;
