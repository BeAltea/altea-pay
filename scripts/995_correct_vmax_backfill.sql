-- Corrige o backfill da tabela VMAX com o caminho JSON correto
-- Atualiza approval_status e auto_collection_enabled baseado no score da Assertiva

UPDATE "VMAX"
SET 
  credit_score = COALESCE(
    (analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->>'pontos')::numeric,
    0
  ),
  approval_status = CASE
    WHEN (analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->>'pontos')::numeric >= 400 THEN 'ACEITA'
    WHEN (analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->>'pontos')::numeric >= 300 THEN 'ACEITA_ESPECIAL'
    ELSE 'REJEITA'
  END,
  auto_collection_enabled = CASE
    WHEN (analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->>'pontos')::numeric >= 400 THEN true
    ELSE false
  END,
  updated_at = NOW()
WHERE 
  analysis_metadata IS NOT NULL
  AND analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->>'pontos' IS NOT NULL;

-- Verifica os resultados
SELECT 
  approval_status,
  auto_collection_enabled,
  COUNT(*) as total,
  ROUND(AVG(credit_score::numeric), 2) as avg_score,
  MIN(credit_score::numeric) as min_score,
  MAX(credit_score::numeric) as max_score
FROM "VMAX"
WHERE analysis_metadata IS NOT NULL
GROUP BY approval_status, auto_collection_enabled
ORDER BY approval_status;
