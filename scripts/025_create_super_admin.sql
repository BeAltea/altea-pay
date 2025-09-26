-- Script para criar usuário Super Admin para testes
-- Execute este script para criar um usuário super admin

DO $$
BEGIN
    -- Primeiro, vamos verificar se o tipo user_role inclui 'super_admin'
    -- Se não incluir, vamos adicionar
    BEGIN
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
    EXCEPTION
        WHEN duplicate_object THEN
            -- Valor já existe, continuar
            NULL;
    END;
END $$;

-- Inserir um perfil super admin de teste
-- IMPORTANTE: Substitua o email abaixo pelo email que você usou para se registrar
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    company_id,
    phone,
    company_name,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'superadmin@alteapay.com.br', -- MUDE ESTE EMAIL para o seu email de teste
    'Super Administrador Altea',
    'super_admin'::user_role,
    NULL, -- Super admin não pertence a uma empresa específica
    '+55 11 99999-9999',
    'Altea Pay',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = 'super_admin'::user_role,
    full_name = 'Super Administrador Altea',
    company_name = 'Altea Pay',
    updated_at = NOW();

-- Também vamos criar alguns admins de empresa para teste
-- Admin da Energia São Paulo
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    company_id,
    phone,
    company_name,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'admin@energiasp.com.br',
    'Administrador Energia SP',
    'admin'::user_role,
    (SELECT id FROM companies WHERE name = 'Energia São Paulo Ltda'),
    '+55 11 98888-8888',
    'Energia São Paulo Ltda',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = 'admin'::user_role,
    company_id = (SELECT id FROM companies WHERE name = 'Energia São Paulo Ltda'),
    full_name = 'Administrador Energia SP',
    company_name = 'Energia São Paulo Ltda',
    updated_at = NOW();

-- Admin das Águas do Rio Grande
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    company_id,
    phone,
    company_name,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'admin@aguasrg.com.br',
    'Administrador Águas RG',
    'admin'::user_role,
    (SELECT id FROM companies WHERE name = 'Águas do Rio Grande S.A.'),
    '+55 51 97777-7777',
    'Águas do Rio Grande S.A.',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = 'admin'::user_role,
    company_id = (SELECT id FROM companies WHERE name = 'Águas do Rio Grande S.A.'),
    full_name = 'Administrador Águas RG',
    company_name = 'Águas do Rio Grande S.A.',
    updated_at = NOW();

-- Relatório final
SELECT 
    'Usuários criados/atualizados:' as status,
    COUNT(*) as total
FROM profiles 
WHERE email IN (
    'superadmin@alteapay.com.br',
    'admin@energiasp.com.br', 
    'admin@aguasrg.com.br'
);

-- Mostrar os usuários criados
SELECT 
    email,
    full_name,
    role,
    company_name,
    CASE 
        WHEN company_id IS NULL THEN 'Acesso Global (Super Admin)'
        ELSE 'Acesso Restrito à Empresa'
    END as nivel_acesso
FROM profiles 
WHERE email IN (
    'superadmin@alteapay.com.br',
    'admin@energiasp.com.br', 
    'admin@aguasrg.com.br'
)
ORDER BY role DESC;
