# Rotas de API - Estado Atual

**Data de geracao:** 2026-06-22
**Base:** altea-pay `main` (dfeceb2). Fonte: `/Users/seufabio/git/altea-pay/app/api/`.

## 1. ASAAS

| Rota | Metodo | Proposito | Auth |
|------|--------|-----------|------|
| `app/api/asaas/route.ts` | POST | Proxy direto para ASAAS quando ha API key | (proxy interno) |
| `app/api/asaas/webhook/payments/route.ts` | POST | Receptor de webhook de pagamentos | Header `asaas-access-token` == `ASAAS_WEBHOOK_TOKEN` |
| `app/api/asaas/sync-payments/route.ts` | POST/GET | Sync/polling de status de pagamento (fallback) | `CRON_SECRET` (Bearer) |
| `app/api/asaas/sync-client/route.ts` | POST | Sync de um cliente | Usuario |
| `app/api/asaas/cancel-payment/route.ts` | POST | Cancela pagamento + cleanup | Usuario |
| `app/api/asaas/check-notifications/route.ts` | POST | Status de visualizacao | Usuario |
| `app/api/asaas/batch/charges/route.ts` | POST | Criacao de cobrancas em lote | Usuario |
| `app/api/asaas/batch/cancel/route.ts` | POST | Cancelamento em lote | Usuario |
| `app/api/asaas/batch/notify/route.ts` | POST | Notificacoes em lote | Usuario |
| `app/api/asaas/batch/sync/route.ts` | POST | Sync de status em lote | Usuario |
| `app/api/asaas/batch/[batchId]/route.ts` | GET | Status de um batch | Usuario |
| `app/api/webhooks/asaas/route.ts` | POST | Webhook **legacy** (@deprecated), identico ao novo | Header `asaas-access-token` |

### Detalhe: webhook de pagamentos (`app/api/asaas/webhook/payments/route.ts`)
- Valida token via header `asaas-access-token` (token simples, **sem HMAC**).
- Deduplicacao dupla: checa registro existente em `asaas_webhook_events` + constraint UNIQUE em `event_id`.
- Localiza o agreement por: `asaas_payment_id` -> `asaas_subscription_id` -> `external_reference` (prefixo) -> `customer_id` + valor.
- Mapeia evento ASAAS -> status local; atualiza `agreements`, `debts`, `VMAX`; cria notificacao; grava `asaas_webhook_events.processed`.

### Detalhe: sync-payments (`app/api/asaas/sync-payments/route.ts`)
- `fullSync=true`: busca TODOS os customers do ASAAS, casa com VMAX/agreements, cria charges faltantes, detecta "stuck clients".
- Normal: sincroniza apenas agreements com `payment_status` IN (pending, confirmed, overdue).
- Limites: max 50 payments por request, timeout ~25s; sincroniza tambem "viewing info".

## 2. Super-admin

| Rota | Metodo | Proposito | Auth |
|------|--------|-----------|------|
| `app/api/super-admin/negotiations/customers/route.ts` | GET | Lista clientes com status | super_admin / viewer |
| `app/api/super-admin/negotiations/send/route.ts` | POST | Envia negociacoes | super_admin |
| `app/api/super-admin/send-bulk-negotiations/route.ts` | POST | Envio de negociacoes em lote | super_admin |
| `app/api/super-admin/send-bulk-negotiations/status/route.ts` | GET | Status do envio em lote | super_admin |
| `app/api/super-admin/send-email/route.ts` | POST | Email em massa via SendGrid (batch/sync) | super_admin |
| `app/api/super-admin/send-email/status/route.ts` | GET | Status do envio de email | super_admin |
| `app/api/super-admin/users/route.ts` | GET/POST | Gestao de usuarios | super_admin |
| `app/api/super-admin/users/[userId]/route.ts` | GET/PUT/DELETE | CRUD de usuario (nao deleta a si mesmo) | super_admin |
| `app/api/super-admin/clients/[id]/route.ts` | GET/PATCH | Le/atualiza cliente em VMAX ou customers | super_admin / viewer |
| `app/api/super-admin/localize/search/route.ts` | POST | Consulta Assertiva Localize (job se batch > 50) | super_admin |
| `app/api/super-admin/localize/update/route.ts` | POST | Aplica resultado Localize (so campos NULL/vazios) | super_admin |
| `app/api/super-admin/localize/clients/route.ts` | GET | Lista clientes com status Localize | super_admin |
| `app/api/super-admin/localize/status/route.ts` | GET | Status/resultado da consulta | super_admin |

> Existe tambem endpoint de backfill `POST /api/super-admin/backfill-due-dates` citado no CLAUDE.md para preencher `due_date` faltante a partir do ASAAS. Confirmar caminho exato no diretorio.

## 3. Cron (scheduled)

| Rota | Metodo | Proposito | Auth |
|------|--------|-----------|------|
| `app/api/cron/process-collection-rules/route.ts` | GET | Executa `processCollectionRulers()` (emails automaticos) | `CRON_SECRET` (Bearer) |
| `app/api/cron/sync-erp/route.ts` | GET | Sincroniza clientes/dividas de ERPs ativos | `CRON_SECRET` (Bearer) |

## 4. Assertiva

| Rota | Metodo | Proposito | Auth |
|------|--------|-----------|------|
| `app/api/assertiva/callback/route.ts` | POST | Callback assincrono de analise | Header `x-assertiva-signature` (permissivo se nao configurado) |

Fluxo do callback: extrai documento + scores (credito + recupere), atualiza `VMAX` (`credit_score`, `risk_level`, `recovery_score`, `recovery_class`), upsert em `credit_profiles`, diferencia analise restritiva (score >= 500 = ACEITA) vs comportamental (score >= 294 = ACEITA), cria notificacao, loga em `integration_logs`. Idempotencia via `external_id` (protocolo Assertiva).

## 5. Dados / portal / outras

| Rota | Metodo | Proposito | Auth |
|------|--------|-----------|------|
| `app/api/propensity/route.ts` | POST/GET | Score de propensao a pagamento | Usuario |
| `app/api/classify/route.ts` | POST/GET | Classificacao de risco da divida | Usuario |
| `app/api/collection-rules/route.ts` | GET/POST | Lista/cria regras | Usuario |
| `app/api/collection-rules/[id]/route.ts` | PUT/DELETE | Atualiza/exclui regra | Usuario |
| `app/api/get-user-debts/route.ts` | GET | Dividas do usuario | Usuario |
| `app/api/vmax-clientes/route.ts` | GET | Clientes VMAX | Usuario |
| `app/api/portal/signup/route.ts` | POST | Cadastro no portal do cliente | Nenhuma |
| `app/api/portal/debts/route.ts` | (ver arquivo) | Dividas no portal | (ver arquivo) |
| `app/api/auth/verify/route.ts` | (ver arquivo) | Verificacao de auth | (ver arquivo) |
| `app/api/negotiate-requests/[id]/approve/route.ts` | (ver arquivo) | Aprovar negociacao | (ver arquivo) |
| `app/api/negotiate-requests/[id]/reject/route.ts` | (ver arquivo) | Rejeitar negociacao | (ver arquivo) |

## 6. Padroes de autenticacao (resumo)

| Tipo | Mecanismo |
|------|-----------|
| Webhook ASAAS | Header `asaas-access-token` == `ASAAS_WEBHOOK_TOKEN` |
| Cron | Header `Authorization: Bearer ${CRON_SECRET}` |
| Callback Assertiva | Header `x-assertiva-signature` (validacao permissiva) |
| Super-admin | Sessao Supabase + checagem `profiles.role == 'super_admin'` (algumas rotas aceitam `viewer` para leitura) |
| Usuario | Sessao Supabase (`supabase.auth.getUser()`) |
| Portal signup | Nenhuma |

> Nenhuma rota de WhatsApp Cloud API (verify_token / hub.challenge) existe no altea-pay. Ver `06_WHATSAPP_API_OFICIAL.md`.
