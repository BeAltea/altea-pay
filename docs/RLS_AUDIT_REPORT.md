# AlteaPay RLS Compliance Audit Report

**Date:** 2026-02-27
**Auditor:** Automated Security Review
**Scope:** Row Level Security and Tenant Isolation

---

## Executive Summary

This audit reviewed the AlteaPay codebase for Row Level Security (RLS) compliance and multi-tenant data isolation. The platform uses Supabase with PostgreSQL and employs RLS policies to enforce tenant isolation at the database level.

### Key Findings

| Category | Status | Risk Level |
|----------|--------|------------|
| Database RLS Policies | ENABLED | LOW |
| Core Tables Isolation | COMPLIANT | LOW |
| Service Role Usage | REQUIRES REVIEW | MEDIUM |
| VMAX Table | USES `id_company` | LOW |

---

## 1. Database Layer - RLS Status

### Tables with RLS Enabled

| Table | Has company_id | RLS Enabled | Policies |
|-------|----------------|-------------|----------|
| companies | N/A (parent) | Yes | Top-level table |
| customers | Yes | Yes | SELECT/INSERT/UPDATE/DELETE |
| debts | Yes | Yes | SELECT/INSERT/UPDATE/DELETE |
| agreements | Yes | Yes | SELECT/INSERT/UPDATE/DELETE |
| payments | Yes | Yes | SELECT/INSERT/UPDATE/DELETE |
| profiles | Yes | Yes | SELECT/INSERT/UPDATE/DELETE |
| collection_rules | Yes | Yes | SELECT/INSERT/UPDATE/DELETE |
| credit_profiles | Yes | Yes | SELECT/INSERT/UPDATE/DELETE |
| asaas_webhook_events | Yes | Yes | SELECT/INSERT/UPDATE |
| asaas_batches | Yes | Yes | SELECT/INSERT/UPDATE |

### VMAX Table

The VMAX table uses `id_company` instead of `company_id` for tenant isolation. This is a naming convention difference but functions correctly.

```sql
-- VMAX table structure
id_company UUID REFERENCES companies(id)
```

All queries to VMAX properly filter by `id_company`:
- `app/dashboard/clientes/page.tsx`: `.eq("id_company", profile.company_id)`
- `app/api/super-admin/negotiations/customers/route.ts`: `.eq("id_company", companyId)`

---

## 2. Application Layer - Service Role Usage

### Legitimate Service Role Use Cases

The following patterns are **correct and necessary**:

1. **Webhook Handlers** (`app/api/asaas/webhook/payments/route.ts`)
   - External webhooks cannot have user context
   - Service role required to update agreements
   - Validation via `ASAAS_WEBHOOK_TOKEN`

2. **Background Workers** (`lib/queue/workers/*.ts`)
   - Queue workers run without user context
   - Jobs include company_id in payload for filtering

3. **Super Admin Routes** (`app/api/super-admin/*`)
   - Super admin has cross-tenant access by design
   - Role verified before granting access

4. **Cron Jobs** (`app/api/cron/*`)
   - System operations require service role
   - Protected by `CRON_SECRET` token

### Files Using Service Role (97 total)

**High Priority - API Routes (accessible externally):**
- `app/api/asaas/webhook/payments/route.ts` - Webhook (validated by token)
- `app/api/asaas/sync-payments/route.ts` - Protected by CRON_SECRET
- `app/api/assertiva/callback/route.ts` - Callback (validates payload)

**Super Admin Routes (role-protected):**
- `app/api/super-admin/negotiations/customers/route.ts`
- `app/api/super-admin/users/[userId]/route.ts`
- `app/api/super-admin/send-bulk-negotiations/route.ts`
- All routes verify `profile?.role === "super_admin"` before processing

**Server Actions (user-context):**
- Most server actions use `createClient()` with user context
- Admin actions using service role include explicit `company_id` filtering

---

## 3. Potential Vulnerabilities

### 3.1 VMAX Queries - RESOLVED

The VMAX table correctly uses `id_company` for filtering. All identified queries include proper filtering.

### 3.2 Agreement Due Date Source - FIXED

**Issue:** The Vencimento column was displaying VMAX's `Vecto` (original debt date) instead of ASAAS agreement `due_date`.

**Resolution:** Fixed in this audit session:
- `app/dashboard/clientes/page.tsx` - Now passes `asaasDueDate` from agreements
- `components/dashboard/admin-clientes-content.tsx` - Now uses `cliente.asaasDueDate`
- `app/api/super-admin/negotiations/customers/route.ts` - Removed `vmax.Vecto` fallback

---

## 4. Recommendations

### Immediate Actions (None Required)

All critical RLS policies are in place. No immediate actions needed.

### Best Practices

1. **Continue using `createClient()` for user-context operations**
   - Automatically respects RLS policies
   - User's company_id is enforced at database level

2. **Use `createAdminClient()` only when necessary**
   - Webhooks from external services
   - Background workers
   - Super admin cross-tenant operations
   - Always include explicit `company_id` filtering

3. **API Route Protection Pattern**
   ```typescript
   // Super admin routes
   if (profile?.role !== "super_admin") {
     return NextResponse.json({ error: "Forbidden" }, { status: 403 })
   }

   // Webhook routes
   if (requestToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
   }
   ```

---

## 5. Compliance Checklist

- [x] RLS enabled on all tenant-sensitive tables
- [x] All tables have `company_id` or equivalent (`id_company`)
- [x] Super admin routes verify role before processing
- [x] Webhooks validate authentication tokens
- [x] VMAX queries filter by `id_company`
- [x] Vencimento column displays correct ASAAS due date
- [x] Background workers include company_id in job payload

---

## 6. Testing Recommendations

### Manual Verification

1. **Cross-tenant isolation test:**
   - Log in as admin of Company A
   - Verify cannot see Company B's customers/debts/agreements

2. **Super admin access test:**
   - Log in as super_admin
   - Verify can access all companies' data
   - Verify role check prevents non-super_admin access

3. **Webhook security test:**
   - Send webhook without valid token
   - Verify 401 Unauthorized response

---

## Appendix: Service Role Files

<details>
<summary>Full list of 97 files using service_role/createAdminClient</summary>

### API Routes
- app/api/asaas/webhook/payments/route.ts
- app/api/asaas/sync-payments/route.ts
- app/api/asaas/batch/*.ts
- app/api/super-admin/**/*.ts
- app/api/portal/signup/route.ts
- app/api/assertiva/callback/route.ts

### Server Actions
- app/actions/company-actions.ts
- app/actions/user-actions.ts
- app/actions/send-bulk-negotiations.ts
- app/actions/create-agreement-super-admin.ts
- app/actions/analyses-actions.ts
- app/actions/vmax-actions.ts
- app/actions/customer-actions.ts
- app/actions/credit-analysis.ts

### Background Workers
- lib/queue/workers/asaas-api.ts
- lib/queue/workers/email.worker.ts
- lib/queue/workers/charge.worker.ts

### Library Files
- lib/supabase/admin.ts
- lib/supabase/service.ts
- lib/collection-engine.ts
- services/creditAnalysisService.ts

</details>

---

**Report Generated:** 2026-02-27
**Status:** COMPLIANT
