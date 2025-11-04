-- Add new essential fields to credit_profiles table
ALTER TABLE public.credit_profiles
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS document_type VARCHAR(10) CHECK (document_type IN ('CPF', 'CNPJ')),
ADD COLUMN IF NOT EXISTS city VARCHAR(255),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'very_high')),
ADD COLUMN IF NOT EXISTS has_sanctions BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_public_bonds BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sanctions_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS public_bonds_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_analysis_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending';

-- Drop the old unique constraint that prevents multiple analyses
ALTER TABLE public.credit_profiles DROP CONSTRAINT IF EXISTS credit_profiles_cpf_company_id_key;

-- Create new unique constraint that allows multiple analyses with different sources
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_profiles_unique_analysis 
ON public.credit_profiles(cpf, company_id, source, analysis_type);

-- Add index for customer_id for better performance
CREATE INDEX IF NOT EXISTS idx_credit_profiles_customer_id ON public.credit_profiles(customer_id);

-- Add index for risk_level for filtering
CREATE INDEX IF NOT EXISTS idx_credit_profiles_risk_level ON public.credit_profiles(risk_level);

-- Add index for has_sanctions for filtering
CREATE INDEX IF NOT EXISTS idx_credit_profiles_has_sanctions ON public.credit_profiles(has_sanctions);

-- Add index for source and analysis_type combination
CREATE INDEX IF NOT EXISTS idx_credit_profiles_source_type ON public.credit_profiles(source, analysis_type);

-- Add index for last_analysis_date for sorting
CREATE INDEX IF NOT EXISTS idx_credit_profiles_last_analysis ON public.credit_profiles(last_analysis_date DESC);

COMMENT ON COLUMN public.credit_profiles.name IS 'Nome do cliente';
COMMENT ON COLUMN public.credit_profiles.document_type IS 'Tipo de documento: CPF ou CNPJ';
COMMENT ON COLUMN public.credit_profiles.city IS 'Cidade do cliente';
COMMENT ON COLUMN public.credit_profiles.email IS 'Email do cliente';
COMMENT ON COLUMN public.credit_profiles.phone IS 'Telefone do cliente';
COMMENT ON COLUMN public.credit_profiles.risk_level IS 'Nível de risco: low, medium, high, very_high';
COMMENT ON COLUMN public.credit_profiles.has_sanctions IS 'Indica se o cliente possui sanções (CEIS/CNEP)';
COMMENT ON COLUMN public.credit_profiles.has_public_bonds IS 'Indica se o cliente possui vínculos públicos';
COMMENT ON COLUMN public.credit_profiles.sanctions_count IS 'Quantidade de sanções encontradas';
COMMENT ON COLUMN public.credit_profiles.public_bonds_count IS 'Quantidade de vínculos públicos encontrados';
COMMENT ON COLUMN public.credit_profiles.last_analysis_date IS 'Data da última análise realizada';
COMMENT ON COLUMN public.credit_profiles.status IS 'Status da análise: pending, completed, failed';
