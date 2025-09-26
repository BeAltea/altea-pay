-- Função para criar perfil automaticamente quando um usuário se registra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, company_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'company_name', ''),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Remove trigger existente se houver
drop trigger if exists on_auth_user_created on auth.users;

-- Cria trigger para executar a função quando um usuário é criado
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
