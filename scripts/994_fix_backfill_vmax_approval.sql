-- Corrigir preenchimento retroativo dos campos de aprovação automática na VMAX
-- Extrai o score do caminho correto: analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->'pontos'

DO $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Atualizar todos os registros na VMAX que têm analysis_metadata com assertiva_data
  UPDATE "VMAX"
  SET 
    credit_score = COALESCE(
      credit_score,
      CAST((analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->>'pontos') AS INTEGER)
    ),
    approval_status = CASE
      WHEN COALESCE(
        credit_score,
        CAST((analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->>'pontos') AS INTEGER)
      ) >= 400 THEN 'ACEITA'
      WHEN COALESCE(
        credit_score,
        CAST((analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->>'pontos') AS INTEGER)
      ) >= 300 THEN 'ACEITA_ESPECIAL'
      ELSE 'REJEITA'
    END,
    auto_collection_enabled = CASE
      WHEN COALESCE(
        credit_score,
        CAST((analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->>'pontos') AS INTEGER)
      ) >= 400 THEN true
      ELSE false
    END
  WHERE analysis_metadata IS NOT NULL
    AND analysis_metadata->'assertiva_data' IS NOT NULL
    AND analysis_metadata->'assertiva_data'->'credito'->'resposta'->'score'->'pontos' IS NOT NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE NOTICE 'Backfill concluído! % registros atualizados com approval_status e auto_collection_enabled', updated_count;
END $$;

-- Verificar o resultado
SELECT 
  approval_status,
  auto_collection_enabled,
  COUNT(*) as total,
  AVG(credit_score) as avg_score,
  MIN(credit_score) as min_score,
  MAX(credit_score) as max_score
FROM "VMAX"
WHERE analysis_metadata IS NOT NULL
GROUP BY approval_status, auto_collection_enabled
ORDER BY approval_status;
