import { describe, it, expect } from "vitest"
import { CustomGateway } from "../../src/providers/custom/custom-gateway"
import { CustomGatewayProductionBlockedError } from "../../src/errors/payment-errors"

describe("CustomGateway", () => {
  it("has name 'custom'", () => {
    const gateway = new CustomGateway("test")
    expect(gateway.name).toBe("custom")
  })

  it("throws CustomGatewayProductionBlockedError in production mode", () => {
    expect(() => new CustomGateway("production")).toThrow(CustomGatewayProductionBlockedError)
  })

  describe("createCustomer", () => {
    it("creates a customer with test_ prefix", async () => {
      const gateway = new CustomGateway("test")
      const customer = await gateway.createCustomer({
        name: "Maria Souza",
        cpfCnpj: "98765432100",
        email: "maria@example.com",
      })

      expect(customer.id).toMatch(/^test_cus_/)
      expect(customer.name).toBe("Maria Souza")
      expect(customer.cpfCnpj).toBe("98765432100")
    })

    it("returns the same customer for the same cpfCnpj", async () => {
      const gateway = new CustomGateway("test")
      const customer1 = await gateway.createCustomer({
        name: "Maria Souza",
        cpfCnpj: "98765432100",
      })
      const customer2 = await gateway.createCustomer({
        name: "Maria Souza",
        cpfCnpj: "98765432100",
      })

      expect(customer1.id).toBe(customer2.id)
    })
  })

  describe("getCustomerByCpfCnpj", () => {
    it("returns null for unknown customer", async () => {
      const gateway = new CustomGateway("test")
      const result = await gateway.getCustomerByCpfCnpj("00000000000")
      expect(result).toBeNull()
    })

    it("returns customer after creation", async () => {
      const gateway = new CustomGateway("test")
      await gateway.createCustomer({
        name: "João",
        cpfCnpj: "11111111111",
      })

      const found = await gateway.getCustomerByCpfCnpj("11111111111")
      expect(found).not.toBeNull()
      expect(found?.name).toBe("João")
    })
  })

  describe("createPayment", () => {
    it("creates a payment with test_ prefix and pending status", async () => {
      const gateway = new CustomGateway("test")
      const customer = await gateway.createCustomer({
        name: "Test",
        cpfCnpj: "12345678901",
      })

      const payment = await gateway.createPayment({
        customer: customer.id,
        billingType: "PIX",
        value: 250.5,
        dueDate: "2025-02-01",
        description: "Test payment",
      })

      expect(payment.id).toMatch(/^test_pay_/)
      expect(payment.status).toBe("pending")
      expect(payment.value).toBe(250.5)
      expect(payment.pixQrCodeUrl).toBeTruthy()
      expect(payment.paymentUrl).toBeTruthy()
    })

    it("generates both boleto and pix URLs for UNDEFINED billing type", async () => {
      const gateway = new CustomGateway("test")
      const customer = await gateway.createCustomer({
        name: "Test",
        cpfCnpj: "12345678902",
      })

      const payment = await gateway.createPayment({
        customer: customer.id,
        billingType: "UNDEFINED",
        value: 100,
        dueDate: "2025-02-01",
      })

      expect(payment.boletoUrl).toBeTruthy()
      expect(payment.pixQrCodeUrl).toBeTruthy()
    })
  })

  describe("getPayment", () => {
    it("retrieves a created payment", async () => {
      const gateway = new CustomGateway("test")
      const customer = await gateway.createCustomer({
        name: "Test",
        cpfCnpj: "12345678903",
      })
      const payment = await gateway.createPayment({
        customer: customer.id,
        billingType: "BOLETO",
        value: 500,
        dueDate: "2025-03-01",
      })

      const retrieved = await gateway.getPayment(payment.id)
      expect(retrieved.id).toBe(payment.id)
      expect(retrieved.value).toBe(500)
    })

    it("throws PaymentNotFoundError for unknown payment", async () => {
      const gateway = new CustomGateway("test")
      await expect(gateway.getPayment("test_pay_unknown")).rejects.toThrow("Payment not found")
    })
  })

  describe("refundPayment", () => {
    it("refunds a payment", async () => {
      const gateway = new CustomGateway("test")
      const customer = await gateway.createCustomer({
        name: "Test",
        cpfCnpj: "12345678904",
      })
      const payment = await gateway.createPayment({
        customer: customer.id,
        billingType: "PIX",
        value: 100,
        dueDate: "2025-02-01",
      })

      const refunded = await gateway.refundPayment({ paymentId: payment.id })
      expect(refunded.status).toBe("refunded")
    })
  })

  describe("cancelPayment", () => {
    it("cancels a payment", async () => {
      const gateway = new CustomGateway("test")
      const customer = await gateway.createCustomer({
        name: "Test",
        cpfCnpj: "12345678905",
      })
      const payment = await gateway.createPayment({
        customer: customer.id,
        billingType: "BOLETO",
        value: 200,
        dueDate: "2025-02-01",
      })

      await gateway.cancelPayment(payment.id)
      const cancelled = await gateway.getPayment(payment.id)
      expect(cancelled.status).toBe("cancelled")
    })
  })

  describe("parseWebhook", () => {
    it("parses a valid webhook payload", () => {
      const gateway = new CustomGateway("test")
      const result = gateway.parseWebhook({
        event: "PAYMENT_RECEIVED",
        payment: {
          id: "test_pay_abc",
          customer: "test_cus_def",
          value: 100,
          status: "received",
        },
      })

      expect(result.event).toBe("PAYMENT_RECEIVED")
      expect(result.payment.id).toBe("test_pay_abc")
    })
  })
})
