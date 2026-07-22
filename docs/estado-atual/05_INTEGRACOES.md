# Integracoes Externas - Estado Atual

**Data de geracao:** 2026-06-22
**Base:** altea-pay `main` (dfeceb2).

## 1. ASAAS (gateway de pagamento - fonte da verdade)

- **Wrapper:** `/Users/seufabio/git/altea-pay/lib/asaas.ts`
- **Base URL:** `https://api.asaas.com/v3` (env `ASAAS_API_URL`).
- **Auth:** header `access_token: {ASAAS_API_KEY}`.
- **Modos:** direto (com API key) ou via proxy `/api/asaas` quando key indisponivel.
- **Rate limit:** retry automatico em 429, respeita `Retry-After`, max 3 tentativas (`asaasRequestDirect`).
- **Funcoes principais:** `getAsaasCustomer`, `createAsaasCustomer`, `updateAsaasCustomer`, `getAsaasPayment`, `createAsaasPayment`, `cancelAsaasPayment`, `getAsaasCustomerNotifications`, `updateAsaasNotification`.
- **Campos customer:** name, email, phone, mobilePhone, cpfCnpj, postalCode, address, addressNumber, complement, province, notificationDisabled.
- **Campos payment:** customer, billingType (BOLETO/CREDIT_CARD/PIX/UNDEFINED), value, dueDate, description, externalReference, installmentCount, invoiceUrl, status.
- **Estrategia de notificacao:** email ASAAS **desabilitado** (AlteaPay envia via SendGrid); WhatsApp + SMS habilitados (ver `ASAAS_NOTIFICATION_DEFAULTS` em `lib/queue/config.ts` e `app/actions/send-payment-link.tsx`).
- **Endpoints ASAAS usados (via `asaasRequest` nos workers e wrapper):** `/customers`, `/customers/{id}/notifications`, `/payments`, `/payments/{id}`, `/payments/{id}/viewingInfo`, `/payments/{id}/resendNotification`, `DELETE /payments/{id}`.

- **`/Users/seufabio/git/altea-pay/lib/asaas-integration.ts`:** stub/placeholder (`createAsaasPaymentLink`, `processAsaasWebhook` mockados). Logica real esta em `lib/asaas.ts` + workers.

**Acoplamento:** workers (`lib/queue/workers/asaas-*.worker.ts`), server actions (`send-payment-link.tsx`, `create-agreement-with-asaas.ts`), webhook (`app/api/asaas/webhook/payments`), sync (`app/api/asaas/sync-payments`).

## 2. Assertiva (analise de credito)

- **Service:** `/Users/seufabio/git/altea-pay/services/assertivaService.ts`
- **Base URL:** `https://api.assertivasolucoes.com.br` (env `ASSERTIVA_BASE_URL`).
- **Auth:** OAuth2 client credentials. Endpoint `/oauth2/v3/token`, header `Authorization: Basic base64(client_id:client_secret)` (`ASSERTIVA_CLIENT_ID`, `ASSERTIVA_CLIENT_SECRET`). Token cacheado em memoria, renovado 60s antes de expirar; refresh em 401.
- **Endpoints:**
  - `GET /score/v3/{pf|pj}/{acoes|credito|recupere}/{doc}` - scores simples.
  - `POST /credito/v1/{pf|pj}` - analise comportamental assincrona (retorna idConsulta; resultado via callback `/api/assertiva/callback`).
- **Interpretacao de score:** restritiva score >= 500 -> ACEITA; comportamental score >= 294 -> ACEITA (conforme `app/api/assertiva/callback/route.ts`).
- **Localize:** `/Users/seufabio/git/altea-pay/services/assertivaLocalizeService.ts` (busca email/telefone). Usado por `app/api/super-admin/localize/*` e pelo worker `assertiva-localize.worker.ts`.
- **Orquestracao:** `/Users/seufabio/git/altea-pay/services/creditAnalysisService.ts` (`analyzeFree` consulta APIs publicas: CEIS, CNDT, CNJ; `analyzeDetailed` usa Assertiva; persiste em `credit_profiles`).

## 3. SendGrid (email - canal primario)

- **Cliente direto:** `/Users/seufabio/git/altea-pay/lib/notifications/sendgrid.ts`
- **Fila/abstracao:** `/Users/seufabio/git/altea-pay/lib/notifications/email.ts` (`sendEmail`, `sendBulkEmails`, `getEmailQueueStats`, `generateDebtCollectionEmail`).
- **Endpoint:** `POST https://api.sendgrid.com/v3/mail/send`. Sucesso = HTTP 202; `x-message-id` no header.
- **Auth:** Bearer `SENDGRID_API_KEY`. Remetente `SENDGRID_FROM_EMAIL`/`SENDGRID_SENDER_EMAIL`, `SENDGRID_FROM_NAME`.
- **Funcoes:** `sendEmailViaSendGrid`, `sendBulkEmailViaSendGrid` (ate 1000 destinatarios), `sendIndividualEmailsWithTracking`, `validateSendGridConfig`.
- **Processamento:** worker `lib/queue/workers/email.worker.ts` (concorrencia 5, limiter 100/seg) e `bulk-email.worker.ts`.

## 4. Twilio (SMS / WhatsApp)

- **Cliente:** `/Users/seufabio/git/altea-pay/lib/notifications/sms.tsx`
- **SMS:** `POST https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json`, Basic Auth (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`).
- **WhatsApp:** mesmo endpoint Twilio, campo `To: whatsapp:{phone}`, usa `TWILIO_MESSAGING_SERVICE_SID` se disponivel.
- **Funcoes:** `sendSMS`, `sendWhatsApp`, `generateDebtCollectionSMS`. Validacao de telefone internacional (+55..., min 12 digitos).
- **Importante:** o WhatsApp do altea-pay e via Twilio, **nao** via WhatsApp Cloud API oficial (graph.facebook.com). Ver `06_WHATSAPP_API_OFICIAL.md`.

## 5. ERP (generico)

- `/Users/seufabio/git/altea-pay/services/erpIntegrationService.ts` (e `lib/integrations/erp/erpService.ts` citado): `syncCustomers`, `syncDebts`, `syncResultsToERP`. Disparado por `app/api/cron/sync-erp`.

## 6. Notificacao - estado consolidado

| Canal | Provedor atual | Arquivo |
|-------|----------------|---------|
| Email | SendGrid (fila BullMQ) | `lib/notifications/email.ts` + `sendgrid.ts` |
| SMS | Twilio REST | `lib/notifications/sms.tsx` |
| WhatsApp | Twilio (nao Cloud API) + ASAAS (canal nativo) | `lib/notifications/sms.tsx`, `lib/asaas.ts` |
| Registro interno | tabela `notifications` | `lib/notifications/create-notification.ts` |

Server actions de envio: `app/actions/send-notification.ts` (`sendCollectionNotification` com tipos email/sms/whatsapp), `app/actions/send-payment-link.tsx`, `app/actions/send-customer-notification.tsx`, `app/actions/send-proposal.ts`, `app/actions/send-bulk-negotiations.ts`.

## 7. Variaveis de ambiente relevantes (ver `.env.example`)

ASAAS: `ASAAS_API_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`.
Assertiva: `ASSERTIVA_BASE_URL`, `ASSERTIVA_CLIENT_ID`, `ASSERTIVA_CLIENT_SECRET`, `ASSERTIVA_CALLBACK_URL`.
SendGrid: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`.
Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_PHONE_NUMBER`.
Redis: `REDIS_URL`. App: `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`. Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
