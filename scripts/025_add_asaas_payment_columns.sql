-- Add Asaas payment columns to agreements table
ALTER TABLE agreements
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT,
ADD COLUMN IF NOT EXISTS asaas_payment_url TEXT,
ADD COLUMN IF NOT EXISTS asaas_pix_qrcode_url TEXT,
ADD COLUMN IF NOT EXISTS asaas_boleto_url TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS installment_amount NUMERIC;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_agreements_asaas_payment_id ON agreements(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_agreements_payment_status ON agreements(payment_status);

-- Add comment
COMMENT ON COLUMN agreements.asaas_customer_id IS 'ID do cliente no Asaas';
COMMENT ON COLUMN agreements.asaas_payment_id IS 'ID da cobrança no Asaas';
COMMENT ON COLUMN agreements.asaas_payment_url IS 'Link universal de pagamento do Asaas';
COMMENT ON COLUMN agreements.payment_status IS 'Status do pagamento: pending, confirmed, received, overdue, refunded';
