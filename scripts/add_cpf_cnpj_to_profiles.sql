-- Add cpf_cnpj and person_type columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
ADD COLUMN IF NOT EXISTS person_type TEXT CHECK (person_type IN ('PF', 'PJ'));

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_cpf_cnpj ON profiles(cpf_cnpj);

-- Add comment to columns
COMMENT ON COLUMN profiles.cpf_cnpj IS 'CPF or CNPJ of the user';
COMMENT ON COLUMN profiles.person_type IS 'Person type: PF (Pessoa Física) or PJ (Pessoa Jurídica)';
