-- Script para limpar TODOS os dados fictícios/mockados do banco de dados
-- Execute este script para preparar o ambiente para produção

-- ATENÇÃO: Este script irá deletar TODOS os dados de teste
-- Certifique-se de fazer backup antes de executar

BEGIN;

-- 1. Deletar empresas fictícias (identificadas por CNPJs de teste ou emails de teste)
DELETE FROM companies 
WHERE 
  cnpj IN ('00.000.000/0000-00', '11.111.111/0001-11', '22.222.222/0001-22', '33.333.333/0001-33')
  OR email LIKE '%@test.com'
  OR email LIKE '%@exemplo.com'
  OR email LIKE '%@mock.com'
  OR name LIKE '%Test%'
  OR name LIKE '%Teste%'
  OR name LIKE '%Mock%'
  OR name LIKE '%Demo%';

-- 2. Deletar clientes fictícios (órfãos ou com documentos de teste)
DELETE FROM customers 
WHERE 
  document IN ('000.000.000-00', '111.111.111-11', '222.222.222-22', '333.333.333-33')
  OR email LIKE '%@test.com'
  OR email LIKE '%@exemplo.com'
  OR email LIKE '%@mock.com'
  OR name LIKE '%Test%'
  OR name LIKE '%Teste%'
  OR name LIKE '%Mock%'
  OR company_id IS NULL;

-- 3. Deletar dívidas órfãs (sem customer_id ou company_id válido)
DELETE FROM debts 
WHERE 
  customer_id IS NULL 
  OR company_id IS NULL
  OR customer_id NOT IN (SELECT id FROM customers)
  OR company_id NOT IN (SELECT id FROM companies);

-- 4. Deletar pagamentos órfãos
DELETE FROM payments 
WHERE 
  debt_id NOT IN (SELECT id FROM debts)
  OR company_id NOT IN (SELECT id FROM companies);

-- 5. Deletar acordos órfãos
DELETE FROM agreements 
WHERE 
  debt_id NOT IN (SELECT id FROM debts)
  OR customer_id NOT IN (SELECT id FROM customers)
  OR company_id NOT IN (SELECT id FROM companies);

-- 6. Deletar perfis de crédito órfãos
DELETE FROM credit_profiles 
WHERE 
  customer_id NOT IN (SELECT id FROM customers)
  OR company_id NOT IN (SELECT id FROM companies);

-- 7. Deletar ações de cobrança órfãs
DELETE FROM collection_actions 
WHERE 
  debt_id NOT IN (SELECT id FROM debts);

-- 8. Deletar logs de integração antigos (mais de 90 dias)
DELETE FROM integration_logs 
WHERE created_at < NOW() - INTERVAL '90 days';

-- 9. Deletar logs de análise antigos (mais de 90 dias)
DELETE FROM analysis_logs 
WHERE created_at < NOW() - INTERVAL '90 days';

-- 10. Deletar importações antigas (mais de 90 dias)
DELETE FROM data_imports 
WHERE created_at < NOW() - INTERVAL '90 days';

-- 11. Deletar triggers de análise completados (mais de 90 dias)
DELETE FROM analysis_triggers 
WHERE 
  status = 'completed' 
  AND completed_at < NOW() - INTERVAL '90 days';

COMMIT;

-- Verificar o que sobrou
SELECT 
  'companies' as table_name, COUNT(*) as count FROM companies
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'debts', COUNT(*) FROM debts
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'agreements', COUNT(*) FROM agreements
UNION ALL
SELECT 'credit_profiles', COUNT(*) FROM credit_profiles
UNION ALL
SELECT 'collection_actions', COUNT(*) FROM collection_actions;
