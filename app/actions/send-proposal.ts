"use server"

import { sendPaymentLink } from "./send-payment-link"

export async function sendProposal(agreementId: string, channel: "email" | "sms" | "whatsapp") {
  return await sendPaymentLink(agreementId, channel, {})
}
