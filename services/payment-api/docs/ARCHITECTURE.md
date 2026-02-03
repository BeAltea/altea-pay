# Payment API - Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Next.js App                       │
│                                                     │
│  ┌─────────────────┐    ┌────────────────────────┐  │
│  │ negotiation-form │───▶│ create-agreement.ts    │  │
│  │ (client)         │    │ (routing action)       │  │
│  └─────────────────┘    └───────┬────────────────┘  │
│                                 │                    │
│                    ┌────────────┼───────────┐        │
│                    ▼                       ▼        │
│  ┌──────────────────────┐  ┌──────────────────────┐ │
│  │ create-agreement-    │  │ create-agreement-    │ │
│  │ with-asaas.ts        │  │ with-payment.ts      │ │
│  │ (unchanged)          │  │ (provider-agnostic)  │ │
│  └──────────┬───────────┘  └──────────┬───────────┘ │
│             │                         │              │
│             ▼                         ▼              │
│  ┌──────────────────┐    ┌──────────────────────┐   │
│  │ lib/asaas.ts      │    │ PaymentService       │   │
│  │ (direct, unchanged)│   │ (from payment-api)   │   │
│  └──────────────────┘    └──────────┬───────────┘   │
│                                     │                │
└─────────────────────────────────────┼────────────────┘
                                      │
                    ┌─────────────────┼──────────────────┐
                    │         PaymentProvider             │
                    │         (interface)                 │
                    │                                     │
                    ▼                                     ▼
          ┌──────────────────┐              ┌──────────────────┐
          │ AsaasAdapter      │              │ CustomGateway     │
          │ (dynamic import)  │              │ (test mode only)  │
          └────────┬─────────┘              └────────┬─────────┘
                   │                                  │
                   ▼                                  ▼
          ┌──────────────────┐              ┌──────────────────┐
          │ Asaas API         │              │ TestModeSimulator │
          │ (external)        │              │ (in-memory)       │
          └──────────────────┘              └──────────────────┘
```

## Provider Routing

The `PAYMENT_PROVIDER` environment variable controls which path is taken:

- `asaas` (default): Routes through the existing `createAgreementWithAsaas` action, which uses `lib/asaas.ts` directly. No changes to this flow.
- `custom`: Routes through `createAgreementWithPayment`, which uses the `PaymentService` abstraction layer with the `CustomGateway` provider.

## Data Flow

### Agreement Creation

1. UI submits form → `createAgreement()` routing action
2. Routing action checks `PAYMENT_PROVIDER` env var
3. Delegates to the appropriate action
4. Action creates/fetches: customer → debt → provider customer → provider payment → agreement → notification
5. Agreement record stored with both `asaas_*` (existing) and `provider_*` (new) columns

### Webhook Processing

- **Asaas webhooks**: Continue to hit `/api/webhooks/asaas` (unchanged)
- **Custom gateway webhooks**: Hit `/api/webhooks/payment` (new)
- Both routes update agreement status and create notifications

## Key Design Decisions

1. **Dynamic Import for Asaas**: `lib/asaas.ts` throws at module load time if `ASAAS_API_KEY` is missing. The `AsaasAdapter` uses `import()` to avoid this when the custom gateway is active.

2. **Provider-agnostic columns**: New `provider_*` columns on the `agreements` table coexist with existing `asaas_*` columns. No data migration risk.

3. **Factory pattern with caching**: `createPaymentProvider()` caches the provider instance to avoid re-initialization on every request.

4. **Production blocking**: The custom gateway throws `CustomGatewayProductionBlockedError` if `CUSTOM_GATEWAY_MODE=production`, preventing accidental use of test payments in production.
