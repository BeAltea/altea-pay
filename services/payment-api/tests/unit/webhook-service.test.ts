import { describe, it, expect, vi } from "vitest"
import { WebhookService } from "../../src/services/webhook-service"
import type { PaymentProvider } from "../../src/interfaces/payment-provider"

function createMockProvider(): PaymentProvider {
  return {
    name: "mock",
    createCustomer: vi.fn(),
    getCustomerByCpfCnpj: vi.fn(),
    createPayment: vi.fn(),
    getPayment: vi.fn(),
    getPaymentByExternalReference: vi.fn(),
    refundPayment: vi.fn(),
    cancelPayment: vi.fn(),
    parseWebhook: vi.fn().mockReturnValue({
      event: "PAYMENT_RECEIVED",
      payment: { id: "pay_1", customer: "cus_1", value: 100, status: "received" },
    }),
  }
}

describe("WebhookService", () => {
  describe("parseWebhook", () => {
    it("delegates to the provider", () => {
      const provider = createMockProvider()
      const service = new WebhookService(provider)
      const body = { event: "PAYMENT_RECEIVED", payment: {} }

      const result = service.parseWebhook(body)

      expect(provider.parseWebhook).toHaveBeenCalledWith(body)
      expect(result.event).toBe("PAYMENT_RECEIVED")
    })
  })

  describe("deriveStatusUpdate", () => {
    it("handles PAYMENT_CREATED", () => {
      const service = new WebhookService(createMockProvider())

      const update = service.deriveStatusUpdate("PAYMENT_CREATED", "unknown", "active")

      expect(update.payment_status).toBe("pending")
      expect(update.status).toBe("active")
      expect(update.payment_received_at).toBeUndefined()
    })

    it("handles PAYMENT_CONFIRMED", () => {
      const service = new WebhookService(createMockProvider())

      const update = service.deriveStatusUpdate("PAYMENT_CONFIRMED", "pending", "active")

      expect(update.payment_status).toBe("confirmed")
      expect(update.status).toBe("active")
    })

    it("handles PAYMENT_RECEIVED and sets paid status with timestamp", () => {
      const service = new WebhookService(createMockProvider())

      const update = service.deriveStatusUpdate("PAYMENT_RECEIVED", "confirmed", "active")

      expect(update.payment_status).toBe("received")
      expect(update.status).toBe("paid")
      expect(update.payment_received_at).toBeDefined()
      expect(() => new Date(update.payment_received_at!)).not.toThrow()
    })

    it("handles PAYMENT_OVERDUE", () => {
      const service = new WebhookService(createMockProvider())

      const update = service.deriveStatusUpdate("PAYMENT_OVERDUE", "pending", "active")

      expect(update.payment_status).toBe("overdue")
      expect(update.status).toBe("active")
    })

    it("handles PAYMENT_REFUNDED", () => {
      const service = new WebhookService(createMockProvider())

      const update = service.deriveStatusUpdate("PAYMENT_REFUNDED", "received", "paid")

      expect(update.payment_status).toBe("refunded")
      expect(update.status).toBe("cancelled")
    })

    it("handles PAYMENT_DELETED", () => {
      const service = new WebhookService(createMockProvider())

      const update = service.deriveStatusUpdate("PAYMENT_DELETED", "pending", "active")

      expect(update.payment_status).toBe("pending")
      expect(update.status).toBe("cancelled")
    })

    it("preserves current statuses for unknown events", () => {
      const service = new WebhookService(createMockProvider())

      const update = service.deriveStatusUpdate("UNKNOWN_EVENT", "pending", "active")

      expect(update.payment_status).toBe("pending")
      expect(update.status).toBe("active")
    })

    it("always includes updated_at", () => {
      const service = new WebhookService(createMockProvider())

      const update = service.deriveStatusUpdate("PAYMENT_CREATED", "pending", "active")

      expect(update.updated_at).toBeDefined()
      expect(() => new Date(update.updated_at)).not.toThrow()
    })
  })
})
