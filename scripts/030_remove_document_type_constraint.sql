-- Remove o check constraint problemático de document_type
-- Isso permite qualquer valor no campo document_type

-- Remove o constraint da tabela customers
ALTER TABLE IF EXISTS public.customers 
DROP CONSTRAINT IF EXISTS customers_document_type_check;

-- Adiciona um comentário explicativo
COMMENT ON COLUMN public.customers.document_type IS 'Tipo de documento: cpf ou cnpj (sem validação de constraint)';

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE 'Check constraint customers_document_type_check removido com sucesso';
END $$;
