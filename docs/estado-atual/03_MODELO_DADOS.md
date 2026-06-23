# Modelo de Dados - Estado Atual

**Data de geracao:** 2026-06-22
**Base:** altea-pay `main` (dfeceb2). Fontes: `/Users/seufabio/git/altea-pay/scripts/*.sql` e `/Users/seufabio/git/altea-pay/supabase/migrations/*.sql`.

## 1. Arquivos de schema

### Migrations (`supabase/migrations/`)

| Arquivo | Proposito |
|---------|-----------|
| `20250205_create_company_email_recipients.sql` | Tabela `company_email_recipients` (id, company_id, client_name, client_email, created_at) + RLS service_role |
| `20250206_create_email_sent_tracking.sql` | Tabela `email_sent_tracking` + enum `email_send_status` ('sent','failed') |
| `20250209_create_accounting_tables.sql` | Tabelas de contabilidade |
| `20260223_asaas_batches.sql` | Tabela `asaas_batches` + enums + 4 funcoes RPC de batch |
| `20260303_create_assertiva_localize_logs.sql` | Logs de Assertiva Localize |
| `20260304_localize_rpc_functions.sql` | Funcoes RPC de localizacao |
| `20260305_add_viewer_role.sql` | Papel `viewer` |
| `20260310_create_negotiation_requests.sql` | Tabela de requisicoes de negociacao |

### Scripts SQL (`scripts/`) - principais

| Arquivo | Proposito |
|---------|-----------|
| `001_create_database_schema.sql` | Schema inicial: profiles, customers, debts, collection_rules, collection_rule_steps, collection_actions, payments, agreements, data_imports |
| `020_create_multi_tenant_structure.sql` | Tabela `companies`, adiciona `company_id`, enum `user_role` ('admin','user','super_admin') |
| `023_create_missing_tables.sql` | Tabela `clients` |
| `032_create_credit_analysis_tables.sql` | `credit_profiles`, `analysis_triggers`, `analysis_logs` |
| `990_implement_collection_ruler_v2.sql` | Atualiza collection_rules/steps v2 + `collection_rule_executions` |
| `992_add_approval_status_to_vmax.sql` | Adiciona campos de analise a `VMAX` |
| `010_add_vmax_rls_policies.sql` | RLS da `VMAX` |
| `1001_create_asaas_webhook_events.sql` | `asaas_webhook_events` + colunas ASAAS em `agreements` |

## 2. Tabelas principais (nomes exatos de coluna)

### companies (`scripts/020_create_multi_tenant_structure.sql`)
`id` UUID PK, `name` TEXT NOT NULL, `document` TEXT, `email`, `phone`, `address`, `city`, `state`, `zip_code`, `created_at`, `updated_at`.
RLS: "Super admins can view all companies", "Company admins can view their company".

### profiles (`scripts/001` + `scripts/020`)
`id` UUID PK -> auth.users(id), `full_name`, `company_name`, `phone`, `company_id` -> companies(id), `role` TEXT ('super_admin','admin','user'), `cpf_cnpj`, `created_at`, `updated_at`.
RLS: "Users can view their own profile", "Super admins can view all profiles".

### customers (`scripts/001` + `scripts/020`)
`id` UUID PK, `user_id` -> auth.users, `company_id` -> companies, `name` NOT NULL, `email`, `phone`, `document`, `address`, `city`, `state`, `zip_code`, `source_system` DEFAULT 'manual', `external_id`, `created_at`, `updated_at`.
RLS: customers_select/insert/update/delete_own (via user_id) + service_role_all.

### debts (`scripts/001` + updates)
`id` UUID PK, `user_id`, `customer_id` -> customers, `company_id`, `original_amount` DECIMAL(10,2) NOT NULL, `current_amount` DECIMAL(10,2) NOT NULL, `due_date` DATE NOT NULL, `contract_number`, `description`, `status` ('pending','in_collection','paid','written_off','in_agreement'), `classification` ('low','medium','high','critical'), `days_overdue` INTEGER GENERATED (EXTRACT(DAY FROM CURRENT_DATE - due_date) STORED), `source_system`, `external_id`, `created_at`, `updated_at`.
RLS: debts_select/insert/update/delete_own + service_role_all.

### agreements (`scripts/001` + `scripts/1001`)
`id` UUID PK, `debt_id`, `customer_id`, `company_id`, `total_amount`, `installments`, `installment_amount`, `first_due_date`, `due_date`, `status` ('draft','active','pending','completed','paid','broken','cancelled'), `discount_percentage` NUMERIC(5,2).
ASAAS: `asaas_customer_id`, `asaas_payment_id`, `asaas_subscription_id`, `asaas_invoice_url`, `asaas_bank_slip_url`, `asaas_pix_qr_code_url`, `asaas_status` VARCHAR(50), `asaas_billing_type` VARCHAR(50).
Pagamento: `payment_status` ('pending','confirmed','received','overdue','refunded'), `payment_received_at`.
Notificacao: `notification_viewed` BOOL, `notification_viewed_at`, `notification_viewed_channel`.
Outros: `attendant_id`, `created_at`, `updated_at`.
RLS: service_role_all + policies de contexto de usuario.

> Atencao: o codigo usa colunas `asaas_invoice_url`, `asaas_bank_slip_url`, `asaas_pix_qr_code_url`. A documentacao antiga do CLAUDE.md citava `asaas_payment_url`, `asaas_boleto_url`, `asaas_pix_qrcode_url` - nomes que divergem do SQL. Ver `09_LACUNAS`.

### payments (`scripts/001`)
`id` UUID PK, `debt_id` -> debts, `company_id`, `amount` DECIMAL(10,2) NOT NULL, `payment_date` DATE NOT NULL, `payment_method`, `transaction_id`, `notes`, `asaas_payment_id`, `created_at`.
RLS: service_role_all.

> Atencao: no SQL `payments` referencia `debt_id`, nao `agreement_id` (como sugeria o CLAUDE.md). Tambem nao tem `due_date`/`status` no script base. Ver `09_LACUNAS`.

### collection_rules (`scripts/001` + `scripts/990`)
`id` UUID PK, `company_id`, `user_id`, `name` NOT NULL, `description`, `is_active` BOOL, `is_default_for_company` BOOL, `execution_mode` ('automatic','manual','scheduled'), `start_date_field` ('due_date','first_overdue','analysis_date','custom'), `rule_version` INT DEFAULT 2, `requires_approval_status` TEXT[] DEFAULT ARRAY['ACEITA','ACEITA_ESPECIAL'], `trigger_days` INT[], `action_type`, `last_execution_at`, `next_execution_at`, `created_at`, `updated_at`.
RLS: collection_rules_select/insert/update/delete_own + service_role_all.

### collection_rule_steps (`scripts/001` + `scripts/990`)
`id` UUID PK, `rule_id` -> collection_rules, `step_order` NOT NULL, `days_after_due` NOT NULL, `action_type` ('email','sms','whatsapp','call_automatic','call_human','task'), `template_subject`, `template_content`, `is_enabled` BOOL, `execution_time` TIME DEFAULT '09:00:00', `retry_on_failure` BOOL, `max_retries` INT, `conditions` JSONB, `metadata` JSONB, `created_at`, `updated_at`.

### collection_rule_executions (`scripts/990`)
`id` UUID PK, `rule_id`, `debt_id`, `customer_id`, `company_id`, `execution_date` DATE NOT NULL, `days_offset` NOT NULL, `start_date` DATE NOT NULL, `step_id` -> collection_rule_steps, `step_order` NOT NULL, `action_type` NOT NULL, `status` ('pending','processing','sent','failed','skipped'), `sent_at`, `error_message`, `metadata` JSONB, `created_at`, `updated_at`.
RLS: "Companies can view own executions", "System can insert executions", "System can update executions".

### asaas_batches (`supabase/migrations/20260223_asaas_batches.sql`)
`id` UUID PK, `company_id`, `type` ('charge_create','charge_update','charge_cancel','notification','sync'), `total_jobs` INT, `completed_jobs` INT, `failed_jobs` INT, `status` ('pending','processing','completed','completed_with_errors','failed'), `metadata` JSONB, `results` JSONB, `errors` JSONB, `created_at`, `started_at`, `completed_at`, `created_by`.
RLS: "Users can view batches from their company", "Users can create batches for their company".

### asaas_webhook_events (`scripts/1001`)
`id` UUID PK, `event_id` VARCHAR(255) UNIQUE, `event_type` VARCHAR(100) NOT NULL, `payment_id` VARCHAR(255), `customer_id` VARCHAR(255), `agreement_id` -> agreements, `payload` JSONB NOT NULL, `processed` BOOL DEFAULT FALSE, `processed_at`, `error_message`, `created_at`.

### credit_profiles (`scripts/032`)
`id` UUID PK, `company_id` NOT NULL, `user_id` -> profiles, `cpf` VARCHAR(14) NOT NULL, `analysis_type` ('free','detailed'), `source` ('gov','assertiva'), `data` JSONB, `score` FLOAT, `created_at`, `updated_at`, UNIQUE(cpf, company_id).

> Atencao: o CHECK de `source` no SQL aceita 'gov' e 'assertiva'. O CLAUDE.md citava apenas 'assertiva'.

### VMAX (`scripts/992_add_approval_status_to_vmax.sql`, RLS em `scripts/010`)
**Isolamento por `id_company`** (NAO `company_id`). Colunas com aspas no nome.
`id` UUID PK, `id_company` UUID NOT NULL, `Cliente` TEXT, `"CPF/CNPJ"` TEXT, `Email` TEXT, `"Telefone 1"` TEXT, `"Telefone 2"` TEXT, `Vencido` TEXT, `"Dias Inad."` TEXT, `Vecto` TEXT.
Analise: `approval_status` ('ACEITA','ACEITA_ESPECIAL','REJEITA','PENDENTE'), `approval_reason`, `credit_score` NUMERIC, `risk_level` ('LOW','MEDIUM','HIGH'), `behavior_classification` ('BOM','RUIM'), `presumed_income`, `presumed_limit`, `last_analysis_date`, `analysis_metadata` JSONB.
Automacao: `auto_collection_enabled` BOOL, `last_collection_attempt`, `collection_count` INT, `assertiva_uuid`, `assertiva_protocol`, `collection_processed_at`, `negotiation_status`, `created_at`, `updated_at`.
RLS: "users_can_view_own_company_vmax", "service_role_vmax_all".

> A tabela VMAX e somente lida (SELECT) nos scripts; o `CREATE TABLE` base nao esta nos scripts (provavelmente importada/externa). Os scripts apenas adicionam colunas e RLS.

## 3. Funcoes RPC

Em `supabase/migrations/20260223_asaas_batches.sql` (GRANT EXECUTE para service_role):

| Funcao | Assinatura | Efeito |
|--------|-----------|--------|
| `increment_batch_completed(batch_id UUID, result_data JSONB DEFAULT NULL)` | void | Incrementa `completed_jobs`, acumula `results`, seta `started_at` |
| `increment_batch_failed(batch_id UUID, error_detail JSONB)` | void | Incrementa `failed_jobs`, acumula `errors`, seta `started_at` |
| `check_and_finalize_batch(batch_id UUID)` | TABLE(is_complete BOOL, final_status TEXT) | Finaliza batch quando todos jobs processados |
| `start_batch_processing(batch_id UUID)` | void | Transiciona 'pending' -> 'processing' |

Funcoes RPC adicionais de localizacao em `supabase/migrations/20260304_localize_rpc_functions.sql` (nao detalhadas; ver arquivo).

## 4. Resumo de isolamento multi-tenant (RLS)

Tabelas tenant-sensiveis com RLS habilitada: companies, profiles, customers, debts, agreements, payments, collection_rules, collection_rule_steps (via rule), collection_rule_executions, asaas_batches, asaas_webhook_events, credit_profiles, VMAX (via `id_company`). Escritas dos workers usam service_role (bypass RLS) e devem filtrar `company_id`/`id_company` explicitamente.
