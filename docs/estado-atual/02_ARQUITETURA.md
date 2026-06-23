# Arquitetura - Estado Atual

**Data de geracao:** 2026-06-22
**Base:** altea-pay `main` (dfeceb2). Referencias cruzadas aos repos de agentes onde indicado.

## 1. Topologia (altea-pay em producao)

```
                         NETLIFY (Next.js 14 + API Routes + Server Actions)
                              |                  |                  |
                              v                  v                  v
                        SUPABASE           UPSTASH REDIS       APIs externas
                     (Postgres + RLS       (filas BullMQ)      (chamadas diretas
                      + Auth + Storage)          |             via fetch)
                                                 v
                                       AWS ECS FARGATE (sa-east-1)
                                       Workers BullMQ (Dockerfile.workers)
                                                 |
                              +------------------+------------------+
                              v                  v                  v
                          ASAAS API         SendGrid API       Assertiva API
```

Stack confirmada em `/Users/seufabio/git/altea-pay/package.json`:
- Next.js 14.2.35, React 19, BullMQ 5.70.1, @supabase/supabase-js 2.57.4.

### Componentes

- **Frontend + API + Server Actions:** Next.js no Netlify (`netlify.toml`, `next.config.mjs`).
- **Banco:** Supabase Postgres com Row-Level Security. Clients em `/Users/seufabio/git/altea-pay/lib/supabase/` (`client.ts`, `server.ts`, `admin.ts`, `middleware.ts`).
- **Filas:** BullMQ sobre Redis (Upstash). Config em `/Users/seufabio/git/altea-pay/lib/queue/`.
- **Workers:** rodam no AWS ECS Fargate via `Dockerfile.workers`; entrypoint `/Users/seufabio/git/altea-pay/lib/queue/start-workers.ts`.
- **Integracoes:** ASAAS (pagamentos), SendGrid (email), Assertiva (credito), Twilio (SMS/WhatsApp).

## 2. Conexao Redis e padrao serverless

- `/Users/seufabio/git/altea-pay/lib/queue/queues.ts`: conexao **lazy** (`lazyConnect: true`, `connectTimeout: 10000`, TLS quando `rediss://`) - critico para funcoes serverless do Netlify (so conecta quando enfileira).
- `/Users/seufabio/git/altea-pay/lib/queue/connection.ts`: conexao para os workers dedicados (sem lazy, `retryStrategy` ate 20 tentativas).

## 3. Filas BullMQ (10 filas)

Definidas em `/Users/seufabio/git/altea-pay/lib/queue/config.ts` (`QUEUE_CONFIG`):

| Constante / nome da fila | Retries | Rate limit | Worker |
|--------------------------|---------|------------|--------|
| email - `alteapay-email` | 3 | 100/seg (no worker) | `workers/email.worker.ts` |
| charge - `alteapay-charge` | 5 | 10/seg | `workers/charge.worker.ts` (legacy) |
| asaasChargeCreate - `alteapay-asaas-charge-create` | 5 | 10/seg | `workers/asaas-charge-create.worker.ts` |
| asaasChargeUpdate - `alteapay-asaas-charge-update` | 5 | 10/seg | `workers/asaas-charge-update.worker.ts` |
| asaasChargeCancel - `alteapay-asaas-charge-cancel` | 5 | 10/seg | `workers/asaas-charge-cancel.worker.ts` |
| asaasNotification - `alteapay-asaas-notification` | 3 | 10/seg | `workers/asaas-notification.worker.ts` |
| asaasSync - `alteapay-asaas-sync` | 3 | 10/seg | `workers/asaas-sync.worker.ts` |
| assertivaLocalize - `alteapay-assertiva-localize` | 3 | - | `workers/assertiva-localize.worker.ts` |
| bulkEmail - `alteapay-bulk-email` | 1 | - | `workers/bulk-email.worker.ts` |
| bulkNegotiations - `alteapay-bulk-negotiations` | 1 | - | `workers/bulk-negotiations.worker.ts` |

> Nota: as filas `assertiva-localize`, `bulk-email` e `bulk-negotiations` existem no codigo mas nao constavam na documentacao antiga do CLAUDE.md (que listava 7 filas). Ver `09_LACUNAS_E_PERGUNTAS_ABERTAS.md`.

Defaults de notificacao ASAAS em `config.ts` (`ASAAS_NOTIFICATION_DEFAULTS`): email desabilitado (provider e customer), SMS habilitado para customer, WhatsApp habilitado para customer, ligacao desabilitada.

## 4. Acesso ao banco a partir dos workers

- Cliente service-role: `/Users/seufabio/git/altea-pay/lib/supabase/admin.ts` (`createAdminClient()`, `autoRefreshToken:false`, `persistSession:false`).
- Workers usam `getSupabaseAdmin()` definido em `/Users/seufabio/git/altea-pay/lib/queue/workers/asaas-api.ts` (cria client com `SUPABASE_SERVICE_ROLE_KEY`).
- `asaas-api.ts` tambem centraliza `asaasRequest()` e os helpers de batch RPC (`incrementBatchCompleted`, `incrementBatchFailed`, `checkAndFinalizeBatch`, `startBatchProcessing`).

## 5. Fluxo de uma cobranca de ponta a ponta (estado atual)

Caminho em lote (super-admin / bulk):

1. **Disparo:** UI super-admin chama `/api/super-admin/send-bulk-negotiations` ou rota de batch `/api/asaas/batch/charges`.
2. **Registro do batch:** cria linha em `asaas_batches` (Supabase), `start_batch_processing` (RPC).
3. **Enfileiramento:** jobs enviados para a fila `alteapay-asaas-charge-create` (ou `alteapay-bulk-negotiations`).
4. **Worker (Fargate)** `asaas-charge-create.worker.ts`:
   a. Encontra/cria customer no ASAAS (`asaasRequest`).
   b. Configura notificacoes ASAAS (WhatsApp + SMS; email desabilitado).
   c. Cria pagamento no ASAAS (BOLETO/PIX/CREDIT_CARD; `installmentCount` se parcelado).
   d. Atualiza `agreements` (`asaas_payment_id`, `asaas_customer_id`, URLs, `due_date`, `status`) e `debts` (`status: in_agreement`).
   e. Enfileira email de notificacao na fila `alteapay-email`.
   f. `incrementBatchCompleted` + `checkAndFinalizeBatch` (RPC).
5. **Email worker** `email.worker.ts`: envia via SendGrid API.
6. **Notificacao WhatsApp/SMS:** disparada pelo proprio ASAAS (canais habilitados no passo 4b).
7. **Recebimento do pagamento:** ASAAS chama o webhook `/api/asaas/webhook/payments`:
   a. Valida token `asaas-access-token`.
   b. Deduplica em `asaas_webhook_events` (`event_id` UNIQUE).
   c. Localiza o agreement (por `asaas_payment_id` -> subscription -> external_reference -> customer+valor).
   d. Atualiza `agreements.payment_status`/`asaas_status`/`payment_received_at`, `debts.status`, `VMAX.negotiation_status`, cria notificacao.
8. **Reconciliacao/fallback:** `/api/asaas/sync-payments` (cron via `CRON_SECRET`) faz polling para casos em que o webhook falhou ("stuck clients").

Caminho unitario: server action `/Users/seufabio/git/altea-pay/app/actions/send-payment-link.tsx` cria customer e pagamento ASAAS diretamente (configura WhatsApp, desabilita email/SMS ASAAS), e salva `due_date` da resposta.

## 6. Onde os agentes se encaixam (planejado/inferido)

Os agentes nao fazem parte do runtime do altea-pay hoje. Em producao, segundo notas dos repos de agentes:
- O agente de negociacao (LangGraph) chamaria o fechamento de acordo via algo equivalente a `create-agreement-with-asaas.ts` / fila de cobranca (`/Users/seufabio/git/altea-negotiation-agent/README.md`; `/Users/seufabio/git/alteapay-agents/agents/negotiation/app/fulfillment.py`).
- Hoje a criacao de link de pagamento nos agentes e **mock** (`https://sandbox.asaas.com/c/{debt_id}-{offer_id}-mock`). Ver `07_AGENTES_NEGOCIACAO.md`.

## 7. Deploy (estado atual)

- **altea-pay:** frontend/API no Netlify; workers no AWS ECS Fargate (sa-east-1), ECR `722560224488.dkr.ecr.sa-east-1.amazonaws.com/alteapay-workers`, conforme `CLAUDE.md` e `Dockerfile.workers`.
- **alteapay-refactored:** propoe migracao para Kubernetes (`/Users/seufabio/git/alteapay-refactored/k8s/`) com manifests para web (HPA 1-4 replicas) e workers (PodDisruptionBudget), overlays cloud AWS/Azure/GCP. Estado: refactor aprovado em main, ainda nao e o runtime de producao.
- **alteapay-agents:** roda em Kubernetes proprio (`/Users/seufabio/git/alteapay-agents/k8s/`) com Postgres/Redis/MinIO/Ollama mockados; repo original montado `readOnly:true`.
