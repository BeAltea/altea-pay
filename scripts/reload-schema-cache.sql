-- Reload PostgREST schema cache to fix "user_id column not found" error
NOTIFY pgrst, 'reload schema';

-- Verify credit_profiles structure (should NOT have user_id column)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'credit_profiles'
ORDER BY ordinal_position;

-- Verify the unique constraint exists for upsert
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'credit_profiles'
AND constraint_type = 'UNIQUE';
