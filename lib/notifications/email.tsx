"use server"

/**
 * Email Notifications Module
 *
 * IMPORTANT: This module sends ALL emails through the BullMQ queue.
 * Emails are processed by the email worker and sent via SendGrid.
 *
 * ASAAS should NEVER send email notifications (emailNotificationEnabled: false).
 * AlteaPay handles ALL customer emails through this queue system.
 */

import { queueEmail, type EmailJobData } from "@/lib/queue"

interface SendEmailParams {
  to: string
  subject: string
  html?: string
  body?: string
  text?: string
  replyTo?: string
  from?: string
  fromName?: string
  metadata?: {
    customerId?: string
    companyId?: string
    agreementId?: string
    templateName?: string
    [key: string]: string | undefined
  }
}

/**
 * Send email via queue (processed by SendGrid worker)
 *
 * This function adds the email to the BullMQ queue for async processing.
 * The email worker will send it via SendGrid with retry logic.
 */
export async function sendEmail({ to, subject, html, body, text, replyTo, from, fromName, metadata }: SendEmailParams) {
  try {
    console.log("=".repeat(50))
    console.log("[Email Queue] Adding email to queue")
    console.log("[Email Queue] To:", to)
    console.log("[Email Queue] Subject:", subject)

    if (!to) {
      console.error("[Email Queue] ERROR: Email address is required")
      return { success: false, error: "Email é obrigatório" }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      console.error("[Email Queue] ERROR: Invalid email format")
      return { success: false, error: "Formato de email inválido" }
    }

    const htmlContent = html || body || ""
    if (!htmlContent) {
      console.error("[Email Queue] ERROR: Email content is required")
      return { success: false, error: "Conteúdo do email é obrigatório" }
    }

    console.log("[Email Queue] Validation passed, adding to queue...")

    const emailData: EmailJobData = {
      to,
      subject,
      html: htmlContent,
      text: text || stripHtml(htmlContent),
      replyTo: replyTo || "relacionamento@alteapay.com",
      from,
      fromName,
      metadata,
    }

    const job = await queueEmail(emailData)

    console.log("[Email Queue] Job added successfully, ID:", job.id)
    console.log("=".repeat(50))

    return {
      success: true,
      jobId: job.id,
      message: `✅ Email adicionado à fila (Job ID: ${job.id})`,
    }
  } catch (error: any) {
    console.error("=".repeat(50))
    console.error("[Email Queue] EXCEPTION occurred")
    console.error("[Email Queue] Error message:", error.message)
    console.error("=".repeat(50))
    return { success: false, error: error.message || "Falha ao adicionar email à fila" }
  }
}

/**
 * Send email synchronously via SendGrid (bypasses queue)
 * Use only for critical emails that cannot be delayed
 */
export async function sendEmailSync({ to, subject, html, body, text, replyTo }: SendEmailParams) {
  try {
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
    const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@alteapay.com"
    const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || "AlteaPay"
    const SENDGRID_REPLY_TO = process.env.SENDGRID_REPLY_TO || "relacionamento@alteapay.com"

    if (!SENDGRID_API_KEY) {
      console.error("[SendGrid] ERROR: SENDGRID_API_KEY not configured")
      return { success: false, error: "SendGrid API key não configurada" }
    }

    if (!to) {
      return { success: false, error: "Email é obrigatório" }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return { success: false, error: "Formato de email inválido" }
    }

    const htmlContent = html || body || ""

    const payload = {
      personalizations: [
        {
          to: [{ email: to }],
          subject,
        },
      ],
      from: {
        email: SENDGRID_FROM_EMAIL,
        name: SENDGRID_FROM_NAME,
      },
      reply_to: {
        email: replyTo || SENDGRID_REPLY_TO,
      },
      content: [
        ...(text ? [{ type: "text/plain", value: text }] : []),
        { type: "text/html", value: htmlContent },
      ],
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error("[SendGrid] Error:", response.status, errorBody)
      return { success: false, error: `SendGrid error: ${response.status}` }
    }

    const messageId = response.headers.get("x-message-id") || undefined

    return {
      success: true,
      messageId,
      message: `✅ Email enviado com sucesso (ID: ${messageId})`,
    }
  } catch (error: any) {
    console.error("[SendGrid] Exception:", error.message)
    return { success: false, error: error.message || "Falha ao enviar email" }
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

export async function generateDebtCollectionEmail({
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
}): Promise<string> {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lembrete de Pagamento - ${companyName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

                <!-- Header -->
                <tr>
                  <td style="padding: 30px 30px 20px 30px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #2d2d4a 100%); border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
                      ${companyName}
                    </h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                      Olá ${customerName},
                    </p>

                    <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Este é um lembrete sobre um pagamento pendente relacionado aos serviços da empresa ${companyName}.
                      Estamos entrando em contato para facilitar a regularização da sua situação financeira.
                    </p>

                    <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Nosso objetivo é ajudá-lo a manter sua conta em dia e evitar qualquer transtorno.
                      Valorizamos muito seu relacionamento conosco.
                    </p>

                    <!-- Invoice Details Box -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin: 25px 0;">
                      <tr>
                        <td style="padding: 25px;">
                          <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                            Detalhes do Pagamento
                          </p>
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="color: #6b7280; font-size: 14px;">Valor a Pagar</span>
                              </td>
                              <td style="padding: 10px 0; text-align: right; border-bottom: 1px solid #e5e7eb;">
                                <span style="color: #1f2937; font-size: 20px; font-weight: 700;">R$ ${debtAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 10px 0;">
                                <span style="color: #6b7280; font-size: 14px;">Vencimento</span>
                              </td>
                              <td style="padding: 10px 0; text-align: right;">
                                <span style="color: #1f2937; font-size: 16px; font-weight: 600;">${dueDate}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 25px 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Para facilitar o processo de pagamento, disponibilizamos uma área exclusiva onde você pode
                      visualizar todos os detalhes e escolher a forma de pagamento mais conveniente para você.
                    </p>

                    <p style="margin: 0 0 25px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Acesse a área de pagamento clicando no botão abaixo:
                    </p>

                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; margin: 30px 0;">
                      <tr>
                        <td style="text-align: center;">
                          <a href="${paymentLink}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #d4a843 0%, #b8922e 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(212, 168, 67, 0.3);">
                            Acessar Área de Pagamento
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      Se você já realizou o pagamento, por favor desconsidere este email.
                      Caso tenha alguma dúvida ou necessite de assistência, nossa equipe está à disposição
                      para ajudá-lo através do email relacionamento@alteapay.com
                    </p>

                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

                    <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.5;">
                      Atenciosamente,<br>
                      <strong style="color: #1f2937;">${companyName}</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 25px 30px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px; text-align: center; line-height: 1.5;">
                      Este é um email transacional enviado automaticamente pelo sistema AlteaPay.<br>
                      Por favor, não responda diretamente a este email.
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center; line-height: 1.5;">
                      Para suporte: relacionamento@alteapay.com
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}
