-- Verificar usuários e perfis existentes
SELECT 
    au.id,
    au.email,
    au.created_at as user_created_at,
    p.id as profile_id,
    p.role,
    p.full_name,
    p.created_at as profile_created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC;

-- Verificar se há perfis sem usuários
SELECT * FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Contar usuários por role
SELECT 
    COALESCE(p.role, 'no_profile') as role,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
GROUP BY p.role;
