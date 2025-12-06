-- Sincronizar análises antigas de credit_profiles para VMAX
-- Usa a coluna 'cpf' para fazer o join com "CPF/CNPJ" da VMAX

UPDATE "VMAX" AS v
SET 
  credit_score = CAST((cp.data_assertiva->'credito'->'resposta'->'score'->>'pontos') AS INTEGER),
  approval_status = CASE
    WHEN CAST((cp.data_assertiva->'credito'->'resposta'->'score'->>'pontos') AS INTEGER) >= 400 THEN 'ACEITA'
    WHEN CAST((cp.data_assertiva->'credito'->'resposta'->'score'->>'pontos') AS INTEGER) >= 300 THEN 'ACEITA_ESPECIAL'
    ELSE 'REJEITA'
  END,
  auto_collection_enabled = CASE
    WHEN CAST((cp.data_assertiva->'credito'->'resposta'->'score'->>'pontos') AS INTEGER) >= 400 THEN true
    ELSE false
  END,
  analysis_metadata = jsonb_build_object(
    'assertiva_data', cp.data_assertiva,
    'cliente_data', jsonb_build_object(
      'nome', cp.name,
      'cpf', cp.cpf,
      'cidade', cp.city
    ),
    'sync_date', NOW()
  )
FROM credit_profiles AS cp
WHERE v."CPF/CNPJ" = cp.cpf
  AND cp.data_assertiva IS NOT NULL
  AND cp.data_assertiva->'credito'->'resposta'->'score'->>'pontos' IS NOT NULL;

-- Exibir resultado da sincronização
SELECT 
  approval_status,
  auto_collection_enabled,
  COUNT(*) as total,
  AVG(credit_score) as avg_score,
  MIN(credit_score) as min_score,
  MAX(credit_score) as max_score
FROM "VMAX"
WHERE approval_status IS NOT NULL
GROUP BY approval_status, auto_collection_enabled
ORDER BY approval_status;
