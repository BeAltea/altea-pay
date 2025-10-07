-- =====================================================
-- SCRIPT DE ATIVAÇÃO DE ROW LEVEL SECURITY (RLS)
-- Sistema: CobrançaAuto (Altea Pay)
-- Objetivo: Implementar segurança multi-tenant
-- =====================================================

-- IMPORTANTE: Este script ativa RLS em todas as tabelas sensíveis
-- e cria políticas que garantem isolamento de dados por empresa (company_id)
-- mantendo login, cadastro e APIs funcionando normalmente.

-- =====================================================
-- 1. TABELA: profiles
-- Regra: Usuário só acessa o próprio perfil
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política de SELECT: Usuário vê apenas o próprio perfil
CREATE POLICY profiles_select ON profiles
FOR SELECT USING (
  auth.uid() = id 
  OR auth.role() = 'service_role'
);

-- Política de INSERT: Apenas service_role pode criar perfis (signup via API)
CREATE POLICY profiles_insert ON profiles
FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
);

-- Política de UPDATE: Usuário pode atualizar apenas o próprio perfil
CREATE POLICY profiles_update ON profiles
FOR UPDATE USING (
  auth.uid() = id 
  OR auth.role() = 'service_role'
);

-- Política de DELETE: Apenas service_role pode deletar perfis
CREATE POLICY profiles_delete ON profiles
FOR DELETE USING (
  auth.role() = 'service_role'
);

-- =====================================================
-- 2. TABELA: companies
-- Regra: Apenas admins e super_admins veem todas as empresas
-- Usuários comuns veem apenas a própria empresa
-- =====================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Política de SELECT: Ver apenas a própria empresa ou todas se for admin
CREATE POLICY companies_select ON companies
FOR SELECT USING (
  id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  OR auth.role() = 'service_role'
);

-- Política de INSERT: Apenas super_admin pode criar empresas
CREATE POLICY companies_insert ON companies
FOR INSERT WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  OR auth.role() = 'service_role'
);

-- Política de UPDATE: Apenas super_admin pode atualizar empresas
CREATE POLICY companies_update ON companies
FOR UPDATE USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  OR auth.role() = 'service_role'
);

-- Política de DELETE: Apenas super_admin pode deletar empresas
CREATE POLICY companies_delete ON companies
FOR DELETE USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  OR auth.role() = 'service_role'
);

-- =====================================================
-- 3. TABELA: customers
-- Regra: Ver apenas clientes da própria empresa
-- =====================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_select ON customers
FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

CREATE POLICY customers_insert ON customers
FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

CREATE POLICY customers_update ON customers
FOR UPDATE USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

CREATE POLICY customers_delete ON customers
FOR DELETE USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

-- =====================================================
-- 4. TABELA: clients
-- Regra: Ver apenas clientes da própria empresa
-- =====================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_select ON clients
FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

CREATE POLICY clients_insert ON clients
FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

CREATE POLICY clients_update ON clients
FOR UPDATE USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

CREATE POLICY clients_delete ON clients
FOR DELETE USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

-- =====================================================
-- 5. TABELA: debts
-- Regra: Ver apenas dívidas da própria empresa
-- =====================================================

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY debts_select ON debts
FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

CREATE POLICY debts_insert ON debts
FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

CREATE POLICY debts_update ON debts
FOR UPDATE USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

CREATE POLICY debts_delete ON debts
FOR DELETE USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

-- =====================================================
-- NOTA: debts_with_overdue é uma VIEW, não uma tabela
-- Views herdam automaticamente as políticas RLS das tabelas base
-- Portanto, não é necessário (nem possível) ativar RLS nela
-- =====================================================

-- =====================================================
-- 6. TABELA: payments
-- Regra: Ver apenas pagamentos da própria empresa
-- =====================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_select ON payments
FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

CREATE POLICY payments_insert ON payments
FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

CREATE POLICY payments_update ON payments
FOR UPDATE USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

CREATE POLICY payments_delete ON payments
FOR DELETE USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

-- =====================================================
-- 7. TABELA: agreements
-- Regra: Ver apenas acordos da própria empresa
-- =====================================================

ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY agreements_select ON agreements
FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

CREATE POLICY agreements_insert ON agreements
FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

CREATE POLICY agreements_update ON agreements
FOR UPDATE USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

CREATE POLICY agreements_delete ON agreements
FOR DELETE USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR auth.role() = 'service_role'
);

-- =====================================================
-- 8. TABELA: collection_rules
-- Regra: Ver apenas regras da própria empresa
-- Nota: Esta tabela não tem company_id, então vamos usar user_id
-- =====================================================

ALTER TABLE collection_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY collection_rules_select ON collection_rules
FOR SELECT USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  OR auth.role() = 'service_role'
);

CREATE POLICY collection_rules_insert ON collection_rules
FOR INSERT WITH CHECK (
  user_id = auth.uid()
  OR auth.role() = 'service_role'
);

CREATE POLICY collection_rules_update ON collection_rules
FOR UPDATE USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  OR auth.role() = 'service_role'
);

CREATE POLICY collection_rules_delete ON collection_rules
FOR DELETE USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  OR auth.role() = 'service_role'
);

-- =====================================================
-- 9. TABELA: collection_rule_steps
-- Regra: Ver apenas steps de regras da própria empresa
-- =====================================================

ALTER TABLE collection_rule_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY collection_rule_steps_select ON collection_rule_steps
FOR SELECT USING (
  rule_id IN (
    SELECT id FROM collection_rules 
    WHERE user_id IN (
      SELECT id FROM profiles 
      WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  )
  OR auth.role() = 'service_role'
);

CREATE POLICY collection_rule_steps_insert ON collection_rule_steps
FOR INSERT WITH CHECK (
  rule_id IN (
    SELECT id FROM collection_rules 
    WHERE user_id IN (
      SELECT id FROM profiles 
      WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  )
  OR auth.role() = 'service_role'
);

CREATE POLICY collection_rule_steps_update ON collection_rule_steps
FOR UPDATE USING (
  rule_id IN (
    SELECT id FROM collection_rules 
    WHERE user_id IN (
      SELECT id FROM profiles 
      WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  )
  OR auth.role() = 'service_role'
);

CREATE POLICY collection_rule_steps_delete ON collection_rule_steps
FOR DELETE USING (
  rule_id IN (
    SELECT id FROM collection_rules 
    WHERE user_id IN (
      SELECT id FROM profiles 
      WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  )
  OR auth.role() = 'service_role'
);

-- =====================================================
-- 10. TABELA: collection_actions
-- Regra: Ver apenas ações de cobrança da própria empresa
-- Nota: Esta tabela não tem company_id, então vamos usar debt_id
-- =====================================================

ALTER TABLE collection_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY collection_actions_select ON collection_actions
FOR SELECT USING (
  debt_id IN (
    SELECT id FROM debts 
    WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  OR auth.role() = 'service_role'
);

CREATE POLICY collection_actions_insert ON collection_actions
FOR INSERT WITH CHECK (
  debt_id IN (
    SELECT id FROM debts 
    WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  OR auth.role() = 'service_role'
);

CREATE POLICY collection_actions_update ON collection_actions
FOR UPDATE USING (
  debt_id IN (
    SELECT id FROM debts 
    WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  OR auth.role() = 'service_role'
);

CREATE POLICY collection_actions_delete ON collection_actions
FOR DELETE USING (
  debt_id IN (
    SELECT id FROM debts 
    WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  OR auth.role() = 'service_role'
);

-- =====================================================
-- 11. TABELA: data_imports
-- Regra: Ver apenas importações da própria empresa
-- Nota: Esta tabela não tem company_id, então vamos usar user_id
-- =====================================================

ALTER TABLE data_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY data_imports_select ON data_imports
FOR SELECT USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  OR auth.role() = 'service_role'
);

CREATE POLICY data_imports_insert ON data_imports
FOR INSERT WITH CHECK (
  user_id = auth.uid()
  OR auth.role() = 'service_role'
);

CREATE POLICY data_imports_update ON data_imports
FOR UPDATE USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  OR auth.role() = 'service_role'
);

CREATE POLICY data_imports_delete ON data_imports
FOR DELETE USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  OR auth.role() = 'service_role'
);

-- =====================================================
-- 12. TABELA: erp_integrations
-- Regra: Ver apenas integrações da própria empresa
-- Apenas admins podem gerenciar integrações
-- =====================================================

ALTER TABLE erp_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY erp_integrations_select ON erp_integrations
FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  OR auth.role() = 'service_role'
);

CREATE POLICY erp_integrations_insert ON erp_integrations
FOR INSERT WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  OR auth.role() = 'service_role'
);

CREATE POLICY erp_integrations_update ON erp_integrations
FOR UPDATE USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  OR auth.role() = 'service_role'
);

CREATE POLICY erp_integrations_delete ON erp_integrations
FOR DELETE USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  OR auth.role() = 'service_role'
);

-- =====================================================
-- 13. TABELA: integration_logs
-- Regra: Ver apenas logs de integrações da própria empresa
-- =====================================================

ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_logs_select ON integration_logs
FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  OR auth.role() = 'service_role'
);

CREATE POLICY integration_logs_insert ON integration_logs
FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
);

CREATE POLICY integration_logs_update ON integration_logs
FOR UPDATE USING (
  auth.role() = 'service_role'
);

CREATE POLICY integration_logs_delete ON integration_logs
FOR DELETE USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  OR auth.role() = 'service_role'
);

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

-- VERIFICAÇÃO: Para testar se RLS está ativo em todas as tabelas, execute:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- IMPORTANTE: Após aplicar este script:
-- 1. Teste o login e cadastro para garantir que continuam funcionando
-- 2. Teste operações CRUD em cada tabela
-- 3. Verifique se usuários de empresas diferentes não veem dados uns dos outros
-- 4. Confirme que super_admin pode ver todos os dados
-- 5. Verifique se APIs e rotinas automáticas continuam funcionando (service_role)
