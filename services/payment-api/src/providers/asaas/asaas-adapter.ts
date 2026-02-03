import type {
  PaymentProvider,
  CreateCustomerParams,
  CreatePaymentParams,
  RefundParams,
  ProviderCustomer,
  ProviderPayment,
  WebhookPayload,
} from "../../interfaces/payment-provider.js"
import { mapAsaasStatus, mapAsaasEvent } from "./asaas-status-mapper.js"
import { ProviderUnavailableError, PaymentNotFoundError } from "../../errors/payment-errors.js"

// Lazy-loaded Asaas module type
interface AsaasModule {
  createAsaasCustomer: (params: {
    name: string
    cpfCnpj: string
    email?: string
    phone?: string
    mobilePhone?: string
    postalCode?: string
    address?: string
    addressNumber?: string
  }) => Promise<{
    id: string
    name: string
    email?: string
    phone?: string
    mobilePhone?: string
    cpfCnpj: string
  }>
  getAsaasCustomerByCpfCnpj: (cpfCnpj: string) => Promise<{
    id: string
    name: string
    email?: string
    phone?: string
    mobilePhone?: string
    cpfCnpj: string
  } | null>
  createAsaasPayment: (params: {
    customer: string
    billingType: string
    value: number
    dueDate: string
    description?: string
    externalReference?: string
    installmentCount?: number
    installmentValue?: number
  }) => Promise<{
    id: string
    customer: string
    billingType: string
    value: number
    dueDate: string
    description?: string
    externalReference?: string
    installmentCount?: number
    installmentValue?: number
    invoiceUrl?: string
    bankSlipUrl?: string
    transactionReceiptUrl?: string
    pixQrCodeUrl?: string
    status: string
  }>
  getAsaasPayment: (paymentId: string) => Promise<{
    id: string
    customer: string
    billingType: string
    value: number
    dueDate: string
    description?: string
    externalReference?: string
    installmentCount?: number
    installmentValue?: number
    invoiceUrl?: string
    bankSlipUrl?: string
    transactionReceiptUrl?: string
    pixQrCodeUrl?: string
    status: string
  }>
  getAsaasPaymentByExternalReference: (ref: string) => Promise<{
    id: string
    customer: string
    billingType: string
    value: number
    dueDate: string
    description?: string
    externalReference?: string
    installmentCount?: number
    installmentValue?: number
    invoiceUrl?: string
    bankSlipUrl?: string
    transactionReceiptUrl?: string
    pixQrCodeUrl?: string
    status: string
  } | null>
}

export class AsaasAdapter implements PaymentProvider {
  readonly name = "asaas"

  private asaasModule: AsaasModule | null = null

  private async getModule(): Promise<AsaasModule> {
    if (this.asaasModule) return this.asaasModule

    try {
      // Dynamic import to avoid the module-level throw when ASAAS_API_KEY is missing
      this.asaasModule = await import("@/lib/asaas") as AsaasModule
      return this.asaasModule
    } catch (error) {
      throw new ProviderUnavailableError("asaas", error as Error)
    }
  }

  async createCustomer(params: CreateCustomerParams): Promise<ProviderCustomer> {
    const asaas = await this.getModule()
    const customer = await asaas.createAsaasCustomer({
      name: params.name,
      cpfCnpj: params.cpfCnpj,
      email: params.email,
      phone: params.phone,
      mobilePhone: params.mobilePhone,
      postalCode: params.postalCode,
      address: params.address,
      addressNumber: params.addressNumber,
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
    const asaas = await this.getModule()
    const customer = await asaas.getAsaasCustomerByCpfCnpj(cpfCnpj)
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
    const asaas = await this.getModule()
    const payment = await asaas.createAsaasPayment({
      customer: params.customer,
      billingType: params.billingType,
      value: params.value,
      dueDate: params.dueDate,
      description: params.description,
      externalReference: params.externalReference,
      installmentCount: params.installmentCount,
      installmentValue: params.installmentValue,
    })
    return this.mapPayment(payment)
  }

  async getPayment(paymentId: string): Promise<ProviderPayment> {
    const asaas = await this.getModule()
    const payment = await asaas.getAsaasPayment(paymentId)
    if (!payment) throw new PaymentNotFoundError(paymentId)
    return this.mapPayment(payment)
  }

  async getPaymentByExternalReference(externalReference: string): Promise<ProviderPayment | null> {
    const asaas = await this.getModule()
    const payment = await asaas.getAsaasPaymentByExternalReference(externalReference)
    if (!payment) return null
    return this.mapPayment(payment)
  }

  async refundPayment(_params: RefundParams): Promise<ProviderPayment> {
    // Asaas refund would require an additional API endpoint in lib/asaas.ts
    // For now, throw as not implemented
    throw new Error("Refund via Asaas adapter is not yet implemented. Use the Asaas dashboard.")
  }

  async cancelPayment(_paymentId: string): Promise<void> {
    // Asaas cancellation would require an additional API endpoint in lib/asaas.ts
    throw new Error("Cancel via Asaas adapter is not yet implemented. Use the Asaas dashboard.")
  }

  parseWebhook(body: unknown): WebhookPayload {
    const data = body as Record<string, unknown>
    const event = data.event as string
    const payment = data.payment as Record<string, unknown>

    if (!payment?.id) {
      throw new Error("Invalid Asaas webhook payload: missing payment.id")
    }

    return {
      event: mapAsaasEvent(event),
      payment: {
        id: payment.id as string,
        customer: payment.customer as string,
        value: payment.value as number,
        status: payment.status as string,
        externalReference: payment.externalReference as string | undefined,
        subscription: payment.subscription as string | undefined,
        description: payment.description as string | undefined,
      },
    }
  }

  private mapPayment(asaasPayment: {
    id: string
    customer: string
    billingType: string
    value: number
    dueDate: string
    description?: string
    externalReference?: string
    installmentCount?: number
    installmentValue?: number
    invoiceUrl?: string
    bankSlipUrl?: string
    transactionReceiptUrl?: string
    pixQrCodeUrl?: string
    status: string
  }): ProviderPayment {
    return {
      id: asaasPayment.id,
      customerId: asaasPayment.customer,
      billingType: asaasPayment.billingType as ProviderPayment["billingType"],
      value: asaasPayment.value,
      dueDate: asaasPayment.dueDate,
      description: asaasPayment.description,
      externalReference: asaasPayment.externalReference,
      installmentCount: asaasPayment.installmentCount,
      installmentValue: asaasPayment.installmentValue,
      status: mapAsaasStatus(asaasPayment.status),
      paymentUrl: asaasPayment.invoiceUrl,
      boletoUrl: asaasPayment.bankSlipUrl,
      pixQrCodeUrl: asaasPayment.pixQrCodeUrl,
      transactionReceiptUrl: asaasPayment.transactionReceiptUrl,
    }
  }
}
