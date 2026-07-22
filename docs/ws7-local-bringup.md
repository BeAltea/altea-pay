# WS-7 - Bring-up local (runbook reproduzivel)

Sobe app + agentes no cluster local (OrbStack k8s, ARM64), 3 namespaces, Postgres
local via Supabase self-hosted (decisao em `docs/db-local-strategy.md`). Validado
em 2026-06-23. Sem em-dash.

## Pre-requisitos
- OrbStack com Kubernetes ON: `kubectl config current-context` = `orbstack`.
- Ollama no host (GPU Metal) com o modelo:
  `nohup env OLLAMA_CONTEXT_LENGTH=8192 OLLAMA_KEEP_ALIVE=12h ollama serve > ~/ollama.log 2>&1 & disown`
  (`ollama ps` mostra `qwen2.5:14b`).
- supabase CLI: `brew install supabase/tap/supabase`.

## 1. Supabase local (host)
```
mkdir -p /tmp/sb-local && cd /tmp/sb-local
printf 'N\nN\n' | supabase init
supabase start                 # sobe Postgres+Auth+PostgREST+Storage+Kong
supabase status -o json        # capturar ANON_KEY e SERVICE_ROLE_KEY (API em :54321, DB em :54322)
```
Os pods alcancam o host por `http://host.orb.internal:54321`.

## 2. Schema minimo + seed + grants
O schema completo de producao esta espalhado por 116 `scripts/*.sql` (replay
fragil). Para a demo aplica-se um subconjunto idempotente:
```
CID=$(docker ps --filter name=supabase_db --format '{{.ID}}' | head -1)
docker exec -i "$CID" psql -U postgres -d postgres -f - < scripts/ws7-local-bootstrap.sql
docker exec -i "$CID" psql -U postgres -d postgres -c "notify pgrst, 'reload schema';"
```
`scripts/ws7-local-bootstrap.sql` cria companies/customers/debts/agreements/
asaas_batches/whatsapp_phone_mapping, semeia 1 empresa + 1 cliente + 1 debito
(id `...d1`) + 1 phone mapping, e concede privilegios aos roles do Supabase
(sem os GRANTs o PostgREST devolve 42501). Recarregar o schema cache do PostgREST
apos criar tabelas (NOTIFY ou reiniciar `supabase_rest`).

## 3. Imagens ARM64 (OrbStack compartilha com o k8s; sem registry)
```
ANON=<anon key do passo 1>
# app: NEXT_PUBLIC_* sao inlinadas no build (rotas constroem o cliente Supabase
# em escopo de modulo) -> passar a URL local alcancavel pelos pods:
docker build -f Dockerfile \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=http://host.orb.internal:54321 \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON" -t alteapay/app:local .
docker build -f Dockerfile.workers -t alteapay/workers:local .
# repo alteapay-agents:
docker build -f Dockerfile.agent -t alteapay/agent:local .
docker build -f agents/negotiation/Dockerfile -t alteapay/negotiation:local agents/negotiation
```

## 4. Namespaces e manifests
```
# agentes (cria os 3 namespaces + negotiation/dev-agents):
kubectl apply -k <alteapay-agents>/deploy/k8s/roadmap-v1
# token compartilhado agente<->app (mesmo valor nos dois lados):
kubectl -n alteapay-negotiation create secret generic platform-secrets \
  --from-literal=POSTGRES_PASSWORD=altea \
  --from-literal=ALTEAPAY_AGENT_TOKEN=<token> --dry-run=client -o yaml | kubectl apply -f -
kubectl -n alteapay-negotiation rollout restart deploy/negotiation-agent

# app (NAO re-aplicar -k depois de setar o secret real: o secret.template reseta):
kubectl apply -k k8s/base
kubectl -n alteapay-app create secret generic alteapay-app-secrets \
  --from-literal=NEXT_PUBLIC_SUPABASE_URL=http://host.orb.internal:54321 \
  --from-literal=NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON" \
  --from-literal=SUPABASE_SERVICE_ROLE_KEY="$SVC" \
  --from-literal=LOCAL_SUPABASE_URL=http://host.orb.internal:54321 \
  --from-literal=LOCAL_SUPABASE_ANON_KEY="$ANON" \
  --from-literal=LOCAL_SUPABASE_SERVICE_ROLE_KEY="$SVC" \
  --from-literal=POSTGRES_PASSWORD=altea \
  --from-literal=AGENT_APP_TOKEN=<token> \
  --from-literal=WHATSAPP_WEBHOOK_VERIFY_TOKEN=<verify> \
  --from-literal=WHATSAPP_APP_SECRET=<secret> --dry-run=client -o yaml | kubectl apply -f -
kubectl -n alteapay-app rollout restart deploy/alteapay-web deploy/alteapay-workers
```
Nota: se o namespace `alteapay-app` tiver Deployments antigos com selector
diferente, apaga-los antes (selector e imutavel):
`kubectl -n alteapay-app delete deploy alteapay-web alteapay-workers`.

## 5. Validacao (via port-forward)
```
kubectl -n alteapay-app port-forward svc/alteapay-web 3000:3000 &
curl localhost:3000/api/health                         # {"status":"ok"}
curl localhost:3000/api/ready                          # {"databaseTarget":"local-postgres"}
curl "localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=<verify>&hub.challenge=X"   # 200 X
curl -X POST localhost:3000/api/agents/close-agreement -H 'x-agent-token: <token>' -H 'content-type: application/json' \
  -d '{"company_id":"00000000-0000-0000-0000-000000000001","thread_id":"t1:5511999999999","debt_id":"00000000-0000-0000-0000-0000000000d1","offer_id":"parc_3","channel":"whatsapp"}'
```
Esperado: handshake 200; close-agreement `success:true` (cria agreement + batch +
enfileira `alteapay-asaas-charge-create`). O worker processa o job e falha apenas
na chamada real ao ASAAS (`chave de API invalida`, esperado sem credencial real)
e nas RPCs de batch (fora do schema minimo). Isso valida o fluxo
negociacao-primeiro; a cobranca real exige credencial ASAAS de sandbox.

## Lacunas observadas no bring-up (registradas em docs/lacunas-roadmap-v1.md)
- negotiation-agent expoe `/health` e `/chat`; `/readyz` e `/session/start`
  (Contrato A) nao implementados -> readinessProbe usa `/health`.
- Schema minimo (nao os 116 scripts) e sem as RPCs `start_batch_processing` /
  `increment_batch_*` / `check_and_finalize_batch` -> worker loga erro de RPC.
- Cobranca ASAAS real precisa de `ASAAS_API_KEY` de sandbox (hoje placeholder).
- Browser client usa `NEXT_PUBLIC_SUPABASE_URL` inlinado (`host.orb.internal`),
  nao resolvivel pelo navegador; ok para a validacao server-side desta fase.
