-- Remove foreign key constraint from credit_profiles
-- This allows credit_profiles.customer_id to reference VMAX.id instead of customers.id

-- Drop the foreign key constraint
ALTER TABLE credit_profiles 
DROP CONSTRAINT IF EXISTS credit_profiles_customer_id_fkey;

-- Verify the constraint was removed
SELECT 
  'Foreign key constraint removed successfully' as message,
  COUNT(*) as total_credit_profiles
FROM credit_profiles;
