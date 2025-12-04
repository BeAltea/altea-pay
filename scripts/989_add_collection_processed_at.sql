-- Script para adicionar coluna collection_processed_at na tabela VMAX
-- Esta coluna rastreia quando a cobrança automática foi processada

-- Adicionar coluna se não existir
ALTER TABLE "VMAX"
ADD COLUMN IF NOT EXISTS collection_processed_at TIMESTAMPTZ;

-- Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_vmax_collection_processed 
ON "VMAX" (collection_processed_at);

-- Adicionar comentário explicativo
COMMENT ON COLUMN "VMAX".collection_processed_at IS 'Timestamp de quando a cobrança automática foi processada pela régua';

-- Forçar refresh do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
