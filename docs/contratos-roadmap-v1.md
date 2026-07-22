# Contratos compartilhados - roadmap-v1

Fonte unica de interfaces para as frentes paralelas. Todo workstream consome
estes contratos. Atualizado para rodar **somente em Ollama local** nesta fase
(sem Anthropic key para os agentes).

---

## Contrato A - API do negotiation-agent (HTTP)

Endpoints que a app chama no servico `negotiation-agent` (namespace
`alteapay-negotiation`). Base atual do prototipo (`app/server.py`) mais o
endpoint novo de abertura de sessao.

- `POST /chat`
  - body: `{ "thread_id": str, "message": str, "source": "live"|"trainer"|"redteam", "company_id": str }`
  - resp: `{ "reply": str, "state": { "verified": bool, "outcome": str } }`
- `POST /session/start` (novo, para inbound WhatsApp)
  - body: `{ "company_id": str, "wa_from": str, "wa_message_id": str }`
  - resp: `{ "thread_id": str }`
- `GET /health` -> 200 quando o processo esta vivo.
- `GET /readyz` -> 200 somente quando o LLM provider esta acessivel (ver secao
  de LLM). Em Ollama, checar `OLLAMA_BASE_URL`.

Gates do agente preservados: identity gate (so `verify_identity` verifica),
rules gate (offer_id apenas de `list_offers`), validator anti-alucinacao
(R$/% apenas vindos de tools).

---

## Contrato B - inbound WhatsApp -> app -> agente (payload de fila)

Schema do job que a rota de webhook enfileira e o worker consome para repassar
ao agente. Nome de fila a confirmar na Fase 0 (padrao `alteapay-*`).

```json
{
  "wa_message_id": "string",
  "from": "5511999999999",
  "text": "string",
  "company_id": "derivado server-side, nunca do payload",
  "received_at": "ISO-8601",
  "thread_id": "string"
}
```

Regras: `company_id` derivado server-side (nunca confiar no payload externo);
`from` normalizado para E.164 sem `+`; matching de telefone/CPF sempre
digits-only.

---

## Contrato C - fechamento de acordo (agente -> app)

O agente **nao** cria cobranca ASAAS diretamente. Ao fechar acordo, ele chama a
app, que enfileira em `alteapay-asaas-charge-create`. Regra negociacao-primeiro:
a cobranca so e gerada apos o acordo, nunca na abertura da conversa.

- Endpoint da app (a definir/confirmar na Fase 0): recebe
  `{ company_id, thread_id, debt_id, offer_id, channel }`, valida, e dispara a
  fila reusando `app/actions/create-agreement-with-asaas.ts` / o worker
  `asaas-charge-create.worker.ts`.
- Substituir no agente o link mock `https://sandbox.asaas.com/c/{debt_id}-{offer_id}-mock`
  por esta chamada real.
- Escritas no banco pela app seguem o Contrato D (service-role, `.select()`
  encadeado, etc.).

### Colunas ASAAS reais em `agreements` (autoritativo via DDL)

Verificado no DDL (`scripts/024`, `scripts/025`, `scripts/1001`), **não** por
contagem de uso. Colunas que existem de fato na tabela `agreements`:

| Coluna real (`TEXT`)   | Campo da API ASAAS        | Definida em      |
| ---------------------- | ------------------------- | ---------------- |
| `asaas_invoice_url`    | `invoiceUrl`              | `scripts/1001`   |
| `asaas_payment_url`    | checkout / `paymentLink`  | `scripts/024/025`|
| `asaas_boleto_url`     | `bankSlipUrl`             | `scripts/024/025`|
| `asaas_pix_qrcode_url` | `pixQrCodeUrl`            | `scripts/024/025`|

**Não são colunas** (nunca definidas em DDL; não usar): `asaas_bank_slip_url`,
`asaas_pix_qr_code_url`. Há gravação nessas duas em
`lib/queue/workers/asaas-charge-create.worker.ts:115-116` — bug latente,
registrado em `docs/lacunas-roadmap-v1.md` (item 1) para correção em WS-3/WS-5.
Mapeamento correto: `bankSlipUrl→asaas_boleto_url`,
`pixQrCodeUrl→asaas_pix_qrcode_url`.

---

## Contrato D - abstracao de banco de dados

Env `DATABASE_TARGET` in { `supabase`, `local-postgres`, `aurora`, `cloudsql` }.
Uma camada unica resolve conexao e credenciais.

- `supabase` (default de producao): mantem Auth/RLS/Storage atuais.
- `local-postgres` (deploy local desta fase): conecta no Postgres do cluster.
- `aurora` / `cloudsql`: adapters esqueleto para Azure/GCP, sem ativar.

Regras Supabase preservadas no codigo (nao-negociaveis):
- escritas sempre via service-role (`supabaseAdmin` / `createAdminClient`);
- sempre encadear `.select()` apos `.update()` e `.insert()` (detectar zero rows);
- `.range(0, 99999)` para passar do cap de 1000 linhas;
- `company_id` / `id_company` derivado server-side, nunca do cliente;
- tabela `VMAX`: isolamento por `id_company`, coluna `"CPF/CNPJ"` entre aspas;
- CPF/CNPJ: normalizar para digits-only antes de comparar.

Schema do Postgres local: aplicar em ordem `scripts/*.sql` +
`supabase/migrations/*.sql`. **Decisao a documentar em `docs/db-local-strategy.md`:**
a app usa Auth/RLS/Storage do Supabase; em `local-postgres` ou se sobe o stack
self-hosted do Supabase localmente, ou se usa Postgres puro com shim de auth.

---

## Contrato E - convencao Kubernetes

- Namespaces: `alteapay-app`, `alteapay-negotiation`, `alteapay-dev-agents`.
- Labels: `app.kubernetes.io/part-of: alteapay`, mais `app.kubernetes.io/name`
  por servico.
- `imagePullPolicy: IfNotPresent` (OrbStack usa as imagens Docker locais; sem
  registry). Imagens ARM64.
- Comunicacao cross-namespace via FQDN do service:
  `negotiation-agent.alteapay-negotiation.svc.cluster.local`.

### Estrutura real de `alteapay-agents` (preservar — NÃO renomear para `services/`)

O repo canônico já é monorepo com layout `orchestrator/` + `agents/` +
`platform/`. "Microserviço" se expressa por **Dockerfile + Deployment por
agente**, não por mover pastas para `services/<nome>/`. Layout preservado:

```
altea-pay-agents/
  orchestrator/      # cto-alpha.ts, cto-beta.ts, decision-log.ts, pipelines.ts
  agents/
    negotiation/     # app/ (FastAPI+LangGraph), trainer/, redteam/ — PRODUÇÃO
    refactor/        # exposto como "dev" no deploy
    qa-code/         # parte de "qa"
    qa-e2e/          # parte de "qa"
    security/
    project-manager/ # NOVO (criado na WS-2)
  platform/          # bus/ (Redis Streams), tasks/ (Postgres), llm/, telemetry/
  deploy/k8s/        # manifests por serviço (namespaces neg e dev)
  docker/            # Dockerfile por serviço (+ Dockerfile.agent existente)
```

### Mapeamento de agentes (alvo ↔ real)

| Alvo do prompt    | Implementação real                          | Namespace             |
| ----------------- | ------------------------------------------- | --------------------- |
| negociação        | `agents/negotiation/app`                    | `alteapay-negotiation`|
| treino            | `agents/negotiation/trainer`                | `alteapay-negotiation`|
| treino malicioso  | `agents/negotiation/redteam`                | `alteapay-negotiation`|
| cto-alpha         | `orchestrator/cto-alpha.ts`                 | `alteapay-dev-agents` |
| cto-beta          | `orchestrator/cto-beta.ts`                  | `alteapay-dev-agents` |
| dev               | `agents/refactor` (reuso)                   | `alteapay-dev-agents` |
| qa                | `agents/qa-code` + `agents/qa-e2e`          | `alteapay-dev-agents` |
| project-manager   | **NOVO** `agents/project-manager`           | `alteapay-dev-agents` |
| (extra) security  | `agents/security`                           | `alteapay-dev-agents` |

### Personas e ataques (canônico)

Ambos os repos (`alteapay-agents` e `altea-negotiation-agent`) têm **13 personas**
e **29 ataques**, idênticos. `alteapay-agents` é o conjunto canônico. Não há
reconciliação numérica a fazer (a menção a "9 vs 7" / "27+ vs 29" no prompt mestre
está desatualizada e foi corrigida em WS-2).

---

## LLM provider local (Ollama) - fase atual

Decisao desta fase: **todas as classes de agente rodam em Ollama local**, sem
Anthropic key. Isso sobrepoe o default anthropic dos agentes de engenharia
(ADR-0013): ajustar o provider de engenharia para `ollama` em
`platform/llm/defaults.ts` (ou via env), nao deixar anthropic como default.
Concretamente: o default de classe de engenharia em `platform/llm/defaults.ts`
passa a `ollama`, e `platform/llm/index.ts` nao deve derrubar o servico (503 em
`/readyz`) por ausencia de `ANTHROPIC_API_KEY` nesta fase — com provider `ollama`
resolvido, o `AnthropicProvider` (que lanca erro sem a chave) nao e instanciado.

### Restricao de RAM (critica)
O MacBook tem 16GB e o `qwen2.5:14b` ocupa ~10GB carregado. Principio firme do
projeto: **um unico modelo carregado por vez, compartilhado por todos os
agentes, que rodam em sequencia.** Implicacoes para o deploy:
- Rodar **uma** instancia de Ollama, nao uma por agente.
- Recomendado: Ollama no **host** (Mac, GPU Metal), e os pods apontam para ele.
  Ollama dentro do cluster no OrbStack roda CPU-only (sem Metal), bem mais lento.
- Os pods dos agentes existem em paralelo, mas as chamadas ao modelo sao
  serializadas pelo Ollama. Manter concorrencia baixa (1 a 2 requisicoes em voo)
  para nao estourar RAM nem enfileirar demais.
- Nunca ter o uvicorn local de ontem e o Ollama servindo o modelo ao mesmo tempo
  com outro carregamento concorrente.

### Service de Ollama no cluster (apontando para o host)
No namespace `alteapay-negotiation`, criar um Service `ollama` tipo
`ExternalName` apontando para o host (`host.orb.internal`), reutilizado tambem
pelo `alteapay-dev-agents` via FQDN. Assim ha um unico carregamento de modelo,
na GPU do Mac.

### Variaveis de ambiente (app dos agentes / ConfigMap)
```
LLM_PROVIDER=ollama
OFFLINE_LOCK=engaged
OLLAMA_BASE_URL=http://ollama.alteapay-negotiation.svc.cluster.local:11434
AGENT_MODEL=qwen2.5:14b
NEGOTIATION_MODEL=qwen2.5:14b
ENGINEERING_MODEL=qwen2.5:14b
OLLAMA_CONTEXT_LENGTH=8192
OLLAMA_KEEP_ALIVE=12h
ANTHROPIC_API_KEY=
```
`ANTHROPIC_API_KEY` vazio de proposito para os agentes: garante que nenhum
servico de agente fale com a Anthropic nesta fase (espelha o `offline_lock:
engaged` / `anthropic_credential: absent` dos runs anteriores).

### ConfigMap de exemplo
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: agents-llm
  labels:
    app.kubernetes.io/part-of: alteapay
data:
  LLM_PROVIDER: "ollama"
  OFFLINE_LOCK: "engaged"
  OLLAMA_BASE_URL: "http://ollama.alteapay-negotiation.svc.cluster.local:11434"
  AGENT_MODEL: "qwen2.5:14b"
  NEGOTIATION_MODEL: "qwen2.5:14b"
  ENGINEERING_MODEL: "qwen2.5:14b"
  OLLAMA_CONTEXT_LENGTH: "8192"
  OLLAMA_KEEP_ALIVE: "12h"
```

### Nota sobre qualidade
Os agentes de engenharia (cto, pm, qa, dev) em `qwen2.5:14b` local terao
qualidade bem inferior a um modelo de fronteira; nesta fase o objetivo e
funcional (subir e orquestrar), nao desempenho de producao. Quando houver
budget, trocar a classe de engenharia de volta para anthropic via env e o
`offline_lock` desligado.
