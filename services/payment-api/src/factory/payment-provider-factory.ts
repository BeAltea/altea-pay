import type { PaymentProvider } from "../interfaces/payment-provider.js"
import type { PaymentApiConfig } from "../config/index.js"
import { AsaasAdapter } from "../providers/asaas/asaas-adapter.js"
import { CustomGateway } from "../providers/custom/custom-gateway.js"
import { CustomGatewayProductionBlockedError } from "../errors/payment-errors.js"

let cachedProvider: PaymentProvider | null = null
let cachedProviderName: string | null = null

export function createPaymentProvider(config: PaymentApiConfig): PaymentProvider {
  // Return cached instance if same provider
  if (cachedProvider && cachedProviderName === config.provider) {
    return cachedProvider
  }

  let provider: PaymentProvider

  switch (config.provider) {
    case "asaas":
      provider = new AsaasAdapter()
      break

    case "custom":
      if (config.customGatewayMode === "production") {
        throw new CustomGatewayProductionBlockedError()
      }
      provider = new CustomGateway(config.customGatewayMode)
      break

    default:
      throw new Error(`Unknown payment provider: ${config.provider}`)
  }

  cachedProvider = provider
  cachedProviderName = config.provider
  return provider
}

// For testing: reset the cached provider
export function resetProviderCache(): void {
  cachedProvider = null
  cachedProviderName = null
}
