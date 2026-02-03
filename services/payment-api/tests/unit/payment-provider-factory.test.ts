import { describe, it, expect, beforeEach } from "vitest"
import { createPaymentProvider, resetProviderCache } from "../../src/factory/payment-provider-factory"
import { CustomGatewayProductionBlockedError } from "../../src/errors/payment-errors"
import type { PaymentApiConfig } from "../../src/config"

function makeConfig(overrides: Partial<PaymentApiConfig> = {}): PaymentApiConfig {
  return {
    provider: "custom",
    customGatewayMode: "test",
    asaas: { apiKey: undefined, apiUrl: "https://api.asaas.com/v3" },
    db: { host: "localhost", port: 5433, database: "test", user: "test", password: "test" },
    redis: { host: "localhost", port: 6379, password: undefined },
    security: { encryptionKey: undefined, rateLimitMaxRequests: 100, rateLimitWindowMs: 60000 },
    ...overrides,
  }
}

describe("PaymentProviderFactory", () => {
  beforeEach(() => {
    resetProviderCache()
  })

  it("creates a custom gateway in test mode", () => {
    const provider = createPaymentProvider(makeConfig({ provider: "custom", customGatewayMode: "test" }))
    expect(provider.name).toBe("custom")
  })

  it("creates an asaas adapter", () => {
    const provider = createPaymentProvider(makeConfig({ provider: "asaas" }))
    expect(provider.name).toBe("asaas")
  })

  it("throws for custom gateway in production mode", () => {
    expect(() =>
      createPaymentProvider(makeConfig({ provider: "custom", customGatewayMode: "production" }))
    ).toThrow(CustomGatewayProductionBlockedError)
  })

  it("throws for unknown provider", () => {
    expect(() =>
      createPaymentProvider(makeConfig({ provider: "unknown" as any }))
    ).toThrow("Unknown payment provider")
  })

  it("caches the provider instance", () => {
    const config = makeConfig({ provider: "custom" })
    const provider1 = createPaymentProvider(config)
    const provider2 = createPaymentProvider(config)
    expect(provider1).toBe(provider2)
  })

  it("creates a new instance after cache reset", () => {
    const config = makeConfig({ provider: "custom" })
    const provider1 = createPaymentProvider(config)
    resetProviderCache()
    const provider2 = createPaymentProvider(config)
    expect(provider1).not.toBe(provider2)
  })
})
