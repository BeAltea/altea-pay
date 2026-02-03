# Payment API - Testing Guide

## Test Framework

Tests use [Vitest](https://vitest.dev/) with the following configuration:

- **Environment**: Node.js
- **Globals**: Enabled (`describe`, `it`, `expect` available without imports)
- **Pattern**: `tests/**/*.test.ts`
- **Aliases**: `@` resolves to project root, `@payment-api` resolves to `src/`

## Running Tests

```bash
cd services/payment-api

# Run all tests once
npx vitest run

# Watch mode (re-runs on file changes)
npx vitest

# Run with coverage
npx vitest run --coverage

# Run a specific test file
npx vitest run tests/unit/encryption.test.ts

# Run tests matching a pattern
npx vitest run -t "WebhookService"
```

## Test Structure

```
tests/
├── unit/                              # Isolated unit tests (no external deps)
│   ├── asaas-adapter.test.ts          # AsaasAdapter with mocked @/lib/asaas
│   ├── asaas-status-mapper.test.ts    # Status/event mapping functions
│   ├── custom-gateway.test.ts         # CustomGateway in-memory provider
│   ├── encryption.test.ts            # AES-256-GCM encrypt/decrypt
│   ├── payment-provider-factory.test.ts # Factory pattern and caching
│   ├── payment-service.test.ts        # PaymentService with mock provider
│   ├── pci-helpers.test.ts           # Card/document masking, log sanitization
│   ├── rate-limiter.test.ts          # Sliding window rate limiter
│   └── webhook-service.test.ts       # Webhook parsing and status derivation
└── integration/                       # End-to-end flows (in-memory, no external deps)
    └── custom-gateway-flow.test.ts    # Full customer → payment → webhook flow
```

## Testing Patterns

### Mocking Providers

Unit tests for `PaymentService` and `WebhookService` use mock implementations of `PaymentProvider`:

```typescript
function createMockProvider(): PaymentProvider {
  return {
    name: "mock",
    createCustomer: vi.fn().mockResolvedValue({ id: "mock_cus_1", ... }),
    // ... other methods
  }
}
```

### Mocking External Modules

The `AsaasAdapter` test mocks `@/lib/asaas` to avoid requiring API credentials:

```typescript
vi.mock("@/lib/asaas", () => mockAsaasModule)
```

### Fake Timers

`RateLimiter` tests use Vitest fake timers to control time progression:

```typescript
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

// Advance time
vi.advanceTimersByTime(1_001)
```

### Parameterized Tests

Status mapper tests use `it.each` for exhaustive mapping coverage:

```typescript
it.each(statusMappings)("maps %s to %s", (input, expected) => {
  expect(mapAsaasStatus(input)).toBe(expected)
})
```

### Integration Tests

Integration tests use the `CustomGateway` in test mode as a real (but in-memory) provider. No mocks, no external services:

```typescript
const gateway = new CustomGateway("test")
const paymentService = new PaymentService(gateway)
// Full flow: create customer → create payment → simulate events → process webhooks
```

## What's Tested

| Module | Test File | Coverage |
|--------|-----------|----------|
| `PaymentService` | `payment-service.test.ts` | Delegation, logging, error handling |
| `AsaasAdapter` | `asaas-adapter.test.ts` | Customer/payment CRUD, webhook parsing |
| `AsaasStatusMapper` | `asaas-status-mapper.test.ts` | All status/event mappings + fallbacks |
| `CustomGateway` | `custom-gateway.test.ts` | Full CRUD, production blocking |
| `PaymentProviderFactory` | `payment-provider-factory.test.ts` | Factory creation, caching, errors |
| `WebhookService` | `webhook-service.test.ts` | All event types, status derivation |
| `Encryption` | `encryption.test.ts` | Round-trip, tampering, unicode |
| `PCI Helpers` | `pci-helpers.test.ts` | Masking, sanitization, nesting |
| `RateLimiter` | `rate-limiter.test.ts` | Limits, sliding window, reset |
| Full Flow | `custom-gateway-flow.test.ts` | Customer → payment → confirmation → webhook |

## Adding New Tests

1. Create a test file in `tests/unit/` or `tests/integration/`
2. Follow the naming convention: `<module-name>.test.ts`
3. Use the existing patterns for mocking providers
4. Import from relative paths to `../../src/`
