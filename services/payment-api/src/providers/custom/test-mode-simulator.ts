import type { BillingType, PaymentStatus } from "../../interfaces/payment-provider.js"
import { v4 as uuidv4 } from "uuid"

export interface SimulatedCustomer {
  id: string
  name: string
  email?: string
  phone?: string
  mobilePhone?: string
  cpfCnpj: string
  createdAt: Date
}

export interface SimulatedPayment {
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
  paymentUrl: string
  boletoUrl?: string
  pixQrCodeUrl?: string
  createdAt: Date
}

export class TestModeSimulator {
  private customers = new Map<string, SimulatedCustomer>()
  private customersByCpfCnpj = new Map<string, string>()
  private payments = new Map<string, SimulatedPayment>()
  private paymentsByExternalRef = new Map<string, string>()

  createCustomer(params: {
    name: string
    cpfCnpj: string
    email?: string
    phone?: string
    mobilePhone?: string
  }): SimulatedCustomer {
    // Return existing if cpfCnpj already registered
    const existingId = this.customersByCpfCnpj.get(params.cpfCnpj)
    if (existingId) {
      return this.customers.get(existingId)!
    }

    const customer: SimulatedCustomer = {
      id: `test_cus_${uuidv4().slice(0, 8)}`,
      name: params.name,
      email: params.email,
      phone: params.phone,
      mobilePhone: params.mobilePhone,
      cpfCnpj: params.cpfCnpj,
      createdAt: new Date(),
    }

    this.customers.set(customer.id, customer)
    this.customersByCpfCnpj.set(params.cpfCnpj, customer.id)
    return customer
  }

  getCustomerByCpfCnpj(cpfCnpj: string): SimulatedCustomer | null {
    const id = this.customersByCpfCnpj.get(cpfCnpj)
    if (!id) return null
    return this.customers.get(id) || null
  }

  createPayment(params: {
    customerId: string
    billingType: BillingType
    value: number
    dueDate: string
    description?: string
    externalReference?: string
    installmentCount?: number
    installmentValue?: number
  }): SimulatedPayment {
    const paymentId = `test_pay_${uuidv4().slice(0, 8)}`

    const payment: SimulatedPayment = {
      id: paymentId,
      customerId: params.customerId,
      billingType: params.billingType,
      value: params.value,
      dueDate: params.dueDate,
      description: params.description,
      externalReference: params.externalReference,
      installmentCount: params.installmentCount,
      installmentValue: params.installmentValue,
      status: "pending",
      paymentUrl: `https://test-gateway.local/pay/${paymentId}`,
      boletoUrl: params.billingType === "BOLETO" ? this.generateTestBoletoUrl(paymentId) : undefined,
      pixQrCodeUrl: params.billingType === "PIX" ? this.generateTestPixQrCodeUrl(paymentId) : undefined,
      createdAt: new Date(),
    }

    // For UNDEFINED billing type, generate both
    if (params.billingType === "UNDEFINED") {
      payment.boletoUrl = this.generateTestBoletoUrl(paymentId)
      payment.pixQrCodeUrl = this.generateTestPixQrCodeUrl(paymentId)
    }

    this.payments.set(paymentId, payment)
    if (params.externalReference) {
      this.paymentsByExternalRef.set(params.externalReference, paymentId)
    }

    return payment
  }

  getPayment(paymentId: string): SimulatedPayment | null {
    return this.payments.get(paymentId) || null
  }

  getPaymentByExternalReference(externalReference: string): SimulatedPayment | null {
    const id = this.paymentsByExternalRef.get(externalReference)
    if (!id) return null
    return this.payments.get(id) || null
  }

  simulatePaymentConfirmation(paymentId: string): SimulatedPayment | null {
    const payment = this.payments.get(paymentId)
    if (!payment) return null
    payment.status = "confirmed"
    return payment
  }

  simulatePaymentReceived(paymentId: string): SimulatedPayment | null {
    const payment = this.payments.get(paymentId)
    if (!payment) return null
    payment.status = "received"
    return payment
  }

  simulatePaymentOverdue(paymentId: string): SimulatedPayment | null {
    const payment = this.payments.get(paymentId)
    if (!payment) return null
    payment.status = "overdue"
    return payment
  }

  simulateRefund(paymentId: string): SimulatedPayment | null {
    const payment = this.payments.get(paymentId)
    if (!payment) return null
    payment.status = "refunded"
    return payment
  }

  cancelPayment(paymentId: string): boolean {
    const payment = this.payments.get(paymentId)
    if (!payment) return false
    payment.status = "cancelled"
    return true
  }

  private generateTestBoletoUrl(paymentId: string): string {
    return `https://test-gateway.local/boleto/${paymentId}`
  }

  private generateTestPixQrCodeUrl(paymentId: string): string {
    return `https://test-gateway.local/pix/${paymentId}`
  }
}
