-- Script definitivo para corrigir problemas de RLS e autenticação
-- Resolve os erros 406 e 403 que impedem acesso aos perfis

BEGIN;

-- 1. LIMPEZA COMPLETA DE POLÍTICAS CONFLITANTES
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Remove todas as políticas da tabela profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    END LOOP;
END $$;

-- Remove funções problemáticas que causam recursão
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_company_id() CASCADE;

-- 2. REABILITA RLS COM POLÍTICAS SIMPLES E SEGURAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política básica: usuários podem ver e editar apenas seu próprio perfil
CREATE POLICY "profiles_own_access" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- Política para service role (necessária para triggers e operações administrativas)
CREATE POLICY "profiles_service_role" ON public.profiles
    FOR ALL USING (auth.role() = 'service_role');

-- 3. GARANTE PERMISSÕES ADEQUADAS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

-- 4. CORRIGE O TRIGGER DE CRIAÇÃO DE PERFIL
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recria função de criação de perfil mais robusta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Tenta inserir o perfil, mas não falha se já existir
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'::user_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não impede a criação do usuário
    RAISE LOG 'Erro ao criar perfil para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recria o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. CRIA PERFIS PARA USUÁRIOS EXISTENTES QUE NÃO TÊM PERFIL
INSERT INTO public.profiles (id, email, role, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    'user'::user_role,
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 6. ATUALIZA PERFIS EXISTENTES PARA GARANTIR CONSISTÊNCIA
UPDATE public.profiles 
SET 
    role = COALESCE(role, 'user'::user_role),
    updated_at = NOW()
WHERE role IS NULL;

-- 7. CRIA ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

COMMIT;

-- Mensagem de sucesso
SELECT 'RLS corrigido com sucesso! Usuários agora podem acessar seus perfis.' as status;
