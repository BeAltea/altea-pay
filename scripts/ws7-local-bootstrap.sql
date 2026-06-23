-- WS-7 bootstrap minimo (subconjunto do schema para a demo) + seed.
-- Aplicado via psql no Postgres local do supabase start. Idempotente.
-- NAO e o schema completo de producao (116 scripts); cobre o caminho
-- inbound -> agente -> close-agreement -> cobranca. RLS off no minimo (writes
-- via service-role; documentado em docs/db-local-strategy.md).

create extension if not exists pgcrypto;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_at timestamptz default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  name text,
  document text,
  phone text,
  email text,
  created_at timestamptz default now()
);

create table if not exists debts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  customer_id uuid,
  amount numeric(12,2),
  current_amount numeric(12,2),
  original_amount numeric(12,2),
  due_date date,
  status text,
  description text,
  created_at timestamptz default now()
);

create table if not exists agreements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  debt_id uuid,
  customer_id uuid,
  original_amount numeric(12,2),
  agreed_amount numeric(12,2),
  installments int,
  installment_amount numeric(12,2),
  due_date date,
  status text,
  payment_status text,
  terms text,
  asaas_payment_id text,
  asaas_customer_id text,
  asaas_invoice_url text,
  asaas_payment_url text,
  asaas_boleto_url text,
  asaas_pix_qrcode_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists asaas_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  type text,
  total_jobs int default 0,
  completed_jobs int default 0,
  failed_jobs int default 0,
  status text default 'pending',
  metadata jsonb default '{}'::jsonb,
  results jsonb default '[]'::jsonb,
  errors jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- whatsapp_phone_mapping (mesma forma da migracao; companies ja existe acima).
create table if not exists whatsapp_phone_mapping (
  phone_number_id text primary key,
  company_id uuid not null references companies(id) on delete cascade,
  business_account_id text,
  display_phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== SEED (ids fixos para o teste de /api/agents/close-agreement) =====
insert into companies (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Empresa Demo roadmap-v1')
on conflict (id) do nothing;

insert into customers (id, company_id, name, document, phone, email)
values ('00000000-0000-0000-0000-0000000000c1',
        '00000000-0000-0000-0000-000000000001',
        'Cliente Demo', '52998224725', '5511999999999', 'demo@example.com')
on conflict (id) do nothing;

insert into debts (id, company_id, customer_id, amount, current_amount, original_amount, due_date, status, description)
values ('00000000-0000-0000-0000-0000000000d1',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-0000000000c1',
        1000.00, 1000.00, 1000.00, current_date - 30, 'in_negotiation', 'Divida demo WS-7')
on conflict (id) do nothing;

insert into whatsapp_phone_mapping (phone_number_id, company_id, display_phone, is_active)
values ('123456789012345', '00000000-0000-0000-0000-000000000001', '+5511999999999', true)
on conflict (phone_number_id) do nothing;

select 'seed ok' as status,
  (select count(*) from companies) as companies,
  (select count(*) from debts) as debts,
  (select count(*) from whatsapp_phone_mapping) as wpm;

-- ===== GRANTs para os roles do Supabase (PostgREST) =====
-- CREATE TABLE como postgres nao concede acesso aos roles anon/authenticated/
-- service_role; sem isso o PostgREST responde 42501 (permission denied).
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
-- Apos aplicar, recarregar o schema cache do PostgREST:
--   psql -c "notify pgrst, 'reload schema';"  (ou reiniciar o container supabase_rest)
