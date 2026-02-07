-- Script to remove test client records
-- Records to remove:
-- 1. Fabio Moura Barros
-- 2. Fabio Barros
-- 3. Pedro Moura Barros
-- 4. Rodrigo Barbieri

-- First, let's see what we're going to delete (SELECT before DELETE)

-- Check VMAX table
SELECT id, "Cliente", "CPF/CNPJ", id_company
FROM "VMAX"
WHERE "Cliente" ILIKE '%Fabio Moura Barros%'
   OR "Cliente" ILIKE '%Fabio Barros%'
   OR "Cliente" ILIKE '%Pedro Moura Barros%'
   OR "Cliente" ILIKE '%Rodrigo Barbieri%';

-- Check customers table
SELECT id, name, document, company_id
FROM customers
WHERE name ILIKE '%Fabio Moura Barros%'
   OR name ILIKE '%Fabio Barros%'
   OR name ILIKE '%Pedro Moura Barros%'
   OR name ILIKE '%Rodrigo Barbieri%';

-- Check profiles table
SELECT id, full_name, email, role
FROM profiles
WHERE full_name ILIKE '%Fabio Moura Barros%'
   OR full_name ILIKE '%Fabio Barros%'
   OR full_name ILIKE '%Pedro Moura Barros%'
   OR full_name ILIKE '%Rodrigo Barbieri%';

-- Check credit_profiles table
SELECT id, name, cpf, company_id
FROM credit_profiles
WHERE name ILIKE '%Fabio Moura Barros%'
   OR name ILIKE '%Fabio Barros%'
   OR name ILIKE '%Pedro Moura Barros%'
   OR name ILIKE '%Rodrigo Barbieri%';

-- ===== DELETE OPERATIONS =====
-- Run these after verifying the SELECT results

-- Delete from credit_profiles (no FK dependencies)
DELETE FROM credit_profiles
WHERE name ILIKE '%Fabio Moura Barros%'
   OR name ILIKE '%Fabio Barros%'
   OR name ILIKE '%Pedro Moura Barros%'
   OR name ILIKE '%Rodrigo Barbieri%';

-- Delete from behavioral_analyses (linked to credit_profiles by cpf)
-- Get CPFs first from VMAX
DELETE FROM behavioral_analyses
WHERE cpf IN (
  SELECT "CPF/CNPJ" FROM "VMAX"
  WHERE "Cliente" ILIKE '%Fabio Moura Barros%'
     OR "Cliente" ILIKE '%Fabio Barros%'
     OR "Cliente" ILIKE '%Pedro Moura Barros%'
     OR "Cliente" ILIKE '%Rodrigo Barbieri%'
);

-- Delete from collection_actions (linked to customer_id)
DELETE FROM collection_actions
WHERE customer_id IN (
  SELECT id FROM "VMAX"
  WHERE "Cliente" ILIKE '%Fabio Moura Barros%'
     OR "Cliente" ILIKE '%Fabio Barros%'
     OR "Cliente" ILIKE '%Pedro Moura Barros%'
     OR "Cliente" ILIKE '%Rodrigo Barbieri%'
);

-- Delete from collection_rule_executions (linked to customer_id)
DELETE FROM collection_rule_executions
WHERE customer_id IN (
  SELECT id FROM "VMAX"
  WHERE "Cliente" ILIKE '%Fabio Moura Barros%'
     OR "Cliente" ILIKE '%Fabio Barros%'
     OR "Cliente" ILIKE '%Pedro Moura Barros%'
     OR "Cliente" ILIKE '%Rodrigo Barbieri%'
);

-- Delete from agreements (linked to customer_id)
DELETE FROM agreements
WHERE customer_id IN (
  SELECT id FROM "VMAX"
  WHERE "Cliente" ILIKE '%Fabio Moura Barros%'
     OR "Cliente" ILIKE '%Fabio Barros%'
     OR "Cliente" ILIKE '%Pedro Moura Barros%'
     OR "Cliente" ILIKE '%Rodrigo Barbieri%'
);

-- Delete from debts (linked to customer_id via customers table)
DELETE FROM debts
WHERE customer_id IN (
  SELECT id FROM customers
  WHERE name ILIKE '%Fabio Moura Barros%'
     OR name ILIKE '%Fabio Barros%'
     OR name ILIKE '%Pedro Moura Barros%'
     OR name ILIKE '%Rodrigo Barbieri%'
);

-- Delete from customers table
DELETE FROM customers
WHERE name ILIKE '%Fabio Moura Barros%'
   OR name ILIKE '%Fabio Barros%'
   OR name ILIKE '%Pedro Moura Barros%'
   OR name ILIKE '%Rodrigo Barbieri%';

-- Delete from VMAX table
DELETE FROM "VMAX"
WHERE "Cliente" ILIKE '%Fabio Moura Barros%'
   OR "Cliente" ILIKE '%Fabio Barros%'
   OR "Cliente" ILIKE '%Pedro Moura Barros%'
   OR "Cliente" ILIKE '%Rodrigo Barbieri%';

-- Note: Deleting from auth.users requires special handling through Supabase Admin API
-- Check profiles that might be linked to auth accounts
SELECT p.id, p.full_name, p.email, p.role
FROM profiles p
WHERE p.full_name ILIKE '%Fabio Moura Barros%'
   OR p.full_name ILIKE '%Fabio Barros%'
   OR p.full_name ILIKE '%Pedro Moura Barros%'
   OR p.full_name ILIKE '%Rodrigo Barbieri%';
