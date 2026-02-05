-- Fix agreements table to allow user_id to be nullable (for VMAX-only clients)
-- Also update RLS policies to allow company-level access

-- Make user_id nullable in agreements
ALTER TABLE agreements ALTER COLUMN user_id DROP NOT NULL;

-- Make user_id nullable in debts (if not already)
ALTER TABLE debts ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing restrictive RLS policies on agreements
DROP POLICY IF EXISTS "Users can view own agreements" ON agreements;
DROP POLICY IF EXISTS "Users can insert own agreements" ON agreements;
DROP POLICY IF EXISTS "Users can update own agreements" ON agreements;
DROP POLICY IF EXISTS "Users can delete own agreements" ON agreements;
DROP POLICY IF EXISTS "Users can manage own agreements" ON agreements;

-- Create new policies that allow company-level access
CREATE POLICY "Users can view company agreements" ON agreements 
  FOR SELECT USING (
    auth.uid() = user_id 
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert company agreements" ON agreements 
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update company agreements" ON agreements 
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete company agreements" ON agreements 
  FOR DELETE USING (
    auth.uid() = user_id 
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );
