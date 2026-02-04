#!/bin/bash
set -euo pipefail

###############################################################################
# Migrate data from Supabase PostgreSQL to local Docker PostgreSQL
#
# Usage: docker compose exec postgres bash /scripts/migrate-supabase-to-docker.sh
#
# This script:
#   1. Connects to both Supabase (source) and local (target) databases
#   2. Exports each table as CSV from Supabase
#   3. Imports into local tables with column mapping via SQL transforms
###############################################################################

# --- Connection strings ---
SUPABASE_URL="postgres://postgres.hpjzlmurljxzwjtwcbkz:tsDJsPBA9MiBtyES@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
LOCAL_URL="postgresql://altea:altea@localhost:5432/alteapay"

TMPDIR="/tmp/migration"
mkdir -p "$TMPDIR"

echo "============================================"
echo "  Supabase -> Docker PostgreSQL Migration"
echo "============================================"

# --- Test connections ---
echo ""
echo "[1/4] Testing connections..."
psql "$SUPABASE_URL" -c "SELECT 1" > /dev/null 2>&1 || { echo "ERROR: Cannot connect to Supabase"; exit 1; }
echo "  Supabase: OK"
psql "$LOCAL_URL" -c "SELECT 1" > /dev/null 2>&1 || { echo "ERROR: Cannot connect to local DB"; exit 1; }
echo "  Local:    OK"

# --- Disable FK constraints and truncate ---
echo ""
echo "[2/4] Preparing local database (truncating tables)..."
psql "$LOCAL_URL" <<'SQL'
SET session_replication_role = 'replica';

TRUNCATE TABLE security_events CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE integration_logs CASCADE;
TRUNCATE TABLE erp_integration_logs CASCADE;
TRUNCATE TABLE erp_integrations CASCADE;
TRUNCATE TABLE data_imports CASCADE;
TRUNCATE TABLE collection_actions CASCADE;
TRUNCATE TABLE collection_tasks CASCADE;
TRUNCATE TABLE collection_rule_executions CASCADE;
TRUNCATE TABLE collection_rule_steps CASCADE;
TRUNCATE TABLE collection_rules CASCADE;
TRUNCATE TABLE credit_profiles CASCADE;
TRUNCATE TABLE analysis_triggers CASCADE;
TRUNCATE TABLE analysis_logs CASCADE;
TRUNCATE TABLE negotiations CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE agreements CASCADE;
TRUNCATE TABLE debts CASCADE;
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE "VMAX" CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE password_reset_tokens CASCADE;
TRUNCATE TABLE sessions CASCADE;
TRUNCATE TABLE accounts CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE companies CASCADE;

SET session_replication_role = 'origin';
SQL
echo "  All tables truncated."

# --- Export from Supabase and import to local ---
echo ""
echo "[3/4] Migrating data..."

# Helper: export a query result as CSV from Supabase
export_csv() {
  local name="$1"
  local query="$2"
  echo "  Exporting: $name"
  psql "$SUPABASE_URL" -c "\COPY ($query) TO '$TMPDIR/${name}.csv' WITH (FORMAT csv, HEADER true, NULL '')"
}

# Helper: import CSV into local table
import_csv() {
  local name="$1"
  local table="$2"
  local columns="$3"
  local count
  echo "  Importing: $name -> $table"
  psql "$LOCAL_URL" <<EOPSQL
SET session_replication_role = 'replica';
\COPY ${table}(${columns}) FROM '$TMPDIR/${name}.csv' WITH (FORMAT csv, HEADER true, NULL '')
SET session_replication_role = 'origin';
EOPSQL
  count=$(psql "$LOCAL_URL" -t -c "SELECT count(*) FROM $table;")
  echo "    Rows: $count"
}

# -------------------------------------------------------
# 1. companies (must be first - referenced by FK)
# -------------------------------------------------------
export_csv "companies" "
SELECT
  id,
  name,
  cnpj,
  email,
  phone,
  address,
  city,
  state,
  zip_code,
  sector,
  customer_table_name,
  created_at,
  updated_at
FROM public.companies
"
import_csv "companies" "companies" \
  "id,name,cnpj,email,phone,address,city,state,zip_code,sector,customer_table_name,created_at,updated_at"

# -------------------------------------------------------
# 2. auth.users -> users
# -------------------------------------------------------
export_csv "users" "
SELECT
  id,
  email,
  email_confirmed_at,
  encrypted_password,
  COALESCE(raw_user_meta_data->>'full_name', '') as name,
  created_at,
  updated_at
FROM auth.users
"
import_csv "users" "users" \
  "id,email,email_verified,password_hash,name,created_at,updated_at"

# -------------------------------------------------------
# 3. profiles
# -------------------------------------------------------
export_csv "profiles" "
SELECT
  id,
  email,
  full_name,
  role::text as role,
  company_id,
  phone,
  cpf_cnpj,
  person_type,
  created_at,
  updated_at
FROM public.profiles
"
# Import via temp table to add default 'status' (all in one psql session)
echo "  Importing: profiles -> profiles"
psql "$LOCAL_URL" <<EOPSQL
CREATE TEMP TABLE tmp_profiles (
  id uuid,
  email text,
  full_name text,
  role text,
  company_id uuid,
  phone text,
  cpf_cnpj text,
  person_type text,
  created_at timestamptz,
  updated_at timestamptz
);
\COPY tmp_profiles FROM '$TMPDIR/profiles.csv' WITH (FORMAT csv, HEADER true, NULL '')
SET session_replication_role = 'replica';
INSERT INTO profiles (id, email, full_name, role, company_id, phone, cpf_cnpj, person_type, status, created_at, updated_at)
SELECT id, email, full_name, COALESCE(role, 'user'), company_id, phone, cpf_cnpj, person_type, 'active', created_at, updated_at
FROM tmp_profiles;
DROP TABLE tmp_profiles;
SET session_replication_role = 'origin';
EOPSQL
count=$(psql "$LOCAL_URL" -t -c "SELECT count(*) FROM profiles;")
echo "    Rows: $count"

# -------------------------------------------------------
# 4. VMAX
# -------------------------------------------------------
export_csv "vmax" "
SELECT
  id,
  id_company,
  \"Cliente\",
  \"CPF/CNPJ\",
  \"Cidade\",
  credit_score,
  risk_level,
  approval_status,
  auto_collection_enabled,
  analysis_metadata,
  last_analysis_date,
  collection_processed_at,
  last_collection_attempt,
  created_at,
  updated_at
FROM public.\"VMAX\"
"
import_csv "vmax" '"VMAX"' \
  "id,id_company,\"Cliente\",\"CPF/CNPJ\",\"Cidade\",credit_score,risk_level,approval_status,auto_collection_enabled,analysis_metadata,last_analysis_date,collection_processed_at,last_collection_attempt,created_at,updated_at"

# -------------------------------------------------------
# 5. credit_profiles
# -------------------------------------------------------
export_csv "credit_profiles" "
SELECT
  id,
  company_id,
  customer_id,
  cpf,
  name,
  score,
  risk_level,
  data,
  source as provider,
  analysis_type,
  status,
  data_assertiva as metadata,
  created_at,
  updated_at
FROM public.credit_profiles
"
import_csv "credit_profiles" "credit_profiles" \
  "id,company_id,customer_id,cpf,name,score,risk_level,data,provider,analysis_type,status,metadata,created_at,updated_at"

# -------------------------------------------------------
# 6. collection_actions
# -------------------------------------------------------
export_csv "collection_actions" "
SELECT
  id,
  customer_id,
  company_id,
  action_type,
  status,
  message,
  metadata,
  created_at
FROM public.collection_actions
"
import_csv "collection_actions" "collection_actions" \
  "id,customer_id,company_id,action_type,status,message,metadata,created_at"

# -------------------------------------------------------
# 7. collection_rules
# -------------------------------------------------------
export_csv "collection_rules" "
SELECT
  id,
  COALESCE(company_id, (SELECT id FROM public.companies LIMIT 1)) as company_id,
  name,
  description,
  trigger_days,
  message_template,
  is_active,
  created_at,
  updated_at
FROM public.collection_rules
"
import_csv "collection_rules" "collection_rules" \
  "id,company_id,name,description,trigger_days,message_template,is_active,created_at,updated_at"

# -------------------------------------------------------
# 8. integration_logs
# -------------------------------------------------------
export_csv "integration_logs" "
SELECT
  id,
  company_id,
  operation as action,
  status,
  details,
  created_at
FROM public.integration_logs
"
import_csv "integration_logs" "integration_logs" \
  "id,company_id,action,status,details,created_at"

# -------------------------------------------------------
# 9. notifications
# -------------------------------------------------------
export_csv "notifications" "
SELECT
  id,
  company_id,
  user_id,
  title,
  description as message,
  type,
  COALESCE(read, false) as is_read,
  created_at
FROM public.notifications
"
import_csv "notifications" "notifications" \
  "id,company_id,user_id,title,message,type,is_read,created_at"

# -------------------------------------------------------
# 10. security_events
# -------------------------------------------------------
export_csv "security_events" "
SELECT
  id,
  company_id,
  user_id,
  event_type,
  action,
  resource_type as resource,
  resource_id::text as resource_id,
  ip_address,
  user_agent,
  severity,
  metadata,
  created_at
FROM public.security_events
"
import_csv "security_events" "security_events" \
  "id,company_id,user_id,event_type,action,resource,resource_id,ip_address,user_agent,severity,metadata,created_at"

# --- Verification ---
echo ""
echo "[4/4] Verification..."
echo ""
echo "  Row counts (local):"
psql "$LOCAL_URL" -t -c "
SELECT 'companies' as tbl, count(*) FROM companies
UNION ALL SELECT 'users', count(*) FROM users
UNION ALL SELECT 'profiles', count(*) FROM profiles
UNION ALL SELECT 'VMAX', count(*) FROM \"VMAX\"
UNION ALL SELECT 'credit_profiles', count(*) FROM credit_profiles
UNION ALL SELECT 'collection_actions', count(*) FROM collection_actions
UNION ALL SELECT 'collection_rules', count(*) FROM collection_rules
UNION ALL SELECT 'integration_logs', count(*) FROM integration_logs
UNION ALL SELECT 'notifications', count(*) FROM notifications
UNION ALL SELECT 'security_events', count(*) FROM security_events
ORDER BY 1;
"

echo ""
echo "  Checking admin user..."
psql "$LOCAL_URL" -t -c "SELECT email, password_hash IS NOT NULL as has_password FROM users WHERE email LIKE '%admin%' OR email LIKE '%altea%' LIMIT 5;"

echo ""
echo "  Checking profiles linked to users..."
psql "$LOCAL_URL" -t -c "
SELECT count(*) as linked_profiles
FROM profiles p
JOIN users u ON p.id = u.id;
"

# Cleanup
rm -rf "$TMPDIR"

echo ""
echo "============================================"
echo "  Migration complete!"
echo "============================================"
echo ""
echo "  Next steps:"
echo "  1. Test login at http://localhost:3000"
echo "  2. Verify data in the app dashboard"
echo ""
