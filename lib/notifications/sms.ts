import twilio from "twilio"

// Initialize Twilio client with credentials from environment
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

export interface SendSMSParams {
  to: string
  body: string
}

export interface SendSMSResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send transactional SMS using Twilio API
 *
 * @param params - SMS parameters
 * @returns Result object with success status and message ID or error
 *
 * @example
 * \`\`\`typescript
 * const result = await sendSMS({
 *   to: '+5511999999999',
 *   body: 'Você tem uma dívida pendente de R$ 150,00. Acesse: https://alteapay.com'
 * })
 * \`\`\`
 */
export async function sendSMS({ to, body }: SendSMSParams): Promise<SendSMSResult> {
  try {
    console.log("[Twilio] Preparing to send SMS")
    console.log("[Twilio] To:", to)
    console.log("[Twilio] Body:", body)

    // Validate environment variables
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error("[Twilio] Credentials not configured")
      throw new Error("Twilio credentials not configured")
    }

    if (!process.env.TWILIO_MESSAGING_SERVICE_SID && !process.env.TWILIO_PHONE_NUMBER) {
      console.error("[Twilio] Messaging service or phone number not configured")
      throw new Error("Twilio messaging service or phone number not configured")
    }

    // Normalize phone number (remove spaces, dashes, parentheses)
    const normalizedPhone = to.replace(/[\s\-()]/g, "")
    console.log("[Twilio] Normalized phone:", normalizedPhone)

    // Ensure phone number starts with +
    const formattedPhone = normalizedPhone.startsWith("+") ? normalizedPhone : `+55${normalizedPhone}`
    console.log("[Twilio] Formatted phone:", formattedPhone)

    console.log("[Twilio] Credentials configured, calling Twilio API...")

    // Send SMS via Twilio
    const message = await twilioClient.messages.create({
      body,
      to: formattedPhone,
      // Use messaging service if available, otherwise use phone number
      ...(process.env.TWILIO_MESSAGING_SERVICE_SID
        ? { messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID }
        : { from: process.env.TWILIO_PHONE_NUMBER }),
    })

    console.log("[Twilio] API call completed")
    console.log("[Twilio] Message SID:", message.sid)
    console.log("[Twilio] Message status:", message.status)
    console.log("[Twilio] SMS sent successfully")

    return {
      success: true,
      messageId: message.sid,
    }
  } catch (error) {
    console.error("[Twilio] Exception caught:", error)
    console.error("[Twilio] Error details:", error instanceof Error ? error.message : "Unknown error")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Generate SMS message for debt collection
 */
export function generateDebtCollectionSMS({
  customerName,
  debtAmount,
  companyName,
  paymentLink,
}: {
  customerName: string
  debtAmount: number
  companyName: string
  paymentLink?: string
}): string {
  const message = `Olá ${customerName}, você tem uma pendência de R$ ${debtAmount.toFixed(2)} com ${companyName}.`

  if (paymentLink) {
    return `${message} Regularize em: ${paymentLink}`
  }

  return `${message} Entre em contato para regularizar.`
}

/**
 * Generate SMS message for agreement confirmation
 */
export function generateAgreementConfirmationSMS({
  customerName,
  totalAmount,
  installments,
}: {
  customerName: string
  totalAmount: number
  installments: number
}): string {
  const installmentValue = (totalAmount / installments).toFixed(2)
  return `Olá ${customerName}, seu acordo foi confirmado! ${installments}x de R$ ${installmentValue}. Você receberá lembretes antes de cada vencimento.`
}

/**
 * Generate SMS message for payment reminder
 */
export function generatePaymentReminderSMS({
  customerName,
  amount,
  dueDate,
}: {
  customerName: string
  amount: number
  dueDate: string
}): string {
  return `Olá ${customerName}, lembrete: pagamento de R$ ${amount.toFixed(2)} vence em ${dueDate}. Evite juros!`
}
