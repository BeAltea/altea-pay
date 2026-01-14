-- Adicionar colunas para rastreio de UUID/protocolo da Assertiva

ALTER TABLE "VMAX"
ADD COLUMN IF NOT EXISTS assertiva_uuid TEXT,
ADD COLUMN IF NOT EXISTS assertiva_protocol TEXT;

COMMENT ON COLUMN "VMAX".assertiva_uuid IS 'UUID da consulta Assertiva (identificador)';
COMMENT ON COLUMN "VMAX".assertiva_protocol IS 'Protocolo único da resposta Assertiva';

-- Índice para busca rápida por UUID
CREATE INDEX IF NOT EXISTS idx_vmax_assertiva_uuid ON "VMAX" (assertiva_uuid);
CREATE INDEX IF NOT EXISTS idx_vmax_assertiva_protocol ON "VMAX" (assertiva_protocol);
