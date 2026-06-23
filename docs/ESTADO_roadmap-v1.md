# Estado do roadmap-v1 (documento de retomada)

Checkpoint salvo no Sync Point 3. Objetivo: retomar amanha, possivelmente em
sessao nova sem o contexto desta. Gerado em 2026-06-22.

Regras invioláveis seguem valendo: nada de push, force, merge ou delete na branch
`main` de producao do `altea-pay`. A `main` permanece intocada.

Fontes de verdade: `prompts/PROMPT_roadmap_v1_orquestracao.md`,
`docs/contratos-roadmap-v1.md`, `docs/arquitetura-roadmap-v1.mermaid`,
`docs/lacunas-roadmap-v1.md`, `docs/db-local-strategy.md`.

---

## 2.1 Status das waves

| Wave | Conteudo | Status |
| ---- | -------- | ------ |
| Wave 0 | Fase 0 (diagnostico) + contratos | CONCLUIDA |
| Wave 1 | WS-1a (push + arquivamento), WS-2 (repo de agentes), WS-6 (diagrama) | CONCLUIDA |
| Wave 2 | WS-3 (Docker/k8s/Postgres/DATABASE_TARGET/fix worker), WS-4 (WhatsApp Cloud API + webhook) | CONCLUIDA |
| Wave 3 | WS-5 (worker inbound, endpoint de fechamento, tabela phone->company, link mock removido) | CONCLUIDA |
| Wave 4 | WS-7 (deploy local: 3 namespaces, imagens ARM64, bring-up, validacao) | PENDENTE (proxima) |
| Wave 5 | WS-1b (deleção das 29 branches antigas) | PENDENTE (apos WS-7 validado) |

## 2.2 Estado por repositorio (SHAs reais)

- `altea-pay` `feature/roadmap-v1` @ `d2d459efb89d345728d735eba2d4f07686ae7678` (pushado, em sincronia com o remote). Observacao: este documento gera um commit novo por cima desse SHA.
- `altea-pay-agents` `main` @ `1e8e017214f31492feec21145f2684541805cb33` (pushado, em sincronia).
- `altea-pay` `main` de producao @ `dfeceb2dfde89942719635cb27738c9e8e63223b` (baseline, intocada).
- Arquivo das branches antigas: 29 tags `archive/*` no remote do `altea-pay` + bundle local `backups/altea-pay-branches-2026-06-22.bundle` (17 MB, fora do git via .gitignore). Nenhuma branch foi apagada ainda.

## 2.3 O que ja esta pronto (resumo)

- Guard-rails: hook `tools/pre-bash-guard.sh` v3 escopado ao remote `BeAltea/altea-pay` (so bloqueia a main desse repo; libera `main-*` e o repo de agentes); branch protection com `enforce_admins` ON, force-push e delete bloqueados, PR obrigatorio.
- Documentacao: contratos A a E, `docs/estado-atual/*`, `docs/lacunas-roadmap-v1.md`, `docs/db-local-strategy.md`, diagrama `docs/arquitetura-roadmap-v1.mermaid` coerente com o implementado.
- `altea-pay-agents`: estrutura de microservicos (orchestrator + agents + platform) com manifests para 3 namespaces em `deploy/k8s/roadmap-v1`; `project-manager` novo; `dev` = reuso do `refactor`; `qa` = `qa-code` + `qa-e2e`; LLM em ollama para todas as classes; ASAAS mock; link de pagamento mock removido (agora chama `/api/agents/close-agreement`). 13 personas e 29 ataques (canonico).
- `altea-pay` `feature/roadmap-v1`:
  - `Dockerfile` (web Next.js, pnpm, ARM64, non-root) e `Dockerfile.workers` (ARM64).
  - `k8s/base` (ns `alteapay-app`): web (Deploy+Service+HPA), workers (Deploy+PDB), redis, `postgres-app` StatefulSet, configmap, secret template, networkpolicy, kustomization.
  - Abstracao de banco `lib/db` (`DATABASE_TARGET`: supabase default, local-postgres, skeleton aurora/cloudsql); `server.ts` e `admin.ts` resolvem por ela.
  - Fix do worker `asaas-charge-create` (colunas reais `asaas_boleto_url` e `asaas_pix_qrcode_url`).
  - WhatsApp Cloud API: `lib/notifications/whatsapp-cloud.ts` + webhook `app/api/whatsapp/webhook/route.ts` (handshake GET, HMAC SHA-256 no POST), fila `alteapay-whatsapp-inbound`.
  - Worker `whatsapp-inbound` repassa ao `negotiation-agent` (Contrato A) e responde via Cloud API.
  - Endpoint `app/api/agents/close-agreement` (Contrato C, negociacao-primeiro) enfileira `alteapay-asaas-charge-create`.
  - Migracao `supabase/migrations/20260622_create_whatsapp_phone_mapping.sql` (tabela `whatsapp_phone_mapping`, phone_number_id -> company_id, com RLS).

## 2.4 Follow-ups abertos

- CRITICO para validar a Wave 4: o agente busca debito e ofertas de dados mock (`fulfillment.yaml`). Para validar o fluxo real ponta a ponta no deploy, decidir entre: (a) implementar a busca de debito e ofertas na app (seta "negagent -> consulta divida e ofertas -> web" do diagrama), ou (b) semear dados de teste no Postgres local para a demo. Sem um dos dois, o end-to-end nao fecha em WS-7.
- Supabase self-hosted: os manifests de GoTrue, PostgREST, Storage e Kong ficaram para a WS-7. Avaliar a alternativa mais leve de rodar `supabase start` (CLI, em Docker no host) e apontar a app in-cluster para ele, em vez de implantar os quatro servicos no cluster.
- Confirmar lockfile do pnpm (`pnpm-lock.yaml`) antes do build da imagem; se o repo passar a usar `package-lock.json`, ajustar o Dockerfile. (Hoje o repo usa pnpm-lock.yaml.)
- Migrar os `getSupabaseAdmin` ad-hoc dos workers para `lib/db/target`.
- `client.ts` (browser) precisa de `NEXT_PUBLIC_DATABASE_TARGET` para trocar destino no cliente.
- Endurecer egress das NetworkPolicies (hoje so o ingress e default-deny).
- Contrato C nao transmite o desconto negociado (usa valor do debito mais parcelas derivadas do offer_id); refinar no futuro.

## 2.5 Checklist de ambiente para retomar amanha

- Ollama no host (GPU Metal). Comando exato:
  `nohup env OLLAMA_CONTEXT_LENGTH=8192 OLLAMA_KEEP_ALIVE=12h ollama serve > ~/ollama.log 2>&1 & disown`
  e confirmar com `ollama ps` (qwen2.5:14b, CONTEXT 8192). Se a porta 11434 estiver ocupada pelo Ollama.app, sair por ele no menu do macOS antes.
- `kubectl config current-context` deve ser `orbstack`; `kubectl get nodes` deve estar Ready.
- Tomar a decisao do Supabase local (item 2.4) antes de subir a app.

## 2.6 Proximos passos

- Wave 4 (WS-7) conforme `prompts/PROMPT_roadmap_v1_orquestracao.md`: criar os 3 namespaces (`alteapay-app`, `alteapay-negotiation`, `alteapay-dev-agents`), build das imagens ARM64 (app, workers, negotiation, agente TS unificado), subir app + workers + `postgres-app`, negotiation + trainer (replicas 0) + redteam (replicas 0) + ollama (host) + `postgres-neg`, dev-agents (cto-alpha, cto-beta, project-manager, dev, qa-code, qa-e2e, security) + bus + `postgres-platform`, apontar `DATABASE_TARGET=local-postgres`, e validar os criterios de aceite. Incorporar as decisoes do Supabase local e do sourcing ou seed de dados.
- Wave 5 (WS-1b) apos WS-7 validado: apagar as 29 branches via `git push origin --delete <branch>` (o hook v3 libera `main-*`; nunca a `main`). Confirmar antes que o archive (tags mais bundle) existe.

---

## Criterios de aceite (acompanhamento)

- [x] Fase 0 reportada e aprovada antes de qualquer alteracao.
- [x] `main` do `altea-pay` intocada (mesmo SHA `dfeceb2`); branch protection ativa (enforce_admins ON).
- [ ] `altea-pay` com apenas `main` + `feature/roadmap-v1` (branches arquivadas e removidas). Arquivadas: SIM (29 tags + bundle). Removidas: PENDENTE (Wave 5).
- [x] `altea-pay-agents` populado e com push (negociacao, treino, treino malicioso, cto-alpha, cto-beta, project-manager, qa-code, qa-e2e, security/dev, com Dockerfile e manifest).
- [x] `feature/roadmap-v1` contem Docker/k8s, namespaces, Postgres local, abstracao de DB, WhatsApp Cloud API (lib + webhook verify/HMAC), integracao com o agente (Contratos A/B/C).
- [ ] Cluster local rodando com 3 namespaces (Wave 4).
- [ ] App e agentes usando Postgres local; webhook WhatsApp passa no handshake (Wave 4).
- [x] Diagrama coerente com o implementado.
- [x] `docs/lacunas-roadmap-v1.md`, `docs/db-local-strategy.md`, `docs/contratos-roadmap-v1.md` gerados.
