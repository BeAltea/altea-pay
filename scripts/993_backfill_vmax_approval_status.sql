-- Script para preencher retroativamente approval_status e auto_collection_enabled na tabela VMAX
-- Baseado nos dados de análise existentes

-- 1. Para registros com credit_score >= 400: ACEITA e auto_collection_enabled = true
UPDATE "VMAX"
SET 
  approval_status = 'ACEITA',
  auto_collection_enabled = true,
  approval_reason = 'Score >= 400 - Aprovado para cobrança automática'
WHERE credit_score >= 400
  AND approval_status IS NULL;

-- 2. Para registros com credit_score entre 300-399: ACEITA_ESPECIAL e auto_collection_enabled = false
UPDATE "VMAX"
SET 
  approval_status = 'ACEITA_ESPECIAL',
  auto_collection_enabled = false,
  approval_reason = 'Score 300-399 - Aprovado para cobrança manual'
WHERE credit_score >= 300 AND credit_score < 400
  AND approval_status IS NULL;

-- 3. Para registros com credit_score < 300: REJEITA
UPDATE "VMAX"
SET 
  approval_status = 'REJEITA',
  auto_collection_enabled = false,
  approval_reason = 'Score < 300 - Rejeitado'
WHERE credit_score < 300
  AND approval_status IS NULL;

-- 4. Para registros com analysis_metadata mas sem credit_score, tentar extrair do JSON
UPDATE "VMAX"
SET 
  credit_score = COALESCE(
    (analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->>'pontos')::numeric,
    (analysis_metadata->'credito'->'resposta'->'score'->>'pontos')::numeric,
    0
  )
WHERE credit_score IS NULL
  AND analysis_metadata IS NOT NULL
  AND (
    analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->>'pontos' IS NOT NULL
    OR analysis_metadata->'credito'->'resposta'->'score'->>'pontos' IS NOT NULL
  );

-- 5. Agora processar os que foram atualizados com score extraído do JSON
UPDATE "VMAX"
SET 
  approval_status = 'ACEITA',
  auto_collection_enabled = true,
  approval_reason = 'Score >= 400 (extraído do JSON) - Aprovado para cobrança automática'
WHERE credit_score >= 400
  AND approval_status IS NULL;

UPDATE "VMAX"
SET 
  approval_status = 'ACEITA_ESPECIAL',
  auto_collection_enabled = false,
  approval_reason = 'Score 300-399 (extraído do JSON) - Aprovado para cobrança manual'
WHERE credit_score >= 300 AND credit_score < 400
  AND approval_status IS NULL;

UPDATE "VMAX"
SET 
  approval_status = 'REJEITA',
  auto_collection_enabled = false,
  approval_reason = 'Score < 300 (extraído do JSON) - Rejeitado'
WHERE credit_score > 0 AND credit_score < 300
  AND approval_status IS NULL;

-- 6. Para registros sem análise: PENDENTE
UPDATE "VMAX"
SET 
  approval_status = 'PENDENTE',
  auto_collection_enabled = false,
  approval_reason = 'Aguardando análise de crédito'
WHERE approval_status IS NULL;

-- Exibir resumo
SELECT 
  approval_status,
  auto_collection_enabled,
  COUNT(*) as total,
  AVG(credit_score) as avg_score
FROM "VMAX"
GROUP BY approval_status, auto_collection_enabled
ORDER BY approval_status;
