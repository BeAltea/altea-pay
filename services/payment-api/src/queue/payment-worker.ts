import { Worker } from "bullmq"
import type { PaymentApiConfig } from "../config/index.js"
import type { PaymentService } from "../services/payment-service.js"
import type { PaymentJobData } from "./payment-queue.js"

export function createPaymentWorker(
  config: PaymentApiConfig,
  paymentService: PaymentService
): Worker<PaymentJobData> {
  return new Worker<PaymentJobData>(
    "payment-processing",
    async (job) => {
      const { operation, payload, companyId } = job.data

      switch (operation) {
        case "createPayment":
          return await paymentService.createPayment(
            {
              customer: payload.customer as string,
              billingType: payload.billingType as "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED",
              value: payload.value as number,
              dueDate: payload.dueDate as string,
              description: payload.description as string | undefined,
              externalReference: payload.externalReference as string | undefined,
              installmentCount: payload.installmentCount as number | undefined,
              installmentValue: payload.installmentValue as number | undefined,
            },
            companyId
          )

        case "processWebhook":
          return paymentService.parseWebhook(payload)

        default:
          throw new Error(`Unknown operation: ${operation}`)
      }
    },
    {
      connection: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      },
      concurrency: 5,
    }
  )
}
