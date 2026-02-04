-- ═══════════════════════════════════════════════════════════════════════════════
-- verify-migration.sql - Migration Verification Queries
--
-- Run this file against the LOCAL database to verify migration success:
--   psql postgresql://altea:altea@localhost:5432/alteapay -f scripts/verify-migration.sql
--
-- Expected Results:
--   - Total Clientes: 3,205
--   - Valor Total em Cobrança: R$ 838,390.96
--   - Casos Críticos: 3,205
--   - Dívidas Ativas: 3,205
--   - Administradores Ativos: 3 (+ 1 script-created = 4 in UI)
-- ═══════════════════════════════════════════════════════════════════════════════

\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'MIGRATION VERIFICATION REPORT'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''

-- ───────────────────────────────────────────────────────────────────────────────
-- 1. Total Clientes (VMAX records)
-- Expected: 3,205
-- ───────────────────────────────────────────────────────────────────────────────
\echo '1. Total Clientes'
\echo '   Expected: 3,205'
SELECT
  COUNT(*) as total_clientes,
  CASE
    WHEN COUNT(*) = 3205 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM "VMAX";

-- ───────────────────────────────────────────────────────────────────────────────
-- 2. Total Administradores Ativos
-- Expected: 3 (from Supabase) + 1 (script superadmin) = 4 total
-- ───────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '2. Administradores Ativos'
\echo '   Expected: 3 (from Supabase) + 1 (script superadmin) = 4'
SELECT
  COUNT(*) as total_admins,
  CASE
    WHEN COUNT(*) >= 3 AND COUNT(*) <= 4 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM profiles
WHERE role IN ('admin', 'super_admin');

-- ───────────────────────────────────────────────────────────────────────────────
-- 3. Valor Total em Cobrança (CRITICAL)
-- Expected: R$ 838,390.96
-- ───────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '3. Valor Total em Cobrança (CRITICAL)'
\echo '   Expected: R$ 838,390.96'
SELECT
  'R$ ' || TO_CHAR(
    COALESCE(SUM(
      CASE
        WHEN "Valor_Total" ~ 'R\$' THEN
          REPLACE(REPLACE(REGEXP_REPLACE("Valor_Total", 'R\$ ', ''), '.', ''), ',', '.')::numeric
        ELSE 0
      END
    ), 0),
    'FM999,999,999.00'
  ) as valor_total_cobranca,
  CASE
    WHEN ABS(COALESCE(SUM(
      CASE
        WHEN "Valor_Total" ~ 'R\$' THEN
          REPLACE(REPLACE(REGEXP_REPLACE("Valor_Total", 'R\$ ', ''), '.', ''), ',', '.')::numeric
        ELSE 0
      END
    ), 0) - 838390.96) < 1 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM "VMAX"
WHERE "Valor_Total" IS NOT NULL AND "Valor_Total" != '';

-- ───────────────────────────────────────────────────────────────────────────────
-- 4. Casos Críticos (CRITICAL)
-- Expected: 3,205 (all records with Maior_Atraso)
-- ───────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '4. Casos Críticos (CRITICAL)'
\echo '   Expected: 3,205'
SELECT
  COUNT(*) as casos_criticos,
  CASE
    WHEN COUNT(*) = 3205 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM "VMAX"
WHERE "Maior_Atraso" IS NOT NULL AND "Maior_Atraso" != '';

-- ───────────────────────────────────────────────────────────────────────────────
-- 5. Dívidas Ativas
-- Expected: 3,205 (same as total clientes for this dataset)
-- ───────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '5. Dívidas Ativas'
\echo '   Expected: 3,205'
SELECT
  COUNT(*) as dividas_ativas,
  CASE
    WHEN COUNT(*) = 3205 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM "VMAX"
WHERE "Valor_Total" IS NOT NULL AND "Valor_Total" != '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- Additional Diagnostics
-- ═══════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'ADDITIONAL DIAGNOSTICS'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''

-- Sample VMAX data to verify columns are populated
\echo 'Sample VMAX data (first 5 records):'
SELECT
  "Cliente",
  "Valor_Total",
  "Maior_Atraso",
  "Primeira_Vencida"
FROM "VMAX"
LIMIT 5;

\echo ''
\echo 'Column population statistics:'
SELECT
  'Valor_Total' as column_name,
  COUNT(*) as total_records,
  COUNT(NULLIF("Valor_Total", '')) as records_with_data,
  ROUND(100.0 * COUNT(NULLIF("Valor_Total", '')) / NULLIF(COUNT(*), 0), 1) as pct_populated
FROM "VMAX"
UNION ALL
SELECT
  'Maior_Atraso',
  COUNT(*),
  COUNT(NULLIF("Maior_Atraso", '')),
  ROUND(100.0 * COUNT(NULLIF("Maior_Atraso", '')) / NULLIF(COUNT(*), 0), 1)
FROM "VMAX"
UNION ALL
SELECT
  'Primeira_Vencida',
  COUNT(*),
  COUNT(NULLIF("Primeira_Vencida", '')),
  ROUND(100.0 * COUNT(NULLIF("Primeira_Vencida", '')) / NULLIF(COUNT(*), 0), 1)
FROM "VMAX";

\echo ''
\echo 'Table row counts:'
SELECT 'companies' as table_name, COUNT(*) as rows FROM companies
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL SELECT 'VMAX', COUNT(*) FROM "VMAX"
UNION ALL SELECT 'credit_profiles', COUNT(*) FROM credit_profiles
UNION ALL SELECT 'collection_rules', COUNT(*) FROM collection_rules
UNION ALL SELECT 'collection_actions', COUNT(*) FROM collection_actions
ORDER BY 1;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'VERIFICATION COMPLETE'
\echo '═══════════════════════════════════════════════════════════════════════════'
