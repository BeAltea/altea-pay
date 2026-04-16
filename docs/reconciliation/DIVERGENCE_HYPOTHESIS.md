# Divergence Hypothesis

**Generated:** 2026-04-16
**Purpose:** Phase 1.1 - Document potential causes of metric discrepancies based on code analysis

---

## Executive Summary

Based on comprehensive code review of dashboard components, API routes, and database schema, the following potential divergence points have been identified. These represent hypotheses to be validated through SQL audit queries and ASAAS API comparison.

---

## HIGH PRIORITY Issues

### H1: Inconsistent `pago_ao_cliente` Handling

**Severity:** HIGH
**Affected Metrics:** Paid Count, Recovered Debt, Pending Debt

**Problem:**
The constant `PAID_AGREEMENT_STATUSES` includes `"pago_ao_cliente"` in `lib/constants/payment-status.ts`, but NOT all dashboard components check for this status.

| Component | File | Checks `pago_ao_cliente`? |
|-----------|------|---------------------------|
| Super Admin Page | `app/super-admin/page.tsx` | YES (via constants import) |
| Negotiations Client | `negotiations-client.tsx` | NO (hardcoded list) |
| Dashboard Page | `app/dashboard/page.tsx` | NO (hardcoded list) |
| Admin Clientes | `admin-clientes-content.tsx` | NO (hardcoded list) |

**Impact:**
Customers who paid directly to the provider (not via ASAAS) may:
- Still show as "unpaid" in some dashboards
- Be counted in "pending" metrics
- Be eligible for new negotiation sending (duplicate)

**Hypothesis:**
Any customer with `status = 'pago_ao_cliente'` will show inconsistent paid status across portals.

**Validation Query:**
```sql
SELECT COUNT(*) FROM agreements WHERE status = 'pago_ao_cliente';
```

---

### H2: `RECEIVED_IN_CASH` Not Checked Everywhere

**Severity:** HIGH
**Affected Metrics:** Paid Count, Recovered Debt

**Problem:**
`PAID_ASAAS_STATUSES` includes `"RECEIVED_IN_CASH"` but the Admin Dashboard (`app/dashboard/page.tsx`) only checks for:
- `RECEIVED`
- `CONFIRMED`

**Impact:**
Cash payments confirmed in ASAAS will appear as unpaid in Admin Dashboard.

**Evidence (dashboard/page.tsx lines 168-175):**
```typescript
if (
  a.payment_status === "received" ||
  a.payment_status === "confirmed" ||
  a.status === "completed" ||
  a.status === "paid" ||
  a.asaas_status === "RECEIVED" ||
  a.asaas_status === "CONFIRMED"
  // MISSING: a.asaas_status === "RECEIVED_IN_CASH"
)
```

**Validation Query:**
```sql
SELECT COUNT(*) FROM agreements WHERE asaas_status = 'RECEIVED_IN_CASH';
```

---

### H3: Supabase 1000-Row Default Limit

**Severity:** HIGH (if record counts exceed 1000)
**Affected Metrics:** All counts that iterate over large tables

**Problem:**
Code review shows pagination was added in most places, but some edge cases may still exist. Historical bug: `range(0, 99999)` does NOT override the 1000-row default.

**Current Status (verified in code):**
- `app/dashboard/page.tsx`: HAS proper pagination loop
- `app/super-admin/page.tsx`: HAS proper pagination loop
- `app/api/super-admin/negotiations/customers/route.ts`: HAS pagination

**Potential Risk:**
Any new code without pagination will silently truncate results.

**Validation:**
```sql
SELECT COUNT(*) FROM "VMAX"; -- If > 1000, verify dashboard shows correct count
SELECT COUNT(*) FROM agreements; -- If > 1000, verify pagination works
```

---

## MEDIUM PRIORITY Issues

### M1: VMAX vs Agreement Document Matching

**Severity:** MEDIUM
**Affected Metrics:** Negotiations Sent, Paid Count

**Problem:**
VMAX `"CPF/CNPJ"` is stored with formatting (e.g., "471.077.648-29") while `customers.document` is digits-only. Matching requires normalization.

**Current Logic (verified):**
```typescript
const normalizedDoc = (v["CPF/CNPJ"] || "").replace(/\D/g, "")
```

**Risk:**
- Typos or data entry errors in VMAX could prevent matching
- Leading zeros could cause mismatch (CPFs starting with 0)

**Validation Query:**
```sql
-- Find VMAX records that don't match any customer
SELECT COUNT(*) as unmatched
FROM "VMAX" v
WHERE NOT EXISTS (
  SELECT 1 FROM customers cu
  WHERE REGEXP_REPLACE(v."CPF/CNPJ", '[^0-9]', '', 'g') =
        REGEXP_REPLACE(cu.document, '[^0-9]', '', 'g')
  AND v.id_company = cu.company_id
);
```

---

### M2: Cancelled Agreements Still Counted

**Severity:** MEDIUM
**Affected Metrics:** Negotiations Sent (potentially)

**Problem:**
The `hasNegotiation` flag in negotiations-client.tsx excludes cancelled:
```typescript
const withNegotiation = customers.filter((c) => c.hasNegotiation && !c.isCancelled).length
```

But the API definition of `hasNegotiation` may include cancelled in some paths.

**Risk:**
Inconsistent counts between what the API returns and what the UI displays.

**Validation:**
Compare API response `hasNegotiation` counts with UI displayed counts.

---

### M3: Multiple Agreements per Customer

**Severity:** MEDIUM
**Affected Metrics:** Recovered Debt, Paid Count

**Problem:**
A customer can have multiple agreements (e.g., after cancellation and re-send). The current logic counts unique customers, not total agreements.

**Dashboard Logic (negotiations-client.tsx):**
```typescript
const paidCount = paidCustomers.length // Counts unique customers
```

**Impact:**
If one customer has 3 paid agreements, `paidCount` = 1, but ASAAS shows 3 payments.

**Validation Query:**
```sql
-- Customers with multiple paid agreements
SELECT cu.document, COUNT(*) as paid_agreements
FROM agreements a
JOIN customers cu ON a.customer_id = cu.id
WHERE a.status IN ('completed', 'paid', 'pago_ao_cliente')
   OR a.payment_status IN ('received', 'confirmed')
   OR a.asaas_status IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')
GROUP BY cu.document
HAVING COUNT(*) > 1;
```

---

### M4: Notification Viewed Status Sync Delay

**Severity:** MEDIUM
**Affected Metrics:** Cobranças Visualizadas

**Problem:**
`notification_viewed` is populated via:
1. ASAAS webhook (`PAYMENT_CHECKOUT_VIEWED`)
2. Manual sync via `/api/asaas/check-notifications`

If webhook fails or user views outside tracking window, status may be stale.

**Validation:**
Compare `notification_viewed = true` count with ASAAS `viewingInfo` API.

---

## LOW PRIORITY Issues

### L1: Due Date Display Confusion

**Severity:** LOW (cosmetic, but causes user confusion)

**Problem:**
Three different "due date" sources exist:
1. `VMAX.Vecto` - Original debt due date (DD/MM/YYYY string)
2. `debts.due_date` - May contain ASAAS charge date or original
3. `agreements.due_date` - ASAAS charge due date

**Current Display Logic:**
- Admin Clientes: Shows `asaasDueDate` (agreements.due_date)
- Super Admin Negotiations: Shows `dueDate` (agreements.due_date)
- PDF Reports: Should use VMAX.Vecto for "original debt date"

**Risk:**
Users see ASAAS charge date (2026) instead of original debt date (2023-2025).

---

### L2: Aging Bucket Calculation Inconsistency

**Severity:** LOW

**Problem:**
`VMAX."Dias Inad."` may be stored as string with thousand separators (e.g., "1.234" for 1234 days). Different parsing approaches exist:

```typescript
// Some places:
const dias = Number(String(record["Dias Inad."] || "0").replace(/\./g, "")) || 0

// Other places:
const diasAtraso = parseInt(rawDias.replace(/\./g, ""), 10) || 0
```

**Risk:**
Minor inconsistency if data contains non-standard formats.

---

### L3: Currency Parsing Variations

**Severity:** LOW

**Problem:**
`VMAX.Vencido` is stored as Brazilian currency string (e.g., "R$ 1.234,56"). Multiple parsing functions exist:

```typescript
// Version 1
const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")

// Version 2
const cleaned = value.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
```

**Risk:**
Slight differences if data contains edge cases (negative values, parentheses, etc.)

---

## Validation Plan

### Step 1: Run SQL Queries
Execute all queries in BASELINE_AUDIT.md and record results.

### Step 2: Compare with Dashboards
Load each dashboard and compare displayed values with SQL results.

### Step 3: ASAAS API Comparison
For a sample company:
1. Fetch all ASAAS customers: `GET /customers?limit=100`
2. Fetch all ASAAS payments: `GET /payments?customer={id}`
3. Compare counts with AlteaPay dashboard

### Step 4: Prioritize Fixes
Based on delta size and user impact, prioritize:
1. H1, H2 (status consistency)
2. M1, M2 (matching issues)
3. L1-L3 (cosmetic/edge cases)

---

## Recommended Immediate Actions

1. **Unify Paid Detection Logic**
   - Create a shared utility function `isPaidAgreement(agreement)` that uses constants
   - Replace all hardcoded status checks with this function

2. **Add `pago_ao_cliente` Everywhere**
   - Update `negotiations-client.tsx` paid detection
   - Update `admin-clientes-content.tsx` status logic
   - Update `dashboard/page.tsx` paid detection

3. **Add `RECEIVED_IN_CASH` to Dashboard**
   - Update `app/dashboard/page.tsx` lines 168-175

4. **Create Reconciliation Endpoint**
   - New API: `/api/super-admin/reconcile`
   - Compares AlteaPay counts with ASAAS API
   - Returns discrepancies for review

---

**STOP HERE. User review required before Phase 2.**

After reviewing these three documents:
1. Run the SQL queries from BASELINE_AUDIT.md
2. Validate hypotheses against actual data
3. Confirm priority order for fixes
4. Approve proceeding to Phase 2 implementation
