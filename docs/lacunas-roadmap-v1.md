# Lacunas e decisões — roadmap-v1

Registro das lacunas levantadas na FASE 0, cada uma com **estado** e **decisão
tomada**. Nada aqui é preenchido por suposição: o que não pôde ser resolvido fica
marcado como pendência explícita. Fonte de verdade: `prompts/PROMPT_roadmap_v1_orquestracao.md`,
`docs/contratos-roadmap-v1.md`, `docs/arquitetura-roadmap-v1.mermaid`.

Gerado em 2026-06-22 (pós-Fase 0, Parte 1 do `PROMPT_ajustes_e_wave1.md`).

---

## 1. Colunas ASAAS na tabela `agreements` (resolvido via DDL)

**Estado:** o prompt/contrato citava `asaas_invoice_url`, `asaas_bank_slip_url`,
`asaas_pix_qr_code_url`. O relatório da Fase 0 sugeriu, por contagem de uso no
código, `asaas_payment_url`, `asaas_pix_qrcode_url`, `asaas_boleto_url`. Contagem
de uso mistura nome de coluna com nome de variável/campo TS, então foi feita a
verificação autoritativa no DDL.

**Investigação (DDL real em `scripts/` + `supabase/migrations/`):**
- `scripts/024_add_asaas_columns.sql` e `scripts/025_add_asaas_payment_columns.sql`
  → `ALTER TABLE agreements ADD COLUMN`: `asaas_payment_url`, `asaas_pix_qrcode_url`,
  `asaas_boleto_url` (todas `TEXT`).
- `scripts/1001_create_asaas_webhook_events.sql` → `ALTER TABLE agreements ADD
  COLUMN`: `asaas_invoice_url TEXT` (+ `asaas_status`, `asaas_billing_type`, etc.).
- `asaas_bank_slip_url` e `asaas_pix_qr_code_url`: **nenhuma** definição em DDL.

**Decisão:** colunas reais de `agreements` para URLs ASAAS são, autoritativamente:
`asaas_payment_url`, `asaas_pix_qrcode_url`, `asaas_boleto_url`, `asaas_invoice_url`.
O Contrato C e as operações de banco usam **essas**. `asaas_bank_slip_url` e
`asaas_pix_qr_code_url` **não existem** e não devem ser usadas.

**Bug latente encontrado (não corrigido nesta Parte — registrar p/ WS-3/WS-5):**
`lib/queue/workers/asaas-charge-create.worker.ts` grava em colunas inexistentes:
- linha 115: `asaas_bank_slip_url: asaasPayment.bankSlipUrl` → deveria ser
  `asaas_boleto_url`.
- linha 116: `asaas_pix_qr_code_url: asaasPayment.pixQrCodeUrl` → deveria ser
  `asaas_pix_qrcode_url`.
- linha 114: `asaas_invoice_url: asaasPayment.invoiceUrl` → **correto**.
Mapeamento campo da API ASAAS → coluna real:
`invoiceUrl→asaas_invoice_url`, `bankSlipUrl→asaas_boleto_url`,
`pixQrCodeUrl→asaas_pix_qrcode_url`, checkout/`paymentLink→asaas_payment_url`.

---

## 2. Segundo webhook ASAAS (legacy)

**Estado:** além do webhook primário `app/api/asaas/webhook/payments/route.ts`,
existe `app/api/webhooks/asaas/route.ts` (não citado no prompt). Ambos referenciam
`asaas_webhook_events`.

**Decisão:** os Contratos B/C miram o webhook **primário**
`app/api/asaas/webhook/payments/route.ts`. O segundo é tratado como legacy/
@deprecated; não recebe integração nova. Consolidação/remoção fica como pendência
futura (não nesta fase).

---

## 3. `project-manager` e `dev` inexistentes em `alteapay-agents`

**Estado:** o repo canônico tem `agents/{negotiation,refactor,security,qa-code,
qa-e2e,infra,noop}` + `orchestrator/{cto-alpha,cto-beta}`. Não há `project-manager`
nem um agente `dev` isolado.

**Decisão:** criar `project-manager` como **serviço novo** (consome do bus, abre/
prioriza tarefas, status no Postgres da plataforma; marcado como NOVO). Mapear
`dev` para o agente `refactor` existente (exposto como "dev" no deploy). Sem
renomear pastas.

---

## 4. QA dividido em `qa-code` + `qa-e2e`

**Estado:** não há um agente `qa` único; existem `agents/qa-code` e `agents/qa-e2e`.

**Decisão:** implantar **os dois** no namespace `alteapay-dev-agents`. O "qa" do
alvo é o par `qa-code` + `qa-e2e`.

---

## 5. WhatsApp em `alteapay-refactored` é 360dialog/mock, não Cloud API

**Estado:** `alteapay-refactored/lib/notifications/whatsapp/` tem
`dialog360-provider.ts` + `mock-provider.ts` (interface 360dialog/mock), não o
cliente da Meta WhatsApp **Cloud API** (`graph.facebook.com`).

**Decisão:** WS-4 cria um cliente **novo** `lib/notifications/whatsapp-cloud.ts`
(Graph API oficial). A interface 360dialog serve só de referência de shape.
Consolidar/aposentar Twilio e 360dialog é decisão futura (pendência).

---

## 6. Default de LLM de engenharia = anthropic

**Estado:** `platform/llm/index.ts` lança erro sem `ANTHROPIC_API_KEY`
(`AnthropicProvider`); `platform/llm/defaults.ts` (ADR-0013) define classe de
engenharia como `anthropic`.

**Decisão (fase atual):** rodar **todas** as classes em Ollama local. Editar
`platform/llm/defaults.ts` para provider `ollama` em todas as classes, de modo que
sem `ANTHROPIC_API_KEY` os serviços ainda alcancem `/readyz` (não 503). Reverter
para anthropic via env quando houver budget (ADR-0013 preservado, só o default
muda nesta fase).

---

## 7. `k8s/base` sem StatefulSet de Postgres

**Estado:** `alteapay-refactored/k8s/base/` tem namespace, configmap, secret
template, web, workers, networkpolicy, kustomization — **sem** Postgres.

**Decisão:** criar `StatefulSet postgres-app` (+ Service) em WS-3, e os Postgres
`postgres-neg` / `postgres-platform` nos namespaces de agentes.

---

## 8. Estratégia Auth/RLS/Storage em `local-postgres`

**Estado:** a app usa Auth/RLS/Storage do Supabase; em `local-postgres` é preciso
decidir entre subir o stack self-hosted do Supabase (Postgres+Auth+Storage) ou
Postgres puro com shim de auth documentado.

**Decisão:** decidir e registrar em `docs/db-local-strategy.md` na **WS-3**
(escolher o caminho mais confiável para o bring-up). Pendência até lá.

---

## 9. Deleção das branches `main-*` em WS-1b (hook v2)

**Estado:** o hook v1 (`\bmain\b`) bloqueava `git push --delete main-2` (hífen é
fronteira de palavra). Corrigido para v2 (`( |/)main( |$)`), que bloqueia `main`
exata e libera `main-*`/`main2`.

**Decisão:** toda deleção em WS-1b segue pelo caminho `git push origin --delete
<branch>` (sem `gh api` de bypass). `enforce_admins` agora `true` e o hook v2 é a
defesa em profundidade. WS-1b só roda após WS-7 verde.
