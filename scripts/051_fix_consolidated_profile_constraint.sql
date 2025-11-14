-- ============================================
-- FIX: Permitir source='consolidated' na tabela credit_profiles
-- ============================================
-- Problema: A constraint credit_profiles_source_check só permite 'gov' e 'assertiva'
-- Mas o sistema precisa salvar perfis consolidados com source='consolidated'
-- Solução: Atualizar a constraint para incluir 'consolidated'

-- Remover constraint antiga
ALTER TABLE credit_profiles DROP CONSTRAINT IF EXISTS credit_profiles_source_check;

-- Criar nova constraint com 'consolidated' incluído
ALTER TABLE credit_profiles ADD CONSTRAINT credit_profiles_source_check 
  CHECK (source IN ('gov', 'assertiva', 'consolidated'));

-- Comentário explicativo
COMMENT ON CONSTRAINT credit_profiles_source_check ON credit_profiles IS 
  'Permite source: gov (análise gratuita governo), assertiva (análise paga), consolidated (ambas combinadas)';

-- Verificar registros que precisam ser atualizados
-- SELECT id, cpf, source, is_consolidated, created_at 
-- FROM credit_profiles 
-- WHERE is_consolidated = true AND source != 'consolidated';

-- Se houver registros com is_consolidated=true mas source != 'consolidated', corrija:
-- UPDATE credit_profiles 
-- SET source = 'consolidated'
-- WHERE is_consolidated = true AND source IN ('gov', 'assertiva');
