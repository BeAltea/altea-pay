-- Primeiro, verificar se já existe um admin
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    -- Contar quantos admins existem
    SELECT COUNT(*) INTO admin_count 
    FROM public.profiles 
    WHERE role = 'admin';
    
    -- Se não há admin, mostrar instruções
    IF admin_count = 0 THEN
        RAISE NOTICE 'Nenhum usuário admin encontrado.';
        RAISE NOTICE 'Para criar um admin:';
        RAISE NOTICE '1. Registre-se normalmente no sistema';
        RAISE NOTICE '2. Execute: UPDATE public.profiles SET role = ''admin'' WHERE email = ''seu@email.com'';';
    ELSE
        RAISE NOTICE 'Encontrados % usuário(s) admin no sistema', admin_count;
    END IF;
END $$;

-- Mostrar todos os usuários e seus roles
SELECT 
    au.email,
    p.role,
    p.full_name,
    au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC;
