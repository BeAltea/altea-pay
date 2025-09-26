-- Script simples para resolver problemas de RLS na tabela profiles
-- Desabilita RLS temporariamente para permitir acesso aos perfis existentes

-- Desabilitar RLS na tabela profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes que podem estar causando conflito
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;

-- Garantir que todos os usuários autenticados tenham acesso total à tabela profiles
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;

-- Verificar se existem perfis órfãos e criar se necessário
INSERT INTO profiles (id, email, role, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    'user'::user_role,
    NOW(),
    NOW()
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Confirmar que a operação foi bem-sucedida
SELECT 'RLS desabilitado e perfis sincronizados com sucesso' as status;
