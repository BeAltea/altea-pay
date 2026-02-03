export class PaymentError extends Error {
  public readonly code: string

  constructor(message: string, code: string = "PAYMENT_ERROR") {
    super(message)
    this.name = "PaymentError"
    this.code = code
  }
}

export class ProviderUnavailableError extends PaymentError {
  constructor(provider: string, cause?: Error) {
    super(`Payment provider "${provider}" is unavailable: ${cause?.message || "unknown error"}`, "PROVIDER_UNAVAILABLE")
    this.name = "ProviderUnavailableError"
    if (cause) this.cause = cause
  }
}

export class PaymentNotFoundError extends PaymentError {
  constructor(identifier: string) {
    super(`Payment not found: ${identifier}`, "PAYMENT_NOT_FOUND")
    this.name = "PaymentNotFoundError"
  }
}

export class CustomGatewayProductionBlockedError extends PaymentError {
  constructor() {
    super(
      "Custom gateway cannot be used in production mode. Set CUSTOM_GATEWAY_MODE=test or use a different provider.",
      "CUSTOM_GATEWAY_PRODUCTION_BLOCKED"
    )
    this.name = "CustomGatewayProductionBlockedError"
  }
}
