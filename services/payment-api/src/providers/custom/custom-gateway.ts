import type {
  PaymentProvider,
  CreateCustomerParams,
  CreatePaymentParams,
  RefundParams,
  ProviderCustomer,
  ProviderPayment,
  WebhookPayload,
  WebhookEventType,
} from "../../interfaces/payment-provider.js"
import { CustomGatewayProductionBlockedError, PaymentNotFoundError } from "../../errors/payment-errors.js"
import { TestModeSimulator } from "./test-mode-simulator.js"

export class CustomGateway implements PaymentProvider {
  readonly name = "custom"
  private simulator: TestModeSimulator

  constructor(mode: "test" | "production" = "test") {
    if (mode === "production") {
      throw new CustomGatewayProductionBlockedError()
    }
    this.simulator = new TestModeSimulator()
  }

  async createCustomer(params: CreateCustomerParams): Promise<ProviderCustomer> {
    const customer = this.simulator.createCustomer({
      name: params.name,
      cpfCnpj: params.cpfCnpj,
      email: params.email,
      phone: params.phone,
      mobilePhone: params.mobilePhone,
    })
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      mobilePhone: customer.mobilePhone,
      cpfCnpj: customer.cpfCnpj,
    }
  }

  async getCustomerByCpfCnpj(cpfCnpj: string): Promise<ProviderCustomer | null> {
    const customer = this.simulator.getCustomerByCpfCnpj(cpfCnpj)
    if (!customer) return null
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      mobilePhone: customer.mobilePhone,
      cpfCnpj: customer.cpfCnpj,
    }
  }

  async createPayment(params: CreatePaymentParams): Promise<ProviderPayment> {
    const simulated = this.simulator.createPayment({
      customerId: params.customer,
      billingType: params.billingType,
      value: params.value,
      dueDate: params.dueDate,
      description: params.description,
      externalReference: params.externalReference,
      installmentCount: params.installmentCount,
      installmentValue: params.installmentValue,
    })
    return this.mapSimulatedPayment(simulated)
  }

  async getPayment(paymentId: string): Promise<ProviderPayment> {
    const payment = this.simulator.getPayment(paymentId)
    if (!payment) throw new PaymentNotFoundError(paymentId)
    return this.mapSimulatedPayment(payment)
  }

  async getPaymentByExternalReference(externalReference: string): Promise<ProviderPayment | null> {
    const payment = this.simulator.getPaymentByExternalReference(externalReference)
    if (!payment) return null
    return this.mapSimulatedPayment(payment)
  }

  async refundPayment(params: RefundParams): Promise<ProviderPayment> {
    const payment = this.simulator.simulateRefund(params.paymentId)
    if (!payment) throw new PaymentNotFoundError(params.paymentId)
    return this.mapSimulatedPayment(payment)
  }

  async cancelPayment(paymentId: string): Promise<void> {
    const success = this.simulator.cancelPayment(paymentId)
    if (!success) throw new PaymentNotFoundError(paymentId)
  }

  parseWebhook(body: unknown): WebhookPayload {
    const data = body as Record<string, unknown>
    const event = data.event as string
    const payment = data.payment as Record<string, unknown>

    if (!payment?.id) {
      throw new Error("Invalid custom gateway webhook payload: missing payment.id")
    }

    return {
      event: event as WebhookEventType,
      payment: {
        id: payment.id as string,
        customer: payment.customer as string,
        value: payment.value as number,
        status: payment.status as string,
        externalReference: payment.externalReference as string | undefined,
        description: payment.description as string | undefined,
      },
    }
  }

  // Expose simulator for test-mode simulation endpoints
  getSimulator(): TestModeSimulator {
    return this.simulator
  }

  private mapSimulatedPayment(payment: {
    id: string
    customerId: string
    billingType: string
    value: number
    dueDate: string
    description?: string
    externalReference?: string
    installmentCount?: number
    installmentValue?: number
    status: string
    paymentUrl: string
    boletoUrl?: string
    pixQrCodeUrl?: string
  }): ProviderPayment {
    return {
      id: payment.id,
      customerId: payment.customerId,
      billingType: payment.billingType as ProviderPayment["billingType"],
      value: payment.value,
      dueDate: payment.dueDate,
      description: payment.description,
      externalReference: payment.externalReference,
      installmentCount: payment.installmentCount,
      installmentValue: payment.installmentValue,
      status: payment.status as ProviderPayment["status"],
      paymentUrl: payment.paymentUrl,
      boletoUrl: payment.boletoUrl,
      pixQrCodeUrl: payment.pixQrCodeUrl,
    }
  }
}
