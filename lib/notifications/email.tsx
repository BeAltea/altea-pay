"use server"

import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailParams {
  to: string
  subject: string
  body: string
}

export async function sendEmail({ to, subject, body }: SendEmailParams) {
  try {
    console.log("[Resend] Sending email to:", to)
    console.log("[Resend] Subject:", subject)
    console.log("[Resend] Body preview:", body.substring(0, 100))

    const data = await resend.emails.send({
      from: "notificacoes@alteapay.com",
      to,
      subject,
      html: `<p>${body}</p>`,
    })

    console.log("[Resend] Email sent successfully:", data.id)
    return { success: true, messageId: data.id }
  } catch (error: any) {
    console.error("[Resend] ERROR:", error)
    return { success: false, message: error.message || "Failed to send email" }
  }
}
