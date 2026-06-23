# Estado Atual do Codebase AlteaPay - Indice

**Data de geracao:** 2026-06-22
**Tipo:** Documentacao fiel ao estado do codigo (somente leitura). Cada afirmacao referencia caminho de arquivo real.

## Repositorios e commits analisados

| Repo | Caminho local | Branch | Ultimo commit | Data |
|------|---------------|--------|---------------|------|
| altea-pay (app producao) | `/Users/seufabio/git/altea-pay` | `main` | `dfeceb2` | 2026-06-03 |
| altea-negotiation-agent (prototipo Python) | `/Users/seufabio/git/altea-negotiation-agent` | `negotiation-agent-prototype` | `8331f36` | 2026-06-11 |
| alteapay-agents (plataforma multi-agente TS) | `/Users/seufabio/git/alteapay-agents` | `main` | `b8868d6` | 2026-06-15 |
| alteapay-refactored (refactor do app) | `/Users/seufabio/git/alteapay-refactored` | `main` | `3ebb8a9` | 2026-06-11 |

> Os 3 repos de agentes sao **locais, sem remote configurado** (existem apenas na maquina do autor). Apenas `altea-pay` tem remote (`https://github.com/BeAltea/alteapay.git`).

## Mapa dos documentos

| Documento | Conteudo |
|-----------|----------|
| `00_INDICE.md` | Este arquivo: visao geral, repos, data, mapa |
| `01_MAPA_BRANCHES.md` | Todas as branches do altea-pay classificadas + estado dos repos irmaos |
| `02_ARQUITETURA.md` | Arquitetura atual (Next.js, Supabase, filas, workers, ECS) + fluxo de cobranca ponta a ponta |
| `03_MODELO_DADOS.md` | Tabelas com nomes exatos de coluna, relacoes, RLS, funcoes RPC |
| `04_ROTAS_API.md` | Todas as rotas de API com proposito e validacao de auth |
| `05_INTEGRACOES.md` | ASAAS, Assertiva, SendGrid, Twilio: clients, fluxos, acoplamento |
| `06_WHATSAPP_API_OFICIAL.md` | Eixo 1: estado do canal WhatsApp, Cloud API, BSP 360dialog, lacunas |
| `07_AGENTES_NEGOCIACAO.md` | Eixo 2: agentes de negociacao (prototipo Python + plataforma TS) |
| `08_AGENTES_TREINAMENTO.md` | Eixo 3: agentes treinador e red-team, personas, ataques, episodios |
| `09_LACUNAS_E_PERGUNTAS_ABERTAS.md` | Consolidado de NAO ENCONTRADO, inconsistencias, decisoes pendentes |

## Achado estrutural mais importante

O codigo dos agentes (LangGraph, FastAPI, Ollama, red-team, personas) **NAO esta no repositorio altea-pay em nenhuma branch** (busca `git grep` em todas as branches retornou zero). Ele vive em 3 repositorios irmaos locais:

- **altea-negotiation-agent**: prototipo Python do agente de negociacao + treinador + red-team. Cobre eixos 2 e 3.
- **alteapay-agents**: plataforma multi-agente em TypeScript (negociacao v4, qa, security, refactor, infra) com orchestrator, bus Redis Streams, k8s. Evolucao/produtizacao dos eixos 2 e 3.
- **alteapay-refactored**: refactor do app Next.js, gerado parcialmente pelos agentes do alteapay-agents; inclui interface WhatsApp em TypeScript.

## Convencoes

- Separacao explicita entre **estado atual no codigo** e **planejado/inferido**.
- Itens nao encontrados ficam em `09_LACUNAS_E_PERGUNTAS_ABERTAS.md`, nunca preenchidos com suposicao.
- Nenhum codigo de aplicacao foi alterado nesta documentacao.
