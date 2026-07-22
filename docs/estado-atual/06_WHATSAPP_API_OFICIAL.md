# Eixo 1 - WhatsApp API Oficial (Cloud API)

**Data de geracao:** 2026-06-22
**Base:** busca em 4 repos (altea-pay dfeceb2, altea-negotiation-agent 8331f36, alteapay-agents b8868d6, alteapay-refactored 3ebb8a9).

## Estado atual no codigo

### Resumo por repo

| Repo | WhatsApp presente | Canal | Cloud API direta (graph.facebook.com) | Webhook receiver real |
|------|-------------------|-------|----------------------------------------|------------------------|
| altea-pay | Sim | Twilio (`whatsapp:` prefix) | NAO | NAO |
| altea-negotiation-agent | Sim (abstracao) | 360dialog BSP (placeholder) | NAO | Preparado, nao real |
| alteapay-agents | Sim (abstracao) | 360dialog BSP (placeholder) | NAO | Preparado, nao real |
| alteapay-refactored | Sim (abstracao TS) | 360dialog BSP (placeholder) | NAO | Preparado, nao real |

### altea-pay (producao)
- WhatsApp e enviado via **Twilio**: `/Users/seufabio/git/altea-pay/lib/notifications/sms.tsx`, funcao `sendWhatsApp(to, body)` chama `https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json` com `To: whatsapp:{phone}`.
- Disparo via `/Users/seufabio/git/altea-pay/app/actions/send-notification.ts` (`type: "whatsapp"`).
- ASAAS tambem envia WhatsApp como canal nativo (notificacoes da cobranca), config em `ASAAS_NOTIFICATION_DEFAULTS` (`lib/queue/config.ts`).
- **Nao ha** chamada a `graph.facebook.com`, nem `phone_number_id`, `messaging_product`, `verify_token` ou `hub.challenge` em codigo proprio.

### altea-negotiation-agent (prototipo Python)
- `/Users/seufabio/git/altea-negotiation-agent/app/whatsapp.py`:
  - Classe abstrata `WhatsAppProvider` com `verify_webhook(token)`.
  - `MockWhatsAppProvider` (outbox em memoria).
  - `Dialog360Provider` (BSP 360dialog) construido com placeholders: `WHATSAPP_API_URL`, `WHATSAPP_API_KEY`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WEBHOOK_TOKEN`; lanca erro se placeholder.
  - `parse_inbound(payload)` aceita formato simples `{from,text}` E envelope estilo Meta Cloud `entry[].changes[].value.messages[]`.

### alteapay-agents (plataforma TS, agente em Python)
- `/Users/seufabio/git/alteapay-agents/agents/negotiation/app/whatsapp.py` (equivalente ao acima).
- Config em `/Users/seufabio/git/alteapay-agents/agents/negotiation/app/config.py`: `whatsapp_bsp_provider` (mock | 360dialog), `whatsapp_api_url`, `whatsapp_api_key`, `whatsapp_phone_number_id`, `whatsapp_webhook_token`.
- README do agente: switch env-only `WHATSAPP_BSP_PROVIDER=360dialog`; nao chama Cloud API diretamente.

### alteapay-refactored (TypeScript)
- `/Users/seufabio/git/alteapay-refactored/lib/notifications/whatsapp/` (gerado pela branch `agent/refactor-limited-f173ee4e`, autor `alteapay-agent`):
  - `index.ts` (factory mock | 360dialog), `types.ts`, `mock-provider.ts`, `dialog360-provider.ts`, `README.md`.
  - `dialog360-provider.ts`: `fetch(${baseUrl}/messages)` com header `D360-API-KEY` e body `{ messaging_product: "whatsapp", to, type:"text", text:{body} }`. Credenciais sao placeholders (`PLACEHOLDER_360DIALOG_KEY` etc.); `assertConfigured()` falha sem credencial real.
  - Webhook: `verifyWebhookToken(token)` contra `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
  - Env: `WHATSAPP_BSP_PROVIDER`, `WHATSAPP_BSP_API_KEY`, `WHATSAPP_BSP_BASE_URL`, `WHATSAPP_BUSINESS_PHONE_ID`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.

## O que ja esta pronto

- **Abstracao de provider** (interface mock <-> 360dialog) em 3 repos (Python x2, TS x1), permitindo trocar de canal por env sem mudar codigo.
- **Reconhecimento do envelope da Cloud API** (`messaging_product: "whatsapp"`, `entry[].changes[].value.messages[]`) ja codificado no parser de inbound e no provider 360dialog.
- **Hook de verificacao de webhook** (`verify_webhook` / `verifyWebhookToken`) presente, validando contra token de ambiente.
- **WhatsApp transacional em producao** ja funciona via Twilio no altea-pay (envio de cobranca) e via ASAAS (notificacao nativa).

## Lacunas e pontos de decisao para o futuro

1. **Nenhum cliente chama a WhatsApp Cloud API oficial diretamente** (graph.facebook.com). A arquitetura escolhida foi **BSP 360dialog** como intermediario. Decidir: Cloud API direta da Meta vs BSP (360dialog) - os dois eixos de codigo apontam para 360dialog, mas as credenciais sao placeholder.
2. **Webhook receiver real nao existe** em nenhum repo (so verificacao de token + parser). Para negociacao ativa por WhatsApp e preciso uma rota HTTP que: responda ao GET de verificacao (`hub.challenge`) e processe POSTs de mensagens inbound, encaminhando ao agente.
3. **Templates de mensagem (HSM/message templates)** aprovados pela Meta: `NAO ENCONTRADO` em nenhum repo. Necessarios para iniciar conversa fora da janela de 24h.
4. **Credenciais reais** (`WHATSAPP_API_KEY`/`WHATSAPP_BSP_API_KEY`, `phone_number_id`/WABA, verify token) sao placeholders em todos os repos.
5. **Dois caminhos de WhatsApp coexistem hoje:** Twilio (altea-pay, transacional) e 360dialog (agentes, conversacional). Decidir consolidacao.
6. **Integracao agente -> WhatsApp -> ASAAS:** o agente de negociacao usa link de pagamento mock; nao ha ainda o fluxo inbound WhatsApp -> agente -> criacao de cobranca real. Ver `07_AGENTES_NEGOCIACAO.md`.

> Tudo nesta secao de lacunas e estado verificado (placeholder/ausente), nao suposicao. Itens marcados `NAO ENCONTRADO` consolidados em `09_LACUNAS_E_PERGUNTAS_ABERTAS.md`.
