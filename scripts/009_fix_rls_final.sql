-- Remove todas as políticas existentes que estão causando recursão
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;

-- Remove a função que pode estar causando problemas
DROP FUNCTION IF EXISTS is_admin();

-- Desabilita RLS temporariamente para limpar
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Reabilita RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cria políticas simples e diretas sem recursão
-- Política 1: Usuários podem ver seu próprio perfil
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política 2: Usuários podem atualizar seu próprio perfil  
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Política 3: Permite inserção de novos perfis
CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política 4: Admins podem ver todos os perfis (usando service role)
-- Esta política só funciona quando chamada com service role key
CREATE POLICY "profiles_admin_all" ON profiles
    FOR ALL
    USING (
        -- Verifica se é service role ou se o usuário atual tem role admin
        auth.jwt() ->> 'role' = 'service_role' OR
        (
            SELECT role FROM profiles 
            WHERE user_id = auth.uid() 
            LIMIT 1
        ) = 'admin'
    );

-- Garante que a tabela profiles existe e tem a estrutura correta
DO $$
BEGIN
    -- Verifica se a coluna role existe, se não, adiciona
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
    END IF;
END $$;

-- Atualiza o perfil do admin se ainda não estiver correto
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'pedrom0503@gmail.com' AND role != 'admin';

-- Cria índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
