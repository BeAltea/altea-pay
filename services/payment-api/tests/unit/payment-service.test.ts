import { describe, it, expect, vi, beforeEach } from "vitest"
import { PaymentService } from "../../src/services/payment-service"
import type { PaymentProvider } from "../../src/interfaces/payment-provider"
import type { TransactionRepository } from "../../src/interfaces/transaction-repository"

function createMockProvider(): PaymentProvider {
  return {
    name: "mock",
    createCustomer: vi.fn().mockResolvedValue({
      id: "mock_cus_1",
      name: "Test User",
      cpfCnpj: "12345678901",
    }),
    getCustomerByCpfCnpj: vi.fn().mockResolvedValue(null),
    createPayment: vi.fn().mockResolvedValue({
      id: "mock_pay_1",
      customerId: "mock_cus_1",
      billingType: "PIX",
      value: 100,
      dueDate: "2025-01-15",
      status: "pending",
      paymentUrl: "https://mock.com/pay/1",
    }),
    getPayment: vi.fn().mockResolvedValue({
      id: "mock_pay_1",
      status: "pending",
    }),
    getPaymentByExternalReference: vi.fn().mockResolvedValue(null),
    refundPayment: vi.fn().mockResolvedValue({
      id: "mock_pay_1",
      status: "refunded",
    }),
    cancelPayment: vi.fn().mockResolvedValue(undefined),
    parseWebhook: vi.fn().mockReturnValue({
      event: "PAYMENT_RECEIVED",
      payment: { id: "mock_pay_1", customer: "mock_cus_1", value: 100, status: "received" },
    }),
  }
}

function createMockRepository(): TransactionRepository {
  return {
    log: vi.fn().mockResolvedValue(undefined),
    getByProvider: vi.fn().mockResolvedValue([]),
    getByCompanyId: vi.fn().mockResolvedValue([]),
  }
}

describe("PaymentService", () => {
  let provider: PaymentProvider
  let repository: TransactionRepository
  let service: PaymentService

  beforeEach(() => {
    provider = createMockProvider()
    repository = createMockRepository()
    service = new PaymentService(provider, repository)
  })

  it("exposes activeProvider name", () => {
    expect(service.activeProvider).toBe("mock")
  })

  describe("createCustomer", () => {
    it("delegates to provider and logs transaction", async () => {
      const result = await service.createCustomer(
        { name: "Test", cpfCnpj: "12345678901" },
        "company_1"
      )

      expect(result.id).toBe("mock_cus_1")
      expect(provider.createCustomer).toHaveBeenCalledOnce()
      expect(repository.log).toHaveBeenCalledOnce()
      expect(repository.log).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "mock",
          operation: "createCustomer",
          company_id: "company_1",
          error_message: null,
        })
      )
    })

    it("logs errors and rethrows", async () => {
      const error = new Error("Provider error")
      vi.mocked(provider.createCustomer).mockRejectedValue(error)

      await expect(
        service.createCustomer({ name: "Test", cpfCnpj: "12345678901" })
      ).rejects.toThrow("Provider error")

      expect(repository.log).toHaveBeenCalledWith(
        expect.objectContaining({
          error_message: "Provider error",
        })
      )
    })
  })

  describe("createPayment", () => {
    it("delegates to provider", async () => {
      const result = await service.createPayment({
        customer: "mock_cus_1",
        billingType: "PIX",
        value: 100,
        dueDate: "2025-01-15",
      })

      expect(result.id).toBe("mock_pay_1")
      expect(result.paymentUrl).toBe("https://mock.com/pay/1")
    })
  })

  describe("parseWebhook", () => {
    it("delegates to provider", () => {
      const result = service.parseWebhook({ event: "PAYMENT_RECEIVED", payment: {} })
      expect(result.event).toBe("PAYMENT_RECEIVED")
      expect(provider.parseWebhook).toHaveBeenCalledOnce()
    })
  })

  describe("without repository", () => {
    it("works without logging", async () => {
      const serviceNoRepo = new PaymentService(provider)
      const result = await serviceNoRepo.createCustomer({
        name: "Test",
        cpfCnpj: "12345678901",
      })
      expect(result.id).toBe("mock_cus_1")
    })
  })
})
