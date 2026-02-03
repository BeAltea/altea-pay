import { describe, it, expect, vi, beforeEach } from "vitest"
import { AsaasAdapter } from "../../src/providers/asaas/asaas-adapter"

// Mock the dynamic import of @/lib/asaas
const mockAsaasModule = {
  createAsaasCustomer: vi.fn(),
  getAsaasCustomerByCpfCnpj: vi.fn(),
  createAsaasPayment: vi.fn(),
  getAsaasPayment: vi.fn(),
  getAsaasPaymentByExternalReference: vi.fn(),
}

vi.mock("@/lib/asaas", () => mockAsaasModule)

describe("AsaasAdapter", () => {
  let adapter: AsaasAdapter

  beforeEach(() => {
    adapter = new AsaasAdapter()
    vi.clearAllMocks()
  })

  it("has name 'asaas'", () => {
    expect(adapter.name).toBe("asaas")
  })

  describe("createCustomer", () => {
    it("creates a customer and maps the result", async () => {
      const asaasCustomer = {
        id: "cus_abc123",
        name: "João Silva",
        email: "joao@example.com",
        phone: undefined,
        mobilePhone: "11999999999",
        cpfCnpj: "12345678901",
      }
      mockAsaasModule.createAsaasCustomer.mockResolvedValue(asaasCustomer)

      const result = await adapter.createCustomer({
        name: "João Silva",
        cpfCnpj: "12345678901",
        email: "joao@example.com",
        mobilePhone: "11999999999",
      })

      expect(result).toEqual({
        id: "cus_abc123",
        name: "João Silva",
        email: "joao@example.com",
        phone: undefined,
        mobilePhone: "11999999999",
        cpfCnpj: "12345678901",
      })
    })
  })

  describe("getCustomerByCpfCnpj", () => {
    it("returns null when customer not found", async () => {
      mockAsaasModule.getAsaasCustomerByCpfCnpj.mockResolvedValue(null)

      const result = await adapter.getCustomerByCpfCnpj("00000000000")
      expect(result).toBeNull()
    })

    it("returns mapped customer when found", async () => {
      mockAsaasModule.getAsaasCustomerByCpfCnpj.mockResolvedValue({
        id: "cus_abc123",
        name: "João Silva",
        cpfCnpj: "12345678901",
      })

      const result = await adapter.getCustomerByCpfCnpj("12345678901")
      expect(result?.id).toBe("cus_abc123")
      expect(result?.cpfCnpj).toBe("12345678901")
    })
  })

  describe("createPayment", () => {
    it("creates a payment and maps fields correctly", async () => {
      const asaasPayment = {
        id: "pay_xyz789",
        customer: "cus_abc123",
        billingType: "PIX",
        value: 100.0,
        dueDate: "2025-01-15",
        description: "Test payment",
        externalReference: "agreement_123",
        invoiceUrl: "https://asaas.com/pay/xyz",
        bankSlipUrl: null,
        pixQrCodeUrl: "https://asaas.com/pix/xyz",
        transactionReceiptUrl: null,
        status: "PENDING",
      }
      mockAsaasModule.createAsaasPayment.mockResolvedValue(asaasPayment)

      const result = await adapter.createPayment({
        customer: "cus_abc123",
        billingType: "PIX",
        value: 100.0,
        dueDate: "2025-01-15",
        description: "Test payment",
        externalReference: "agreement_123",
      })

      expect(result.id).toBe("pay_xyz789")
      expect(result.paymentUrl).toBe("https://asaas.com/pay/xyz")
      expect(result.pixQrCodeUrl).toBe("https://asaas.com/pix/xyz")
      expect(result.boletoUrl).toBeNull()
      expect(result.status).toBe("pending")
    })
  })

  describe("parseWebhook", () => {
    it("parses a valid Asaas webhook payload", () => {
      const body = {
        event: "PAYMENT_RECEIVED",
        payment: {
          id: "pay_xyz789",
          customer: "cus_abc123",
          value: 100.0,
          status: "RECEIVED",
          externalReference: "agreement_123",
        },
      }

      const result = adapter.parseWebhook(body)

      expect(result.event).toBe("PAYMENT_RECEIVED")
      expect(result.payment.id).toBe("pay_xyz789")
      expect(result.payment.value).toBe(100.0)
    })

    it("throws on invalid payload", () => {
      expect(() => adapter.parseWebhook({ event: "PAYMENT_RECEIVED" })).toThrow(
        "Invalid Asaas webhook payload: missing payment.id"
      )
    })
  })
})
