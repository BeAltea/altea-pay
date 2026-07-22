# Roadmap v1 - Orquestracao multi-agente (Claude Code)

Prompt mestre para o Claude Code executar a refatoracao do roadmap-v1 da AlteaPay
com varios agentes em paralelo, em diferentes frentes, de forma autonoma, dentro
de um container isolado, sem nunca tocar a `main` do repositorio de producao.

---

## 0. RED FLAGS - regras invioláveis (ler antes de tudo)

Estas regras tem precedencia sobre qualquer outra instrucao deste documento.

1. **NUNCA** fazer `push`, `force-push`, `merge` ou `delete` na branch `main` do
   repositorio de producao `altea-pay` (`github.com/BeAltea/alteapay`). A `main`
   e o estado de producao e permanece intocada.
2. **NUNCA** rodar como root nem com sudo (o proprio Claude Code recusa bypass nesse caso).
3. **NUNCA** executar comandos destrutivos amplos (`rm -rf` fora do diretorio de
   trabalho, `git clean -fdx` em repo de producao, etc.).
4. **Toda** branch a ser apagada deve antes ser arquivada (tag + bundle) e o
   arquivo verificado. Apagar branch so depois disso e so no final, com o deploy
   local ja validado.
5. Escopo da regra "sem push na main": ela vale **somente** para a `main` do
   `altea-pay`. E permitido e esperado:
   - criar e dar push na branch `feature/roadmap-v1` do `altea-pay`;
   - apagar as **outras** branches remotas do `altea-pay` (nunca a main);
   - dar push no repositorio **novo** `altea-pay-agents` (recem criado e vazio).
6. Se faltar credencial de git/gh, ou se um push for rejeitado por protecao,
   **parar e reportar**. Nunca tentar inserir senha ou contornar a protecao.

> Defesa em profundidade obrigatoria antes de iniciar: ver secao 2 (container +
> branch protection no GitHub + hook PreToolUse + budget cap).

---

## 1. Objetivo e entregaveis

Consolidar os agentes em um microservico, escalar a aplicacao para Docker e
Kubernetes, integrar a WhatsApp Cloud API oficial, e subir tudo localmente no
cluster do autor, com Postgres local para app e agentes.

Entregaveis:

- **E1.** Repositorio `altea-pay-agents` populado com os agentes em estrutura de
  microservicos (negociacao, treino, treino malicioso, cto-alpha, cto-beta,
  project-manager, qa, dev), com Dockerfiles e manifests k8s.
- **E2.** Branch `feature/roadmap-v1` no `altea-pay` contendo: estado atual de
  producao (igual a `main`) + Docker/k8s + namespaces + Postgres local + camada
  de abstracao de DB + integracao WhatsApp Cloud API + integracao com o
  microservico de agentes de negociacao.
- **E3.** `altea-pay` sanitizado: `main` intocada, todas as demais branches
  arquivadas e removidas, restando `main` + `feature/roadmap-v1`.
- **E4.** Diagrama arquitetural do alvo roadmap-v1 versionado no repo
  (`docs/arquitetura-roadmap-v1.mermaid`, fornecido junto deste prompt).
- **E5.** Deploy local funcionando: app + agentes rodando no cluster local, 3
  namespaces, Postgres local para app e agentes.

---

## 2. Como rodar (ambiente seguro + autonomia + paralelismo)

### 2.1 Isolamento (obrigatorio)
Rodar o Claude Code **dentro de um devcontainer** com apenas os repos montados e
rede restrita. Nao rodar bypass/dontAsk no host. O container roda como usuario
nao-root. O cluster local e acessado via kubeconfig montado no container (no
OrbStack, a API do k8s e alcancavel e as imagens Docker locais sao compartilhadas
com o k8s, dispensando registry).

### 2.2 Guard-rails que NAO dependem de configuracao local
- **Branch protection no GitHub** em `altea-pay`/`main`: exigir PR, bloquear
  force-push e bloquear delete. Esse e o backstop autoritativo: mesmo que algo
  tente push na main, o servidor rejeita. Configurar ANTES de iniciar o swarm.

### 2.3 Guard-rails locais (defesa em profundidade)
- `.claude/settings.json` em cada repo com `permissions.defaultMode` definido,
  para que **subagentes herdem** o modo (o bypass do processo pai nao se propaga
  de forma confiavel para subagentes).
- Hook `PreToolUse` em `Bash` que bloqueia qualquer comando que faca push, force,
  merge ou delete mirando `main` do `altea-pay`. Script de referencia:
  `tools/pre-bash-guard.sh` (criar; bloquear ao casar
  `git\s+push.*\bmain\b`, `push\s+--force`, `push\s+-f`, `branch\s+-D\s+main`,
  `push\s+.*--delete\s+main`). Confirmar o formato de retorno de hook da sua
  versao do Claude Code.
- `--disallowedTools "Bash(git push --force:*)" "Bash(git push -f:*)"` para barrar
  force-push em qualquer modo (o `--disallowedTools` funciona inclusive em bypass;
  o `--allowedTools` tem bug conhecido em bypass).
- `--max-budget-usd <valor>` para limitar gasto de um swarm longo.

### 2.4 Modo de permissao
Escolher um:
- **Auto mode** (`--permission-mode auto`): mais seguro; um classificador avalia
  cada acao, libera as seguras e tenta caminho alternativo no lugar de travar.
  Em headless, encerra apos 3 negacoes seguidas ou 20 no total. Pode sinalizar
  operacoes destrutivas (delete de branch) e gerar escalonamento.
- **Headless silencioso** (`--permission-mode dontAsk`): nao pede nada e nao
  escalona; use somente porque o container + branch protection + hook + archive
  ja cobrem o risco. Para sessoes sem TTY (swarm), este e o modo que de fato nao
  trava em dialog.

Recomendacao: dado o ambiente isolado e os guard-rails acima, usar `dontAsk` para
as frentes de infra/destrutivas (evita escalonamento do classificador no meio do
run) e manter o archive + branch protection como garantia. Se preferir maxima
seguranca, usar `auto` e aceitar possiveis escalonamentos.

### 2.5 Execucao paralela (multiplos agentes)
- Disparar **um subagente por workstream** dentro de cada "wave" (secao 6).
- Quando dois agentes tocam o **mesmo** repositorio na mesma wave, usar **git
  worktrees** distintos por agente (evita corromper o working tree), e integrar
  no fim da wave (sync point). Subagentes em modo headless herdam o `defaultMode`
  do `.claude/settings.json` do diretorio.
- Respeitar os sync points: nao iniciar uma wave antes da anterior fechar.

Exemplo de invocacao headless por frente (dentro do container, nao-root):
```
claude -p "<conteudo do workstream WS-x>" \
  --permission-mode dontAsk \
  --disallowedTools "Bash(git push --force:*)" "Bash(git push -f:*)" \
  --max-budget-usd 20 \
  --output-format stream-json
```

---

## 3. FASE 0 - Diagnostico global (gate, reportar antes de qualquer alteracao)

Nao alterar nada nesta fase. Ler, auditar, reportar e parar. Repos:
`altea-pay`, `altea-negotiation-agent`, `alteapay-agents`, `alteapay-refactored`.

1. Em cada repo: branch atual, ultimo commit, `git status` limpo, e arvore de
   diretorios ate 2 niveis.
2. Confirmar credencial git/gh disponivel e que `altea-pay-agents` existe vazio
   no GitHub. Confirmar branch protection da `main` do `altea-pay` ativa.
3. `altea-pay`: confirmar nomes exatos a partir do codigo (nao supor):
   - cliente service-role em `lib/supabase/admin.ts` (`createAdminClient`);
   - filas em `lib/queue/config.ts` (`QUEUE_CONFIG`), em especial
     `asaasChargeCreate` -> `alteapay-asaas-charge-create`;
   - server action de fechamento `app/actions/create-agreement-with-asaas.ts` e
     `app/actions/send-payment-link.tsx`;
   - webhook ASAAS `app/api/asaas/webhook/payments/route.ts`;
   - canal WhatsApp atual `lib/notifications/sms.tsx` (`sendWhatsApp`, via Twilio);
   - tabelas: `agreements` (colunas `asaas_invoice_url`, `asaas_bank_slip_url`,
     `asaas_pix_qr_code_url`), `debts`, `VMAX` (isolamento por `id_company`,
     coluna `"CPF/CNPJ"` entre aspas), `asaas_webhook_events`.
4. `alteapay-agents`: confirmar `orchestrator/cto-alpha.ts`, `orchestrator/cto-beta.ts`,
   `agents/negotiation/`, `agents/negotiation/trainer/`, `agents/negotiation/redteam/`,
   `platform/bus/`, `platform/tasks/schema.sql`, `app/llm.py`, `app/fulfillment.py`,
   `app/whatsapp.py`, e a existencia (ou nao) de um agente `qa`, `security`,
   `refactor` e de um `project-manager`.
5. `altea-negotiation-agent`: confirmar `app/graph.py`, `app/tools.py`,
   `trainer/personas.py` (9 personas), `redteam/attacks.py` (27+ ataques).
6. `alteapay-refactored`: confirmar `k8s/`, `Dockerfile.workers`, e
   `lib/notifications/whatsapp/` (interface TS mock/360dialog).

**Reportar o relatorio da Fase 0 e parar. Aguardar confirmacao.**

---

## 4. Contratos compartilhados (definir ANTES das waves paralelas)

Para que frentes paralelas componham sem retrabalho, gerar primeiro o documento
`docs/contratos-roadmap-v1.md` com as interfaces abaixo e usa-lo como fonte unica.

- **Contrato A - API do negotiation-agent (HTTP):** endpoints que a app chama.
  Base do prototipo: `POST /chat` ({thread_id, message, source, company_id}) ->
  {reply, state}; `GET /health`; `GET /readyz`. Acrescentar
  `POST /session/start` para abrir conversa a partir de um inbound WhatsApp.
- **Contrato B - inbound WhatsApp -> app -> agente (payload de fila):** schema do
  job enfileirado pela rota de webhook e consumido pelo worker que repassa ao
  agente. Campos: `wa_message_id`, `from` (E.164 sem +), `text`, `company_id`
  (derivado server-side, nunca do payload), `received_at`, `thread_id`.
- **Contrato C - fechamento de acordo (agente -> app):** o agente NAO cria
  cobranca ASAAS direto. Quando ha acordo, ele chama a app, que enfileira em
  `alteapay-asaas-charge-create` (regra negociacao-primeiro: cobranca so apos
  acordo). Reusar `create-agreement-with-asaas.ts` / o worker existente. Definir
  o endpoint da app que recebe o acordo e dispara a fila.
- **Contrato D - abstracao de DB:** env `DATABASE_TARGET` in
  {`supabase`, `local-postgres`, `aurora`, `cloudsql`}. Uma camada unica resolve
  conexao e credenciais. Em `supabase`, mantem RLS/Auth/Storage atuais. Em
  `local-postgres`, conecta no Postgres do cluster. Regras Supabase preservadas
  no codigo: escritas sempre via service-role (`supabaseAdmin`), sempre encadear
  `.select()` apos `.update()`/`.insert()`, `.range(0, 99999)` para passar do cap
  de 1000 linhas, `company_id`/`id_company` derivado server-side, matching de
  CPF/CNPJ sempre digits-only.
- **Contrato E - convencao k8s:** namespaces `alteapay-app`,
  `alteapay-negotiation`, `alteapay-dev-agents`; nomes de service, labels
  (`app.kubernetes.io/part-of: alteapay`), `imagePullPolicy: IfNotPresent`
  (imagens locais no OrbStack), targets ARM64.

---

## 5. Workstreams (frentes)

Cada workstream segue as regras invioláveis (secao 0) e os contratos (secao 4).
Diagnostico local especifico antes de codar; nomes exatos, nunca "adaptar".

### WS-1a - Preparacao do altea-pay (NAO destrutivo)
- Garantir working tree limpo. Criar `feature/roadmap-v1` a partir de `main`.
- Arquivar TODAS as outras branches remotas: para cada uma, criar tag
  `archive/<branch>` apontando para o head dela e dar push das tags; gerar tambem
  um bundle `backups/altea-pay-branches-<data>.bundle` com `git bundle create`.
  Verificar que tags e bundle existem. (A remocao em si fica na WS-1b, no fim.)

### WS-2 - Microservico de agentes (repo altea-pay-agents)
Base canonica: `alteapay-agents` (mais completo: orchestrator, bus, fulfillment,
negotiation v4, trainer, redteam). Conferir conteudo do `altea-negotiation-agent`,
mas sem reconciliacao numerica: ambos os repos tem 13 personas e 29 ataques
(identicos); `alteapay-agents` e o conjunto canonico. Estrutura monorepo de
microservicos:
```
altea-pay-agents/
  services/
    negotiation/      # agente de negociacao (LangGraph, FastAPI) - producao
    trainer/          # agentes de treino (personas de devedor)
    redteam/          # agentes de treino malicioso (adversarial)
    cto-alpha/        # propoe e decompoe pipelines
    cto-beta/         # valida, nunca auto-aprova
    project-manager/  # NOVO: prioriza e coordena tarefas (criar; ver nota)
    qa/               # agente de QA
    dev/              # agente de dev/refactor
  platform/           # bus (Redis Streams), tasks (Postgres), telemetry, llm
  orchestrator/       # pipelines, decision-log
  deploy/k8s/         # manifests por servico (namespaces neg e dev)
  docker/             # Dockerfile por servico
  README.md
```
- Preservar os 3 conjuntos de agentes pedidos: negociacao, treino, treino
  malicioso. Mais cto-alpha, cto-beta, project-manager, qa, dev.
- **project-manager**: se nao existir no codigo, criar como servico novo,
  modelado no papel de coordenacao/priorizacao (consome do bus, abre tarefas,
  acompanha status no Postgres da plataforma). Marcar claramente como novo.
- LLM por classe (preservar ADR-0013): negociacao default ollama `qwen2.5`;
  agentes de engenharia default anthropic. **Nota de deploy:** os agentes de
  engenharia exigem `ANTHROPIC_API_KEY` valida e modelo disponivel; sem isso
  ficam `/readyz` 503. Para subir local sem a chave, configurar provider `mock`
  para alcancar ready, ou aceitar 503.
- ASAAS permanece mock no repo de agentes (fechamento real e via app, Contrato C).
- `git init` se necessario, `git remote add origin github.com/BeAltea/alteapay-agents`,
  commit inicial estruturado, push (repo novo; push permitido).

### WS-3 - Containerizacao, k8s, namespaces, Postgres local, abstracao de DB (em feature/roadmap-v1)
- `Dockerfile` (web) e reutilizar/ajustar `Dockerfile.workers` (workers), ARM64.
- Manifests base em `k8s/` (aproveitar o que existe em `alteapay-refactored/k8s/`):
  namespace `alteapay-app`, Deployment web (HPA), Deployment workers, Service,
  ConfigMap/Secret, e **StatefulSet `postgres-app`** (Postgres local) + Service.
- Camada de abstracao de DB (Contrato D). Implementar resolucao por
  `DATABASE_TARGET`; manter `supabase` como default de producao; adicionar
  `local-postgres`. Esqueletos/adapters para `aurora` e `cloudsql` (Azure/GCP),
  sem ativar.
- Migracao do schema para o Postgres local: aplicar, em ordem, `scripts/*.sql` +
  `supabase/migrations/*.sql`. **Decisao a registrar (nao inventar):** a app usa
  Auth/RLS/Storage do Supabase. Em `local-postgres`, ou se sobe o stack
  self-hosted do Supabase localmente (Postgres + Auth + Storage) e aponta para
  ele, ou se usa Postgres puro com um shim de auth documentado. Escolher o
  caminho mais confiavel para o bring-up e documentar em
  `docs/db-local-strategy.md`; o que nao der para resolver vira item em
  `docs/lacunas-roadmap-v1.md`.

### WS-4 - Integracao WhatsApp Cloud API oficial (em feature/roadmap-v1)
- `lib/notifications/whatsapp-cloud.ts`: cliente Graph API
  (`graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
  Bearer token). Funcoes `sendText`, `sendTemplate`, `sendInteractive`,
  `sendOutbound`. Normalizar `to` para E.164 sem +. Erros nunca silenciosos
  (logar status e corpo da Graph API). Tratar token expirado, template nao
  aprovado, fora da janela de 24h, rate limit.
- Webhook `app/api/whatsapp/webhook/route.ts`:
  - GET: handshake (`hub.mode`/`hub.verify_token` == `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
    -> 200 com `hub.challenge`; senao 403).
  - POST: validar `X-Hub-Signature-256` via HMAC-SHA256 do corpo **raw** com
    `WHATSAPP_APP_SECRET` (comparacao timing-safe); 401 se nao bater; responder
    200 rapido; enfileirar inbound conforme Contrato B.
- Env novas: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`,
  `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`,
  `WHATSAPP_API_VERSION`.
- Twilio permanece como esta (transacional) nesta fase; consolidacao e decisao
  futura, registrar em `docs/lacunas-roadmap-v1.md`.

### WS-5 - Integracao app <-> microservico de agentes (em feature/roadmap-v1 + agents)
- Lado app: worker/rota que consome o inbound (Contrato B) e chama o
  `negotiation-agent` (Contrato A) no namespace `alteapay-negotiation`. Endpoint
  da app que recebe o acordo do agente e enfileira em
  `alteapay-asaas-charge-create` (Contrato C), respeitando negociacao-primeiro.
- Lado agente: trocar o link de pagamento mock pela chamada real a app (Contrato
  C). Preservar os gates do agente (identity gate, rules gate, validator).
- Manifests de service cross-namespace para a comunicacao app -> agente.

### WS-6 - Diagrama arquitetural
- Versionar `docs/arquitetura-roadmap-v1.mermaid` (fornecido com este prompt) e
  manter coerente com o que foi implementado. Se algo divergir do diagrama,
  ajustar o diagrama e anotar a diferenca.

### WS-7 - Deploy local e validacao (integracao, por ultimo)
- Criar os 3 namespaces: `alteapay-app`, `alteapay-negotiation`,
  `alteapay-dev-agents`.
- Build das imagens ARM64 e disponibilizacao no cluster local (OrbStack usa as
  imagens Docker locais; `imagePullPolicy: IfNotPresent`).
- Subir: app + workers + `postgres-app` (ns app); negotiation + trainer + redteam
  + ollama + `postgres-neg` (ns negotiation); cto-alpha + cto-beta +
  project-manager + qa + dev + bus + `postgres-platform` (ns dev-agents).
- Apontar app e agentes para Postgres local (`DATABASE_TARGET=local-postgres`).
- Validar criterios de aceite (secao 7). So entao liberar a WS-1b.

### WS-1b - Remocao das branches antigas (ULTIMA acao, apos WS-7 verde)
- Confirmar que o archive (tags + bundle) da WS-1a existe.
- Apagar todas as branches remotas do `altea-pay` **exceto `main` e
  `feature/roadmap-v1`** (`git push origin --delete <branch>`), uma a uma.
- **Jamais** apagar `main`. Resultado final: apenas `main` + `feature/roadmap-v1`.

---

## 6. Mapa de paralelismo (waves e sync points)

- **Wave 0 (sequencial):** FASE 0 (gate) -> gerar `docs/contratos-roadmap-v1.md`.
- **Wave 1 (paralela):** WS-1a, WS-2, WS-6. (Independentes entre si.)
  - Sync point 1: branch `feature/roadmap-v1` criada e arquivada; agents repo com
    esqueleto + servicos commitados; diagrama versionado.
- **Wave 2 (paralela, em feature/roadmap-v1 com worktrees distintos):** WS-3, WS-4.
  - Sync point 2: integrar worktrees em `feature/roadmap-v1`; build local OK.
- **Wave 3 (sequencial):** WS-5 (depende de WS-2, WS-3, WS-4).
  - Sync point 3: contrato app<->agente fechado e testado em dev.
- **Wave 4 (sequencial):** WS-7 (deploy local + validacao).
  - Sync point 4: criterios de aceite verdes.
- **Wave 5 (sequencial):** WS-1b (remocao das branches).

---

## 7. Criterios de aceite (definition of done)

- [ ] FASE 0 reportada e aprovada antes de qualquer alteracao.
- [ ] `main` do `altea-pay` intocada (mesmo SHA do inicio); branch protection ativa.
- [ ] `altea-pay` com apenas `main` + `feature/roadmap-v1`; demais branches
      arquivadas (tags + bundle) e removidas.
- [ ] `altea-pay-agents` populado e com push: negociacao, treino, treino malicioso,
      cto-alpha, cto-beta, project-manager, qa, dev, cada um como microservico com
      Dockerfile e manifest.
- [ ] `feature/roadmap-v1` contem: Docker/k8s, namespaces, Postgres local,
      abstracao de DB (`DATABASE_TARGET`), WhatsApp Cloud API (lib + webhook
      verify/HMAC), integracao com o agente (Contratos A/B/C).
- [ ] Cluster local rodando com 3 namespaces: `alteapay-app`,
      `alteapay-negotiation`, `alteapay-dev-agents`.
- [ ] App e agentes usando Postgres local; app responde e o webhook WhatsApp
      passa no handshake de verificacao.
- [ ] Os 3 conjuntos de agentes preservados e no namespace correto (negociacao,
      treino, treino malicioso em `alteapay-negotiation`).
- [ ] Diagrama `docs/arquitetura-roadmap-v1.mermaid` coerente com o implementado.
- [ ] `docs/lacunas-roadmap-v1.md`, `docs/db-local-strategy.md` e
      `docs/contratos-roadmap-v1.md` gerados; pendencias e decisoes registradas,
      nunca preenchidas com suposicao.

---

## 8. Formato de reporte

Ao fim de cada wave, reportar: o que foi feito, arquivos/manifests criados ou
alterados (com caminho), comandos git executados (e confirmacao de que nenhum
mirou a main), e itens que foram para `docs/lacunas-roadmap-v1.md`. Documentar
cada arquivo modificado para deixar trilha de auditoria.
