import type { PaymentStatus, WebhookEventType } from "../../interfaces/payment-provider.js"

const statusMap: Record<string, PaymentStatus> = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  RECEIVED: "received",
  OVERDUE: "overdue",
  REFUNDED: "refunded",
  DELETED: "deleted",
  REFUND_REQUESTED: "refunded",
  CHARGEBACK_REQUESTED: "refunded",
  CHARGEBACK_DISPUTE: "refunded",
  AWAITING_CHARGEBACK_REVERSAL: "refunded",
  DUNNING_REQUESTED: "overdue",
  DUNNING_RECEIVED: "received",
  AWAITING_RISK_ANALYSIS: "pending",
}

export function mapAsaasStatus(asaasStatus: string): PaymentStatus {
  return statusMap[asaasStatus] || "pending"
}

const eventMap: Record<string, WebhookEventType> = {
  PAYMENT_CREATED: "PAYMENT_CREATED",
  PAYMENT_UPDATED: "PAYMENT_CONFIRMED",
  PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  PAYMENT_OVERDUE: "PAYMENT_OVERDUE",
  PAYMENT_DELETED: "PAYMENT_DELETED",
  PAYMENT_RESTORED: "PAYMENT_CREATED",
  PAYMENT_REFUNDED: "PAYMENT_REFUNDED",
  PAYMENT_RECEIVED_IN_CASH_UNDONE: "PAYMENT_REFUNDED",
  PAYMENT_CHARGEBACK_REQUESTED: "PAYMENT_REFUNDED",
  PAYMENT_CHARGEBACK_DISPUTE: "PAYMENT_REFUNDED",
  PAYMENT_AWAITING_CHARGEBACK_REVERSAL: "PAYMENT_REFUNDED",
  PAYMENT_DUNNING_RECEIVED: "PAYMENT_RECEIVED",
  PAYMENT_DUNNING_REQUESTED: "PAYMENT_OVERDUE",
  PAYMENT_BANK_SLIP_VIEWED: "PAYMENT_CONFIRMED",
  PAYMENT_CHECKOUT_VIEWED: "PAYMENT_CONFIRMED",
}

export function mapAsaasEvent(asaasEvent: string): WebhookEventType {
  return eventMap[asaasEvent] || "PAYMENT_CREATED"
}
