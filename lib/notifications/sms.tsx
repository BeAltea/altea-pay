"use server"

import twilio from "twilio"

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

interface SendSMSParams {
  to: string
  body: string
}

export async function sendSMS({ to, body }: SendSMSParams) {
  try {
    console.log("=".repeat(50))
    console.log("[Twilio] Starting SMS send")
    console.log("[Twilio] Original phone:", to)
    console.log("[Twilio] Body preview:", body.substring(0, 100))

    if (!to.startsWith("+")) {
      console.error("[Twilio] ERROR: Phone must start with +")
      return { success: false, error: "Telefone deve estar no formato internacional (+55...)" }
    }

    const phoneDigits = to.replace(/\D/g, "")
    if (phoneDigits.length < 12) {
      console.error("[Twilio] ERROR: Phone too short:", phoneDigits.length)
      return { success: false, error: `Telefone inválido: ${phoneDigits.length} dígitos (mínimo 12 dígitos)` }
    }

    console.log("[Twilio] Phone validation passed")
    console.log("[Twilio] Phone digits:", phoneDigits.length)
    console.log("[Twilio] Formatted phone:", to)

    console.log("[Twilio] Calling Twilio API...")
    console.log("[Twilio] From:", process.env.TWILIO_PHONE_NUMBER)
    console.log("[Twilio] To:", to)

    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to, // Usar o telefone já formatado
    })

    console.log("[Twilio Response] SID:", message.sid)
    console.log("[Twilio Response] Status:", message.status)
    console.log("[Twilio Response] To:", message.to)
    console.log("[Twilio Response] From:", message.from)
    console.log("[Twilio Response] Date sent:", message.dateSent)
    console.log("[Twilio Response] Full response:", JSON.stringify(message, null, 2))
    console.log("[Twilio] SMS sent successfully!")
    console.log("=".repeat(50))

    return { success: true, messageId: message.sid, message: `SMS enviado com sucesso (SID: ${message.sid})` }
  } catch (error: any) {
    console.error("=".repeat(50))
    console.error("[Twilio] ERROR occurred")
    console.error("[Twilio] Error message:", error.message)
    console.error("[Twilio] Error code:", error.code)
    console.error("[Twilio] Error status:", error.status)
    console.error("[Twilio] Error stack:", error.stack)
    console.error("[Twilio] Full error:", JSON.stringify(error, null, 2))
    console.error("=".repeat(50))
    return { success: false, error: error.message || "Falha ao enviar SMS" }
  }
}

export function generateDebtCollectionSMS({
  customerName,
  debtAmount,
  companyName,
  paymentLink,
}: {
  customerName: string
  debtAmount: number
  companyName: string
  paymentLink: string
}): string {
  return `Olá ${customerName}, você possui uma cobrança pendente de R$ ${debtAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} com ${companyName}. Acesse ${paymentLink} para pagar. Atenciosamente, ${companyName}`
}
// </CHANGE>
