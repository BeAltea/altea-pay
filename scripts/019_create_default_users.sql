-- Script para criar usuários padrão no Supabase
-- Este script deve ser executado como administrador do Supabase

-- Primeiro, vamos criar os usuários usando a função admin do Supabase
-- IMPORTANTE: Este script precisa ser executado no SQL Editor do Supabase Dashboard
-- ou via API administrativa, não via aplicação

-- Criar usuário admin
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@admin.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  '',
  '',
  '',
  ''
);

-- Criar usuário cliente
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'cliente@cliente.com',
  crypt('cliente123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  '',
  '',
  '',
  ''
);

-- Agora criar os perfis correspondentes
-- O trigger já deve criar automaticamente, mas vamos garantir

-- Perfil admin
INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
  id,
  'admin@admin.com',
  'Administrador',
  'admin',
  now(),
  now()
FROM auth.users 
WHERE email = 'admin@admin.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  full_name = 'Administrador';

-- Perfil cliente
INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
  id,
  'cliente@cliente.com',
  'Cliente Teste',
  'user',
  now(),
  now()
FROM auth.users 
WHERE email = 'cliente@cliente.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'user',
  full_name = 'Cliente Teste';
