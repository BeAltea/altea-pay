-- Sincronizar dados de credit_profiles para VMAX
-- Este script pega todas as análises antigas da Assertiva e sincroniza com VMAX

UPDATE "VMAX" v
SET 
  credit_score = COALESCE(
    (cp.data_assertiva->'credito'->'resposta'->'score'->>'pontos')::integer,
    0
  ),
  approval_status = CASE 
    WHEN (cp.data_assertiva->'credito'->'resposta'->'score'->>'pontos')::integer >= 400 THEN 'ACEITA'
    WHEN (cp.data_assertiva->'credito'->'resposta'->'score'->>'pontos')::integer >= 300 THEN 'ACEITA_ESPECIAL'
    WHEN (cp.data_assertiva->'credito'->'resposta'->'score'->>'pontos')::integer > 0 THEN 'REJEITA'
    ELSE 'PENDENTE'
  END,
  auto_collection_enabled = CASE 
    WHEN (cp.data_assertiva->'credito'->'resposta'->'score'->>'pontos')::integer >= 400 THEN true
    ELSE false
  END,
  analysis_metadata = jsonb_build_object(
    'assertiva_data', cp.data_assertiva,
    'cliente_data', jsonb_build_object(
      'nome', cp.name,
      'documento', v."CPF/CNPJ"
    ),
    'sync_timestamp', NOW()
  )
FROM credit_profiles cp
WHERE v."CPF/CNPJ" = cp.document
  AND cp.data_assertiva IS NOT NULL
  AND cp.data_assertiva->'credito'->'resposta'->'score'->>'pontos' IS NOT NULL;

-- Exibir resumo do que foi sincronizado
SELECT 
  approval_status,
  auto_collection_enabled,
  COUNT(*) as total,
  ROUND(AVG((analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->>'pontos')::numeric), 2) as avg_score,
  MIN((analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->>'pontos')::integer) as min_score,
  MAX((analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->>'pontos')::integer) as max_score
FROM "VMAX"
WHERE analysis_metadata IS NOT NULL
GROUP BY approval_status, auto_collection_enabled
ORDER BY approval_status;
