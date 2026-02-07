-- =====================================================
-- ASAAS Webhook Events Table and Additional Columns
-- Purpose: Track all webhook events for deduplication and audit
-- =====================================================

-- Create asaas_webhook_events table for event logging and deduplication
CREATE TABLE IF NOT EXISTS asaas_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE,          -- ASAAS event ID for deduplication (e.g., "evt_05b708f961d739ea...")
  event_type VARCHAR(100) NOT NULL,      -- e.g., PAYMENT_RECEIVED, PAYMENT_CREATED, etc.
  payment_id VARCHAR(255),               -- ASAAS payment ID (e.g., "pay_080225913252")
  customer_id VARCHAR(255),              -- ASAAS customer ID
  agreement_id UUID REFERENCES agreements(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,                -- Full webhook payload for debugging
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,                    -- Error message if processing failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster deduplication lookups
CREATE INDEX IF NOT EXISTS idx_asaas_webhook_events_event_id ON asaas_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_asaas_webhook_events_payment_id ON asaas_webhook_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_asaas_webhook_events_created_at ON asaas_webhook_events(created_at);
CREATE INDEX IF NOT EXISTS idx_asaas_webhook_events_processed ON asaas_webhook_events(processed);

-- Add additional ASAAS tracking columns to agreements table
ALTER TABLE agreements
ADD COLUMN IF NOT EXISTS asaas_status VARCHAR(50),           -- Raw ASAAS status string (PENDING, RECEIVED, etc.)
ADD COLUMN IF NOT EXISTS asaas_billing_type VARCHAR(50),     -- PIX, BOLETO, CREDIT_CARD
ADD COLUMN IF NOT EXISTS asaas_payment_date TIMESTAMP WITH TIME ZONE,  -- When payment was actually made
ADD COLUMN IF NOT EXISTS asaas_net_value DECIMAL(10,2),      -- Net value after ASAAS fees
ADD COLUMN IF NOT EXISTS asaas_invoice_url TEXT,             -- Link to ASAAS invoice
ADD COLUMN IF NOT EXISTS asaas_last_webhook_at TIMESTAMP WITH TIME ZONE,  -- Last webhook event received
ADD COLUMN IF NOT EXISTS asaas_last_synced_at TIMESTAMP WITH TIME ZONE;   -- Last polling sync timestamp

-- Add subscription ID for installment payments
ALTER TABLE agreements
ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;

-- Index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_agreements_asaas_subscription_id ON agreements(asaas_subscription_id);
CREATE INDEX IF NOT EXISTS idx_agreements_asaas_customer_id ON agreements(asaas_customer_id);

-- Comments for documentation
COMMENT ON TABLE asaas_webhook_events IS 'Log of all ASAAS webhook events for deduplication and audit';
COMMENT ON COLUMN asaas_webhook_events.event_id IS 'Unique event ID from ASAAS for deduplication';
COMMENT ON COLUMN asaas_webhook_events.event_type IS 'Type of event: PAYMENT_CREATED, PAYMENT_RECEIVED, etc.';
COMMENT ON COLUMN asaas_webhook_events.payload IS 'Full webhook payload from ASAAS';
COMMENT ON COLUMN agreements.asaas_status IS 'Raw ASAAS payment status: PENDING, CONFIRMED, RECEIVED, OVERDUE, REFUNDED, DELETED';
COMMENT ON COLUMN agreements.asaas_billing_type IS 'Payment method: PIX, BOLETO, CREDIT_CARD';
COMMENT ON COLUMN agreements.asaas_net_value IS 'Net value after ASAAS fees';
COMMENT ON COLUMN agreements.asaas_last_webhook_at IS 'Timestamp of last webhook event received';
COMMENT ON COLUMN agreements.asaas_last_synced_at IS 'Timestamp of last manual/cron sync with ASAAS API';
