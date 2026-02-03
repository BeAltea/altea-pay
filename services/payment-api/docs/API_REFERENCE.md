# Payment API - API Reference

## Types

### BillingType

```typescript
type BillingType = "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED"
```

### PaymentStatus

```typescript
type PaymentStatus = "pending" | "confirmed" | "received" | "overdue" | "refunded" | "cancelled" | "deleted"
```

### WebhookEventType

```typescript
type WebhookEventType =
  | "PAYMENT_CREATED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_DELETED"
```

## Interfaces

### PaymentProvider

The core abstraction for payment providers. All providers must implement this interface.

| Method | Signature | Description |
|--------|-----------|-------------|
| `createCustomer` | `(params: CreateCustomerParams) => Promise<ProviderCustomer>` | Create a customer record in the provider |
| `getCustomerByCpfCnpj` | `(cpfCnpj: string) => Promise<ProviderCustomer \| null>` | Look up a customer by CPF/CNPJ |
| `createPayment` | `(params: CreatePaymentParams) => Promise<ProviderPayment>` | Create a payment/charge |
| `getPayment` | `(paymentId: string) => Promise<ProviderPayment>` | Get payment by provider ID |
| `getPaymentByExternalReference` | `(ref: string) => Promise<ProviderPayment \| null>` | Get payment by external reference |
| `refundPayment` | `(params: RefundParams) => Promise<ProviderPayment>` | Refund a payment |
| `cancelPayment` | `(paymentId: string) => Promise<void>` | Cancel a payment |
| `parseWebhook` | `(body: unknown) => WebhookPayload` | Parse webhook payload into unified format |

### CreateCustomerParams

```typescript
interface CreateCustomerParams {
  name: string
  cpfCnpj: string
  email?: string
  phone?: string
  mobilePhone?: string
  postalCode?: string
  address?: string
  addressNumber?: string
}
```

### CreatePaymentParams

```typescript
interface CreatePaymentParams {
  customer: string         // Provider customer ID
  billingType: BillingType
  value: number
  dueDate: string          // ISO date string (YYYY-MM-DD)
  description?: string
  externalReference?: string
  installmentCount?: number
  installmentValue?: number
}
```

### RefundParams

```typescript
interface RefundParams {
  paymentId: string
  value?: number           // Partial refund amount (omit for full refund)
  description?: string
}
```

### ProviderCustomer

```typescript
interface ProviderCustomer {
  id: string
  name: string
  email?: string
  phone?: string
  mobilePhone?: string
  cpfCnpj: string
}
```

### ProviderPayment

```typescript
interface ProviderPayment {
  id: string
  customerId: string
  billingType: BillingType
  value: number
  dueDate: string
  description?: string
  externalReference?: string
  installmentCount?: number
  installmentValue?: number
  status: PaymentStatus
  paymentUrl?: string
  boletoUrl?: string
  pixQrCodeUrl?: string
  transactionReceiptUrl?: string
}
```

### WebhookPayload

```typescript
interface WebhookPayload {
  event: WebhookEventType
  payment: {
    id: string
    customer: string
    value: number
    status: string
    externalReference?: string
    subscription?: string
    description?: string
  }
}
```

### TransactionRepository

Optional repository for logging payment transactions.

```typescript
interface TransactionRepository {
  log(entry: TransactionLog): Promise<void>
  getByProvider(provider: string): Promise<TransactionLog[]>
  getByCompanyId(companyId: string): Promise<TransactionLog[]>
}
```

## Services

### PaymentService

Wraps a `PaymentProvider` with transaction logging and company context.

```typescript
const service = new PaymentService(provider, repository?)
```

| Property/Method | Description |
|----------------|-------------|
| `activeProvider` | Returns the name of the active provider |
| `createCustomer(params, companyId?)` | Create customer with logging |
| `getCustomerByCpfCnpj(cpfCnpj, companyId?)` | Look up customer with logging |
| `createPayment(params, companyId?)` | Create payment with logging |
| `getPayment(paymentId, companyId?)` | Get payment with logging |
| `getPaymentByExternalReference(ref, companyId?)` | Get payment by reference with logging |
| `refundPayment(params, companyId?)` | Refund payment with logging |
| `cancelPayment(paymentId, companyId?)` | Cancel payment with logging |
| `parseWebhook(body)` | Parse webhook (no logging) |

### WebhookService

Processes webhook payloads and derives agreement status updates.

```typescript
const webhookService = new WebhookService(provider)
```

| Method | Description |
|--------|-------------|
| `parseWebhook(body)` | Delegates to provider's parseWebhook |
| `deriveStatusUpdate(event, currentPaymentStatus, currentAgreementStatus)` | Returns an `AgreementUpdate` object |

#### AgreementUpdate

```typescript
interface AgreementUpdate {
  payment_status: string
  status: string
  payment_received_at?: string
  updated_at: string
}
```

#### Event to Status Mapping

| Event | payment_status | agreement status |
|-------|---------------|-----------------|
| `PAYMENT_CREATED` | `pending` | unchanged |
| `PAYMENT_CONFIRMED` | `confirmed` | unchanged |
| `PAYMENT_RECEIVED` | `received` | `paid` |
| `PAYMENT_OVERDUE` | `overdue` | unchanged |
| `PAYMENT_REFUNDED` | `refunded` | `cancelled` |
| `PAYMENT_DELETED` | unchanged | `cancelled` |

## Factory

### createPaymentProvider

```typescript
function createPaymentProvider(config: PaymentApiConfig): PaymentProvider
```

Creates and caches a provider instance based on the config. Supported providers:

- `asaas` — Wraps the Asaas payment API via `AsaasAdapter`
- `custom` — In-memory test gateway via `CustomGateway` (test mode only)

### resetProviderCache

```typescript
function resetProviderCache(): void
```

Clears the cached provider instance. Useful in tests.

## Errors

| Error Class | Code | Description |
|-------------|------|-------------|
| `PaymentError` | `PAYMENT_ERROR` | Base error class |
| `ProviderUnavailableError` | `PROVIDER_UNAVAILABLE` | Provider connection failure |
| `PaymentNotFoundError` | `PAYMENT_NOT_FOUND` | Payment ID does not exist |
| `CustomGatewayProductionBlockedError` | `CUSTOM_GATEWAY_PRODUCTION_BLOCKED` | Custom gateway used with `mode=production` |

## Security Utilities

### Encryption

```typescript
encrypt(plaintext: string, keyHex: string): string    // AES-256-GCM, returns base64
decrypt(encryptedBase64: string, keyHex: string): string
```

Key must be 32 bytes (64 hex characters). Each encryption uses a random 12-byte IV.

### PCI Helpers

```typescript
maskCardNumber(cardNumber: string): string     // "4111111111111111" → "************1111"
maskDocument(document: string): string         // "12345678901" → "123******01"
sanitizeForLog(data: Record<string, unknown>): Record<string, unknown>
```

`sanitizeForLog` recursively redacts sensitive fields: `cardNumber`, `card_number`, `cvv`, `cvc`, `securityCode`, `security_code`, `password`, `secret`, `token`, `access_token`, `apiKey`, `api_key`. Document fields (`cpfCnpj`, `cpf_cnpj`, `document`) are masked.

### RateLimiter

```typescript
const limiter = new RateLimiter(maxRequests = 100, windowMs = 60000)

limiter.isAllowed(key: string): boolean   // Check and record request
limiter.remaining(key: string): number    // Remaining requests in window
limiter.reset(key: string): void          // Clear limits for key
```

Sliding window rate limiter, keyed by company ID (or any string).

## Configuration

### PaymentApiConfig

```typescript
interface PaymentApiConfig {
  provider: "asaas" | "custom"
  customGatewayMode: "test" | "production"
  asaas: { apiKey: string | undefined; apiUrl: string }
  db: { host: string; port: number; database: string; user: string; password: string }
  redis: { host: string; port: number; password: string | undefined }
  security: {
    encryptionKey: string | undefined
    rateLimitMaxRequests: number
    rateLimitWindowMs: number
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PAYMENT_PROVIDER` | `asaas` | Active provider |
| `CUSTOM_GATEWAY_MODE` | `test` | Custom gateway mode |
| `ASAAS_API_KEY` | - | Asaas API key |
| `ASAAS_API_URL` | `https://api.asaas.com/v3` | Asaas API URL |
| `PAYMENT_DB_HOST` | `localhost` | PostgreSQL host |
| `PAYMENT_DB_PORT` | `5433` | PostgreSQL port |
| `PAYMENT_DB_NAME` | `payment_api` | PostgreSQL database |
| `PAYMENT_DB_USER` | `payment_api` | PostgreSQL user |
| `PAYMENT_DB_PASSWORD` | `payment_api_secret` | PostgreSQL password |
| `PAYMENT_REDIS_HOST` | `localhost` | Redis host |
| `PAYMENT_REDIS_PORT` | `6379` | Redis port |
| `PAYMENT_REDIS_PASSWORD` | - | Redis password |
| `PAYMENT_ENCRYPTION_KEY` | - | AES-256 key (hex) |
| `PAYMENT_RATE_LIMIT_MAX` | `100` | Rate limit max requests |
| `PAYMENT_RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
