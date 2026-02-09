"use server"

import { Resend } from "resend"

interface SendEmailParams {
  to: string
  subject: string
  html?: string
  body?: string
  text?: string
}

export async function sendEmail({ to, subject, html, body, text }: SendEmailParams) {
  try {
    console.log("=".repeat(50))
    console.log("[Resend] Starting email send")
    console.log("[Resend] To:", to)
    console.log("[Resend] Subject:", subject)

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

    if (!process.env.RESEND_API_KEY) {
      console.error("[Resend] ERROR: RESEND_API_KEY not configured")
      return { success: false, error: "API key do Resend não configurada" }
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const { data, error } = await resend.emails.send({
      from: "AlteaPay Cobranças <relacionamento@alteapay.com>",
      to: [to],
      subject,
      html: html || body || "",
      text: text || stripHtml(html || body || ""),
      replyTo: "relacionamento@alteapay.com",
      headers: {
        "X-Entity-Ref-ID": `alteapay-${Date.now()}`,
        "List-Unsubscribe": "<mailto:relacionamento@alteapay.com?subject=unsubscribe>",
        Precedence: "bulk",
      },
      tags: [{ name: "category", value: "payment-reminder" }],
    })

    if (error) {
      console.error("[Resend] ERROR from API:", error)
      console.error("[Resend] Error details:", JSON.stringify(error, null, 2))
      console.error("=".repeat(50))

      if (error.message?.includes("testing emails") || error.message?.includes("not verified")) {
        return {
          success: false,
          error:
            "⚠️ Domínio alteapay.com não verificado no Resend. Adicione os registros DNS (SPF, DKIM) no seu provedor de domínio e aguarde verificação.",
        }
      }

      return { success: false, error: error.message || "Falha ao enviar email" }
    }

    console.log("[Resend Response] ID:", data?.id)
    console.log("[Resend] Email sent successfully!")
    console.log("=".repeat(50))

    return { success: true, messageId: data?.id, message: `✅ Email enviado com sucesso (ID: ${data?.id})` }
  } catch (error: any) {
    console.error("=".repeat(50))
    console.error("[Resend] EXCEPTION occurred")
    console.error("[Resend] Error message:", error.message)
    console.error("=".repeat(50))
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
