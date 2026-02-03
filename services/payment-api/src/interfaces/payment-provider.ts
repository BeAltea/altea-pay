export type BillingType = "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED"

export type PaymentStatus =
  | "pending"
  | "confirmed"
  | "received"
  | "overdue"
  | "refunded"
  | "cancelled"
  | "deleted"

export type WebhookEventType =
  | "PAYMENT_CREATED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_DELETED"

export interface ProviderCustomer {
  id: string
  name: string
  email?: string
  phone?: string
  mobilePhone?: string
  cpfCnpj: string
}

export interface ProviderPayment {
  id: string
  customerId: string
  billingType: BillingType
  value: number
  dueDate: string
  description?: string
  externalReference?: string
  installmentCount?: number
  installmentValue?: number
  status: PaymentStatus
  paymentUrl?: string
  boletoUrl?: string
  pixQrCodeUrl?: string
  transactionReceiptUrl?: string
}

export interface CreateCustomerParams {
  name: string
  cpfCnpj: string
  email?: string
  phone?: string
  mobilePhone?: string
  postalCode?: string
  address?: string
  addressNumber?: string
}

export interface CreatePaymentParams {
  customer: string
  billingType: BillingType
  value: number
  dueDate: string
  description?: string
  externalReference?: string
  installmentCount?: number
  installmentValue?: number
}

export interface RefundParams {
  paymentId: string
  value?: number
  description?: string
}

export interface WebhookPayload {
  event: WebhookEventType
  payment: {
    id: string
    customer: string
    value: number
    status: string
    externalReference?: string
    subscription?: string
    description?: string
  }
}

export interface PaymentProvider {
  readonly name: string

  createCustomer(params: CreateCustomerParams): Promise<ProviderCustomer>
  getCustomerByCpfCnpj(cpfCnpj: string): Promise<ProviderCustomer | null>
  createPayment(params: CreatePaymentParams): Promise<ProviderPayment>
  getPayment(paymentId: string): Promise<ProviderPayment>
  getPaymentByExternalReference(externalReference: string): Promise<ProviderPayment | null>
  refundPayment(params: RefundParams): Promise<ProviderPayment>
  cancelPayment(paymentId: string): Promise<void>
  parseWebhook(body: unknown): WebhookPayload
}
