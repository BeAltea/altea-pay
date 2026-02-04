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
#   4. VALIDATES that critical metrics match between source and target
#
# Expected Metrics (from Supabase):
#   - Total Clientes: 3,205
#   - Valor Total em Cobrança: R$ 838,390.96
#   - Casos Críticos: 3,205
###############################################################################

# --- Colors for output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Connection strings ---
# These can be overridden by environment variables
SUPABASE_URL="${SUPABASE_URL:-postgres://postgres.hpjzlmurljxzwjtwcbkz:tsDJsPBA9MiBtyES@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require}"
LOCAL_URL="${LOCAL_URL:-postgresql://altea:altea@localhost:5432/alteapay}"

TMPDIR="/tmp/migration"
LOGFILE="/tmp/migration.log"
mkdir -p "$TMPDIR"

# --- Logging ---
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOGFILE"
}

log_success() {
  echo -e "${GREEN}  ✓ $*${NC}" | tee -a "$LOGFILE"
}

log_error() {
  echo -e "${RED}  ✗ $*${NC}" | tee -a "$LOGFILE"
}

log_warning() {
  echo -e "${YELLOW}  ⚠ $*${NC}" | tee -a "$LOGFILE"
}

log_info() {
  echo -e "${BLUE}  ℹ $*${NC}" | tee -a "$LOGFILE"
}

# Initialize log
echo "========================================" > "$LOGFILE"
echo "Migration Log - $(date)" >> "$LOGFILE"
echo "========================================" >> "$LOGFILE"

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}       Supabase -> Docker PostgreSQL Data Migration              ${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# Step 1: Test Connections
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}[1/5]${NC} Testing database connections..."
log "Testing database connections"

if ! psql "$SUPABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
  log_error "Cannot connect to Supabase"
  exit 1
fi
log_success "Supabase connection: OK"

if ! psql "$LOCAL_URL" -c "SELECT 1" > /dev/null 2>&1; then
  log_error "Cannot connect to local database"
  exit 1
fi
log_success "Local connection: OK"

# ═══════════════════════════════════════════════════════════════════════════════
# Step 2: Get Source Metrics (for validation later)
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}[2/5]${NC} Capturing source metrics from Supabase..."
log "Capturing source metrics from Supabase"

# Get total VMAX count
SUPABASE_VMAX_COUNT=$(psql "$SUPABASE_URL" -t -c "SELECT COUNT(*) FROM public.\"VMAX\";" | tr -d ' ')
log_info "Supabase VMAX count: $SUPABASE_VMAX_COUNT"

# Get total Vencido (debt amount) - parse Brazilian currency format
SUPABASE_VENCIDO_TOTAL=$(psql "$SUPABASE_URL" -t -c "
  SELECT COALESCE(SUM(
    CASE
      WHEN \"Vencido\" ~ 'R\\\$' THEN
        REPLACE(REPLACE(REGEXP_REPLACE(\"Vencido\", 'R\\\$ ', ''), '.', ''), ',', '.')::numeric
      ELSE 0
    END
  ), 0)::numeric(15,2)
  FROM public.\"VMAX\"
  WHERE \"Vencido\" IS NOT NULL AND \"Vencido\" != '';
" | tr -d ' ')
log_info "Supabase total Vencido: R\$ $SUPABASE_VENCIDO_TOTAL"

# Get count of records with Dias Inad. (critical cases)
SUPABASE_CRITICAL_COUNT=$(psql "$SUPABASE_URL" -t -c "
  SELECT COUNT(*)
  FROM public.\"VMAX\"
  WHERE \"Dias Inad.\" IS NOT NULL AND \"Dias Inad.\" != '';
" | tr -d ' ')
log_info "Supabase critical cases (with Dias Inad.): $SUPABASE_CRITICAL_COUNT"

# Get admin count
SUPABASE_ADMIN_COUNT=$(psql "$SUPABASE_URL" -t -c "
  SELECT COUNT(*)
  FROM public.profiles
  WHERE role IN ('admin', 'super_admin');
" | tr -d ' ')
log_info "Supabase admin count: $SUPABASE_ADMIN_COUNT"

# ═══════════════════════════════════════════════════════════════════════════════
# Step 3: Prepare Local Database
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}[3/5]${NC} Preparing local database (truncating tables)..."
log "Truncating local tables"

psql "$LOCAL_URL" <<'SQL'
SET session_replication_role = 'replica';

-- Truncate in dependency order
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
log_success "All tables truncated"

# ═══════════════════════════════════════════════════════════════════════════════
# Step 4: Migrate Data
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}[4/5]${NC} Migrating data..."
log "Starting data migration"

# Helper: export a query result as CSV from Supabase
export_csv() {
  local name="$1"
  local query="$2"
  log "  Exporting: $name"
  psql "$SUPABASE_URL" -c "\COPY ($query) TO '$TMPDIR/${name}.csv' WITH (FORMAT csv, HEADER true, NULL '')" >> "$LOGFILE" 2>&1
}

# Helper: import CSV into local table
import_csv() {
  local name="$1"
  local table="$2"
  local columns="$3"
  local count
  log "  Importing: $name -> $table"
  psql "$LOCAL_URL" <<EOPSQL >> "$LOGFILE" 2>&1
SET session_replication_role = 'replica';
\COPY ${table}(${columns}) FROM '$TMPDIR/${name}.csv' WITH (FORMAT csv, HEADER true, NULL '')
SET session_replication_role = 'origin';
EOPSQL
  count=$(psql "$LOCAL_URL" -t -c "SELECT count(*) FROM $table;" | tr -d ' ')
  log_success "$name: $count rows"
}

# ───────────────────────────────────────────────────────────────────────────────
# 1. companies (must be first - referenced by FK)
# ───────────────────────────────────────────────────────────────────────────────
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

# ───────────────────────────────────────────────────────────────────────────────
# 2. auth.users -> users
# ───────────────────────────────────────────────────────────────────────────────
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

# ───────────────────────────────────────────────────────────────────────────────
# 3. profiles
# ───────────────────────────────────────────────────────────────────────────────
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
# Import via temp table to add default 'status'
log "  Importing: profiles -> profiles"
psql "$LOCAL_URL" <<EOPSQL >> "$LOGFILE" 2>&1
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
count=$(psql "$LOCAL_URL" -t -c "SELECT count(*) FROM profiles;" | tr -d ' ')
log_success "profiles: $count rows"

# ───────────────────────────────────────────────────────────────────────────────
# 4. VMAX (CRITICAL - includes financial data)
# ───────────────────────────────────────────────────────────────────────────────
log "  Exporting: VMAX (with ALL critical columns)"
export_csv "vmax" "
SELECT
  id,
  id_company,
  \"Cliente\",
  \"CPF/CNPJ\",
  \"Cidade\",
  \"Vencido\",
  \"Vecto\",
  \"Dias Inad.\",
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

# Import via temp table to map columns correctly
log "  Importing: VMAX -> VMAX (mapping Vencido->Valor_Total, Dias Inad.->Maior_Atraso, Vecto->Primeira_Vencida)"
psql "$LOCAL_URL" <<EOPSQL >> "$LOGFILE" 2>&1
CREATE TEMP TABLE tmp_vmax (
  id uuid,
  id_company uuid,
  cliente text,
  cpf_cnpj text,
  cidade text,
  vencido text,
  vecto text,
  dias_inad text,
  credit_score numeric,
  risk_level text,
  approval_status text,
  auto_collection_enabled boolean,
  analysis_metadata jsonb,
  last_analysis_date timestamptz,
  collection_processed_at timestamptz,
  last_collection_attempt timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);
\COPY tmp_vmax FROM '$TMPDIR/vmax.csv' WITH (FORMAT csv, HEADER true, NULL '')
SET session_replication_role = 'replica';
INSERT INTO "VMAX" (
  id, id_company, "Cliente", "CPF/CNPJ", "Cidade",
  "Valor_Total", "Primeira_Vencida", "Maior_Atraso",
  credit_score, risk_level, approval_status, auto_collection_enabled,
  analysis_metadata, last_analysis_date, collection_processed_at,
  last_collection_attempt, created_at, updated_at
)
SELECT
  id, id_company, cliente, cpf_cnpj, cidade,
  vencido, vecto, dias_inad,
  credit_score, risk_level, approval_status, auto_collection_enabled,
  analysis_metadata, last_analysis_date, collection_processed_at,
  last_collection_attempt, created_at, updated_at
FROM tmp_vmax;
DROP TABLE tmp_vmax;
SET session_replication_role = 'origin';
EOPSQL
count=$(psql "$LOCAL_URL" -t -c "SELECT count(*) FROM \"VMAX\";" | tr -d ' ')
log_success "VMAX: $count rows"

# ───────────────────────────────────────────────────────────────────────────────
# 5. credit_profiles
# ───────────────────────────────────────────────────────────────────────────────
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

# ───────────────────────────────────────────────────────────────────────────────
# 6. collection_actions
# ───────────────────────────────────────────────────────────────────────────────
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

# ───────────────────────────────────────────────────────────────────────────────
# 7. collection_rules
# ───────────────────────────────────────────────────────────────────────────────
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

# ───────────────────────────────────────────────────────────────────────────────
# 8. integration_logs
# ───────────────────────────────────────────────────────────────────────────────
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

# ───────────────────────────────────────────────────────────────────────────────
# 9. notifications
# ───────────────────────────────────────────────────────────────────────────────
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

# ───────────────────────────────────────────────────────────────────────────────
# 10. security_events
# ───────────────────────────────────────────────────────────────────────────────
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

# ═══════════════════════════════════════════════════════════════════════════════
# Step 5: Validate Migration
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}[5/5]${NC} Validating migration..."
log "Validating migration"

VALIDATION_FAILED=0

# Get local metrics
LOCAL_VMAX_COUNT=$(psql "$LOCAL_URL" -t -c "SELECT COUNT(*) FROM \"VMAX\";" | tr -d ' ')
LOCAL_VENCIDO_TOTAL=$(psql "$LOCAL_URL" -t -c "
  SELECT COALESCE(SUM(
    CASE
      WHEN \"Valor_Total\" ~ 'R\\\$' THEN
        REPLACE(REPLACE(REGEXP_REPLACE(\"Valor_Total\", 'R\\\$ ', ''), '.', ''), ',', '.')::numeric
      ELSE 0
    END
  ), 0)::numeric(15,2)
  FROM \"VMAX\"
  WHERE \"Valor_Total\" IS NOT NULL AND \"Valor_Total\" != '';
" | tr -d ' ')
LOCAL_CRITICAL_COUNT=$(psql "$LOCAL_URL" -t -c "
  SELECT COUNT(*)
  FROM \"VMAX\"
  WHERE \"Maior_Atraso\" IS NOT NULL AND \"Maior_Atraso\" != '';
" | tr -d ' ')
LOCAL_ADMIN_COUNT=$(psql "$LOCAL_URL" -t -c "
  SELECT COUNT(*)
  FROM profiles
  WHERE role IN ('admin', 'super_admin');
" | tr -d ' ')

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    VALIDATION REPORT                              ║"
echo "╠═══════════════════════════════════════════════════════════════════╣"
printf "║ %-25s │ %-12s │ %-12s │ %-6s ║\n" "Metric" "Expected" "Actual" "Status"
echo "╠═══════════════════════════════════════════════════════════════════╣"

# Validate VMAX count
if [[ "$LOCAL_VMAX_COUNT" == "$SUPABASE_VMAX_COUNT" ]]; then
  printf "║ %-25s │ %12s │ %12s │ ${GREEN}%-6s${NC} ║\n" "Total Clientes" "$SUPABASE_VMAX_COUNT" "$LOCAL_VMAX_COUNT" "OK"
else
  printf "║ %-25s │ %12s │ %12s │ ${RED}%-6s${NC} ║\n" "Total Clientes" "$SUPABASE_VMAX_COUNT" "$LOCAL_VMAX_COUNT" "FAIL"
  VALIDATION_FAILED=1
fi

# Validate Vencido total (with tolerance of R$ 1.00)
DIFF=$(echo "$SUPABASE_VENCIDO_TOTAL - $LOCAL_VENCIDO_TOTAL" | bc | tr -d '-')
if (( $(echo "$DIFF < 1" | bc -l) )); then
  printf "║ %-25s │ %12s │ %12s │ ${GREEN}%-6s${NC} ║\n" "Valor Total (R\$)" "$SUPABASE_VENCIDO_TOTAL" "$LOCAL_VENCIDO_TOTAL" "OK"
else
  printf "║ %-25s │ %12s │ %12s │ ${RED}%-6s${NC} ║\n" "Valor Total (R\$)" "$SUPABASE_VENCIDO_TOTAL" "$LOCAL_VENCIDO_TOTAL" "FAIL"
  VALIDATION_FAILED=1
fi

# Validate critical cases
if [[ "$LOCAL_CRITICAL_COUNT" == "$SUPABASE_CRITICAL_COUNT" ]]; then
  printf "║ %-25s │ %12s │ %12s │ ${GREEN}%-6s${NC} ║\n" "Casos Críticos" "$SUPABASE_CRITICAL_COUNT" "$LOCAL_CRITICAL_COUNT" "OK"
else
  printf "║ %-25s │ %12s │ %12s │ ${RED}%-6s${NC} ║\n" "Casos Críticos" "$SUPABASE_CRITICAL_COUNT" "$LOCAL_CRITICAL_COUNT" "FAIL"
  VALIDATION_FAILED=1
fi

# Validate admin count (allow +1 for script-created superadmin)
ADMIN_DIFF=$((LOCAL_ADMIN_COUNT - SUPABASE_ADMIN_COUNT))
if [[ $ADMIN_DIFF -le 1 ]] && [[ $ADMIN_DIFF -ge 0 ]]; then
  printf "║ %-25s │ %12s │ %12s │ ${GREEN}%-6s${NC} ║\n" "Administradores" "$SUPABASE_ADMIN_COUNT" "$LOCAL_ADMIN_COUNT" "OK"
else
  printf "║ %-25s │ %12s │ %12s │ ${YELLOW}%-6s${NC} ║\n" "Administradores" "$SUPABASE_ADMIN_COUNT" "$LOCAL_ADMIN_COUNT" "WARN"
fi

echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Cleanup temp files
rm -rf "$TMPDIR"

# Final result
if [[ $VALIDATION_FAILED -eq 1 ]]; then
  echo -e "${RED}╔═══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║              MIGRATION VALIDATION FAILED!                         ║${NC}"
  echo -e "${RED}╚═══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  log_error "Migration validation FAILED - critical metrics do not match"
  echo "Check the log file for details: $LOGFILE"
  exit 1
else
  echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║              MIGRATION COMPLETED SUCCESSFULLY!                    ║${NC}"
  echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  log_success "Migration validation PASSED - all critical metrics match"
  echo "Next steps:"
  echo "  1. Test login at http://localhost:3000"
  echo "  2. Verify dashboard shows correct metrics"
  echo "  3. Check log file: $LOGFILE"
  echo ""
fi
