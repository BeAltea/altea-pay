-- Refresh schema cache for collection_actions table
-- This ensures the company_id column is properly recognized

-- Verify that the company_id column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'collection_actions' 
        AND column_name = 'company_id'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE public.collection_actions 
        ADD COLUMN company_id UUID REFERENCES public.companies(id);
        
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_collection_actions_company_id 
        ON public.collection_actions(company_id);
        
        RAISE NOTICE 'Column company_id added to collection_actions';
    ELSE
        RAISE NOTICE 'Column company_id already exists in collection_actions';
    END IF;
END $$;

-- Force Supabase to refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the column exists and is accessible
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'collection_actions' 
ORDER BY ordinal_position;
