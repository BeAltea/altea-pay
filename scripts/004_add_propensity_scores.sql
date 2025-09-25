-- Add propensity score columns to debts table
ALTER TABLE public.debts 
ADD COLUMN IF NOT EXISTS propensity_payment_score DECIMAL(5,2) DEFAULT 0.00 CHECK (propensity_payment_score >= 0 AND propensity_payment_score <= 100),
ADD COLUMN IF NOT EXISTS propensity_loan_score DECIMAL(5,2) DEFAULT 0.00 CHECK (propensity_loan_score >= 0 AND propensity_loan_score <= 100),
ADD COLUMN IF NOT EXISTS last_score_update TIMESTAMPTZ DEFAULT NOW();

-- Create index for better performance on score queries
CREATE INDEX IF NOT EXISTS idx_debts_propensity_payment ON public.debts(propensity_payment_score DESC);
CREATE INDEX IF NOT EXISTS idx_debts_propensity_loan ON public.debts(propensity_loan_score DESC);
CREATE INDEX IF NOT EXISTS idx_debts_user_scores ON public.debts(user_id, propensity_payment_score DESC, propensity_loan_score DESC);

-- Create function to update propensity scores
CREATE OR REPLACE FUNCTION update_propensity_scores()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_score_update = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_score_update when scores change
DROP TRIGGER IF EXISTS trigger_update_propensity_scores ON public.debts;
CREATE TRIGGER trigger_update_propensity_scores
    BEFORE UPDATE OF propensity_payment_score, propensity_loan_score ON public.debts
    FOR EACH ROW
    EXECUTE FUNCTION update_propensity_scores();

-- Update existing debts with random scores for testing (will be replaced by real engine)
UPDATE public.debts 
SET 
    propensity_payment_score = ROUND((RANDOM() * 100)::numeric, 2),
    propensity_loan_score = ROUND((RANDOM() * 100)::numeric, 2),
    last_score_update = NOW()
WHERE propensity_payment_score IS NULL OR propensity_loan_score IS NULL;
