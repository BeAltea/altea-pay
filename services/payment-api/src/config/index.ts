export interface PaymentApiConfig {
  provider: "asaas" | "custom"
  customGatewayMode: "test" | "production"
  asaas: {
    apiKey: string | undefined
    apiUrl: string
  }
  db: {
    host: string
    port: number
    database: string
    user: string
    password: string
  }
  redis: {
    host: string
    port: number
    password: string | undefined
  }
  security: {
    encryptionKey: string | undefined
    rateLimitMaxRequests: number
    rateLimitWindowMs: number
  }
}

export function loadConfig(): PaymentApiConfig {
  return {
    provider: (process.env.PAYMENT_PROVIDER as "asaas" | "custom") || "asaas",
    customGatewayMode: (process.env.CUSTOM_GATEWAY_MODE as "test" | "production") || "test",
    asaas: {
      apiKey: process.env.ASAAS_API_KEY,
      apiUrl: process.env.ASAAS_API_URL || "https://api.asaas.com/v3",
    },
    db: {
      host: process.env.PAYMENT_DB_HOST || "localhost",
      port: parseInt(process.env.PAYMENT_DB_PORT || "5433", 10),
      database: process.env.PAYMENT_DB_NAME || "payment_api",
      user: process.env.PAYMENT_DB_USER || "payment_api",
      password: process.env.PAYMENT_DB_PASSWORD || "payment_api_secret",
    },
    redis: {
      host: process.env.PAYMENT_REDIS_HOST || "localhost",
      port: parseInt(process.env.PAYMENT_REDIS_PORT || "6379", 10),
      password: process.env.PAYMENT_REDIS_PASSWORD || undefined,
    },
    security: {
      encryptionKey: process.env.PAYMENT_ENCRYPTION_KEY,
      rateLimitMaxRequests: parseInt(process.env.PAYMENT_RATE_LIMIT_MAX || "100", 10),
      rateLimitWindowMs: parseInt(process.env.PAYMENT_RATE_LIMIT_WINDOW_MS || "60000", 10),
    },
  }
}
