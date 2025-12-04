"use server"

interface SendSMSParams {
  to: string
  body: string
}

async function getTwilioClient() {
  const twilio = (await import("twilio")).default
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
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

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromPhone = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !fromPhone) {
      console.error("[Twilio] ERROR: Missing credentials")
      return { success: false, error: "Credenciais do Twilio não configuradas" }
    }

    console.log("[Twilio] Calling Twilio REST API...")
    console.log("[Twilio] From:", fromPhone)
    console.log("[Twilio] To:", to)

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: fromPhone,
        To: to,
        Body: body,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("[Twilio] API Error:", data)
      return {
        success: false,
        error: data.message || `Erro Twilio: ${response.status}`,
      }
    }

    console.log("[Twilio Response] SID:", data.sid)
    console.log("[Twilio Response] Status:", data.status)
    console.log("[Twilio Response] To:", data.to)
    console.log("[Twilio Response] From:", data.from)
    console.log("[Twilio] SMS sent successfully!")
    console.log("=".repeat(50))

    return {
      success: true,
      messageId: data.sid,
      message: `SMS enviado com sucesso (SID: ${data.sid})`,
    }
  } catch (error: any) {
    console.error("=".repeat(50))
    console.error("[Twilio] ERROR occurred")
    console.error("[Twilio] Error message:", error.message)
    console.error("[Twilio] Error stack:", error.stack)
    console.error("=".repeat(50))
    return { success: false, error: error.message || "Falha ao enviar SMS" }
  }
}

export async function generateDebtCollectionSMS({
  customerName,
  debtAmount,
  companyName,
  paymentLink,
}: {
  customerName: string
  debtAmount: number
  companyName: string
  paymentLink: string
}): Promise<string> {
  const formattedAmount = debtAmount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })

  return `${companyName} - Cobrança Pendente

Olá ${customerName},

Identificamos uma pendência de ${formattedAmount} em seu nome.

Para regularizar sua situação, acesse:
${paymentLink}

Dúvidas? Entre em contato conosco.

Atenciosamente,
${companyName}`
}
