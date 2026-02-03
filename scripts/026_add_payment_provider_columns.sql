-- Add provider-agnostic payment columns to agreements table
-- These columns coexist with existing asaas_* columns (no data migration risk)

ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50),
  ADD COLUMN IF NOT EXISTS provider_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_payment_url TEXT,
  ADD COLUMN IF NOT EXISTS provider_pix_qrcode_url TEXT,
  ADD COLUMN IF NOT EXISTS provider_boleto_url TEXT;

-- Backfill from existing asaas_* columns where data exists
UPDATE public.agreements
SET
  payment_provider = 'asaas',
  provider_customer_id = asaas_customer_id,
  provider_payment_id = asaas_payment_id,
  provider_payment_url = asaas_payment_url,
  provider_pix_qrcode_url = asaas_pix_qrcode_url,
  provider_boleto_url = asaas_boleto_url
WHERE asaas_payment_id IS NOT NULL
  AND provider_payment_id IS NULL;

-- Index for looking up agreements by provider payment ID
CREATE INDEX IF NOT EXISTS idx_agreements_provider_payment_id
  ON public.agreements(provider_payment_id);

CREATE INDEX IF NOT EXISTS idx_agreements_payment_provider
  ON public.agreements(payment_provider);
