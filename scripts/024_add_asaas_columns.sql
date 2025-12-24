-- Script para adicionar colunas do Asaas na tabela agreements
BEGIN;

-- Adiciona colunas para integração com Asaas
ALTER TABLE public.agreements 
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT,
ADD COLUMN IF NOT EXISTS asaas_payment_url TEXT,
ADD COLUMN IF NOT EXISTS asaas_pix_qrcode_url TEXT,
ADD COLUMN IF NOT EXISTS asaas_boleto_url TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS installment_amount NUMERIC(10,2);

-- Cria índice para buscar por payment_id do Asaas
CREATE INDEX IF NOT EXISTS idx_agreements_asaas_payment_id 
ON public.agreements(asaas_payment_id);

-- Adiciona check constraint para payment_status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'agreements_payment_status_check'
    ) THEN
        ALTER TABLE public.agreements 
        ADD CONSTRAINT agreements_payment_status_check 
        CHECK (payment_status IN ('pending', 'confirmed', 'received', 'overdue', 'refunded'));
    END IF;
END $$;

COMMIT;

SELECT 'Colunas do Asaas adicionadas com sucesso!' as status;
