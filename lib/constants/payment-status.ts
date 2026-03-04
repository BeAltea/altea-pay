/**
 * Payment Status Constants
 *
 * Centralized definitions for payment status values used across the application.
 * IMPORTANT: Keep these in sync with ASAAS webhook mappings.
 */

// Agreement statuses that indicate the debt is PAID
export const PAID_AGREEMENT_STATUSES = ["paid", "completed"] as const

// Payment statuses that indicate the payment was RECEIVED (money in account)
export const PAID_PAYMENT_STATUSES = ["received"] as const

// ASAAS statuses that indicate the payment was RECEIVED
export const PAID_ASAAS_STATUSES = ["RECEIVED", "RECEIVED_IN_CASH"] as const

// VMAX negotiation statuses that indicate PAID
export const PAID_VMAX_STATUSES = ["PAGO"] as const

// All possible "paid" status values (for SQL IN clauses)
export const ALL_PAID_STATUSES = [
  ...PAID_AGREEMENT_STATUSES,
  ...PAID_PAYMENT_STATUSES,
  ...PAID_ASAAS_STATUSES,
  ...PAID_VMAX_STATUSES,
] as const

/**
 * Check if a combination of status values indicates the debt is PAID
 *
 * @param agreementStatus - Agreement status (paid, completed, active, etc.)
 * @param paymentStatus - Payment status from ASAAS webhook (received, confirmed, pending, etc.)
 * @param asaasStatus - Raw ASAAS status (RECEIVED, CONFIRMED, PENDING, etc.)
 * @param vmaxNegotiationStatus - VMAX negotiation_status field (PAGO, etc.)
 */
export function isPaidStatus(
  agreementStatus?: string | null,
  paymentStatus?: string | null,
  asaasStatus?: string | null,
  vmaxNegotiationStatus?: string | null
): boolean {
  // Check agreement status
  if (agreementStatus && PAID_AGREEMENT_STATUSES.includes(agreementStatus as any)) {
    return true
  }

  // Check payment status (from webhook)
  if (paymentStatus && PAID_PAYMENT_STATUSES.includes(paymentStatus as any)) {
    return true
  }

  // Check raw ASAAS status
  if (asaasStatus && PAID_ASAAS_STATUSES.includes(asaasStatus as any)) {
    return true
  }

  // Check VMAX negotiation status
  if (vmaxNegotiationStatus && PAID_VMAX_STATUSES.includes(vmaxNegotiationStatus as any)) {
    return true
  }

  return false
}

/**
 * Check if a single status string indicates PAID
 * Useful for simple checks against any status field
 */
export function isAnyPaidStatus(status?: string | null): boolean {
  if (!status) return false
  const normalizedStatus = status.toUpperCase()
  return (
    normalizedStatus === "PAID" ||
    normalizedStatus === "COMPLETED" ||
    normalizedStatus === "RECEIVED" ||
    normalizedStatus === "RECEIVED_IN_CASH" ||
    normalizedStatus === "PAGO"
  )
}
