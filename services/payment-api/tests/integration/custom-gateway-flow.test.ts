import { describe, it, expect } from "vitest"
import { CustomGateway } from "../../src/providers/custom/custom-gateway"
import { PaymentService } from "../../src/services/payment-service"
import { WebhookService } from "../../src/services/webhook-service"

describe("Custom Gateway Integration Flow", () => {
  it("completes full flow: create customer → create payment → simulate confirmation → webhook processing", async () => {
    const gateway = new CustomGateway("test")
    const paymentService = new PaymentService(gateway)
    const webhookService = new WebhookService(gateway)

    // Step 1: Create customer
    const customer = await paymentService.createCustomer({
      name: "Integration Test User",
      cpfCnpj: "11122233344",
      email: "integration@test.com",
      mobilePhone: "11999998888",
    })

    expect(customer.id).toMatch(/^test_cus_/)
    expect(customer.name).toBe("Integration Test User")
    expect(customer.cpfCnpj).toBe("11122233344")

    // Step 2: Verify customer lookup works
    const foundCustomer = await paymentService.getCustomerByCpfCnpj("11122233344")
    expect(foundCustomer).not.toBeNull()
    expect(foundCustomer?.id).toBe(customer.id)

    // Step 3: Create payment
    const payment = await paymentService.createPayment({
      customer: customer.id,
      billingType: "UNDEFINED",
      value: 350.75,
      dueDate: "2025-03-15",
      description: "Acordo de negociação - Integration Test",
      externalReference: "agreement_test_001",
    })

    expect(payment.id).toMatch(/^test_pay_/)
    expect(payment.status).toBe("pending")
    expect(payment.value).toBe(350.75)
    expect(payment.paymentUrl).toBeTruthy()
    expect(payment.boletoUrl).toBeTruthy()
    expect(payment.pixQrCodeUrl).toBeTruthy()

    // Step 4: Verify payment lookup works
    const foundPayment = await paymentService.getPayment(payment.id)
    expect(foundPayment.id).toBe(payment.id)

    // Step 5: Lookup by external reference
    const foundByRef = await paymentService.getPaymentByExternalReference("agreement_test_001")
    expect(foundByRef).not.toBeNull()
    expect(foundByRef?.id).toBe(payment.id)

    // Step 6: Simulate payment confirmation via internal simulator
    const simulator = gateway.getSimulator()
    simulator.simulatePaymentConfirmation(payment.id)

    const confirmedPayment = await paymentService.getPayment(payment.id)
    expect(confirmedPayment.status).toBe("confirmed")

    // Step 7: Simulate payment received
    simulator.simulatePaymentReceived(payment.id)

    const receivedPayment = await paymentService.getPayment(payment.id)
    expect(receivedPayment.status).toBe("received")

    // Step 8: Process webhook for received event
    const webhookPayload = {
      event: "PAYMENT_RECEIVED",
      payment: {
        id: payment.id,
        customer: customer.id,
        value: 350.75,
        status: "received",
        externalReference: "agreement_test_001",
      },
    }

    const parsed = webhookService.parseWebhook(webhookPayload)
    expect(parsed.event).toBe("PAYMENT_RECEIVED")

    const statusUpdate = webhookService.deriveStatusUpdate(
      parsed.event,
      "pending",
      "active"
    )
    expect(statusUpdate.payment_status).toBe("received")
    expect(statusUpdate.status).toBe("paid")
    expect(statusUpdate.payment_received_at).toBeTruthy()
  })

  it("handles payment refund flow", async () => {
    const gateway = new CustomGateway("test")
    const paymentService = new PaymentService(gateway)

    const customer = await paymentService.createCustomer({
      name: "Refund Test",
      cpfCnpj: "55566677788",
    })

    const payment = await paymentService.createPayment({
      customer: customer.id,
      billingType: "PIX",
      value: 200,
      dueDate: "2025-04-01",
    })

    // Refund
    const refunded = await paymentService.refundPayment({ paymentId: payment.id })
    expect(refunded.status).toBe("refunded")
  })

  it("handles payment cancellation flow", async () => {
    const gateway = new CustomGateway("test")
    const paymentService = new PaymentService(gateway)

    const customer = await paymentService.createCustomer({
      name: "Cancel Test",
      cpfCnpj: "99988877766",
    })

    const payment = await paymentService.createPayment({
      customer: customer.id,
      billingType: "BOLETO",
      value: 150,
      dueDate: "2025-04-01",
    })

    await paymentService.cancelPayment(payment.id)

    const cancelled = await paymentService.getPayment(payment.id)
    expect(cancelled.status).toBe("cancelled")
  })

  it("activeProvider returns 'custom'", () => {
    const gateway = new CustomGateway("test")
    const paymentService = new PaymentService(gateway)
    expect(paymentService.activeProvider).toBe("custom")
  })
})
