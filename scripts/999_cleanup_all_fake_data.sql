-- Script para limpar TODOS os dados fictícios do banco de dados
-- Execute este script no SQL Editor do Supabase

-- ATENÇÃO: Este script deleta TODOS os dados das tabelas principais
-- Use apenas se quiser começar do zero com dados reais

BEGIN;

-- Deletar dados de tabelas dependentes primeiro (ordem importa por causa das foreign keys)
DELETE FROM payments;
DELETE FROM agreements;
DELETE FROM debts;
DELETE FROM customers;
DELETE FROM collection_actions;
DELETE FROM collection_rule_steps;
DELETE FROM collection_rules;
DELETE FROM analysis_logs;
DELETE FROM analysis_triggers;
DELETE FROM integration_logs;
DELETE FROM erp_integrations;
DELETE FROM credit_profiles;
DELETE FROM data_imports;
DELETE FROM base_import_exports;

-- Deletar empresas (exceto se houver alguma que você quer manter)
-- Se quiser manter alguma empresa específica, comente a linha abaixo e use:
-- DELETE FROM companies WHERE name LIKE '%teste%' OR name LIKE '%demo%';
DELETE FROM companies;

-- Deletar perfis de usuários que não são super_admin
-- Mantém apenas os super admins
DELETE FROM profiles WHERE role != 'super_admin';

-- Resetar os contadores de ID (opcional)
-- Isso faz com que os próximos IDs comecem do 1 novamente
ALTER SEQUENCE IF EXISTS companies_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS customers_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS debts_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS agreements_id_seq RESTART WITH 1;

-- Mostrar contagem final de registros
SELECT 
  'companies' as tabela, 
  COUNT(*) as registros 
FROM companies
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'debts', COUNT(*) FROM debts
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'agreements', COUNT(*) FROM agreements
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles;

COMMIT;

-- Relatório de limpeza:
-- Este script deletou TODOS os dados das seguintes tabelas:
-- - payments
-- - agreements
-- - debts
-- - customers
-- - collection_actions
-- - collection_rule_steps
-- - collection_rules
-- - analysis_logs
-- - analysis_triggers
-- - integration_logs
-- - erp_integrations
-- - credit_profiles
-- - data_imports
-- - base_import_exports
-- - companies
-- - profiles (exceto super_admin)
--
-- O banco de dados está agora limpo e pronto para dados reais de produção.
