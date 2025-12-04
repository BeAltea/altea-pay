-- Add email and telefone columns to VMAX table
ALTER TABLE "VMAX" 
ADD COLUMN IF NOT EXISTS "Email" TEXT,
ADD COLUMN IF NOT EXISTS "Telefone" TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vmax_email ON "VMAX"("Email");
CREATE INDEX IF NOT EXISTS idx_vmax_telefone ON "VMAX"("Telefone");

-- Add comments to columns
COMMENT ON COLUMN "VMAX"."Email" IS 'Email do cliente para envio de cobranças';
COMMENT ON COLUMN "VMAX"."Telefone" IS 'Telefone do cliente no formato +5511999999999 para SMS/WhatsApp';
