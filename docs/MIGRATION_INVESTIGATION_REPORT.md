# Migration Investigation Report

## Executive Summary

**Date:** 2026-02-04
**Status:** ROOT CAUSE IDENTIFIED
**Severity:** CRITICAL

### Issues Found

| Metric | Expected | Actual (Local) | Status |
|--------|----------|----------------|--------|
| Total Clientes | 3,205 | 3,205 | ✅ OK |
| Dívidas Ativas | 3,205 | 3,205 | ✅ OK |
| Administradores Ativos | 3 | 4 | ⚠️ +1 (script superadmin) |
| **Valor Total em Cobrança** | **R$ 838,390.96** | **R$ 0.00** | ❌ CRITICAL |
| **Casos Críticos** | **3,205** | **0** | ❌ CRITICAL |

---

## Root Cause Analysis

### Issue 1: Valor Total em Cobrança = R$ 0.00

**Root Cause:** The migration script does NOT migrate the `Vencido` column from Supabase.

**Details:**
- Supabase `VMAX` table has column `"Vencido"` containing debt amounts as formatted Brazilian currency (e.g., "R$ 99,90")
- Local schema has column `"Valor_Total"` (TEXT) to store this data
- **The migration script SKIPS this column entirely**

**Evidence:**
```sql
-- Supabase VMAX table has 48 columns including:
-- "Vencido" (text) - Contains debt amounts like "R$ 838,390.96" total

-- Migration script (line 186-206) only exports 15 columns:
SELECT id, id_company, "Cliente", "CPF/CNPJ", "Cidade", credit_score,
       risk_level, approval_status, auto_collection_enabled, analysis_metadata,
       last_analysis_date, collection_processed_at, last_collection_attempt,
       created_at, updated_at
FROM public."VMAX"
-- MISSING: "Vencido", "Vecto", "Dias Inad.", and 30+ other columns!
```

**Financial Data in Supabase:**
```
Total Records: 3,205
Records with Vencido: 3,205 (100%)
Total Value: R$ 838,390.96
Format: Brazilian currency "R$ X.XXX,XX"
```

### Issue 2: Casos Críticos = 0

**Root Cause:** The migration script does NOT migrate the `"Dias Inad."` column from Supabase.

**Details:**
- Supabase `VMAX` table has column `"Dias Inad."` containing days of delinquency
- Local schema has column `"Maior_Atraso"` (TEXT) to store this data
- **The migration script SKIPS this column entirely**
- A "critical case" is any record with days in delinquency > 0
- Since ALL 3,205 records have `"Dias Inad."` values (1-999 days), ALL are critical

**Evidence:**
```sql
-- Supabase data:
Records with "Dias Inad.": 3,205 (100%)
Min value: 1.004 days
Max value: 999 days
-- All records are considered "critical cases"
```

---

## Schema Comparison

### Supabase VMAX Table (48 columns)

| Column | Type | Status in Migration |
|--------|------|---------------------|
| id | uuid | ✅ Migrated |
| id_company | uuid | ✅ Migrated |
| Cliente | text | ✅ Migrated |
| CPF/CNPJ | text | ✅ Migrated |
| **Email** | text | ❌ NOT MIGRATED |
| **Telefone 1** | text | ❌ NOT MIGRATED |
| **Telefone 2** | text | ❌ NOT MIGRATED |
| **Rua** | text | ❌ NOT MIGRATED |
| **Nº Rua** | text | ❌ NOT MIGRATED |
| **Bairro** | text | ❌ NOT MIGRATED |
| **CEP** | text | ❌ NOT MIGRATED |
| Cidade | text | ✅ Migrated |
| **UF** | text | ❌ NOT MIGRATED |
| **Vencido** | text | ❌ **CRITICAL - Debt amounts!** |
| **Vecto** | text | ❌ NOT MIGRATED |
| **Dias Inad.** | text | ❌ **CRITICAL - Critical cases!** |
| **Serviço** | text | ❌ NOT MIGRATED |
| **Situação** | text | ❌ NOT MIGRATED |
| **DT Cancelamento** | text | ❌ NOT MIGRATED |
| **Motivo Específico** | text | ❌ NOT MIGRATED |
| **Tipo Cobrança** | text | ❌ NOT MIGRATED |
| **Tipo Contrato** | text | ❌ NOT MIGRATED |
| **Empresa** | text | ❌ NOT MIGRATED |
| approval_status | text | ✅ Migrated |
| **approval_reason** | text | ❌ NOT MIGRATED |
| credit_score | integer | ✅ Migrated |
| risk_level | text | ✅ Migrated |
| **behavior_classification** | text | ❌ NOT MIGRATED |
| **presumed_income** | numeric | ❌ NOT MIGRATED |
| **presumed_limit** | numeric | ❌ NOT MIGRATED |
| last_analysis_date | timestamp | ✅ Migrated |
| analysis_metadata | jsonb | ✅ Migrated |
| auto_collection_enabled | boolean | ✅ Migrated |
| last_collection_attempt | timestamp | ✅ Migrated |
| **collection_count** | integer | ❌ NOT MIGRATED |
| collection_processed_at | timestamp | ✅ Migrated |
| **recovery_score** | integer | ❌ NOT MIGRATED |
| **recovery_class** | text | ❌ NOT MIGRATED |
| **recovery_description** | text | ❌ NOT MIGRATED |
| **assertiva_uuid** | uuid | ❌ NOT MIGRATED |
| **assertiva_protocol** | text | ❌ NOT MIGRATED |
| **analysis_logs** | jsonb | ❌ NOT MIGRATED |
| created_at | timestamp | ✅ Migrated |
| updated_at | timestamp | ✅ Migrated |
| **restrictive_analysis_logs** | jsonb | ❌ NOT MIGRATED |
| **restrictive_analysis_date** | timestamp | ❌ NOT MIGRATED |
| **behavioral_analysis_logs** | jsonb | ❌ NOT MIGRATED |
| **behavioral_analysis_date** | timestamp | ❌ NOT MIGRATED |

**Summary:** Only 15 of 48 columns are being migrated (31%)

### Local Schema Mapping Required

| Supabase Column | Local Column | Data Type |
|-----------------|--------------|-----------|
| `"Vencido"` | `"Valor_Total"` | TEXT |
| `"Dias Inad."` | `"Maior_Atraso"` | TEXT |
| `"Vecto"` | `"Primeira_Vencida"` | TEXT |
| (need new) | `"Quantidade_Titulos"` | TEXT |

---

## Row Count Comparison

| Table | Supabase | Local | Status |
|-------|----------|-------|--------|
| companies | 1 | 1 | ✅ Match |
| users | 8* | 14 | ⚠️ +6 (created by app) |
| profiles | 8 | 8 | ✅ Match |
| VMAX | 3,205 | 3,205 | ✅ Match |
| credit_profiles | 300 | 300 | ✅ Match |
| collection_actions | 5 | 5 | ✅ Match |
| collection_rules | 2 | 2 | ✅ Match |
| integration_logs | 153 | ~153 | ✅ Match |
| notifications | 11 | ~11 | ✅ Match |
| security_events | 114 | ~114 | ✅ Match |
| customers | 0 | 0 | ✅ Match |
| debts | 0 | 0 | ✅ Match |
| payments | 0 | 0 | ✅ Match |
| agreements | 0 | 0 | ✅ Match |

**Note:** Row counts match, but column data is incomplete for VMAX table.

---

## Fix Required

### Migration Script Changes (scripts/migrate-supabase-to-docker.sh)

The VMAX export query (line 186-206) must be updated to include:

```sql
SELECT
  id,
  id_company,
  "Cliente",
  "CPF/CNPJ",
  "Cidade",
  "Vencido" as "Valor_Total",           -- CRITICAL: Debt amounts
  "Vecto" as "Primeira_Vencida",        -- Due date
  "Dias Inad." as "Maior_Atraso",       -- CRITICAL: Days overdue
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
FROM public."VMAX"
```

### Validation Required

After migration, verify:
1. `SUM(parse_currency("Valor_Total")) = R$ 838,390.96`
2. `COUNT(*) WHERE "Maior_Atraso" IS NOT NULL = 3,205`

---

## Impact Assessment

| Affected Feature | Impact |
|-----------------|--------|
| Dashboard "Valor Total em Cobrança" | Shows R$ 0.00 instead of R$ 838.39k |
| Dashboard "Casos Críticos" | Shows 0 instead of 3,205 |
| Customer debt details | Missing debt amounts |
| Collection workflows | Cannot prioritize by days overdue |
| Reporting | All financial reports incorrect |

**Business Impact:** SEVERE - All financial metrics are broken.

---

## Recommendations

1. **Immediate:** Update migration script to include missing columns
2. **Add Validation:** Script should verify totals match after migration
3. **Re-run Migration:** Execute updated script with `--reset` flag
4. **Verify in UI:** Check dashboard shows correct metrics
