-- Migration: Create assertiva_localize_logs table for Localize API audit trail
-- Date: 2026-03-03
-- Purpose: Track all Assertiva Localize API queries and data enrichment operations

CREATE TABLE IF NOT EXISTS assertiva_localize_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  cpf_cnpj TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('cpf', 'cnpj')),

  -- Dados da consulta
  assertiva_protocolo TEXT,
  query_status TEXT NOT NULL CHECK (query_status IN ('success', 'not_found', 'error')),
  error_message TEXT,

  -- Response completa (para auditoria)
  response_payload JSONB,

  -- Dados encontrados
  emails_found JSONB,          -- array de emails retornados
  phones_found JSONB,          -- array de telefones retornados
  best_email TEXT,             -- melhor email selecionado
  best_phone TEXT,             -- melhor telefone selecionado
  best_phone_whatsapp BOOLEAN DEFAULT false,

  -- Dados aplicados ao cadastro
  email_applied TEXT,          -- email que foi efetivamente salvo (null se não aplicou)
  phone_applied TEXT,          -- telefone que foi efetivamente salvo
  email_before TEXT,           -- valor do email antes da atualização
  phone_before TEXT,           -- valor do telefone antes da atualização

  -- Metadados
  applied_at TIMESTAMPTZ,      -- quando os dados foram aplicados (null se só consultou)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID              -- ID do super-admin que executou
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_localize_logs_company ON assertiva_localize_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_localize_logs_client ON assertiva_localize_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_localize_logs_created ON assertiva_localize_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_localize_logs_cpf_cnpj ON assertiva_localize_logs(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_localize_logs_status ON assertiva_localize_logs(query_status);

-- RLS Policies
ALTER TABLE assertiva_localize_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can see all logs
CREATE POLICY "Super admins can view all localize logs" ON assertiva_localize_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Super admins can insert logs
CREATE POLICY "Super admins can insert localize logs" ON assertiva_localize_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Super admins can update logs (for applying data)
CREATE POLICY "Super admins can update localize logs" ON assertiva_localize_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Service role has full access
CREATE POLICY "Service role full access to localize logs" ON assertiva_localize_logs
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE assertiva_localize_logs IS 'Audit trail for Assertiva Localize API queries and data enrichment';
COMMENT ON COLUMN assertiva_localize_logs.query_status IS 'success = data found, not_found = no data for CPF/CNPJ, error = API error';
COMMENT ON COLUMN assertiva_localize_logs.best_phone_whatsapp IS 'Whether the selected phone number has WhatsApp according to Assertiva';
