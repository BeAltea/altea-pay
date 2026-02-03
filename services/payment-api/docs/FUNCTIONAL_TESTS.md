# Payment API - Functional Test Plan

This document provides step-by-step instructions for manually testing all payment functionality through the Altea Pay user interface. It is designed for QA testers and business users who need to validate the system end-to-end.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Test Environment Setup](#2-test-environment-setup)
3. [Test Scenarios](#3-test-scenarios)
   - [TC-01: Create Agreement with Single Payment (No Discount)](#tc-01-create-agreement-with-single-payment-no-discount)
   - [TC-02: Create Agreement with Discount](#tc-02-create-agreement-with-discount)
   - [TC-03: Create Agreement with Installments](#tc-03-create-agreement-with-installments)
   - [TC-04: Send Payment Link via Email](#tc-04-send-payment-link-via-email)
   - [TC-05: Send Payment Link via WhatsApp](#tc-05-send-payment-link-via-whatsapp)
   - [TC-06: Payment Received (Webhook Confirmation)](#tc-06-payment-received-webhook-confirmation)
   - [TC-07: Payment Overdue (Webhook)](#tc-07-payment-overdue-webhook)
   - [TC-08: Payment Refund (Webhook)](#tc-08-payment-refund-webhook)
   - [TC-09: Discount Boundary Values](#tc-09-discount-boundary-values)
   - [TC-10: Due Date Validation](#tc-10-due-date-validation)
   - [TC-11: Provider Switching (Asaas to Custom Gateway)](#tc-11-provider-switching-asaas-to-custom-gateway)
   - [TC-12: Custom Gateway Test Mode Verification](#tc-12-custom-gateway-test-mode-verification)
   - [TC-13: Unauthenticated User Attempt](#tc-13-unauthenticated-user-attempt)
   - [TC-14: Customer Without Contact Information](#tc-14-customer-without-contact-information)
   - [TC-15: Duplicate Agreement for Same Customer](#tc-15-duplicate-agreement-for-same-customer)
4. [Troubleshooting](#4-troubleshooting)
5. [Test Data Appendix](#5-test-data-appendix)

---

## 1. Prerequisites

Before starting, ensure you have the following:

### Access Requirements

| Item | Details |
|------|---------|
| Test environment URL | The staging/development URL for Altea Pay (e.g., `http://localhost:3000` or the Vercel preview URL) |
| User account | A valid login with a company assigned to your profile |
| Database access | Access to Supabase dashboard or `psql` to verify records (optional but helpful) |

### Environment Configuration

Check which payment provider is active. This determines how payments are processed:

| Provider | Environment Variable | What It Does |
|----------|---------------------|--------------|
| **Asaas** (default) | `PAYMENT_PROVIDER=asaas` | Connects to the real Asaas sandbox/production API |
| **Custom Gateway** | `PAYMENT_PROVIDER=custom` | Uses an in-memory test gateway — no real charges |

> **Important**: When testing with the **Custom Gateway**, all payment IDs will start with `test_` (e.g., `test_pay_abc12345`). No real money is charged.

### Test Data Requirements

You need at least one customer record in the VMAX table with the following fields populated:

- `Cliente` (customer name)
- `CPF/CNPJ` (customer document)
- `Vencido` (overdue amount, e.g., "R$ 1.500,00")
- `Email` (optional, needed for email notification tests)
- `Telefone` (optional, needed for WhatsApp/SMS tests)

See the [Test Data Appendix](#5-test-data-appendix) for sample values.

---

## 2. Test Environment Setup

### For Custom Gateway Testing (Recommended for First-Time Testing)

This mode requires no external API keys and is safe for development:

1. Open the `.env` or `.env.local` file in the project root
2. Set the following variables:
   ```
   PAYMENT_PROVIDER=custom
   CUSTOM_GATEWAY_MODE=test
   ```
3. Restart the application (`pnpm dev` or redeploy)
4. Verify: When you create an agreement, the payment IDs in the database should start with `test_`

### For Asaas Sandbox Testing

1. Create a sandbox account at [https://sandbox.asaas.com](https://sandbox.asaas.com)
2. Generate a sandbox API key
3. Set the following variables:
   ```
   PAYMENT_PROVIDER=asaas
   ASAAS_API_KEY=<your_sandbox_api_key>
   ASAAS_API_URL=https://sandbox.asaas.com/api/v3
   ```
4. Restart the application

---

## 3. Test Scenarios

### TC-01: Create Agreement with Single Payment (No Discount)

**Objective**: Verify that a basic negotiation agreement can be created with a single payment and no discount applied.

**Preconditions**: Logged in as a user with a company. At least one customer exists in the system with an overdue debt.

#### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to the customer list page (`/dashboard/clientes`) | The customer list loads. You can see customer names and debt information |
| 2 | Click on a customer with an overdue debt to open their details | The customer detail page opens |
| 3 | Click the button to start a negotiation | The negotiation form ("Proposta de Negociacao") opens |
| 4 | Verify the **"Dados do Cliente"** card at the top | Customer name, CPF/CNPJ, debt amount, and days overdue are displayed correctly. These fields are read-only (grayed out) |
| 5 | Leave the **"Desconto (%)"** field at `0` | The "Desconto em R$" shows `R$ 0,00`. The "Valor Final" matches the original debt amount |
| 6 | Set **"Numero de Parcelas"** to `1x` | The "Valor da Parcela" matches the full final amount |
| 7 | Verify the **"Data de Vencimento"** field | It defaults to 7 days from today. The minimum selectable date is today |
| 8 | Leave **"Atendente Responsavel"** empty | This is optional |
| 9 | Review the **"Resumo da Proposta"** card at the bottom | It shows: customer name, original amount, discount R$ 0,00 (0%), full amount to pay, 1x installment, and the due date |
| 10 | Click **"Salvar e Enviar para Cliente"** | The button shows "Salvando..." while processing. After a few seconds, a green toast notification appears: "Proposta criada com sucesso!" |
| 11 | The **"Enviar Proposta para o Cliente"** dialog opens automatically | The dialog shows the customer name, and three sending options: E-mail, WhatsApp, and SMS |

**Pass Criteria**: Agreement is created successfully. Toast message appears. Send dialog opens.

**Verification (optional)**: Check the `agreements` table in Supabase:
- `status` = `active`
- `payment_status` = `pending`
- `agreed_amount` = original debt amount
- `discount_percentage` = `0`
- `installments` = `1`
- `provider_payment_id` is populated (starts with `test_pay_` if using Custom Gateway)

---

### TC-02: Create Agreement with Discount

**Objective**: Verify that discount calculations work correctly and are saved to the agreement.

**Preconditions**: Same as TC-01.

#### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open the negotiation form for a customer with a debt of R$ 1,000.00 | Form loads with debt amount displayed |
| 2 | Enter `25` in the **"Desconto (%)"** field | - "Desconto em R$" updates to `R$ 250,00` |
|    |                                              | - "Valor Final" updates to `R$ 750,00` (green text) |
| 3 | Change discount to `50` | - "Desconto em R$" updates to `R$ 500,00` |
|    |                         | - "Valor Final" updates to `R$ 500,00` |
| 4 | Change discount to `0.5` (half percent) | - Values update proportionally (R$ 5,00 discount, R$ 995,00 final) |
| 5 | Verify the **"Resumo da Proposta"** reflects the current discount | Summary shows the discount amount, percentage, and updated final value |
| 6 | Click **"Salvar e Enviar para Cliente"** | Agreement is created with the discounted amount |

**Pass Criteria**: All calculations are accurate. The agreement record has the correct `discount_percentage`, `discount_amount`, and `agreed_amount`.

---

### TC-03: Create Agreement with Installments

**Objective**: Verify installment calculations and that payment is correctly split.

**Preconditions**: Same as TC-01.

#### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open the negotiation form for a customer | Form loads |
| 2 | Set **"Desconto (%)"** to `10` on a R$ 1,200.00 debt | Final amount = R$ 1,080.00 |
| 3 | Select **"Numero de Parcelas"** = `3x` | "Valor da Parcela" updates to `R$ 360,00` |
| 4 | Change to `6x` | "Valor da Parcela" updates to `R$ 180,00` |
| 5 | Change to `12x` | "Valor da Parcela" updates to `R$ 90,00` |
| 6 | Set a due date for the first installment | Date is accepted |
| 7 | Verify the **"Resumo da Proposta"** | Shows: "12x de R$ 90,00", correct due date |
| 8 | Click **"Salvar e Enviar para Cliente"** | Agreement created successfully |

**Pass Criteria**: Installment value = agreed amount / number of installments. Agreement record has correct `installments` and `installment_amount`.

**Available installment options**: 1x, 2x, 3x, 4x, 5x, 6x, 9x, 12x, 18x, 24x

---

### TC-04: Send Payment Link via Email

**Objective**: Verify that the payment link can be sent to the customer by email.

**Preconditions**: An agreement has just been created (the send dialog is open), and the customer has an email address.

#### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In the **"Enviar Proposta"** dialog, verify customer contact info is loaded | The email address appears under the "E-mail" option. If loading, the text "Carregando informacoes de contato..." appears briefly |
| 2 | Select the **"E-mail"** option (should be selected by default) | The E-mail radio button is highlighted with a blue border |
| 3 | Click **"Enviar Proposta"** | Button shows "Enviando..." while processing. A green toast appears: "Proposta enviada com sucesso via E-mail!" |
| 4 | The dialog closes automatically | You are redirected to `/dashboard/clientes` |

**Pass Criteria**: Toast notification confirms successful send. No error messages.

**Note**: In test/sandbox environments, emails may not actually arrive. Verify the notification was created in the `notifications` table.

---

### TC-05: Send Payment Link via WhatsApp

**Objective**: Verify that the payment link can be sent via WhatsApp.

**Preconditions**: Same as TC-04, but the customer needs a phone number.

#### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In the **"Enviar Proposta"** dialog, select the **"WhatsApp"** option | The WhatsApp radio button is highlighted. The phone number appears below the label |
| 2 | Click **"Enviar Proposta"** | Button shows "Enviando...". A green toast appears: "Proposta enviada com sucesso via WhatsApp!" |
| 3 | The dialog closes | You are redirected to the customer list |

**Pass Criteria**: No errors. Toast notification confirms success.

---

### TC-06: Payment Received (Webhook Confirmation)

**Objective**: Verify that when a payment is confirmed by the provider, the agreement status updates correctly.

**Preconditions**: An agreement exists with `status = active` and `payment_status = pending`.

#### Steps (Custom Gateway)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find the agreement's `provider_payment_id` in the database (e.g., `test_pay_abc12345`) | Note the payment ID |
| 2 | Send a POST request to `/api/webhooks/payment` with this payload: | |
| | ```json | |
| | { | |
| |   "event": "PAYMENT_RECEIVED", | |
| |   "payment": { | |
| |     "id": "test_pay_abc12345", | |
| |     "customer": "test_cus_xyz", | |
| |     "value": 750.00, | |
| |     "status": "received", | |
| |     "externalReference": "agreement_<vmaxId>" | |
| |   } | |
| | } | |
| | ``` | |
| 3 | Check the API response | Returns `{ "success": true }` with status 200 |
| 4 | Check the agreement in the database | - `payment_status` = `received` |
|    |                                       | - `status` = `paid` |
|    |                                       | - `payment_received_at` is set to the current timestamp |
| 5 | Check the associated debt | `status` = `paid` |
| 6 | Check the notifications table | A notification with `type = payment` and title "Pagamento Confirmado" was created for the customer |

**Pass Criteria**: Agreement transitions to `paid`, debt is marked as `paid`, customer notification is created.

#### How to Send the Webhook (using curl)

```bash
curl -X POST http://localhost:3000/api/webhooks/payment \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_RECEIVED",
    "payment": {
      "id": "test_pay_abc12345",
      "customer": "test_cus_xyz",
      "value": 750.00,
      "status": "received"
    }
  }'
```

---

### TC-07: Payment Overdue (Webhook)

**Objective**: Verify that an overdue webhook updates the payment status without changing the agreement status.

**Preconditions**: An agreement exists with `status = active` and `payment_status = pending`.

#### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send a `PAYMENT_OVERDUE` webhook (same format as TC-06, change `"event"` to `"PAYMENT_OVERDUE"` and `"status"` to `"overdue"`) | Returns `{ "success": true }` |
| 2 | Check the agreement in the database | - `payment_status` = `overdue` |
|    |                                       | - `status` remains `active` (unchanged) |
| 3 | Verify no payment confirmation notification was created | Only the original agreement notification exists |

**Pass Criteria**: Payment status changes to `overdue`. Agreement status stays `active`.

---

### TC-08: Payment Refund (Webhook)

**Objective**: Verify that a refund webhook cancels the agreement.

**Preconditions**: An agreement exists with `status = paid` and `payment_status = received`.

#### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send a `PAYMENT_REFUNDED` webhook (change `"event"` to `"PAYMENT_REFUNDED"` and `"status"` to `"refunded"`) | Returns `{ "success": true }` |
| 2 | Check the agreement in the database | - `payment_status` = `refunded` |
|    |                                       | - `status` = `cancelled` |

**Pass Criteria**: Both payment status and agreement status update correctly.

---

### TC-09: Discount Boundary Values

**Objective**: Verify the discount field handles edge cases properly.

**Preconditions**: Negotiation form is open.

#### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter `0` in the discount field | Final amount equals the original debt amount |
| 2 | Enter `100` in the discount field | Final amount = R$ 0,00. Installment value = R$ 0,00 |
| 3 | Enter `99.9` in the discount field | Final amount is 0.1% of the original amount |
| 4 | Enter `0.1` in the discount field | Final amount is 99.9% of the original amount |
| 5 | Clear the discount field (empty) | The form should handle this gracefully (no NaN or errors in the calculated fields) |
| 6 | Enter a negative number (e.g., `-5`) | The HTML `min="0"` attribute should prevent this, or the field should clamp to 0 |
| 7 | Enter a number greater than 100 (e.g., `150`) | The HTML `max="100"` attribute should prevent this, or the field should clamp to 100 |

**Pass Criteria**: No NaN values, no broken calculations, no negative final amounts.

---

### TC-10: Due Date Validation

**Objective**: Verify the due date field enforces valid dates.

**Preconditions**: Negotiation form is open.

#### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Check the default due date | Set to 7 days from today |
| 2 | Try to select a past date | The date picker should not allow dates before today (the `min` attribute is set to today's date) |
| 3 | Select today's date | Accepted |
| 4 | Select a date 30 days in the future | Accepted |
| 5 | Clear the date field and try to submit | The form should not submit (the field has `required` attribute) |

**Pass Criteria**: Past dates are blocked. Empty dates prevent form submission.

---

### TC-11: Provider Switching (Asaas to Custom Gateway)

**Objective**: Verify that the application correctly routes to the appropriate payment provider based on environment configuration.

**Preconditions**: Access to environment variables.

#### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set `PAYMENT_PROVIDER=asaas` and `ASAAS_API_KEY=<sandbox_key>`. Restart the app | Application starts normally |
| 2 | Create an agreement | The agreement record has: |
|    |                      | - `asaas_payment_id` populated (starts with `pay_`) |
|    |                      | - Payment URLs point to `asaas.com` domain |
| 3 | Set `PAYMENT_PROVIDER=custom` and `CUSTOM_GATEWAY_MODE=test`. Restart the app | Application starts normally (no Asaas API key required) |
| 4 | Create another agreement | The agreement record has: |
|    |                          | - `provider_payment_id` populated (starts with `test_pay_`) |
|    |                          | - `payment_provider` = `custom` |
|    |                          | - Payment URLs point to `test-gateway.local` domain |

**Pass Criteria**: Each provider creates agreements with its own ID format and URL domain. Switching does not break existing agreements.

---

### TC-12: Custom Gateway Test Mode Verification

**Objective**: Verify that the Custom Gateway only works in test mode and is blocked in production mode.

**Preconditions**: Access to environment variables.

#### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set `PAYMENT_PROVIDER=custom` and `CUSTOM_GATEWAY_MODE=test` | Application works normally. Agreements can be created |
| 2 | Set `CUSTOM_GATEWAY_MODE=production` and restart | The application should throw a `CustomGatewayProductionBlockedError` when trying to create an agreement. The error message reads: "Custom gateway cannot be used in production mode. Set CUSTOM_GATEWAY_MODE=test or use a different provider." |
| 3 | Set `CUSTOM_GATEWAY_MODE=test` again and restart | Application works normally again |

**Pass Criteria**: Production mode is blocked. Test mode works. Error message is clear.

---

### TC-13: Unauthenticated User Attempt

**Objective**: Verify that unauthenticated users cannot create agreements.

#### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log out of the application | You are redirected to the login page |
| 2 | Try to navigate directly to a negotiation form URL | You are redirected to the login page, or an error "Nao autenticado" is displayed |

**Pass Criteria**: No agreement is created. User is redirected or shown an authentication error.

---

### TC-14: Customer Without Contact Information

**Objective**: Verify the send proposal dialog handles missing contact information gracefully.

**Preconditions**: Create an agreement for a customer that has no email and no phone number in the system.

#### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create an agreement for the customer without contact info | Agreement is created successfully (contact info is not required for agreement creation) |
| 2 | The send dialog opens | Under each channel option: |
|    |                       | - E-mail shows: "Nenhum e-mail cadastrado" |
|    |                       | - WhatsApp shows: "Nenhum telefone cadastrado" |
|    |                       | - SMS shows: "Nenhum telefone cadastrado" |
| 3 | Try to send via E-mail | The send may fail or succeed depending on backend validation. Verify the behavior is graceful (error toast, not a crash) |
| 4 | Close the dialog using "Cancelar" | Dialog closes. You are redirected to the customer list |

**Pass Criteria**: No crashes or unhandled errors. Missing contact info is clearly indicated.

---

### TC-15: Duplicate Agreement for Same Customer

**Objective**: Verify behavior when creating multiple agreements for the same customer/debt.

**Preconditions**: An agreement already exists for a customer.

#### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to the same customer and open the negotiation form again | Form opens with the same customer data |
| 2 | Fill in different terms (e.g., different discount, different installments) | Form accepts the values |
| 3 | Click **"Salvar e Enviar para Cliente"** | A new agreement is created |
| 4 | Check the database | - The existing customer record is reused (not duplicated) |
|    |                    | - The existing debt record is reused (not duplicated) |
|    |                    | - A new agreement record is created with its own `provider_payment_id` |
|    |                    | - The provider customer is reused (looked up by CPF/CNPJ) |

**Pass Criteria**: Customer and debt are not duplicated. A new agreement with a new payment is created.

---

## 4. Troubleshooting

### Common Issues

| Issue | Possible Cause | Resolution |
|-------|---------------|------------|
| "Nao autenticado" error when submitting | Your session has expired | Log out and log back in |
| "Empresa nao encontrada" error | Your user profile does not have a `company_id` assigned | Check the `profiles` table in Supabase and ensure your user has a company |
| "Registro nao encontrado" error | The VMAX record ID does not exist | Verify the customer has a valid VMAX record in the database |
| Agreement created but no payment URLs | Provider returned null URLs | Check the payment provider configuration. For Asaas, verify the API key is valid. For Custom Gateway, verify `CUSTOM_GATEWAY_MODE=test` |
| Toast shows "Erro ao criar proposta" | Server-side error during agreement creation | Check the browser console (F12) and server logs for the specific error message |
| Webhook returns 404 ("Agreement not found") | The payment ID in the webhook does not match any agreement | Verify the `provider_payment_id` in the webhook payload matches an existing agreement. Check all three lookup strategies: payment ID, external reference, and customer ID + amount |
| Webhook returns 400 ("Invalid payload") | Webhook payload is missing `payment.id` | Ensure the webhook JSON has the correct structure with `event` and `payment.id` fields |
| "Custom gateway cannot be used in production mode" | `CUSTOM_GATEWAY_MODE` is set to `production` | Change to `CUSTOM_GATEWAY_MODE=test` or switch to `PAYMENT_PROVIDER=asaas` |
| Send dialog shows "Carregando informacoes de contato..." indefinitely | Network error or Supabase query timeout | Refresh the page and try again. Check browser console for errors |
| Discount field shows NaN | Empty or invalid value in the discount field | Enter a valid number (0-100) in the discount field |

### Checking Server Logs

All payment-related log messages are prefixed with `[payment-api]`. Look for these patterns:

```
[payment-api] Received webhook: ...         → Webhook was received
[payment-api] Processing event: ...         → Webhook is being processed
[payment-api] Found agreement: ... via: ... → Agreement was located (shows lookup method)
[payment-api] Agreement updated: ...        → Agreement was updated successfully
[payment-api] Error processing webhook: ... → Something went wrong
```

### Verifying Database Records

Useful queries to run in Supabase SQL editor or psql:

```sql
-- Check recent agreements
SELECT id, status, payment_status, payment_provider, provider_payment_id,
       agreed_amount, installments, created_at
FROM agreements
ORDER BY created_at DESC
LIMIT 10;

-- Check if customer was duplicated
SELECT id, name, document, company_id, created_at
FROM customers
WHERE document = '12345678901';

-- Check notifications
SELECT id, type, title, description, created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;
```

---

## 5. Test Data Appendix

### Sample Customer Data (for VMAX table)

| Field | Value 1 | Value 2 | Value 3 |
|-------|---------|---------|---------|
| Cliente | Maria Silva Santos | João Pedro Oliveira | Empresa ABC Ltda |
| CPF/CNPJ | 123.456.789-01 | 987.654.321-00 | 12.345.678/0001-99 |
| Vencido | R$ 1.500,00 | R$ 350,50 | R$ 25.000,00 |
| Email | maria@email.com | joao@email.com | contato@abc.com.br |
| Telefone | 11999998888 | 21988887777 | 1133334444 |
| Dias em atraso | 45 | 120 | 30 |

### Discount Test Values

| Discount (%) | Original Amount | Expected Discount (R$) | Expected Final (R$) |
|--------------|----------------|----------------------|---------------------|
| 0 | R$ 1.000,00 | R$ 0,00 | R$ 1.000,00 |
| 10 | R$ 1.000,00 | R$ 100,00 | R$ 900,00 |
| 25 | R$ 1.000,00 | R$ 250,00 | R$ 750,00 |
| 33.3 | R$ 1.000,00 | R$ 333,00 | R$ 667,00 |
| 50 | R$ 1.000,00 | R$ 500,00 | R$ 500,00 |
| 75 | R$ 1.000,00 | R$ 750,00 | R$ 250,00 |
| 100 | R$ 1.000,00 | R$ 1.000,00 | R$ 0,00 |

### Installment Test Values

| Final Amount | Installments | Expected Installment Value |
|-------------|-------------|---------------------------|
| R$ 1.200,00 | 1x | R$ 1.200,00 |
| R$ 1.200,00 | 2x | R$ 600,00 |
| R$ 1.200,00 | 3x | R$ 400,00 |
| R$ 1.200,00 | 4x | R$ 300,00 |
| R$ 1.200,00 | 6x | R$ 200,00 |
| R$ 1.200,00 | 12x | R$ 100,00 |
| R$ 1.200,00 | 24x | R$ 50,00 |
| R$ 1.000,00 | 3x | R$ 333,33 |

### Webhook Payloads for Testing

**Payment Received**
```json
{
  "event": "PAYMENT_RECEIVED",
  "payment": {
    "id": "<provider_payment_id>",
    "customer": "<provider_customer_id>",
    "value": 750.00,
    "status": "received",
    "externalReference": "agreement_<vmaxId>"
  }
}
```

**Payment Overdue**
```json
{
  "event": "PAYMENT_OVERDUE",
  "payment": {
    "id": "<provider_payment_id>",
    "customer": "<provider_customer_id>",
    "value": 750.00,
    "status": "overdue"
  }
}
```

**Payment Refunded**
```json
{
  "event": "PAYMENT_REFUNDED",
  "payment": {
    "id": "<provider_payment_id>",
    "customer": "<provider_customer_id>",
    "value": 750.00,
    "status": "refunded"
  }
}
```

**Payment Confirmed**
```json
{
  "event": "PAYMENT_CONFIRMED",
  "payment": {
    "id": "<provider_payment_id>",
    "customer": "<provider_customer_id>",
    "value": 750.00,
    "status": "confirmed"
  }
}
```

**Payment Deleted (Cancellation)**
```json
{
  "event": "PAYMENT_DELETED",
  "payment": {
    "id": "<provider_payment_id>",
    "customer": "<provider_customer_id>",
    "value": 750.00,
    "status": "deleted"
  }
}
```

> **Note**: Replace `<provider_payment_id>`, `<provider_customer_id>`, and `<vmaxId>` with actual values from the agreement you created during testing.

### Test Results Tracking Template

| Test Case | Date | Tester | Provider | Result | Notes |
|-----------|------|--------|----------|--------|-------|
| TC-01 | | | | Pass / Fail | |
| TC-02 | | | | Pass / Fail | |
| TC-03 | | | | Pass / Fail | |
| TC-04 | | | | Pass / Fail | |
| TC-05 | | | | Pass / Fail | |
| TC-06 | | | | Pass / Fail | |
| TC-07 | | | | Pass / Fail | |
| TC-08 | | | | Pass / Fail | |
| TC-09 | | | | Pass / Fail | |
| TC-10 | | | | Pass / Fail | |
| TC-11 | | | | Pass / Fail | |
| TC-12 | | | | Pass / Fail | |
| TC-13 | | | | Pass / Fail | |
| TC-14 | | | | Pass / Fail | |
| TC-15 | | | | Pass / Fail | |
