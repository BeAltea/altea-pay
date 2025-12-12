-- Add attendant_name field to agreements table
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS attendant_name TEXT;

-- Add comment
COMMENT ON COLUMN agreements.attendant_name IS 'Nome do atendente que criou a negociação';
