-- Atualizar TODOS os clientes com score 0 para score 5
UPDATE "VMAX"
SET credit_score = 5
WHERE credit_score = 0
AND analysis_metadata IS NOT NULL;

-- Verificar quantos foram atualizados
SELECT 
  COUNT(*) as total_atualizados,
  STRING_AGG("Cliente", ', ') as clientes_atualizados
FROM "VMAX"
WHERE credit_score = 5
AND analysis_metadata IS NOT NULL;
