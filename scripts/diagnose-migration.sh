#!/bin/bash
###############################################################################
# diagnose-migration.sh - Migration Diagnostic Tool
#
# This script compares data between Supabase and local PostgreSQL databases
# to identify any discrepancies after migration.
#
# Usage: ./scripts/diagnose-migration.sh
#        docker compose exec postgres bash /scripts/diagnose-migration.sh
###############################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Connection strings
SUPABASE_URL="${SUPABASE_URL:-postgres://postgres.hpjzlmurljxzwjtwcbkz:tsDJsPBA9MiBtyES@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require}"
LOCAL_URL="${LOCAL_URL:-postgresql://altea:altea@localhost:5432/alteapay}"

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}            Migration Diagnostic Report                            ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test connections
echo -e "${BLUE}Testing connections...${NC}"
if ! psql "$SUPABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
  echo -e "${RED}Cannot connect to Supabase${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Supabase${NC}"

if ! psql "$LOCAL_URL" -c "SELECT 1" > /dev/null 2>&1; then
  echo -e "${RED}Cannot connect to local database${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Local${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# Table Row Count Comparison
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TABLE ROW COUNT COMPARISON${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

printf "%-25s │ %12s │ %12s │ %10s\n" "Table" "Supabase" "Local" "Status"
echo "──────────────────────────┼──────────────┼──────────────┼───────────"

TABLES=("companies" "profiles" "VMAX" "credit_profiles" "collection_actions" "collection_rules" "integration_logs" "notifications" "security_events" "customers" "debts" "payments" "agreements")

for table in "${TABLES[@]}"; do
  if [[ "$table" == "VMAX" ]]; then
    SUPABASE_COUNT=$(psql "$SUPABASE_URL" -t -c "SELECT COUNT(*) FROM public.\"$table\";" 2>/dev/null | tr -d ' ' || echo "0")
    LOCAL_COUNT=$(psql "$LOCAL_URL" -t -c "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null | tr -d ' ' || echo "0")
  else
    SUPABASE_COUNT=$(psql "$SUPABASE_URL" -t -c "SELECT COUNT(*) FROM public.$table;" 2>/dev/null | tr -d ' ' || echo "0")
    LOCAL_COUNT=$(psql "$LOCAL_URL" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ' || echo "0")
  fi

  if [[ "$SUPABASE_COUNT" == "$LOCAL_COUNT" ]]; then
    STATUS="${GREEN}✓ Match${NC}"
  else
    STATUS="${RED}✗ Mismatch${NC}"
  fi

  printf "%-25s │ %12s │ %12s │ %b\n" "$table" "$SUPABASE_COUNT" "$LOCAL_COUNT" "$STATUS"
done

echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# Financial Data Comparison
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}FINANCIAL DATA COMPARISON (CRITICAL)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

# Supabase Vencido total
SUPABASE_VENCIDO=$(psql "$SUPABASE_URL" -t -c "
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

# Local Valor_Total
LOCAL_VALOR_TOTAL=$(psql "$LOCAL_URL" -t -c "
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

echo "Valor Total em Cobrança:"
echo "  Supabase (Vencido):     R\$ $SUPABASE_VENCIDO"
echo "  Local (Valor_Total):    R\$ $LOCAL_VALOR_TOTAL"

DIFF=$(echo "$SUPABASE_VENCIDO - $LOCAL_VALOR_TOTAL" | bc | tr -d '-')
if (( $(echo "$DIFF < 1" | bc -l) )); then
  echo -e "  Status:                 ${GREEN}✓ MATCH${NC}"
else
  echo -e "  Status:                 ${RED}✗ MISMATCH (Diff: R\$ $DIFF)${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# Critical Cases Comparison
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}CRITICAL CASES COMPARISON${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

# Supabase critical cases (records with Dias Inad.)
SUPABASE_CRITICAL=$(psql "$SUPABASE_URL" -t -c "
  SELECT COUNT(*) FROM public.\"VMAX\" WHERE \"Dias Inad.\" IS NOT NULL AND \"Dias Inad.\" != '';
" | tr -d ' ')

# Local critical cases (records with Maior_Atraso)
LOCAL_CRITICAL=$(psql "$LOCAL_URL" -t -c "
  SELECT COUNT(*) FROM \"VMAX\" WHERE \"Maior_Atraso\" IS NOT NULL AND \"Maior_Atraso\" != '';
" | tr -d ' ')

echo "Casos Críticos (records with days in delinquency):"
echo "  Supabase (Dias Inad.):  $SUPABASE_CRITICAL"
echo "  Local (Maior_Atraso):   $LOCAL_CRITICAL"

if [[ "$SUPABASE_CRITICAL" == "$LOCAL_CRITICAL" ]]; then
  echo -e "  Status:                 ${GREEN}✓ MATCH${NC}"
else
  echo -e "  Status:                 ${RED}✗ MISMATCH${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# Column Data Check for VMAX
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}VMAX COLUMN DATA CHECK${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

echo "Local VMAX table - records with data in critical columns:"
psql "$LOCAL_URL" -c "
  SELECT
    'Valor_Total' as column_name,
    COUNT(NULLIF(\"Valor_Total\", '')) as records_with_data,
    COUNT(*) as total_records
  FROM \"VMAX\"
  UNION ALL
  SELECT
    'Maior_Atraso',
    COUNT(NULLIF(\"Maior_Atraso\", '')),
    COUNT(*)
  FROM \"VMAX\"
  UNION ALL
  SELECT
    'Primeira_Vencida',
    COUNT(NULLIF(\"Primeira_Vencida\", '')),
    COUNT(*)
  FROM \"VMAX\";
"

# ═══════════════════════════════════════════════════════════════════════════════
# Sample Data Comparison
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SAMPLE DATA (First 5 records)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

echo "Supabase VMAX sample:"
psql "$SUPABASE_URL" -c "
  SELECT \"Cliente\", \"Vencido\", \"Dias Inad.\", \"Vecto\"
  FROM public.\"VMAX\"
  LIMIT 5;
"

echo ""
echo "Local VMAX sample:"
psql "$LOCAL_URL" -c "
  SELECT \"Cliente\", \"Valor_Total\", \"Maior_Atraso\", \"Primeira_Vencida\"
  FROM \"VMAX\"
  LIMIT 5;
"

# ═══════════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}DIAGNOSTIC SUMMARY${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

ISSUES=0

if [[ "$LOCAL_VALOR_TOTAL" == "0.00" ]] || [[ "$LOCAL_VALOR_TOTAL" == "0" ]]; then
  echo -e "${RED}✗ CRITICAL: Valor_Total is empty (R\$ 0.00)${NC}"
  echo "  → The migration script is not copying the 'Vencido' column to 'Valor_Total'"
  ISSUES=$((ISSUES + 1))
fi

if [[ "$LOCAL_CRITICAL" == "0" ]]; then
  echo -e "${RED}✗ CRITICAL: Maior_Atraso is empty (0 critical cases)${NC}"
  echo "  → The migration script is not copying the 'Dias Inad.' column to 'Maior_Atraso'"
  ISSUES=$((ISSUES + 1))
fi

if [[ $ISSUES -eq 0 ]]; then
  echo -e "${GREEN}✓ All critical metrics appear to be migrated correctly${NC}"
else
  echo ""
  echo -e "${YELLOW}Recommendation: Re-run the updated migration script:${NC}"
  echo "  docker compose exec postgres bash /scripts/migrate-supabase-to-docker.sh"
fi

echo ""
