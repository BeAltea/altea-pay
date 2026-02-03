// Interfaces & Types
export type {
  PaymentProvider,
  BillingType,
  PaymentStatus,
  WebhookEventType,
  ProviderCustomer,
  ProviderPayment,
  CreateCustomerParams,
  CreatePaymentParams,
  RefundParams,
  WebhookPayload,
} from "./interfaces/payment-provider.js"

export type {
  TransactionLog,
  TransactionRepository,
} from "./interfaces/transaction-repository.js"

// Config
export { loadConfig } from "./config/index.js"
export type { PaymentApiConfig } from "./config/index.js"

// Errors
export {
  PaymentError,
  ProviderUnavailableError,
  PaymentNotFoundError,
  CustomGatewayProductionBlockedError,
} from "./errors/payment-errors.js"

// Factory
export { createPaymentProvider, resetProviderCache } from "./factory/payment-provider-factory.js"

// Services
export { PaymentService } from "./services/payment-service.js"
export { WebhookService } from "./services/webhook-service.js"
export type { WebhookResult, AgreementUpdate } from "./services/webhook-service.js"

// Providers (for direct use if needed)
export { AsaasAdapter } from "./providers/asaas/asaas-adapter.js"
export { CustomGateway } from "./providers/custom/custom-gateway.js"

// Security
export { RateLimiter } from "./security/rate-limiter.js"
export { encrypt, decrypt } from "./security/encryption.js"
export { maskCardNumber, maskDocument, sanitizeForLog } from "./security/pci-helpers.js"
