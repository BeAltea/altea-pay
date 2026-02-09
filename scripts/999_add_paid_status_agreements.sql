-- Add "paid" status to agreements table check constraint
-- This is needed for ASAAS sync to properly mark agreements as paid

BEGIN;

-- Remove old constraint
DO $$
BEGIN
    -- Try to remove possible status constraints
    BEGIN
        ALTER TABLE public.agreements DROP CONSTRAINT IF EXISTS agreements_status_check;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
        ALTER TABLE public.agreements DROP CONSTRAINT IF EXISTS agreements_status_check1;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
END $$;

-- Add new constraint with "paid" included
ALTER TABLE public.agreements
ADD CONSTRAINT agreements_status_check
CHECK (status IN ('draft', 'pending', 'active', 'paid', 'completed', 'cancelled', 'breached', 'defaulted'));

COMMIT;

SELECT 'Status paid adicionado com sucesso!' as status;
