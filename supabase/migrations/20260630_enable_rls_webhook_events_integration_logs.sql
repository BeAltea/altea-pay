-- Migration: Enable RLS on public tables flagged by Supabase advisor (rls_disabled_in_public)
-- Date: 2026-06-30
-- Context: Supabase Security Advisor reported tables in the `public` schema with
--          Row-Level Security DISABLED. With default anon/authenticated grants, the
--          public anon key could read/insert/update/delete every row in these tables.
--
-- Affected tables (RLS was OFF):
--   - asaas_webhook_events : raw ASAAS webhook payloads (payment/customer data)
--   - integration_logs     : credit-analysis / ERP integration logs (has company_id)
--
-- Access review (why this is safe):
--   - asaas_webhook_events: written & read ONLY by service-role webhook handlers
--     (app/api/asaas/webhook/payments, app/api/webhooks/asaas). Service role has
--     BYPASSRLS, so those paths are unaffected. No browser/anon access exists.
--   - integration_logs: all WRITES use createAdminClient()/service-role; the only
--     non-service READ is the super-admin ERP page
--     (app/super-admin/companies/[id]/erp-integration), covered by the super_admin
--     SELECT policy below.
--
-- Idempotent: safe to re-run.

-- =====================================================================
-- asaas_webhook_events
-- =====================================================================
ALTER TABLE public.asaas_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON public.asaas_webhook_events;
CREATE POLICY "service_role_all" ON public.asaas_webhook_events
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "super_admins_select" ON public.asaas_webhook_events;
CREATE POLICY "super_admins_select" ON public.asaas_webhook_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- =====================================================================
-- integration_logs
-- =====================================================================
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON public.integration_logs;
CREATE POLICY "service_role_all" ON public.integration_logs
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "super_admins_select" ON public.integration_logs;
CREATE POLICY "super_admins_select" ON public.integration_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- Company admins may read their own company's integration logs (multi-tenant isolation)
DROP POLICY IF EXISTS "company_admins_select" ON public.integration_logs;
CREATE POLICY "company_admins_select" ON public.integration_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
            AND profiles.company_id = integration_logs.company_id
        )
    );
