-- Atualizar todos os clientes com score 0 para score 5
-- Isso garante que a regra de "score 0 = score 5" seja aplicada em análises antigas

UPDATE "VMAX"
SET credit_score = 5
WHERE credit_score = 0;

-- Atualizar também na tabela credit_profiles
UPDATE credit_profiles
SET 
  score = 5,
  score_assertiva = 5
WHERE score = 0 OR score_assertiva = 0;

-- Log das mudanças
SELECT 
  'VMAX' as tabela,
  COUNT(*) as registros_atualizados
FROM "VMAX"
WHERE credit_score = 5;
