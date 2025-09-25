-- Criar usuário admin padrão
-- IMPORTANTE: Execute este script após criar o usuário admin no Supabase Auth

-- Primeiro, vamos verificar se já existe um usuário admin
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Procurar por um usuário com email admin (você deve ajustar este email)
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'admin@alteapay.com' 
    LIMIT 1;
    
    -- Se encontrou o usuário, atualizar o role para admin
    IF admin_user_id IS NOT NULL THEN
        UPDATE profiles 
        SET role = 'admin', 
            updated_at = NOW()
        WHERE id = admin_user_id;
        
        RAISE NOTICE 'Usuário admin atualizado com sucesso: %', admin_user_id;
    ELSE
        RAISE NOTICE 'Usuário admin não encontrado. Crie primeiro um usuário com email admin@alteapay.com no Supabase Auth';
    END IF;
END $$;

-- Garantir que o role padrão para novos usuários seja 'user'
UPDATE profiles SET role = 'user' WHERE role IS NULL;

-- Atualizar a função handle_new_user para definir role padrão como 'user'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    'user', -- Role padrão
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao criar perfil para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
