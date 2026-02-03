# Payment API - Provider Guide

## Switching Providers

### Using Asaas (Default)

```env
PAYMENT_PROVIDER=asaas
ASAAS_API_KEY=your_key_here
```

This is the default behavior. The routing action delegates to the existing `createAgreementWithAsaas` server action, which remains completely unchanged.

### Using Custom Gateway (Test Mode)

```env
PAYMENT_PROVIDER=custom
CUSTOM_GATEWAY_MODE=test
```

The custom gateway simulates payment processing in-memory. All IDs are prefixed with `test_` to distinguish them from real payments. This is useful for development and testing without needing Asaas API credentials.

## Adding a New Provider

To add a new payment provider (e.g., Stripe, PagSeguro):

### 1. Create the adapter

Create a new directory under `src/providers/`:

```
src/providers/stripe/
├── stripe-adapter.ts       # Implements PaymentProvider
└── stripe-status-mapper.ts # Maps provider-specific statuses
```

### 2. Implement the `PaymentProvider` interface

```typescript
import type { PaymentProvider, ... } from "../../interfaces/payment-provider"

export class StripeAdapter implements PaymentProvider {
  readonly name = "stripe"

  async createCustomer(params: CreateCustomerParams): Promise<ProviderCustomer> {
    // Your implementation
  }

  async getCustomerByCpfCnpj(cpfCnpj: string): Promise<ProviderCustomer | null> {
    // Your implementation
  }

  async createPayment(params: CreatePaymentParams): Promise<ProviderPayment> {
    // Your implementation
  }

  // ... implement all interface methods
}
```

### 3. Register in the factory

Update `src/factory/payment-provider-factory.ts`:

```typescript
case "stripe":
  provider = new StripeAdapter(config)
  break
```

### 4. Update the config

Add any provider-specific config to `src/config/index.ts` and `.env.example`.

### 5. Add the routing option

Update `app/actions/create-agreement.ts` to handle the new provider value, or rely on the generic `createAgreementWithPayment` action which already uses the `PaymentService` abstraction.

### 6. Create a webhook route (if needed)

Add a new webhook endpoint at `app/api/webhooks/<provider>/route.ts` or reuse the generic `/api/webhooks/payment` route.

## Interface Reference

The `PaymentProvider` interface defines these methods:

| Method | Description |
|--------|-------------|
| `createCustomer(params)` | Create a customer in the provider |
| `getCustomerByCpfCnpj(cpfCnpj)` | Look up customer by CPF/CNPJ |
| `createPayment(params)` | Create a payment/charge |
| `getPayment(paymentId)` | Get payment by provider ID |
| `getPaymentByExternalReference(ref)` | Get payment by external reference |
| `refundPayment(params)` | Refund a payment |
| `cancelPayment(paymentId)` | Cancel a payment |
| `parseWebhook(body)` | Parse webhook payload into unified format |

All methods return unified types (`ProviderCustomer`, `ProviderPayment`, `WebhookPayload`) regardless of the underlying provider.
