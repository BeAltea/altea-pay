# Estado do roadmap-v1 (documento de retomada)

Ponto de retomada para uma sessao nova sem o contexto anterior. Atualizado em
2026-06-25. Para continuar, basta pedir "continuar de onde paramos no alteapay" e
ler este arquivo. Sem em-dash.

Regras invioláveis seguem valendo: nada de push, force, merge ou delete na branch
`main` de producao. A `main` permanece intocada.

Fontes de verdade: `prompts/PROMPT_roadmap_v1_orquestracao.md`,
`docs/contratos-roadmap-v1.md`, `docs/arquitetura-roadmap-v1.mermaid`,
`docs/lacunas-roadmap-v1.md`, `docs/db-local-strategy.md`,
`docs/ws7-local-bringup.md` (runbook do deploy local).

---

## IMPORTANTE: rename dos repositorios (feito em 2026-06-23)

Os repos GitHub foram renomeados (o GitHub redireciona os nomes antigos):
- `BeAltea/altea-pay`        -> **`BeAltea/alteapay`**
- `BeAltea/altea-pay-agents` -> **`BeAltea/alteapay-agents`**

Os **diretorios locais NAO mudaram**: continuam `/Users/seufabio/git/altea-pay` e
`/Users/seufabio/git/altea-pay-agents`. Os remotes ja apontam para os nomes novos.
O hook `tools/pre-bash-guard.sh` (v3) aceita o nome novo e o antigo, entao a
protecao da main de producao nao lapsa.

## Status das waves

| Wave | Conteudo | Status |
| ---- | -------- | ------ |
| Wave 0 | Fase 0 + contratos | CONCLUIDA |
| Wave 1 | WS-1a (push + arquivamento), WS-2 (repo de agentes), WS-6 (diagrama) | CONCLUIDA |
| Wave 2 | WS-3 (Docker/k8s/Postgres/DATABASE_TARGET/fix worker), WS-4 (WhatsApp Cloud API) | CONCLUIDA |
| Wave 3 | WS-5 (worker inbound, close-agreement, tabela phone->company, link mock removido) | CONCLUIDA |
| Wave 4 | WS-7 (deploy local, 3 namespaces, bring-up, validacao) | CONCLUIDA e VALIDADA (2026-06-23) |
| Wave 5 | WS-1b (deleção das 29 branches antigas) | PENDENTE (proxima, destrutiva, pede OK explicito) |

## Estado por repositorio (SHAs reais em 2026-06-25)

- `altea-pay` (local) `feature/roadmap-v1` @ `d1958b83bb313ff116070c2db8836b0312fb0f5b`
  (remote `BeAltea/alteapay`, em sincronia, tree limpo).
- `altea-pay-agents` (local) `main` @ `58d1f633549b04b2786f502299f61827d73a4e89`
  (remote `BeAltea/alteapay-agents`, em sincronia, tree limpo).
- `alteapay` `main` de producao @ `dfeceb2dfde89942719635cb27738c9e8e63223b`
  (baseline, INTOCADA). branch protection com `enforce_admins` ON.
- Arquivo das branches antigas: 29 tags `archive/*` no remote do `alteapay` +
  bundle local `backups/altea-pay-branches-2026-06-22.bundle`. Nenhuma branch
  apagada ainda.

## Estado do deploy local (cluster) AGORA

O cluster local e o Supabase local NAO estao rodando neste momento (a maquina foi
reiniciada apos a validacao de 2026-06-23). O deploy FOI validado com 15 pods
Running nos 3 namespaces. Para subir de novo, seguir `docs/ws7-local-bringup.md`
(supabase start, aplicar `scripts/ws7-local-bootstrap.sql` + grants, build das 4
imagens, aplicar manifests, secret real, validar). Resumo do que foi validado:
- 3 namespaces: `alteapay-app`, `alteapay-negotiation`, `alteapay-dev-agents`.
- app responde (`/api/health`, `/api/ready` com `databaseTarget=local-postgres`).
- webhook WhatsApp handshake OK (200 + challenge; 403 token errado).
- agentes prontos (negotiation 1/1; dev-agents 9/9; project-manager up).
- e2e `/api/agents/close-agreement` (Contrato C, negociacao-primeiro): cria
  agreement + batch + enfileira `alteapay-asaas-charge-create`; worker processa o
  job e falha so na chamada real ao ASAAS (chave placeholder, esperado).

## O que ja esta pronto (resumo)

- Guard-rails: hook v3 escopado a `BeAltea/alteapay` (aceita nome antigo via
  redirect); branch protection `enforce_admins` ON.
- Contratos A a E, `docs/estado-atual/*`, lacunas, db-local-strategy, runbook
  WS-7, diagrama coerente.
- `alteapay-agents`: microservicos (orchestrator + agents + platform), manifests
  3 namespaces em `deploy/k8s/roadmap-v1`; `project-manager` novo; `dev`=refactor;
  `qa`=qa-code+qa-e2e; LLM ollama; ASAAS mock; link mock removido (chama
  `/api/agents/close-agreement`). readinessProbe do negotiation usa `/health`.
- `alteapay` `feature/roadmap-v1`: Dockerfile(s) ARM64 (app usa pnpm@9 e build-args
  NEXT_PUBLIC_SUPABASE_*), `k8s/base` (ns alteapay-app, postgres-app StatefulSet,
  redis, web HPA, workers), abstracao `DATABASE_TARGET` (`lib/db`), fix do worker
  (asaas_boleto_url / asaas_pix_qrcode_url), WhatsApp Cloud API
  (`lib/notifications/whatsapp-cloud.ts`) + webhook (HMAC/verify), fila
  `alteapay-whatsapp-inbound`, worker inbound -> negotiation-agent, endpoint
  `/api/agents/close-agreement`, tabela `whatsapp_phone_mapping`,
  `scripts/ws7-local-bootstrap.sql`.

## Follow-ups abertos (ver docs/lacunas-roadmap-v1.md, itens 1 a 10)

- CRITICO p/ e2e real: o agente usa debito/ofertas mock (`fulfillment.yaml`). Para
  o fluxo real ponta a ponta, implementar a busca de debito/ofertas na app
  (seta "negagent -> consulta divida e ofertas -> web") ou seguir semeando dados
  (hoje ha 1 debito de teste id `...d1`).
- negotiation-agent nao implementa `/readyz` nem `/session/start` (Contrato A).
- schema local e o subconjunto minimo (nao os 116 `scripts/*.sql`); faltam as RPCs
  `start_batch_processing` / `increment_batch_*` / `check_and_finalize_batch`.
- cobranca ASAAS real exige `ASAAS_API_KEY` de sandbox.
- migrar `getSupabaseAdmin` ad-hoc dos workers para `lib/db/target`.
- `client.ts` (browser) precisa de `NEXT_PUBLIC_DATABASE_TARGET`.
- endurecer egress das NetworkPolicies.
- Contrato C nao transmite o desconto negociado.

## Proximos passos

- **Wave 5 (WS-1b)** quando autorizado: apagar as 29 branches antigas via
  `git push origin --delete <branch>` (o hook v3 libera `main-*`, nunca a `main`).
  Confirmar antes que o archive (tags + bundle) existe. Lista das 29 branches em
  `prompts/PROMPT_ajustes_e_wave1.md` (secao WS-1a) e em git.
- Opcional antes da Wave 5: re-subir o deploy local (runbook) se quiser revalidar.

## Checklist de ambiente para retomar

- Ollama no host (GPU Metal):
  `nohup env OLLAMA_CONTEXT_LENGTH=8192 OLLAMA_KEEP_ALIVE=12h ollama serve > ~/ollama.log 2>&1 & disown`
  e `ollama ps` (qwen2.5:14b).
- `kubectl config current-context` = `orbstack`; `kubectl get nodes` Ready.
- supabase CLI instalado (`supabase --version`); `cd /tmp/sb-local && supabase start`.
