-- ═══════════════════════════════════════════════════════════════════════════════
-- verification-queries.sql - Data Integrity Verification Queries
--
-- These queries are used to verify data integrity between Supabase and PostgreSQL.
-- Run them against both databases and compare results.
--
-- Supabase: psql "postgres://postgres.xxx:password@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"
-- PostgreSQL: psql "postgresql://altea:altea@localhost:5432/alteapay"
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 1 & 2: ROW COUNT VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════

\echo '═══════════════════════════════════════════════════════════════════════════════'
\echo 'PHASE 1 & 2: ROW COUNT VERIFICATION'
\echo '═══════════════════════════════════════════════════════════════════════════════'

-- All application tables with row counts
SELECT 'VMAX' as table_name, COUNT(*) as row_count FROM "VMAX"
UNION ALL SELECT 'companies', COUNT(*) FROM companies
UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL SELECT 'credit_profiles', COUNT(*) FROM credit_profiles
UNION ALL SELECT 'collection_actions', COUNT(*) FROM collection_actions
UNION ALL SELECT 'collection_rules', COUNT(*) FROM collection_rules
UNION ALL SELECT 'collection_rule_executions', COUNT(*) FROM collection_rule_executions
UNION ALL SELECT 'collection_rule_steps', COUNT(*) FROM collection_rule_steps
UNION ALL SELECT 'collection_tasks', COUNT(*) FROM collection_tasks
UNION ALL SELECT 'integration_logs', COUNT(*) FROM integration_logs
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'security_events', COUNT(*) FROM security_events
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'debts', COUNT(*) FROM debts
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'agreements', COUNT(*) FROM agreements
UNION ALL SELECT 'data_imports', COUNT(*) FROM data_imports
UNION ALL SELECT 'erp_integrations', COUNT(*) FROM erp_integrations
UNION ALL SELECT 'analysis_logs', COUNT(*) FROM analysis_logs
UNION ALL SELECT 'analysis_triggers', COUNT(*) FROM analysis_triggers
ORDER BY table_name;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 3: CRITICAL DATA VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════════'
\echo 'PHASE 3: CRITICAL DATA VERIFICATION'
\echo '═══════════════════════════════════════════════════════════════════════════════'

-- 3.1 Financial Data Verification
-- Run on Supabase (uses Vencido column)
\echo ''
\echo '3.1 Financial Data - Supabase Version (use Vencido column):'
/*
SELECT
  COUNT(*) as total_records,
  COUNT(NULLIF("Vencido", '')) as non_empty_vencido,
  COUNT(*) - COUNT(NULLIF("Vencido", '')) as empty_vencido,
  COALESCE(SUM(
    CASE WHEN "Vencido" ~ 'R\$' THEN
      REPLACE(REPLACE(REGEXP_REPLACE("Vencido", 'R\$ ', ''), '.', ''), ',', '.')::numeric
    ELSE 0 END
  ), 0)::numeric(15,2) as sum_vencido,
  COALESCE(MIN(
    CASE WHEN "Vencido" ~ 'R\$' AND "Vencido" != 'R$ 0,00' THEN
      REPLACE(REPLACE(REGEXP_REPLACE("Vencido", 'R\$ ', ''), '.', ''), ',', '.')::numeric
    ELSE NULL END
  ), 0)::numeric(15,2) as min_vencido,
  COALESCE(MAX(
    CASE WHEN "Vencido" ~ 'R\$' THEN
      REPLACE(REPLACE(REGEXP_REPLACE("Vencido", 'R\$ ', ''), '.', ''), ',', '.')::numeric
    ELSE 0 END
  ), 0)::numeric(15,2) as max_vencido
FROM public."VMAX";
*/

-- Run on PostgreSQL (uses Valor_Total column)
\echo '3.1 Financial Data - PostgreSQL Version (uses Valor_Total column):'
SELECT
  COUNT(*) as total_records,
  COUNT(NULLIF("Valor_Total", '')) as non_empty_valor_total,
  COUNT(*) - COUNT(NULLIF("Valor_Total", '')) as empty_valor_total,
  COALESCE(SUM(
    CASE WHEN "Valor_Total" ~ 'R\$' THEN
      REPLACE(REPLACE(REGEXP_REPLACE("Valor_Total", 'R\$ ', ''), '.', ''), ',', '.')::numeric
    ELSE 0 END
  ), 0)::numeric(15,2) as sum_valor_total,
  COALESCE(MIN(
    CASE WHEN "Valor_Total" ~ 'R\$' AND "Valor_Total" != 'R$ 0,00' THEN
      REPLACE(REPLACE(REGEXP_REPLACE("Valor_Total", 'R\$ ', ''), '.', ''), ',', '.')::numeric
    ELSE NULL END
  ), 0)::numeric(15,2) as min_valor_total,
  COALESCE(MAX(
    CASE WHEN "Valor_Total" ~ 'R\$' THEN
      REPLACE(REPLACE(REGEXP_REPLACE("Valor_Total", 'R\$ ', ''), '.', ''), ',', '.')::numeric
    ELSE 0 END
  ), 0)::numeric(15,2) as max_valor_total
FROM "VMAX";

-- 3.2 Critical Cases Verification
\echo ''
\echo '3.2 Critical Cases (Delinquency Days):'
SELECT
  COUNT(*) as total_records,
  COUNT(NULLIF("Maior_Atraso", '')) as with_maior_atraso,
  COUNT(*) - COUNT(NULLIF("Maior_Atraso", '')) as without_maior_atraso
FROM "VMAX";

-- 3.3 Date Verification
\echo ''
\echo '3.3 Date Verification (First Due Date):'
SELECT
  COUNT(*) as total_records,
  COUNT(NULLIF("Primeira_Vencida", '')) as with_primeira_vencida,
  COUNT(*) - COUNT(NULLIF("Primeira_Vencida", '')) as without_primeira_vencida
FROM "VMAX";

-- 3.4 Admin Verification
\echo ''
\echo '3.4 Admin Count by Role:'
SELECT role, COUNT(*) as count
FROM profiles
WHERE role IN ('admin', 'super_admin')
GROUP BY role
ORDER BY role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 4: REFERENTIAL INTEGRITY
-- ═══════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════════'
\echo 'PHASE 4: REFERENTIAL INTEGRITY'
\echo '═══════════════════════════════════════════════════════════════════════════════'

-- Check for orphaned VMAX records (company doesn't exist)
\echo ''
\echo '4.1 Orphaned VMAX records (invalid company_id):'
SELECT COUNT(*) as orphaned_vmax_records
FROM "VMAX" v
WHERE v.id_company IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = v.id_company);

-- Check for orphaned profiles (user doesn't exist)
\echo ''
\echo '4.2 Orphaned profiles (invalid user_id):'
SELECT COUNT(*) as orphaned_profiles
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.id);

-- Check for orphaned notifications (user doesn't exist)
\echo ''
\echo '4.3 Orphaned notifications (invalid user_id):'
SELECT COUNT(*) as orphaned_notifications
FROM notifications n
WHERE n.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = n.user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 5: HASH-BASED VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════════'
\echo 'PHASE 5: HASH-BASED VERIFICATION'
\echo '═══════════════════════════════════════════════════════════════════════════════'

-- VMAX table hash (PostgreSQL version)
\echo ''
\echo '5.1 VMAX Data Hash (all records):'
SELECT md5(string_agg(
  COALESCE(id::text, '') || '|' ||
  COALESCE("Cliente", '') || '|' ||
  COALESCE("CPF/CNPJ", '') || '|' ||
  COALESCE("Cidade", '') || '|' ||
  COALESCE("Valor_Total", '') || '|' ||
  COALESCE("Maior_Atraso", '') || '|' ||
  COALESCE("Primeira_Vencida", ''),
  ',' ORDER BY id
)) as vmax_hash
FROM "VMAX";

-- Credit profiles hash
\echo ''
\echo '5.2 Credit Profiles Data Hash:'
SELECT md5(string_agg(
  COALESCE(id::text, '') || '|' ||
  COALESCE(cpf, '') || '|' ||
  COALESCE(name, '') || '|' ||
  COALESCE(score::text, ''),
  ',' ORDER BY id
)) as credit_profiles_hash
FROM credit_profiles;

-- Collection actions hash
\echo ''
\echo '5.3 Collection Actions Data Hash:'
SELECT md5(string_agg(
  COALESCE(id::text, '') || '|' ||
  COALESCE(customer_id::text, '') || '|' ||
  COALESCE(action_type, '') || '|' ||
  COALESCE(status, ''),
  ',' ORDER BY id
)) as collection_actions_hash
FROM collection_actions;

-- Collection rules hash
\echo ''
\echo '5.4 Collection Rules Data Hash:'
SELECT md5(string_agg(
  COALESCE(id::text, '') || '|' ||
  COALESCE(name, '') || '|' ||
  COALESCE(trigger_days::text, '') || '|' ||
  COALESCE(is_active::text, ''),
  ',' ORDER BY id
)) as collection_rules_hash
FROM collection_rules;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 6: CRITICAL METRICS VALIDATION
-- ═══════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════════'
\echo 'PHASE 6: CRITICAL METRICS VALIDATION'
\echo '═══════════════════════════════════════════════════════════════════════════════'

\echo ''
\echo 'Critical Metrics Summary:'
SELECT
  'Total Clientes' as metric,
  3205 as expected,
  (SELECT COUNT(*) FROM "VMAX") as actual,
  CASE WHEN (SELECT COUNT(*) FROM "VMAX") = 3205 THEN '✓ PASS' ELSE '✗ FAIL' END as status
UNION ALL
SELECT
  'Valor Total (R$)',
  838390.96,
  COALESCE((
    SELECT SUM(
      CASE WHEN "Valor_Total" ~ 'R\$' THEN
        REPLACE(REPLACE(REGEXP_REPLACE("Valor_Total", 'R\$ ', ''), '.', ''), ',', '.')::numeric
      ELSE 0 END
    )
    FROM "VMAX"
    WHERE "Valor_Total" IS NOT NULL
  ), 0)::numeric(15,2),
  CASE WHEN ABS(COALESCE((
    SELECT SUM(
      CASE WHEN "Valor_Total" ~ 'R\$' THEN
        REPLACE(REPLACE(REGEXP_REPLACE("Valor_Total", 'R\$ ', ''), '.', ''), ',', '.')::numeric
      ELSE 0 END
    )
    FROM "VMAX"
    WHERE "Valor_Total" IS NOT NULL
  ), 0) - 838390.96) < 1 THEN '✓ PASS' ELSE '✗ FAIL' END
UNION ALL
SELECT
  'Casos Críticos',
  3205,
  (SELECT COUNT(*) FROM "VMAX" WHERE "Maior_Atraso" IS NOT NULL AND "Maior_Atraso" != ''),
  CASE WHEN (SELECT COUNT(*) FROM "VMAX" WHERE "Maior_Atraso" IS NOT NULL AND "Maior_Atraso" != '') = 3205 THEN '✓ PASS' ELSE '✗ FAIL' END
UNION ALL
SELECT
  'Dívidas Ativas',
  3205,
  (SELECT COUNT(*) FROM "VMAX" WHERE "Valor_Total" IS NOT NULL AND "Valor_Total" != ''),
  CASE WHEN (SELECT COUNT(*) FROM "VMAX" WHERE "Valor_Total" IS NOT NULL AND "Valor_Total" != '') = 3205 THEN '✓ PASS' ELSE '✗ FAIL' END
UNION ALL
SELECT
  'Administradores',
  5,
  (SELECT COUNT(*) FROM profiles WHERE role IN ('admin', 'super_admin')),
  CASE WHEN (SELECT COUNT(*) FROM profiles WHERE role IN ('admin', 'super_admin')) = 5 THEN '✓ PASS' ELSE '✗ FAIL' END;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════════'
\echo 'VERIFICATION COMPLETE'
\echo '═══════════════════════════════════════════════════════════════════════════════'
