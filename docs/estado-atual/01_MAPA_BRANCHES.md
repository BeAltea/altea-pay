# Mapa de Branches

**Data de geracao:** 2026-06-22
**Base:** `git fetch --all --prune` em 2026-06-22; inventario via `git for-each-ref`, `git log -1`, `git rev-list --left-right --count`.

## 1. altea-pay (repo de producao)

- **Branch default:** `origin/main` (HEAD aponta para main).
- **Remote:** `https://github.com/BeAltea/altea-pay.git`
- **main:** `dfeceb2`, Fabio Moura Barros, 2026-06-03. **Unica branch atualizada.**

Todas as outras branches estao **centenas de commits atras de main** (ou seja, ja mergeadas/historicas ou abandonadas). O `git fetch --prune` removeu 12 branches remotas ja deletadas no origin.

### Classificacao das branches remotas

| Branch | Ultimo commit | Autor | Ahead / Behind main | Status |
|--------|---------------|-------|---------------------|--------|
| `origin/main` | dfeceb2 / 2026-06-03 | Fabio | 0 / 0 | **PRODUCAO** |
| `origin/feature/bullmq-queue-system` | db348f3 / 02-20 | Fabio | 1 / 133 | Mergeada (filas BullMQ ja em main) |
| `origin/feature/docker-migration` | e78f3cf / 02-05 | Fabio | 12 / 308 | Experimental; tem commits exclusivos sobre Docker/workers |
| `origin/feature/payment-gateway` | fbf46ee / 02-03 | Fabio | 2 / 335 | Mergeada (ASAAS inicial) |
| `origin/feature/super-admin-improvements-feb9` | 3dfbe21 / 02-09 | Fabio | 2 / 206 | Mergeada (melhorias super-admin) |
| `origin/fix/cancel-negotiation-and-email` | 8664b4e / 02-09 | Fabio | 3 / 198 | Mergeada (fix cancelamento) |
| `origin/feature/email-tracking-filters` | 488ec78 / 02-06 | Fabio | 0 / 264 | Mergeada |
| `origin/feature/final-client-portal` | 4fa0f54 / 02-25 | Fabio | 0 / 116 | Mergeada (portal cliente) |
| `origin/feature/final-client-portal-v2` | 7197beb / 02-25 | Fabio | 0 / 114 | Mergeada (portal cliente v2) |
| `origin/feature/reports-accounting-module` | 8b0434e / 02-10 | Fabio | 0 / 187 | Mergeada (relatorios) |
| `origin/feature/send-email-menu` | 41a7f44 / 02-05 | Fabio | 0 / 304 | Mergeada |
| `origin/feature/session-timeout` | c897322 / 02-09 | Fabio | 0 / 201 | Mergeada |
| `origin/fix/negociacoes-batch-send-debug` | eda8f19 / 02-12 | Fabio | 0 / 135 | Mergeada |
| `origin/main-2` | fbafa7c / 01-26 | vercel[bot] | 0 / 358 | **Abandonada** (snapshot v0.dev) |
| `origin/main-3` | e7d26e2 / 01-26 | v0 | 0 / 356 | **Abandonada** (snapshot v0.dev) |
| `origin/main-4` | 8a041e0 / 01-26 | v0 | 0 / 350 | **Abandonada** (snapshot v0.dev) |
| `origin/main-branch-update` | 7c9365d / 01-26 | v0 | 0 / 353 | **Abandonada** (snapshot v0.dev) |
| `origin/main-main` | 04cc839 / 01-26 | vercel[bot] | 0 / 355 | **Abandonada** (snapshot v0.dev) |
| `origin/main2` | 9f2c776 / 2025-11-03 | v0 | 1 / 427 | **Abandonada** (muito antiga) |
| `origin/v0/main-0605df88` | c897381 / 01-26 | v0 | 0 / 359 | **Abandonada** (v0.dev) |
| `origin/v0/suportectpcr-1565-365d1e02-2` | 95de11f / 02-06 | vercel[bot] | 0 / 256 | Experimental v0.dev |
| `origin/v0/suportectpcr-1565-4069e465` | cca00b2 / 02-06 | vercel[bot] | 0 / 252 | Experimental v0.dev |
| `origin/v0/suportectpcr-1565-4ccd216c` | 14f4c96 / 02-11 | v0 | 1 / 147 | Experimental v0.dev |
| `origin/v0/suportectpcr-1565-4dcfa0c4` | 8fc6e90 / 02-06 | vercel[bot] | 0 / 277 | Experimental v0.dev |
| `origin/v0/suportectpcr-1565-543cc458` | 8c2f111 / 02-11 | seufabio | 0 / 147 | Experimental v0.dev |
| `origin/v0/suportectpcr-1565-723feb09` | eb1d802 / 02-06 | seufabio | 0 / 254 | Experimental v0.dev |
| `origin/v0/suportectpcr-1565-d66e4d82` | a492a33 / 02-06 | vercel[bot] | 0 / 247 | Experimental v0.dev |
| `origin/v0/suportectpcr-1565-d96693fb` | d5c5542 / 02-07 | vercel[bot] | 0 / 238 | Experimental v0.dev |
| `origin/v0/suportectpcr-1565-ed76225c` | 8c2f111 / 02-11 | seufabio | 0 / 147 | Experimental v0.dev |
| `origin/v0/updates` | 0038007 / 02-06 | pedromourabarros | 2 / 254 | Experimental v0.dev |

### Conclusao (altea-pay)

- Para documentar o **estado atual** basta `main`.
- As branches `feature/*` e `fix/*` ja foram incorporadas (0 ahead) ou contem pequenos deltas (1-3 commits) provavelmente ja refletidos em main.
- As branches `main-*`, `main2`, `v0/*` sao snapshots automaticos do v0.dev / Vercel, **abandonados**. Nenhuma contem codigo nao-mergeado relevante para os 3 eixos de planejamento.
- **Nenhuma branch do altea-pay contem codigo de agentes** (busca `git grep -i -E 'langgraph|fastapi|ollama|red.team|persona|qwen2'` em todas as branches retornou vazio).

## 2. Repositorios irmaos (locais, sem remote)

### altea-negotiation-agent

- **Branch atual:** `negotiation-agent-prototype` (unica branch local).
- **Ultimo commit:** `8331f36`, Fabio Moura Barros, 2026-06-11, "fix(redteam): unbuffered output + LLM timeouts + warmup; add bounded soak".
- **Stack:** Python (LangGraph, langchain-ollama, FastAPI, pydantic, pytest) - ver `/Users/seufabio/git/altea-negotiation-agent/requirements.txt`.
- **Estado:** prototipo funcional com dados mock; Ollama nao instalado na maquina segundo `docs/AGENT_OVERVIEW.md`.

### alteapay-agents

- **Branch atual:** `main` (unica branch local).
- **Ultimo commit:** `b8868d6`, Fabio Moura Barros, 2026-06-15, "docs(negotiation): v4 refinement re-tested + validated - campaign path 4/4 wrong_channel=0, redirect tool called every episode".
- **Stack:** TypeScript + Python (agente negotiation em LangGraph), Kubernetes - ver `/Users/seufabio/git/alteapay-agents/package.json`.
- **Estado:** plataforma multi-agente mais ampla; ultimo trabalho em negotiation v4 (redirect-tool compliance).

### alteapay-refactored

- **Branch atual:** `main`. Branches adicionais: `agent/refactor-limited-f173ee4e`, `agent/infra-manifests-mq9v30k8`.
- **Ultimo commit (main):** `3ebb8a9`, cto-alpha, 2026-06-11, "merge: agent/infra-manifests-mq9v30k8 (MR 04002f2b, CTO-approved)".
- **Branch `agent/refactor-limited-f173ee4e`:** commit `b5208a1` (2026-06-11), autor `alteapay-agent`, "feat(notifications): add WhatsApp provider interface with mock implementation" (+177 linhas em `lib/notifications/whatsapp/`).
- **Branch `agent/infra-manifests-mq9v30k8`:** commit `bab142b` (2026-06-11), autor `alteapay-agent`, "feat(infra): generate cloud-agnostic k8s manifests for refactored app".
- **Estado:** refactor do altea-pay (Next.js) com k8s/, vitest, Dockerfile.workers. As branches `agent/*` foram **geradas por agentes autonomos** (assinatura de commit `alteapay-agent`), confirmando que o alteapay-agents produz codigo neste repo.
