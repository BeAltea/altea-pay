-- Add updated_at column to credit_profiles for tracking when analysis was last updated
-- This is important because created_at only tracks initial creation, not subsequent updates

-- Add updated_at column if it doesn't exist
ALTER TABLE public.credit_profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for sorting by updated_at
CREATE INDEX IF NOT EXISTS idx_credit_profiles_updated_at ON public.credit_profiles(updated_at DESC);

-- Create trigger to automatically update updated_at on any UPDATE
CREATE OR REPLACE FUNCTION update_credit_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_credit_profiles_updated_at ON public.credit_profiles;

CREATE TRIGGER trigger_credit_profiles_updated_at
    BEFORE UPDATE ON public.credit_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_credit_profiles_updated_at();

-- Backfill: set updated_at = created_at for existing records that don't have it
UPDATE public.credit_profiles 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Add comment
COMMENT ON COLUMN public.credit_profiles.updated_at IS 'Timestamp of when the analysis was last updated/reprocessed';
