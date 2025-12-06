-- Backfill VMAX approval_status and auto_collection_enabled based on score
-- Extrai o score do caminho correto em analysis_metadata

UPDATE "VMAX"
SET 
  credit_score = COALESCE(
    (analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->>'pontos')::integer,
    0
  ),
  approval_status = CASE
    WHEN COALESCE((analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->>'pontos')::integer, 0) >= 400 THEN 'ACEITA'
    WHEN COALESCE((analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->>'pontos')::integer, 0) >= 300 THEN 'ACEITA_ESPECIAL'
    ELSE 'REJEITA'
  END,
  auto_collection_enabled = CASE
    WHEN COALESCE((analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->>'pontos')::integer, 0) >= 400 THEN true
    ELSE false
  END
WHERE analysis_metadata IS NOT NULL
  AND analysis_metadata->'assertiva_data' IS NOT NULL;

-- Verificar resultado
SELECT 
  approval_status,
  auto_collection_enabled,
  COUNT(*) as total,
  AVG(credit_score) as avg_score,
  MIN(credit_score) as min_score,
  MAX(credit_score) as max_score
FROM "VMAX"
GROUP BY approval_status, auto_collection_enabled
ORDER BY approval_status;
