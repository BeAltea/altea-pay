/**
 * Negotiation Request Constants
 *
 * Centralized definitions for negotiation request types and statuses.
 */

// Request types
export const NEGOTIATION_REQUEST_TYPES = {
  DISCOUNT: "discount",
  INSTALLMENT: "installment",
  BOTH: "both",
} as const

export type NegotiationRequestType = (typeof NEGOTIATION_REQUEST_TYPES)[keyof typeof NEGOTIATION_REQUEST_TYPES]

// Request statuses
export const NEGOTIATION_REQUEST_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
} as const

export type NegotiationRequestStatus = (typeof NEGOTIATION_REQUEST_STATUSES)[keyof typeof NEGOTIATION_REQUEST_STATUSES]

// Status display labels (Portuguese)
export const REQUEST_STATUS_LABELS: Record<NegotiationRequestStatus, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Rejeitada",
  cancelled: "Cancelada",
}

// Status colors for UI
export const REQUEST_STATUS_COLORS: Record<NegotiationRequestStatus, string> = {
  pending: "yellow",
  approved: "green",
  rejected: "red",
  cancelled: "gray",
}

// Request type display labels (Portuguese)
export const REQUEST_TYPE_LABELS: Record<NegotiationRequestType, string> = {
  discount: "Desconto",
  installment: "Parcelamento",
  both: "Desconto e Parcelamento",
}

// Roles that can create requests
export const REQUEST_CREATOR_ROLES = ["user", "super_admin"] as const

// Roles that can approve/reject requests
export const REQUEST_RESPONDER_ROLES = ["admin", "super_admin"] as const

// Maximum discount percentage allowed (configurable)
export const MAX_DISCOUNT_PERCENTAGE = 50

// Maximum installments allowed (configurable)
export const MAX_INSTALLMENTS = 24

// Minimum installment amount in BRL
export const MIN_INSTALLMENT_AMOUNT = 50

/**
 * Validate a discount percentage
 */
export function isValidDiscountPercentage(percentage: number): boolean {
  return percentage >= 0 && percentage <= MAX_DISCOUNT_PERCENTAGE
}

/**
 * Validate installments count
 */
export function isValidInstallments(installments: number): boolean {
  return installments >= 1 && installments <= MAX_INSTALLMENTS
}

/**
 * Calculate installment amount
 */
export function calculateInstallmentAmount(
  totalAmount: number,
  discountPercentage: number,
  installments: number
): number {
  const discountedAmount = totalAmount * (1 - discountPercentage / 100)
  return Math.ceil((discountedAmount / installments) * 100) / 100 // Round up to 2 decimals
}

/**
 * Check if a request can be modified by the user
 */
export function canUserModifyRequest(status: NegotiationRequestStatus): boolean {
  return status === NEGOTIATION_REQUEST_STATUSES.PENDING
}

/**
 * Check if a request can be responded to by admin
 */
export function canAdminRespondToRequest(status: NegotiationRequestStatus): boolean {
  return status === NEGOTIATION_REQUEST_STATUSES.PENDING
}

// Interface for negotiation request
export interface NegotiationRequest {
  id: string
  agreement_id: string | null
  customer_id: string | null
  company_id: string
  vmax_id: string | null
  customer_name: string | null
  customer_document: string | null
  customer_email: string | null
  customer_phone: string | null
  original_amount: number
  original_due_date: string | null
  original_installments: number
  original_discount_percentage: number
  request_type: NegotiationRequestType
  requested_discount_percentage: number | null
  requested_installments: number | null
  requested_first_due_date: string | null
  customer_justification: string | null
  original_asaas_payment_id: string | null
  new_asaas_payment_id: string | null
  status: NegotiationRequestStatus
  admin_response: string | null
  created_at: string
  updated_at: string
  responded_at: string | null
  responded_by: string | null
  created_by: string | null
  created_by_role: string | null
}

// Interface for creating a request
export interface CreateNegotiationRequestInput {
  agreement_id?: string
  customer_id?: string
  company_id: string
  vmax_id?: string
  customer_name?: string
  customer_document?: string
  customer_email?: string
  customer_phone?: string
  original_amount: number
  original_due_date?: string
  original_installments?: number
  original_discount_percentage?: number
  request_type: NegotiationRequestType
  requested_discount_percentage?: number
  requested_installments?: number
  requested_first_due_date?: string
  customer_justification?: string
  original_asaas_payment_id?: string
}

// Interface for responding to a request
export interface RespondToNegotiationRequestInput {
  status: "approved" | "rejected"
  admin_response?: string
}
