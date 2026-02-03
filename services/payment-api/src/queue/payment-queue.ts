import { Queue } from "bullmq"
import type { PaymentApiConfig } from "../config/index.js"

export interface PaymentJobData {
  operation: "createPayment" | "processWebhook"
  payload: Record<string, unknown>
  companyId?: string
}

export function createPaymentQueue(config: PaymentApiConfig): Queue<PaymentJobData> {
  return new Queue<PaymentJobData>("payment-processing", {
    connection: {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  })
}

export function createWebhookQueue(config: PaymentApiConfig): Queue<PaymentJobData> {
  return new Queue<PaymentJobData>("webhook-processing", {
    connection: {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    },
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  })
}
