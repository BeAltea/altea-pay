# Eixo 2 - Agentes de Negociacao

**Data de geracao:** 2026-06-22
**Base:** altea-negotiation-agent `negotiation-agent-prototype` (8331f36); alteapay-agents `main` (b8868d6).

> O codigo do agente de negociacao **NAO esta no altea-pay**. Existem duas implementacoes paralelas nos repos irmaos: um prototipo Python (altea-negotiation-agent) e a versao na plataforma multi-agente (alteapay-agents). Ambas usam LangGraph.

## A. Prototipo Python - altea-negotiation-agent

### Estado atual no codigo

**Stack:** LangGraph >=0.2.50, langchain-ollama, FastAPI, pydantic, pytest (`requirements.txt`).

**Arquivos core (`app/`):**
- `app/graph.py` - state machine LangGraph + binding ChatOllama.
- `app/server.py` - FastAPI (endpoints abaixo).
- `app/tools.py` - 7 ferramentas + gates estruturais.
- `app/data.py` - dados mock (2 clientes: Maria Silva, Joao Pereira).
- `app/store.py` - SQLite (transcripts, eventos, funnel).
- `app/rules.py` - engine de politicas (desconto por aging, parcelamento).
- `app/validator.py` - anti-alucinacao (R$/% so vindos de tools).
- `app/prompts/negotiator_v1.md` - system prompt versionado (PT-BR).

**Grafo (`app/graph.py`):**
```
START -> chat (LLM + tools) -> [tool_calls?] -> tools -> chat -> validate -> [retry?] -> chat | END
```
- Nos: `chat` (ChatOllama + SystemMessage + historico), `tools` (ToolNode), `validate` (anti-alucinacao deterministica).
- Checkpointer: `MemorySaver` (plano: Postgres/Redis).
- Retry do validator: max 1; 2a falha -> SAFE_FALLBACK.

**LLM:** ChatOllama, modelo `qwen2.5:14b` (env `AGENT_MODEL`, `OLLAMA_BASE_URL=http://localhost:11434`), temperatura 0 para o negociador. `.bind_tools(TOOLS)`. Ollama nao instalado na maquina (sistema roda sem LLM real, segundo `docs/AGENT_OVERVIEW.md`).

**7 ferramentas (`app/tools.py`):**
1. `verify_identity(cpf, birth_date)` - unico setter de `state["verified"]=True` (identity gate).
2. `get_debt_summary()` - bloqueia se nao verificado.
3. `list_offers()` - calcula ofertas via `rules.py`, guarda offer_ids em `state["available_offers"]`.
4. `propose_offer(offer_id)` - so aceita offer_id do set permitido (LLM nao inventa %).
5. `create_payment_link(offer_id)` - link **mock** `https://sandbox.asaas.com/c/{debt_id}-{offer_id}-mock`; valida regras.
6. `request_handoff(reason)` - escala para humano.
7. `deflect_out_of_scope(topic)` - redireciona assuntos fora do escopo.

**Gates estruturais:** identity gate (so verify_identity verifica), rules gate (offer_id apenas de list_offers), validator (R$/% devem estar em `tool_facts`).

**Endpoints FastAPI (`app/server.py`):** `GET /` (widget), `POST /chat` ({thread_id, message, source?} -> {reply}), `GET /health`, `GET /metrics` + `/metrics.json`, `GET /training`, `GET /security`, `GET /conversations` + `/conversations/{thread_id}`.

**Politicas (`config/charge_rules.yaml`):** moeda BRL, metodos pix/boleto/credit_card, parcelamento (max 12, min R$50, PIX sem parcelamento), descontos por faixa de aging (0-89d: 5%; 90-180d: 15%; 181-365d: 25%; 366d+: 35%), lista de proibidos. Carregado por `app/rules.py` (`load_rules(company_id="default")`, estrutura multi-tenant).

**Persistencia (`app/store.py`):** SQLite `data/conversations.db` (gitignored, PII). Tabelas `conversations` (thread_id, cpf, customer_name, verified, outcome, source, prompt_version, timestamps), `messages`, `conversation_events`. Funnel monotonico: in_progress -> identity_failed -> verified -> offer_proposed -> payment_link_sent. `source` distingue 'live' | 'trainer' | 'redteam'.

**Integracao ASAAS:** **mock** (`app/tools.py`). Comentario no README aponta substituir por chamada real a `create-agreement-with-asaas.ts` / fila de cobranca em producao.

### O que ja esta pronto
- Grafo compila, tools executam, 3 gates funcionam, logging + funnel corretos (segundo `docs/AGENT_OVERVIEW.md`).
- Prompt versionado, multi-tenant em YAML, testes em `tests/` (test_rules, test_validator, test_tools, test_evaluator, test_security_evaluator).
- Widget web (`static/index.html`) + pagina de metricas.

### Lacunas (prototipo)
- Ollama nao instalado: nao roda end-to-end com LLM real.
- Dados mock (2 clientes); sem conexao Supabase.
- Link ASAAS mock; sem fechamento real.
- Sem canal WhatsApp real (ver `06`).

## B. Plataforma multi-agente - alteapay-agents

### Estado atual no codigo

**Agente:** `/Users/seufabio/git/alteapay-agents/agents/negotiation/` (Python LangGraph), parte de uma plataforma TS maior.

**Arquivos adicionais em relacao ao prototipo:**
- `app/llm.py` - abstracao de provider (ollama | anthropic | mock).
- `app/fulfillment.py` - modos de cumprimento A/B/C por tenant (`config/fulfillment.yaml`).
- `app/whatsapp.py` - provider WhatsApp (mock | 360dialog).
- `app/checkpoint.py` - persistencia de state (Postgres | InMemory).
- `app/worker.py` - consumer de Redis Streams (integra com o bus da plataforma).
- `app/config.py`, `app/asaas_mock.py`.
- Prompts `app/prompts/negotiator_v1.md` ... `negotiator_v4.md`.

**Prompts (versoes):**
- v1 baseline; v2 reforco anti-negativacao (INJ-02 -> SEC3); v3 canais de cumprimento (A/B/C); **v4 (atual)** adesao a redirect-tool (obrigatorio chamar `redirect_to_official_channel` em modo B/C; proibido inventar URL/placeholder). Selecao via env `NEGOTIATOR_PROMPT_VERSION`.
- Ultimo commit `b8868d6`: "v4 refinement ... campaign path 4/4 wrong_channel=0, redirect tool called every episode".

**Modos de cumprimento (`app/fulfillment.py`):**
- Modo A: AlteaPay emite cobranca (`create_payment_link` permitido).
- Modo B: cobranca bloqueada, redireciona a canal oficial do credor.
- Modo C: contestacao/casos especiais, redireciona a atendimento.
- Resolucao de tenant: env `NEGOTIATION_TENANT` > `customer.company_id` > "default".

**LLM (politica por classe, ADR-0013 `/docs/adr/0013-per-class-llm-provider-policy.md`):**
- Negociacao: default `ollama` modelo `qwen2.5:7b` (env-switchable para anthropic).
- Engenharia (refactor/qa/security/infra/CTO): default `anthropic` modelo `claude-fable-5`, **sem fallback** (chave ausente -> `/readyz` 503).
- Mock para testes. Defaults em `/Users/seufabio/git/alteapay-agents/platform/llm/defaults.ts`.

**ASAAS:** mock (`app/asaas_mock.py`); charge so apos agreement (guard estrutural). ADR-0014 trata reconciliacao da negociacao.

**Orquestracao e plataforma:**
- `orchestrator/cto-alpha.ts` (propoe/decompoe pipelines) + `orchestrator/cto-beta.ts` (valida; nunca auto-aprova). `orchestrator/pipelines.ts`, `orchestrator/decision-log.ts` (logs em `logs/decisions/`).
- `platform/bus/` - Redis Streams (consumer groups, at-least-once). ADR-0001.
- `platform/tasks/` - Postgres (tabelas tasks, decisions, human_reviews, agent_health, llm_usage, negotiation_conversations, negotiation_messages). `schema.sql`.
- `platform/telemetry/` - Pino + OpenTelemetry.
- `platform/agent-runtime.ts` - guard `assertNotInSource()` (repo original montado readOnly).
- CLI `triggers/alteactl.ts` (`run negotiation`, `run negotiation-train`, `status`, `review`, etc.).
- `knowledge/` - mapa do codebase, 56 invariants de dominio, `negotiation-asis.md`, baseline de equivalencia.

### O que ja esta pronto
- Agente de negociacao v4 com redirect-tool compliance validado (4/4 wrong_channel=0).
- Abstracao de LLM provider (ollama local <-> anthropic prod) por env.
- Checkpoint Postgres, worker via bus, multi-tenant per-request (`/chat` aceita company_id).
- Governanca CTO-Alpha/Beta + human review; migration com triple-gate (ver `08`).
- Verificacao documentada em `/Users/seufabio/git/alteapay-agents/VERIFICATION.md` (run 2026-06-11): simulador gera agreement + charge ASAAS mock so apos agreement.

### Lacunas (plataforma)
- ASAAS ainda mock; sem fechamento real em producao.
- WhatsApp 360dialog placeholder (ver `06`).
- Multi-tenant E2E pulado (precisa staging Supabase) - `VERIFICATION.md`.
- Duas bases de codigo do agente (prototipo Python vs plataforma) - decidir qual e a oficial. Ver `09`.

## C. Decisao de futuro (consolidado)

- Escolher base oficial: prototipo `altea-negotiation-agent` (mais simples) vs `alteapay-agents` (com orchestrator, bus, fulfillment, v4). A plataforma parece a evolucao (commit mais recente, 06-15).
- Definir integracao real com ASAAS no fechamento (substituir mocks pelas funcoes de `lib/asaas.ts` / filas do altea-pay).
- Definir persistencia de producao (Postgres da plataforma vs Supabase do altea-pay).
