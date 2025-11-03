-- Script para corrigir customer_id em credit_profiles
-- Relaciona os registros de credit_profiles com VMAX usando CPF/CNPJ limpo

-- Atualiza os registros que têm customer_id NULL
UPDATE credit_profiles cp
SET customer_id = v.id
FROM "VMAX" v
WHERE cp.customer_id IS NULL
  AND REGEXP_REPLACE(v."CPF/CNPJ", '[^0-9]', '', 'g') = cp.cpf;

-- Mostra quantos registros foram atualizados
SELECT 
  COUNT(*) as total_corrigidos,
  'Registros corrigidos com sucesso!' as mensagem
FROM credit_profiles
WHERE customer_id IS NOT NULL;
