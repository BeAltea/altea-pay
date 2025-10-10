"use server"

import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailParams {
  to: string
  subject: string
  html?: string
  body?: string
}

export async function sendEmail({ to, subject, html, body }: SendEmailParams) {
  try {
    console.log("=".repeat(50))
    console.log("[Resend] Starting email send")
    console.log("[Resend] To:", to)
    console.log("[Resend] Subject:", subject)
    console.log("[Resend] Body/HTML preview:", (html || body || "").substring(0, 100))

    if (!to) {
      console.error("[Resend] ERROR: Email address is required")
      return { success: false, error: "Email é obrigatório" }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      console.error("[Resend] ERROR: Invalid email format")
      return { success: false, error: "Formato de email inválido" }
    }

    console.log("[Resend] Email validation passed")
    console.log("[Resend] Calling Resend API...")

    const { data, error } = await resend.emails.send({
      from: "Altea Pay <onboarding@resend.dev>",
      to: [to],
      subject,
      html: html || body || "",
    })

    if (error) {
      console.error("[Resend] ERROR from API:", error)
      console.error("[Resend] Error details:", JSON.stringify(error, null, 2))
      console.error("=".repeat(50))
      return { success: false, error: error.message || "Falha ao enviar email" }
    }

    console.log("[Resend Response] ID:", data?.id)
    console.log("[Resend Response] Full response:", JSON.stringify(data, null, 2))
    console.log("[Resend] Email sent successfully!")
    console.log("=".repeat(50))

    return { success: true, messageId: data?.id, message: `Email enviado com sucesso (ID: ${data?.id})` }
  } catch (error: any) {
    console.error("=".repeat(50))
    console.error("[Resend] EXCEPTION occurred")
    console.error("[Resend] Error message:", error.message)
    console.error("[Resend] Error stack:", error.stack)
    console.error("[Resend] Full error:", JSON.stringify(error, null, 2))
    console.error("=".repeat(50))
    return { success: false, error: error.message || "Falha ao enviar email" }
  }
}

export function generateDebtCollectionEmail({
  customerName,
  debtAmount,
  dueDate,
  companyName,
  paymentLink,
}: {
  customerName: string
  debtAmount: number
  dueDate: string
  companyName: string
  paymentLink: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Cobrança Pendente</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Cobrança Pendente</h2>
          <p>Olá ${customerName},</p>
          <p>Você possui uma cobrança pendente com ${companyName}:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Valor:</strong> R$ ${debtAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            <p style="margin: 5px 0;"><strong>Vencimento:</strong> ${dueDate}</p>
          </div>
          <p>Para realizar o pagamento, acesse o link abaixo:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${paymentLink}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Pagar Agora</a>
          </p>
          <p>Atenciosamente,<br>${companyName}</p>
        </div>
      </body>
    </html>
  `
}
