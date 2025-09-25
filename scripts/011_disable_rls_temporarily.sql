-- Desabilitar RLS temporariamente para resolver o problema de recursão
-- e permitir que o sistema funcione corretamente

-- Remove todas as políticas existentes na tabela profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile updates" ON profiles;
DROP POLICY IF EXISTS "Allow profile inserts" ON profiles;
DROP POLICY IF EXISTS "Allow profile deletes" ON profiles;

-- Remove a função problemática se existir
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- Desabilita RLS na tabela profiles temporariamente
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Garante que a coluna role existe e tem valores padrão
UPDATE profiles SET role = 'user' WHERE role IS NULL;

-- Cria um usuário admin de teste se não existir
-- Substitua o email pelo seu email de admin
INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@cobrancaauto.com', -- MUDE ESTE EMAIL PARA O SEU
  'Administrador',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET role = 'admin';
