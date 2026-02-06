-- Adicionar status "draft" ao check constraint da tabela agreements
BEGIN;

-- Remover constraint antigo (pode ter nomes diferentes dependendo de qual migration rodou)
DO $$
BEGIN
    -- Tentar remover possíveis constraints de status
    BEGIN
        ALTER TABLE public.agreements DROP CONSTRAINT IF EXISTS agreements_status_check;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
        ALTER TABLE public.agreements DROP CONSTRAINT IF EXISTS agreements_status_check1;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
END $$;

-- Adicionar novo constraint com "draft" incluido
ALTER TABLE public.agreements 
ADD CONSTRAINT agreements_status_check 
CHECK (status IN ('draft', 'active', 'completed', 'cancelled', 'breached', 'defaulted'));

COMMIT;

SELECT 'Status draft adicionado com sucesso!' as status;
