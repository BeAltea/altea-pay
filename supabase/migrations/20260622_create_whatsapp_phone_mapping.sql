-- roadmap-v1 WS-5: mapeamento phone_number_id (WhatsApp Cloud API) -> company_id.
-- O webhook (app/api/whatsapp/webhook/route.ts) deriva company_id SERVER-SIDE a
-- partir do phone_number_id do número de negócio que recebeu a mensagem (nunca do
-- payload externo). Multi-tenant: cada empresa tem seu número/WABA.

create table if not exists whatsapp_phone_mapping (
  phone_number_id      text primary key,           -- ID do número (Meta), estável
  company_id           uuid not null references companies(id) on delete cascade,
  business_account_id  text,                        -- WABA id (opcional)
  display_phone        text,                        -- E.164 legível (opcional)
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_whatsapp_phone_mapping_company
  on whatsapp_phone_mapping(company_id);

-- updated_at automático
create or replace function set_whatsapp_phone_mapping_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_whatsapp_phone_mapping_updated_at on whatsapp_phone_mapping;
create trigger trg_whatsapp_phone_mapping_updated_at
  before update on whatsapp_phone_mapping
  for each row execute function set_whatsapp_phone_mapping_updated_at();

-- RLS: o webhook usa service-role (bypassa RLS); abaixo é p/ acesso por usuários.
alter table whatsapp_phone_mapping enable row level security;

drop policy if exists wpm_super_admin_all on whatsapp_phone_mapping;
create policy wpm_super_admin_all on whatsapp_phone_mapping
  for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'));

drop policy if exists wpm_company_select on whatsapp_phone_mapping;
create policy wpm_company_select on whatsapp_phone_mapping
  for select
  using (company_id in (select company_id from profiles where id = auth.uid()));

comment on table whatsapp_phone_mapping is
  'roadmap-v1 WS-5: phone_number_id (WhatsApp Cloud API) -> company_id. Usado pelo webhook para derivar company_id server-side.';
