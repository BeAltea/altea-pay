-- =====================================================
-- SCRIPT DE CONFIGURAÇÃO COMPLETA DO BANCO DE DADOS
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- PASSO 1: LIMPAR TODOS OS DADOS FICTÍCIOS/DE TESTE
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE 'Iniciando limpeza de dados fictícios...';
END $$;

-- Deletar dados de todas as tabelas (ordem importa por causa das foreign keys)
DELETE FROM collection_actions;
DELETE FROM collection_rule_steps;
DELETE FROM collection_rules;
DELETE FROM integration_logs;
DELETE FROM analysis_logs;
DELETE FROM analysis_triggers;
DELETE FROM base_import_exports;
DELETE FROM data_imports;
DELETE FROM erp_integrations;
DELETE FROM payments;
DELETE FROM agreements;
DELETE FROM credit_profiles;
DELETE FROM debts;
DELETE FROM customers;
DELETE FROM clients;
DELETE FROM profiles WHERE role != 'super_admin'; -- Mantém apenas super admins
DELETE FROM companies;

DO $$ 
BEGIN
  RAISE NOTICE 'Dados fictícios removidos com sucesso!';
END $$;

-- PASSO 2: CONFIGURAR POLÍTICAS DE RLS (ROW LEVEL SECURITY)
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE 'Configurando políticas de RLS...';
END $$;

-- Habilitar RLS em todas as tabelas
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_rule_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_import_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_logs ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "service_role_all" ON companies;
DROP POLICY IF EXISTS "service_role_all" ON customers;
DROP POLICY IF EXISTS "service_role_all" ON debts;
DROP POLICY IF EXISTS "service_role_all" ON profiles;
DROP POLICY IF EXISTS "service_role_all" ON payments;
DROP POLICY IF EXISTS "service_role_all" ON agreements;
DROP POLICY IF EXISTS "service_role_all" ON clients;
DROP POLICY IF EXISTS "service_role_all" ON credit_profiles;

-- Criar políticas que permitem acesso total ao service_role (admin client)
-- Isso garante que o código com createAdminClient() possa inserir/ler/atualizar/deletar

CREATE POLICY "service_role_all" ON companies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all" ON customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all" ON debts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all" ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all" ON payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all" ON agreements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all" ON clients
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all" ON credit_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all" ON collection_rules
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all" ON collection_rule_steps
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all" ON collection_actions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all" ON erp_integrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all" ON integration_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all" ON data_imports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all" ON base_import_exports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all" ON analysis_triggers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all" ON analysis_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DO $$ 
BEGIN
  RAISE NOTICE 'Políticas de RLS configuradas com sucesso!';
END $$;

-- PASSO 3: VERIFICAR CONFIGURAÇÃO
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'CONFIGURAÇÃO COMPLETA!';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '1. Faça login como super_admin';
  RAISE NOTICE '2. Crie uma nova empresa';
  RAISE NOTICE '3. Importe a base de clientes';
  RAISE NOTICE '4. Verifique se os dados aparecem corretamente';
  RAISE NOTICE '=====================================================';
END $$;
