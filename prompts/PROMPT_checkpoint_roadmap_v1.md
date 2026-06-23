# Checkpoint roadmap-v1 e pausa (retomar amanha)

Sync Point 3 concluido. **NAO execute a Wave 4 (deploy WS-7) nem a Wave 5
(deleção WS-1b) agora.** O objetivo deste prompt e salvar o estado de forma
limpa para retomar amanha, possivelmente em uma sessao nova (sem o contexto
desta). As RED FLAGS continuam: nada de push/force/delete na main de producao.

---

## 1. Higiene de repositorio (garantir nada solto)

Em ambos os repos, confirmar working tree limpo e tudo pushado. Se houver
qualquer arquivo nao commitado relevante, commitar com mensagem descritiva e dar
push (feature/roadmap-v1 no altea-pay; main no altea-pay-agents, permitido pelo
hook v3).

- `altea-pay`: confirmar branch `feature/roadmap-v1`, working tree limpo, e que o
  remote esta atualizado. Reportar o SHA atual de `feature/roadmap-v1`.
- `altea-pay-agents`: confirmar branch `main`, working tree limpo, remote
  atualizado. Reportar o SHA atual.
- Reconfirmar que a main de producao do `altea-pay` segue em
  `dfeceb2dfde89942719635cb27738c9e8e63223b` (baseline intocado).

## 2. Gerar o documento de retomada

Criar `docs/ESTADO_roadmap-v1.md` no `altea-pay` com, em portugues e sem em-dash:

### 2.1 Status das waves
Tabela: Wave 0 (contratos), Wave 1 (WS-1a/WS-2/WS-6), Wave 2 (WS-3/WS-4), Wave 3
(WS-5) = CONCLUIDAS. Wave 4 (WS-7 deploy local) = PENDENTE (proxima). Wave 5
(WS-1b deleção das 29 branches) = PENDENTE (apos WS-7 validado).

### 2.2 Estado por repositorio (com SHAs reais lidos via git)
- `altea-pay` `feature/roadmap-v1` @ <SHA> (pushado).
- `altea-pay-agents` `main` @ <SHA> (pushado).
- `altea-pay` `main` de producao @ dfeceb2 (intocada).
- Arquivo das branches antigas: 29 tags `archive/*` no remote + bundle local
  `backups/altea-pay-branches-2026-06-22.bundle`. Nenhuma branch apagada ainda.

### 2.3 O que ja esta pronto (resumo)
- Guard-rails (hook v3 escopado ao altea-pay, branch protection enforce_admins
  ON), contratos, docs/estado-atual, docs/lacunas-roadmap-v1.md,
  docs/db-local-strategy.md.
- `altea-pay-agents`: estrutura de microservicos com manifests para 3 namespaces;
  project-manager novo; dev=refactor; qa-code+qa-e2e; LLM em ollama; ASAAS mock;
  link mock removido (chama /api/agents/close-agreement).
- `altea-pay` feature/roadmap-v1: Dockerfile(s) ARM64, k8s/base (ns alteapay-app,
  Postgres StatefulSet), abstracao DATABASE_TARGET (lib/db), fix do worker
  (asaas_boleto_url/asaas_pix_qrcode_url), WhatsApp Cloud API
  (lib/notifications/whatsapp-cloud.ts) + webhook (HMAC/verify), fila
  alteapay-whatsapp-inbound, worker inbound -> negotiation-agent, endpoint
  /api/agents/close-agreement (negociacao-primeiro), tabela
  whatsapp_phone_mapping (phone_number_id -> company_id).

### 2.4 Follow-ups abertos (com destaque do bloqueador de validacao)
- **CRITICO para validar a Wave 4:** o agente busca debito/ofertas de dados mock
  (fulfillment.yaml). Para validar o fluxo real ponta-a-ponta no deploy, decidir:
  (a) implementar a busca de debito/ofertas na app (seta "negagent -> consulta
  divida e ofertas -> web" do diagrama), ou (b) semear dados de teste no Postgres
  local para a demo. Sem um dos dois, o end-to-end nao fecha em WS-7.
- Supabase self-hosted: os manifests de GoTrue/PostgREST/Storage/Kong ficaram
  para a WS-7. Avaliar a alternativa mais leve de rodar `supabase start` (CLI, em
  Docker no host) e apontar a app in-cluster para ele, em vez de implantar os 4
  servicos no cluster.
- Confirmar lockfile do pnpm (`pnpm-lock.yaml`) antes do build da imagem; se o
  repo usa `package-lock.json`, ajustar o Dockerfile.
- Migrar `getSupabaseAdmin` ad-hoc dos workers para `lib/db/target`.
- `client.ts` (browser) precisa de `NEXT_PUBLIC_DATABASE_TARGET`.
- Endurecer egress das NetworkPolicies.
- Contrato C nao transmite o desconto negociado (usa valor do debito + parcelas
  do offer_id); refinar no futuro.

### 2.5 Checklist de ambiente para retomar amanha
- Ollama no host (GPU Metal), comando exato:
  `nohup env OLLAMA_CONTEXT_LENGTH=8192 OLLAMA_KEEP_ALIVE=12h ollama serve > ~/ollama.log 2>&1 & disown`
  e confirmar com `ollama ps` (qwen2.5:14b, CONTEXT 8192). Se a porta 11434
  estiver ocupada pelo Ollama.app, sair por ele no menu do macOS antes.
- `kubectl config current-context` = orbstack; `kubectl get nodes` Ready.
- Decisao do Supabase local (item 2.4) tomada antes de subir a app.

### 2.6 Proximos passos
- **Wave 4 (WS-7)** conforme `prompts/PROMPT_roadmap_v1_orquestracao.md`: criar os
  3 namespaces, build das imagens ARM64, subir app+workers+postgres-app,
  negotiation+trainer(0)+redteam(0)+ollama(host)+postgres-neg,
  dev-agents+bus+postgres-platform, `DATABASE_TARGET=local-postgres`, validar os
  criterios de aceite. Incorporar a decisao do Supabase local e do sourcing/seed.
- **Wave 5 (WS-1b)** apos WS-7 validado: apagar as 29 branches via
  `git push origin --delete <branch>` (o hook v3 libera main-*; nunca a main).

## 3. Fechar o checkpoint
Commitar `docs/ESTADO_roadmap-v1.md` em feature/roadmap-v1
(`docs: checkpoint roadmap-v1 (estado para retomada)`), dar push, e reportar o
caminho e o SHA do commit. **Parar aqui.** Nao subir nada no cluster, nao apagar
nenhuma branch.
