# Lacunas e Perguntas Abertas

**Data de geracao:** 2026-06-22
**Base:** 4 repos (altea-pay dfeceb2, altea-negotiation-agent 8331f36, alteapay-agents b8868d6, alteapay-refactored 3ebb8a9).

Consolida tudo que ficou marcado como `NAO ENCONTRADO`, inconsistencias entre fontes e decisoes pendentes.

## 1. NAO ENCONTRADO neste(s) repositorio(s)

| Item | Onde se buscou | Situacao |
|------|----------------|----------|
| Codigo de agentes (LangGraph/FastAPI/Ollama/red-team/persona) no altea-pay | todas as branches do altea-pay (`git grep`) | NAO ENCONTRADO - vive nos repos irmaos |
| Cliente da WhatsApp Cloud API oficial (graph.facebook.com) | 4 repos | NAO ENCONTRADO (usa-se Twilio ou BSP 360dialog placeholder) |
| Webhook receiver real do WhatsApp (rota com hub.challenge + processamento inbound) | 4 repos | NAO ENCONTRADO (so verify_token/parser preparados) |
| Templates de mensagem WhatsApp aprovados pela Meta (HSM) | 4 repos | NAO ENCONTRADO |
| Credenciais reais de WhatsApp (API key, phone_number_id/WABA) | 4 repos | NAO ENCONTRADO (placeholders) |
| CREATE TABLE base da VMAX | scripts/migrations do altea-pay | NAO ENCONTRADO (scripts so adicionam colunas/RLS; tabela importada/externa) |
| Fechamento ASAAS real nos agentes | repos de agentes | NAO ENCONTRADO (mock `...-mock` / `asaas_mock.py`) |

## 2. Inconsistencias entre documentacao antiga (CLAUDE.md) e o codigo

| Tema | CLAUDE.md dizia | Codigo real | Arquivo de verdade |
|------|-----------------|-------------|--------------------|
| Colunas ASAAS em `agreements` | `asaas_payment_url`, `asaas_boleto_url`, `asaas_pix_qrcode_url` | `asaas_invoice_url`, `asaas_bank_slip_url`, `asaas_pix_qr_code_url` | `scripts/1001_create_asaas_webhook_events.sql` + workers |
| Tabela `payments` | referencia `agreement_id`, tem `due_date`/`status` | referencia `debt_id`, tem `payment_date`/`payment_method`/`transaction_id` | `scripts/001_create_database_schema.sql` |
| `credit_profiles.source` | so 'assertiva' | CHECK aceita 'gov' e 'assertiva' | `scripts/032_create_credit_analysis_tables.sql` |
| Numero de filas BullMQ | 7 filas | 10 filas (inclui assertiva-localize, bulk-email, bulk-negotiations) | `lib/queue/config.ts` |
| Arquitetura Fargate | "ARM64 (Graviton)" em uma secao, "X86_64" em outra | divergencia interna do proprio CLAUDE.md | confirmar no task-definition / Dockerfile.workers |
| `risk_level` da VMAX | 'LOW','MEDIUM','HIGH','VERY_HIGH' | CHECK do script: 'LOW','MEDIUM','HIGH' | `scripts/992_add_approval_status_to_vmax.sql` |

> Recomendacao: tratar o codigo (scripts SQL + lib/queue/config.ts) como fonte da verdade e atualizar o CLAUDE.md.

## 3. Inconsistencias entre os repos de agentes

| Tema | altea-negotiation-agent (prototipo) | alteapay-agents (plataforma) |
|------|-------------------------------------|------------------------------|
| Personas do trainer | 9 | 7 |
| Ataques do red-team | 27+ | 29 |
| Prompt do negociador | v1 | v1..v4 (v4 atual) |
| LLM negociacao | qwen2.5:14b | qwen2.5:7b (default), anthropic em prod |
| Persistencia | SQLite | Postgres + MinIO |
| Modos de cumprimento (A/B/C) | nao tem | `app/fulfillment.py` |
| WhatsApp | abstracao Python | abstracao Python + config |
| Orchestrator / bus / governanca CTO | nao tem | tem |

Pergunta: qual repo e a base oficial para evoluir? (a plataforma parece a evolucao - commit mais recente 2026-06-15 e mais completa.)

## 4. Decisoes pendentes por eixo

### Eixo 1 - WhatsApp Cloud API
- Cloud API direta da Meta vs BSP 360dialog (codigo aponta para 360dialog placeholder).
- Consolidar Twilio (altea-pay, transacional) vs 360dialog (agentes, conversacional).
- Implementar webhook receiver inbound + templates HSM + credenciais reais.
- Definir como o inbound WhatsApp chega ao agente e como o agente fecha cobranca real.

### Eixo 2 - Agentes de negociacao
- Escolher base oficial (prototipo vs plataforma).
- Substituir mock ASAAS por integracao real (funcoes de `lib/asaas.ts` / filas do altea-pay).
- Definir persistencia de producao (Postgres da plataforma vs Supabase do altea-pay).
- Definir provider LLM de producao (Ollama self-hosted vs Anthropic) e custo.

### Eixo 3 - Agentes de treinamento
- Reconciliar conjuntos de personas/ataques entre os dois repos.
- Definir pipeline de fine-tuning (LoRA) e politica de anonimizacao do golden set.
- Garantir Ollama disponivel para rodar treino end-to-end.

## 5. Questoes de arquitetura/produto que precisam de resposta humana

1. O runtime de producao continua Netlify + Fargate (altea-pay) ou migra para Kubernetes (alteapay-refactored)? O refactor ja foi aprovado em main do alteapay-refactored mas nao e o deploy atual.
2. Como os 4 repos se relacionam no futuro: altea-pay continua o app principal e os agentes ficam como servico externo, ou tudo converge para alteapay-refactored + alteapay-agents?
3. Os agentes vao acessar os dados reais via Supabase do altea-pay (com RLS) ou via Postgres proprio + migracao (ferramenta de migration em alteapay-agents)?
4. Qual o caminho de fechamento de acordo a partir do agente: chamar server actions do altea-pay, enfileirar no BullMQ existente, ou novo servico?
5. Versionamento do prompt e governanca (CTO-Alpha/Beta) - sera adotado no fluxo de producao ou e so do ambiente de agentes?

## 6. Itens a confirmar (nao bloqueantes)

- Caminho exato de `POST /api/super-admin/backfill-due-dates` (citado no CLAUDE.md, nao confirmado no diretorio durante esta varredura).
- Conteudo detalhado de `supabase/migrations/20260304_localize_rpc_functions.sql` (funcoes RPC de localizacao nao foram abertas linha a linha).
- Arquitetura efetiva do Fargate (ARM64 vs X86_64) - resolver divergencia interna do CLAUDE.md consultando o task-definition real.
