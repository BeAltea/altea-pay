# Baseline Audit Queries

**Generated:** 2026-04-16
**Purpose:** Phase 1.1 - SQL queries to establish baseline metrics from database

---

## Instructions

Run these queries in Supabase SQL Editor to capture current state before any fixes.
Save results in a separate document or spreadsheet for comparison.

---

## 1. VMAX Table Statistics

### 1.1 Total VMAX Records by Company
```sql
SELECT
  c.name as company_name,
  c.id as company_id,
  COUNT(v.id) as total_vmax_records
FROM companies c
LEFT JOIN "VMAX" v ON v.id_company = c.id
GROUP BY c.id, c.name
ORDER BY total_vmax_records DESC;
```

### 1.2 VMAX Negotiation Status Distribution
```sql
SELECT
  c.name as company_name,
  v.negotiation_status,
  COUNT(*) as count
FROM "VMAX" v
JOIN companies c ON v.id_company = c.id
GROUP BY c.name, v.negotiation_status
ORDER BY c.name, count DESC;
```

---

## 2. Agreements Statistics

### 2.1 Total Agreements by Status
```sql
SELECT
  c.name as company_name,
  a.status,
  COUNT(*) as count
FROM agreements a
JOIN companies c ON a.company_id = c.id
GROUP BY c.name, a.status
ORDER BY c.name, count DESC;
```

### 2.2 Agreements by Payment Status
```sql
SELECT
  c.name as company_name,
  a.payment_status,
  COUNT(*) as count
FROM agreements a
JOIN companies c ON a.company_id = c.id
GROUP BY c.name, a.payment_status
ORDER BY c.name, count DESC;
```

### 2.3 Agreements by ASAAS Status
```sql
SELECT
  c.name as company_name,
  a.asaas_status,
  COUNT(*) as count
FROM agreements a
JOIN companies c ON a.company_id = c.id
WHERE a.asaas_status IS NOT NULL
GROUP BY c.name, a.asaas_status
ORDER BY c.name, count DESC;
```

### 2.4 Agreements with ASAAS Payment ID (Charges Created)
```sql
SELECT
  c.name as company_name,
  COUNT(*) as total_agreements,
  COUNT(a.asaas_payment_id) as with_asaas_charge,
  COUNT(*) - COUNT(a.asaas_payment_id) as without_asaas_charge
FROM agreements a
JOIN companies c ON a.company_id = c.id
WHERE a.status != 'cancelled'
GROUP BY c.name
ORDER BY c.name;
```

---

## 3. Paid Detection Audit

### 3.1 All Paid Agreements (Any Paid Indicator)
```sql
-- This query matches the logic in payment-status.ts
SELECT
  c.name as company_name,
  COUNT(*) as paid_count,
  SUM(a.agreed_amount) as total_recovered
FROM agreements a
JOIN companies c ON a.company_id = c.id
WHERE
  a.status IN ('completed', 'paid', 'pago_ao_cliente')
  OR a.payment_status IN ('received', 'confirmed')
  OR a.asaas_status IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')
GROUP BY c.name
ORDER BY c.name;
```

### 3.2 Paid Breakdown by Indicator Type
```sql
SELECT
  c.name as company_name,
  -- Status-based paid
  SUM(CASE WHEN a.status IN ('completed', 'paid', 'pago_ao_cliente') THEN 1 ELSE 0 END) as status_paid,
  -- Payment status based
  SUM(CASE WHEN a.payment_status IN ('received', 'confirmed') THEN 1 ELSE 0 END) as payment_status_paid,
  -- ASAAS status based
  SUM(CASE WHEN a.asaas_status IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH') THEN 1 ELSE 0 END) as asaas_status_paid,
  -- Unique (any indicator)
  COUNT(DISTINCT CASE
    WHEN a.status IN ('completed', 'paid', 'pago_ao_cliente')
      OR a.payment_status IN ('received', 'confirmed')
      OR a.asaas_status IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')
    THEN a.id
  END) as unique_paid
FROM agreements a
JOIN companies c ON a.company_id = c.id
WHERE a.status != 'cancelled'
GROUP BY c.name
ORDER BY c.name;
```

### 3.3 Agreements with pago_ao_cliente Status
```sql
-- These are payments made directly to provider, not via ASAAS
SELECT
  c.name as company_name,
  a.id,
  a.status,
  a.payment_status,
  a.asaas_status,
  a.agreed_amount,
  cu.name as customer_name,
  cu.document
FROM agreements a
JOIN companies c ON a.company_id = c.id
LEFT JOIN customers cu ON a.customer_id = cu.id
WHERE a.status = 'pago_ao_cliente'
ORDER BY c.name, a.created_at DESC;
```

---

## 4. VMAX to Agreement Matching

### 4.1 VMAX Records with Matching Agreements
```sql
WITH normalized_docs AS (
  SELECT
    v.id as vmax_id,
    v."CPF/CNPJ" as original_doc,
    REGEXP_REPLACE(v."CPF/CNPJ", '[^0-9]', '', 'g') as normalized_doc,
    v.id_company
  FROM "VMAX" v
),
customer_docs AS (
  SELECT
    cu.id as customer_id,
    cu.document,
    REGEXP_REPLACE(cu.document, '[^0-9]', '', 'g') as normalized_doc,
    cu.company_id
  FROM customers cu
),
agreement_info AS (
  SELECT
    a.customer_id,
    a.company_id,
    COUNT(*) as agreement_count,
    COUNT(*) FILTER (WHERE a.status != 'cancelled') as active_agreements,
    COUNT(*) FILTER (WHERE a.status IN ('completed', 'paid', 'pago_ao_cliente')
      OR a.payment_status IN ('received', 'confirmed')
      OR a.asaas_status IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')) as paid_agreements
  FROM agreements a
  GROUP BY a.customer_id, a.company_id
)
SELECT
  c.name as company_name,
  COUNT(v.vmax_id) as total_vmax,
  COUNT(cd.customer_id) as matched_to_customer,
  COUNT(ai.customer_id) as has_any_agreement,
  COUNT(CASE WHEN ai.active_agreements > 0 THEN 1 END) as has_active_agreement,
  COUNT(CASE WHEN ai.paid_agreements > 0 THEN 1 END) as has_paid_agreement
FROM normalized_docs v
JOIN companies c ON v.id_company = c.id
LEFT JOIN customer_docs cd ON v.normalized_doc = cd.normalized_doc AND v.id_company = cd.company_id
LEFT JOIN agreement_info ai ON cd.customer_id = ai.customer_id
GROUP BY c.name
ORDER BY c.name;
```

---

## 5. Due Date Audit

### 5.1 Agreements Missing due_date
```sql
SELECT
  c.name as company_name,
  COUNT(*) as total_active_agreements,
  COUNT(a.due_date) as has_due_date,
  COUNT(*) - COUNT(a.due_date) as missing_due_date
FROM agreements a
JOIN companies c ON a.company_id = c.id
WHERE a.status NOT IN ('cancelled', 'completed', 'paid', 'pago_ao_cliente')
  AND a.asaas_payment_id IS NOT NULL
GROUP BY c.name
ORDER BY c.name;
```

### 5.2 Due Date Sources Comparison
```sql
SELECT
  a.id as agreement_id,
  a.due_date as agreement_due_date,
  d.due_date as debt_due_date,
  v."Vecto" as vmax_vecto
FROM agreements a
LEFT JOIN debts d ON a.debt_id = d.id
LEFT JOIN customers cu ON a.customer_id = cu.id
LEFT JOIN "VMAX" v ON REGEXP_REPLACE(v."CPF/CNPJ", '[^0-9]', '', 'g') = REGEXP_REPLACE(cu.document, '[^0-9]', '', 'g')
  AND v.id_company = a.company_id
WHERE a.status != 'cancelled'
LIMIT 50;
```

---

## 6. Notification Viewed Audit

### 6.1 Notification Viewed Stats by Company
```sql
SELECT
  c.name as company_name,
  COUNT(*) as total_active_agreements,
  COUNT(CASE WHEN a.notification_viewed = true THEN 1 END) as viewed,
  COUNT(CASE WHEN a.notification_viewed = false OR a.notification_viewed IS NULL THEN 1 END) as not_viewed
FROM agreements a
JOIN companies c ON a.company_id = c.id
WHERE a.status NOT IN ('cancelled')
  AND a.asaas_payment_id IS NOT NULL
GROUP BY c.name
ORDER BY c.name;
```

---

## 7. Webhook Event Audit

### 7.1 Recent Webhook Events
```sql
SELECT
  event_type,
  COUNT(*) as count,
  COUNT(CASE WHEN processed = true THEN 1 END) as processed,
  COUNT(CASE WHEN processed = false THEN 1 END) as pending,
  MAX(created_at) as last_received
FROM asaas_webhook_events
GROUP BY event_type
ORDER BY count DESC;
```

### 7.2 Failed Webhook Events
```sql
SELECT
  event_type,
  error_message,
  COUNT(*) as count
FROM asaas_webhook_events
WHERE processed = false
  AND error_message IS NOT NULL
GROUP BY event_type, error_message
ORDER BY count DESC
LIMIT 20;
```

---

## 8. Debt Statistics

### 8.1 Debt Status Distribution
```sql
SELECT
  c.name as company_name,
  d.status,
  COUNT(*) as count,
  SUM(d.amount) as total_amount
FROM debts d
JOIN companies c ON d.company_id = c.id
GROUP BY c.name, d.status
ORDER BY c.name, count DESC;
```

---

## 9. Cross-Table Consistency Check

### 9.1 Agreements without Valid Customer
```sql
SELECT
  c.name as company_name,
  COUNT(*) as orphan_agreements
FROM agreements a
JOIN companies c ON a.company_id = c.id
LEFT JOIN customers cu ON a.customer_id = cu.id
WHERE cu.id IS NULL
  AND a.status != 'cancelled'
GROUP BY c.name
ORDER BY orphan_agreements DESC;
```

### 9.2 Customers without Matching VMAX
```sql
SELECT
  c.name as company_name,
  COUNT(*) as customers_without_vmax
FROM customers cu
JOIN companies c ON cu.company_id = c.id
LEFT JOIN "VMAX" v ON
  REGEXP_REPLACE(v."CPF/CNPJ", '[^0-9]', '', 'g') = REGEXP_REPLACE(cu.document, '[^0-9]', '', 'g')
  AND v.id_company = cu.company_id
WHERE v.id IS NULL
GROUP BY c.name
ORDER BY customers_without_vmax DESC;
```

---

## 10. Expected vs Actual Comparison Template

After running queries, fill in this table:

| Metric | Dashboard Shows | SQL Query Result | Delta | Notes |
|--------|-----------------|------------------|-------|-------|
| Total Customers (Company A) | | | | |
| Negotiations Sent (Company A) | | | | |
| Negotiations Paid (Company A) | | | | |
| Total Debt (Company A) | | | | |
| Recovered Debt (Company A) | | | | |

---

*Next Step: Run queries, capture results, then create DIVERGENCE_HYPOTHESIS.md*
