import type { PaymentProvider, WebhookPayload } from "../interfaces/payment-provider.js"

export interface WebhookResult {
  agreementId: string | null
  paymentStatus: string
  agreementStatus: string
  event: string
}

export interface AgreementUpdate {
  payment_status: string
  status: string
  payment_received_at?: string
  updated_at: string
}

export class WebhookService {
  constructor(private provider: PaymentProvider) {}

  parseWebhook(body: unknown): WebhookPayload {
    return this.provider.parseWebhook(body)
  }

  /**
   * Derives agreement status updates from a webhook event.
   * The actual DB update is performed by the server action / webhook route
   * so this service remains decoupled from Supabase.
   */
  deriveStatusUpdate(
    event: string,
    currentPaymentStatus: string,
    currentAgreementStatus: string
  ): AgreementUpdate {
    let paymentStatus = currentPaymentStatus
    let agreementStatus = currentAgreementStatus
    let paymentReceivedAt: string | undefined

    switch (event) {
      case "PAYMENT_CREATED":
        paymentStatus = "pending"
        break

      case "PAYMENT_CONFIRMED":
        paymentStatus = "confirmed"
        break

      case "PAYMENT_RECEIVED":
        paymentStatus = "received"
        agreementStatus = "paid"
        paymentReceivedAt = new Date().toISOString()
        break

      case "PAYMENT_OVERDUE":
        paymentStatus = "overdue"
        break

      case "PAYMENT_REFUNDED":
        paymentStatus = "refunded"
        agreementStatus = "cancelled"
        break

      case "PAYMENT_DELETED":
        agreementStatus = "cancelled"
        break
    }

    const update: AgreementUpdate = {
      payment_status: paymentStatus,
      status: agreementStatus,
      updated_at: new Date().toISOString(),
    }

    if (paymentReceivedAt) {
      update.payment_received_at = paymentReceivedAt
    }

    return update
  }
}
