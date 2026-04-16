# Dashboard Metric Inventory

**Generated:** 2026-04-16
**Purpose:** Phase 1.1 - Catalog all dashboard metrics across portals for reconciliation analysis

---

## 1. Super Admin Portal (`/super-admin`)

### 1.1 Main Dashboard (`app/super-admin/page.tsx`)

| Metric | Display Name | Source Table | Calculation Logic | Lines |
|--------|--------------|--------------|-------------------|-------|
| `totalCompanies` | Total de Empresas | `companies` | COUNT(*) | L188 |
| `totalCustomers` | Total de Clientes | `VMAX` | Sum of all company VMAX records | L190 |
| `totalDebts` | (part of totalAmount) | `VMAX` | Count of non-paid VMAX records | L191 |
| `totalAmount` | Valor Total em Cobranca | `VMAX.Vencido` | Sum of Vencido excluding paid | L145-152 |
| `totalRecovered` | (hidden in summary) | `VMAX.Vencido` | Sum of Vencido for paid | L155-162 |
| `totalOverdue` | Casos Criticos | `VMAX` | Count where `Dias Inad. > 0` and not paid | L138-142 |
| `totalAnalyses` | Analises Realizadas | `credit_profiles` | COUNT(*) | L211 |

**Paid Detection Logic (Super Admin Page):**
```typescript
const isPaid = (v: any) => {
  const doc = (v["CPF/CNPJ"] || "").replace(/\D/g, "")
  return companyPaidDocs.has(doc) || v.negotiation_status === "PAGO"
}
```

Uses:
- `PAID_AGREEMENT_STATUSES`: `["completed", "paid"]`
- `PAID_PAYMENT_STATUSES`: `["received", "confirmed"]`
- `PAID_ASAAS_STATUSES`: `["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]`

### 1.2 Negotiations Page (`components/super-admin/negotiations-client.tsx`)

| Metric | Display Name | Source | Calculation Logic | Lines |
|--------|--------------|--------|-------------------|-------|
| `total` | Total de Clientes | API response | `customers.length` | L1041 |
| `withNegotiation` | Negociacoes Enviadas | API response | Filter: `hasNegotiation && !isCancelled` | L1060 |
| `withoutNegotiation` | Pendentes de Envio | API response | Filter: `!hasNegotiation \|\| isCancelled` | L1064 |
| `paidCount` | Negociacoes Pagas | API response | Filter: multiple paid status checks | L1045-1050 |
| `viewedCount` | Cobrancas Visualizadas | API response | Filter: `hasNegotiation && !isCancelled && notificationViewed` | L1067 |
| `totalCancelledNegotiations` | Negociacoes Canceladas | API response | Sum of `cancelledCount` per customer | L1056 |
| `pendingDebt` | Divida Pendente | API response | Sum of `totalDebt` for non-paid customers | L1077-1083 |
| `recoveredDebt` | Divida Recuperada | API response | Sum of `totalDebt` for paid customers | L1073 |

**Paid Detection Logic (Negotiations Client):**
```typescript
const isPaidStatus = c.isPaid || c.status === "paid" ||
  c.asaasStatus === "RECEIVED" || c.asaasStatus === "RECEIVED_IN_CASH" || c.asaasStatus === "CONFIRMED" ||
  c.paymentStatus === "received" || c.paymentStatus === "confirmed"
```

### 1.3 Negotiations API (`app/api/super-admin/negotiations/customers/route.ts`)

**Customer Fields Returned:**
- `id`: VMAX.id
- `name`: VMAX.Cliente
- `document`: VMAX."CPF/CNPJ"
- `totalDebt`: Parsed from VMAX.Vencido
- `daysOverdue`: Parsed from VMAX."Dias Inad."
- `hasNegotiation`: boolean (any non-cancelled agreement exists)
- `hasActiveNegotiation`: boolean (active, non-paid, non-cancelled)
- `isPaid`: boolean (RECEIVED, CONFIRMED, etc.)
- `isCancelled`: boolean (all agreements cancelled)
- `cancelledCount`: number
- `paymentStatus`: agreements.payment_status
- `asaasStatus`: agreements.asaas_status
- `dueDate`: agreements.due_date (ASAAS charge due date)
- `notificationViewed`: agreements.notification_viewed

---

## 2. Admin Portal (`/dashboard`)

### 2.1 Main Dashboard (`app/dashboard/page.tsx`)

| Metric | Display Name | Source Table | Calculation Logic | Lines |
|--------|--------------|--------------|-------------------|-------|
| `totalClientes` | Total de Clientes | `VMAX` | COUNT where id_company = companyId | L183 |
| `negotiationsEnviadas` | Negociacoes Enviadas | `VMAX` + `agreements` | Count VMAX where hasActiveAgreement=true | L228 |
| `negotiationsPendentes` | Pendentes de Envio | Derived | totalClientes - negotiationsEnviadas | L229 |
| `negotiationsPagas` | Negociacoes Pagas | `VMAX` + `agreements` | Count VMAX where isPaid=true | L232 |
| `finalPendingDebt` | Divida Pendente | `VMAX.Vencido` | totalDebt - finalRecoveredDebt | L240 |
| `finalRecoveredDebt` | Divida Recuperada | `agreements` | Sum agreed_amount for paid agreements | L235-237 |
| `agingBuckets` | Dividas por Faixa | `VMAX` | Group by days overdue buckets | L188-207 |

**Paid Detection Logic (Dashboard Page):**
```typescript
// From agreements
a.payment_status === "received" ||
a.payment_status === "confirmed" ||
a.status === "completed" ||
a.status === "paid" ||
a.asaas_status === "RECEIVED" ||
a.asaas_status === "CONFIRMED"
```

### 2.2 Clientes Page (`components/dashboard/admin-clientes-content.tsx`)

| Metric | Display Name | Source | Calculation Logic | Lines |
|--------|--------------|--------|-------------------|-------|
| `totalDebt` | Divida Total | Props | Sum of debtValue for activeDebts (debtStatus !== "quitada") | L208-209 |
| `totalClients` | Quantidade | Props | clientes.length | L210 |
| `maxDebt` | Maior Divida | Props | Math.max of debtValues | L212 |
| `avgDays` | Atraso Medio | Props | Average of diasAtraso > 0 | L215-220 |
| `negotiationsInProgress` | Negociacoes | Props | Count: ATIVA_ASAAS, ATIVA, or PAGO | L224-228 |

**Status Logic:**
- `quitada`: asaasStatus === "PAGO" OR paymentStatus in [received, confirmed]
- `vencida`: paymentStatus === "overdue"
- `aguardando`: hasAsaasCharge && paymentStatus === "pending"
- `em_aberto`: no negotiation sent

---

## 3. Status Constants Reference

**File:** `lib/constants/payment-status.ts`

```typescript
export const PAID_AGREEMENT_STATUSES = ["completed", "paid", "pago_ao_cliente"] as const
export const PAID_PAYMENT_STATUSES = ["received", "confirmed"] as const
export const PAID_ASAAS_STATUSES = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"] as const
```

**CRITICAL NOTE:** `pago_ao_cliente` is included in PAID_AGREEMENT_STATUSES but NOT consistently checked in all dashboard logic.

---

## 4. Potential Discrepancy Points

### 4.1 Inconsistent Paid Detection

| Component | Checks `pago_ao_cliente`? | Checks `RECEIVED_IN_CASH`? |
|-----------|---------------------------|----------------------------|
| Super Admin Page | NO (uses constants) | YES (via constants) |
| Negotiations Client | NO | YES |
| Dashboard Page | NO | NO |
| Admin Clientes | NO | NO |

### 4.2 Different Data Sources

| Portal | Primary Source | Negotiation Source |
|--------|----------------|-------------------|
| Super Admin Dashboard | VMAX | agreements (via document match) |
| Super Admin Negotiations | API (VMAX + agreements) | Direct join |
| Admin Dashboard | VMAX | agreements (via document match) |
| Admin Clientes | Props (server-rendered) | Props (already computed) |

### 4.3 Due Date Confusion

- **VMAX.Vecto**: Original debt due date (from provider)
- **agreements.due_date**: ASAAS charge due date (when payment was created)
- **debts.due_date**: May contain either, depends on creation path

---

## 5. ASAAS Source of Truth

The ASAAS API is the authoritative source for:
- Payment status (PENDING, RECEIVED, CONFIRMED, OVERDUE, etc.)
- Payment viewing info (notification_viewed)
- Customer existence

**Key Endpoint:** `GET /payments/{id}` returns:
- `status`: Current payment status
- `dateCreated`, `dueDate`, `paymentDate`
- `viewingInfo.viewedAt`, `viewingInfo.channel`

---

## 6. Reconciliation Priority Metrics

The following metrics are most critical for reconciliation:

1. **Paid Count** - Most inconsistent detection logic
2. **Total Debt** - Depends on paid exclusion
3. **Recovered Debt** - Should match ASAAS received payments
4. **Negotiations Sent** - Should match ASAAS charges count

---

*Next Step: Run SQL audit queries to establish baseline counts*
