-- Garantir que a coluna phone existe na tabela profiles
-- Executar este script para adicionar a coluna phone se não existir

DO $$ 
BEGIN
  -- Add phone column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
    COMMENT ON COLUMN public.profiles.phone IS 'Telefone de contato do usuário';
  END IF;
END $$;

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'phone';
