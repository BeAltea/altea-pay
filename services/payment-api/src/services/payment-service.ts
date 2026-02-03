import type {
  PaymentProvider,
  CreateCustomerParams,
  CreatePaymentParams,
  RefundParams,
  ProviderCustomer,
  ProviderPayment,
  WebhookPayload,
} from "../interfaces/payment-provider.js"
import type { TransactionRepository } from "../interfaces/transaction-repository.js"

export class PaymentService {
  constructor(
    private provider: PaymentProvider,
    private repository?: TransactionRepository
  ) {}

  get activeProvider(): string {
    return this.provider.name
  }

  async createCustomer(params: CreateCustomerParams, companyId?: string): Promise<ProviderCustomer> {
    const start = Date.now()
    try {
      const result = await this.provider.createCustomer(params)
      await this.logTransaction("createCustomer", params, result, null, companyId, Date.now() - start)
      return result
    } catch (error) {
      await this.logTransaction("createCustomer", params, null, error, companyId, Date.now() - start)
      throw error
    }
  }

  async getCustomerByCpfCnpj(cpfCnpj: string, companyId?: string): Promise<ProviderCustomer | null> {
    const start = Date.now()
    try {
      const result = await this.provider.getCustomerByCpfCnpj(cpfCnpj)
      await this.logTransaction("getCustomerByCpfCnpj", { cpfCnpj }, result, null, companyId, Date.now() - start)
      return result
    } catch (error) {
      await this.logTransaction("getCustomerByCpfCnpj", { cpfCnpj }, null, error, companyId, Date.now() - start)
      throw error
    }
  }

  async createPayment(params: CreatePaymentParams, companyId?: string): Promise<ProviderPayment> {
    const start = Date.now()
    try {
      const result = await this.provider.createPayment(params)
      await this.logTransaction("createPayment", params, result, null, companyId, Date.now() - start)
      return result
    } catch (error) {
      await this.logTransaction("createPayment", params, null, error, companyId, Date.now() - start)
      throw error
    }
  }

  async getPayment(paymentId: string, companyId?: string): Promise<ProviderPayment> {
    const start = Date.now()
    try {
      const result = await this.provider.getPayment(paymentId)
      await this.logTransaction("getPayment", { paymentId }, result, null, companyId, Date.now() - start)
      return result
    } catch (error) {
      await this.logTransaction("getPayment", { paymentId }, null, error, companyId, Date.now() - start)
      throw error
    }
  }

  async getPaymentByExternalReference(externalReference: string, companyId?: string): Promise<ProviderPayment | null> {
    const start = Date.now()
    try {
      const result = await this.provider.getPaymentByExternalReference(externalReference)
      await this.logTransaction("getPaymentByExternalReference", { externalReference }, result, null, companyId, Date.now() - start)
      return result
    } catch (error) {
      await this.logTransaction("getPaymentByExternalReference", { externalReference }, null, error, companyId, Date.now() - start)
      throw error
    }
  }

  async refundPayment(params: RefundParams, companyId?: string): Promise<ProviderPayment> {
    const start = Date.now()
    try {
      const result = await this.provider.refundPayment(params)
      await this.logTransaction("refundPayment", params, result, null, companyId, Date.now() - start)
      return result
    } catch (error) {
      await this.logTransaction("refundPayment", params, null, error, companyId, Date.now() - start)
      throw error
    }
  }

  async cancelPayment(paymentId: string, companyId?: string): Promise<void> {
    const start = Date.now()
    try {
      await this.provider.cancelPayment(paymentId)
      await this.logTransaction("cancelPayment", { paymentId }, null, null, companyId, Date.now() - start)
    } catch (error) {
      await this.logTransaction("cancelPayment", { paymentId }, null, error, companyId, Date.now() - start)
      throw error
    }
  }

  parseWebhook(body: unknown): WebhookPayload {
    return this.provider.parseWebhook(body)
  }

  private async logTransaction(
    operation: string,
    requestData: unknown,
    responseData: unknown,
    error: unknown,
    companyId: string | undefined,
    durationMs: number
  ): Promise<void> {
    if (!this.repository) return

    try {
      await this.repository.log({
        provider: this.provider.name,
        operation,
        request_data: requestData as Record<string, unknown>,
        response_data: responseData as Record<string, unknown> | null,
        error_message: error instanceof Error ? error.message : error ? String(error) : null,
        company_id: companyId || null,
        duration_ms: durationMs,
      })
    } catch (logError) {
      // Never let logging failures break the payment flow
      console.error("[payment-api] Failed to log transaction:", logError)
    }
  }
}
