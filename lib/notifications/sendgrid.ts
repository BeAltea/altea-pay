"use server"

interface SendGridEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

interface SendGridResponse {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendEmailViaSendGrid({
  to,
  subject,
  html,
  text,
}: SendGridEmailParams): Promise<SendGridResponse> {
  try {
    console.log("=".repeat(50))
    console.log("[SendGrid] Starting email send")
    console.log("[SendGrid] To:", Array.isArray(to) ? to.length + " recipients" : to)
    console.log("[SendGrid] Subject:", subject)

    const apiKey = process.env.SENDGRID_API_KEY
    const senderEmail = process.env.SENDGRID_SENDER_EMAIL || "noreply@alteapay.com"
    const senderName = process.env.SENDGRID_SENDER_NAME || "AlteaPay"

    if (!apiKey) {
      console.error("[SendGrid] ERROR: SENDGRID_API_KEY not configured")
      return { success: false, error: "SENDGRID_API_KEY não configurada" }
    }

    const recipients = Array.isArray(to) ? to : [to]

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = recipients.filter((email) => !emailRegex.test(email))
    if (invalidEmails.length > 0) {
      console.error("[SendGrid] ERROR: Invalid email formats:", invalidEmails)
      return { success: false, error: `Emails inválidos: ${invalidEmails.join(", ")}` }
    }

    console.log("[SendGrid] Calling SendGrid API...")

    // Prepare personalizations for bulk sending
    const personalizations = recipients.map((email) => ({
      to: [{ email }],
    }))

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations,
        from: {
          email: senderEmail,
          name: senderName,
        },
        subject,
        content: [
          ...(text ? [{ type: "text/plain", value: text }] : []),
          { type: "text/html", value: html },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[SendGrid] ERROR from API:", response.status, errorData)
      console.error("=".repeat(50))

      const errorMessage = errorData.errors?.[0]?.message || `Erro HTTP ${response.status}`
      return { success: false, error: errorMessage }
    }

    // SendGrid returns 202 Accepted for successful sends
    const messageId = response.headers.get("x-message-id") || `sg-${Date.now()}`

    console.log("[SendGrid Response] Message ID:", messageId)
    console.log("[SendGrid] Email(s) sent successfully!")
    console.log("=".repeat(50))

    return {
      success: true,
      messageId,
    }
  } catch (error: unknown) {
    console.error("=".repeat(50))
    console.error("[SendGrid] EXCEPTION occurred")
    console.error("[SendGrid] Error message:", error instanceof Error ? error.message : String(error))
    console.error("=".repeat(50))
    return { success: false, error: error instanceof Error ? error.message : "Falha ao enviar email" }
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

export async function sendBulkEmailViaSendGrid({
  recipients,
  subject,
  html,
}: {
  recipients: string[]
  subject: string
  html: string
}): Promise<SendGridResponse> {
  console.log("[SendGrid] Sending bulk email to", recipients.length, "recipients")

  // SendGrid allows up to 1000 recipients per request
  // For larger lists, we need to batch
  const batchSize = 1000
  const batches: string[][] = []

  for (let i = 0; i < recipients.length; i += batchSize) {
    batches.push(recipients.slice(i, i + batchSize))
  }

  console.log("[SendGrid] Split into", batches.length, "batches")

  let totalSent = 0
  const errors: string[] = []

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    console.log(`[SendGrid] Sending batch ${i + 1}/${batches.length} (${batch.length} recipients)`)

    const result = await sendEmailViaSendGrid({
      to: batch,
      subject,
      html,
      text: stripHtml(html),
    })

    if (result.success) {
      totalSent += batch.length
    } else {
      errors.push(`Batch ${i + 1}: ${result.error}`)
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: `Enviados: ${totalSent}/${recipients.length}. Erros: ${errors.join("; ")}`,
    }
  }

  return {
    success: true,
    messageId: `bulk-${Date.now()}`,
  }
}
