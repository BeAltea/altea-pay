# Ajustes pós-Fase 0 + Wave 1 (roadmap-v1)

FASE 0 foi executada e aprovada. Este prompt aplica os ajustes que o relatorio
exigiu e, em seguida, executa a Wave 1, parando no sync point 1.

Fonte de verdade continua: `prompts/PROMPT_roadmap_v1_orquestracao.md` (regras
invioláveis na secao 0, contratos, waves), `docs/contratos-roadmap-v1.md` e
`docs/arquitetura-roadmap-v1.mermaid`. As RED FLAGS valem integralmente: nunca
push/force/delete na `main` de producao; nenhuma deleção de branch nesta etapa
(a remoção e a WS-1b, no fim de tudo); arquivar antes de remover.

---

## GATE 0 - verificar pre-condicoes ja aplicadas pelo humano (nao refazer)

Apenas conferir e reportar. Se algo nao estiver satisfeito, PARAR e avisar.

1. `enforce_admins` ativo na main:
   `gh api repos/BeAltea/altea-pay/branches/main/protection/enforce_admins --jq .enabled`
   deve retornar `true`.
2. Hook v2 em vigor: `tools/pre-bash-guard.sh` deve existir, ser executavel e
   conter o comportamento de "main exata" (bloqueia `main`, libera `main-*`).
   Teste rapido:
   - `echo '{"tool_input":{"command":"git push origin --delete main"}}' | tools/pre-bash-guard.sh` -> exit 2
   - `echo '{"tool_input":{"command":"git push origin --delete main-2"}}' | tools/pre-bash-guard.sh` -> exit 0
3. Branch ativa = `feature/roadmap-v1`, working tree limpo.

---

## PARTE 1 - Ajustes de documentacao e contrato (antes das frentes)

### 1.1 Gerar `docs/lacunas-roadmap-v1.md`
Registrar os 9 itens levantados na Fase 0, cada um com estado e decisao tomada:
1. Colunas ASAAS: prompt diverge do codigo. Resolver via DDL (ver 1.2). 
2. 2o webhook ASAAS `app/api/webhooks/asaas/route.ts` (legacy/@deprecated) nao
   citado no prompt; Contratos B/C miram o webhook primario
   `app/api/asaas/webhook/payments/route.ts`.
3. `project-manager` e `dev` inexistentes em `alteapay-agents`: criar PM novo;
   mapear `dev` para o agente `refactor` existente.
4. QA dividido em `qa-code` + `qa-e2e` (nao um `qa` unico): implantar os dois.
5. WhatsApp em `alteapay-refactored` e 360dialog/mock, nao Cloud API: WS-4 cria
   cliente novo `lib/notifications/whatsapp-cloud.ts`.
6. Default de LLM de engenharia = anthropic (`platform/llm/index.ts` lanca erro
   sem `ANTHROPIC_API_KEY`): fase atual roda tudo em Ollama, editar
   `platform/llm/defaults.ts` para `ollama`.
7. `k8s/base` (em `alteapay-refactored`) sem StatefulSet de Postgres: criar em WS-3.
8. Estrategia Auth/RLS/Storage em `local-postgres` (Supabase self-hosted vs shim):
   decidir e registrar em `docs/db-local-strategy.md` (WS-3).
9. Deleção de branches `main-*` em WS-1b: com o hook v2, `git push --delete main-2`
   ja e permitido; manter toda deleção pelo caminho `git push --delete` (nao usar
   `gh api` de bypass).

### 1.2 Atualizar `docs/contratos-roadmap-v1.md` - colunas ASAAS (GATE)
O relatorio sugeriu usar `asaas_payment_url/asaas_boleto_url/asaas_pix_qrcode_url`
por contagem de uso. **Nao inverter o contrato com base em contagem de uso**:
contagem mistura nome de coluna do banco com nome de variavel/campo TypeScript.
A fonte autoritativa para coluna e o DDL da tabela `agreements`.

Procedimento obrigatorio antes de finalizar:
- Listar o que o DDL realmente DEFINE como coluna:
  `grep -rEin 'asaas_[a-z_]*url' scripts/ supabase/migrations/ | grep -Ei 'add column|create table|alter table|asaas_[a-z_]*url[[:space:]]+(text|varchar|character|jsonb)'`
- Listar, separadamente, os nomes usados no codigo (apenas para mapear, nao sao
  colunas): `grep -rEin 'asaas_[a-z_]*url' app/ lib/ services/ | head -60`
- Reportar a conclusao: quais colunas existem de fato na tabela `agreements`.
  Se o DDL definir `asaas_invoice_url/asaas_bank_slip_url/asaas_pix_qr_code_url`,
  o Contrato C usa esses para operacoes de banco, e documenta o mapeamento
  codigo<->coluna (ex.: variavel `asaas_payment_url` no TS <-> coluna
  `asaas_invoice_url`). Se o DDL definir AMBOS os conjuntos como colunas reais,
  documentar os dois e qual e usado em cada fluxo.

### 1.3 Atualizar `docs/contratos-roadmap-v1.md` - estrutura e agentes
- Estrutura real de `alteapay-agents`: `orchestrator/` + `agents/` + `platform/`,
  NAO `services/<nome>/`. Atualizar o Contrato E e a expectativa da WS-2: preservar
  esse layout; "microservico" se expressa por Dockerfile + Deployment por agente,
  nao por rename de pasta.
- Mapeamento de agentes: `dev` = reusar `refactor`; `qa` = `qa-code` + `qa-e2e`
  (ambos no namespace `alteapay-dev-agents`); `project-manager` = criar novo.
- LLM: reafirmar provider `ollama` para todas as classes; o ajuste concreto e em
  `platform/llm/defaults.ts` (e nao deixar `platform/llm/index.ts` exigindo
  `ANTHROPIC_API_KEY`).
- Personas/ataques: ambos os repos tem 13 personas e 29 ataques (identicos);
  `alteapay-agents` e o conjunto canonico; remover qualquer mencao a "9 vs 7" ou
  "27+ vs 29".

### 1.4 Commit dos ajustes
Commitar Parte 1 em `feature/roadmap-v1`:
`docs: ajustes pos-fase 0 (lacunas, colunas ASAAS via DDL, estrutura e mapeamento de agentes)`.

---

## PARTE 2 - Wave 1 (frentes paralelas)

Executar WS-1a, WS-2 e WS-6. Onde duas frentes tocam o mesmo repo, usar git
worktrees distintos e integrar no fim. Nenhuma deleção nesta wave.

### WS-1a - preparar altea-pay (nao destrutivo)
- Confirmar `feature/roadmap-v1` com os commits da Parte 1 e dar push para o
  remote (`git push -u origin feature/roadmap-v1`). Push de feature branch e
  permitido; o hook so barra a main.
- Arquivar as 29 branches remotas abaixo (todas exceto `main` e
  `feature/roadmap-v1`): para cada uma, criar tag `archive/<branch>` no head dela
  e dar push das tags; gerar tambem `backups/altea-pay-branches-<data>.bundle`
  com `git bundle create` contendo todas elas. Verificar que tags e bundle
  existem. NAO apagar nenhuma branch agora.
  Branches a arquivar:
  feature/bullmq-queue-system, feature/docker-migration, feature/email-tracking-filters,
  feature/final-client-portal, feature/final-client-portal-v2, feature/payment-gateway,
  feature/reports-accounting-module, feature/send-email-menu, feature/session-timeout,
  feature/super-admin-improvements-feb9, fix/cancel-negotiation-and-email,
  fix/negociacoes-batch-send-debug, main-2, main-3, main-4, main-branch-update,
  main-main, main2, v0/main-0605df88, v0/suportectpcr-1565-365d1e02-2,
  v0/suportectpcr-1565-4069e465, v0/suportectpcr-1565-4ccd216c,
  v0/suportectpcr-1565-4dcfa0c4, v0/suportectpcr-1565-543cc458,
  v0/suportectpcr-1565-723feb09, v0/suportectpcr-1565-d66e4d82,
  v0/suportectpcr-1565-d96693fb, v0/suportectpcr-1565-ed76225c, v0/updates.

### WS-2 - popular altea-pay-agents (preservando estrutura real)
- Base canonica: `alteapay-agents` (orchestrator/, agents/, platform/, ADRs).
  Conferir conteudo de personas/ataques do `altea-negotiation-agent` antes de
  portar, mas sem reconciliacao numerica (sao identicos).
- Preservar os 3 conjuntos pedidos: negociacao (`agents/negotiation/`), treino
  (`agents/negotiation/trainer/`), treino malicioso (`agents/negotiation/redteam/`).
- Agentes de desenvolvimento: cto-alpha + cto-beta (`orchestrator/`), `refactor`
  (exposto como dev), `qa-code` + `qa-e2e`, `security`, e `project-manager` NOVO
  (consome do bus, abre/prioriza tarefas, status no Postgres da plataforma;
  marcar claramente como novo).
- Microservico no nivel de deploy: Dockerfile por agente (aproveitar
  `Dockerfile.agent` e `agents/negotiation/Dockerfile`) + manifest k8s por agente,
  separando namespaces `alteapay-negotiation` (negociacao/trainer/redteam) e
  `alteapay-dev-agents` (cto-a, cto-b, pm, refactor/dev, qa-code, qa-e2e, security).
- LLM: editar `platform/llm/defaults.ts` para provider `ollama` em todas as
  classes; garantir que sem `ANTHROPIC_API_KEY` os servicos ainda alcancem ready
  (nao 503) nesta fase.
- ASAAS permanece mock no repo de agentes (fechamento real e via app, Contrato C).
- `git init` se preciso, `git remote add origin https://github.com/BeAltea/altea-pay-agents.git`,
  definir branch default `main`, commit inicial estruturado, push (repo novo,
  permitido). Decidir se os guard-rails locais (`.claude/`, `tools/`) entram no
  commit ou no `.gitignore`; se entrarem, ignorar `settings.local.json`.

### WS-6 - diagrama
- `docs/arquitetura-roadmap-v1.mermaid` ja existe; manter coerente com o que for
  implementado. Ajustar o diagrama e anotar se algo divergir.

---

## SYNC POINT 1 - parar e reportar

Apos WS-1a, WS-2 e WS-6, PARAR. Reportar:
- conclusao do GATE 0;
- colunas reais da tabela `agreements` segundo o DDL e o mapeamento codigo<->coluna;
- push de `feature/roadmap-v1` confirmado; tags `archive/*` e bundle criados (sem
  deleção);
- estrutura final commitada em `altea-pay-agents` (arvore de servicos, quais
  Dockerfiles e manifests, namespace de cada agente, PM novo criado);
- itens adicionados a `docs/lacunas-roadmap-v1.md`;
- comandos git executados, com confirmacao de que nenhum mirou a main.

Aguardar revisao humana antes da Wave 2 (WS-3 e WS-4).
