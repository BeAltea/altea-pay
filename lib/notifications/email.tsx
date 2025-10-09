import { Resend } from "resend"

// Initialize Resend client with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send transactional email using Resend API
 *
 * @param params - Email parameters
 * @returns Result object with success status and message ID or error
 *
 * @example
 * \`\`\`typescript
 * const result = await sendEmail({
 *   to: 'customer@example.com',
 *   subject: 'Cobrança Pendente',
 *   html: '<p>Você tem uma dívida pendente...</p>'
 * })
 * \`\`\`
 */
export async function sendEmail({
  to,
  subject,
  html,
  from = "Altea Pay <noreply@alteapay.com>",
}: SendEmailParams): Promise<SendEmailResult> {
  try {
    console.log("[Resend] Preparing to send email")
    console.log("[Resend] To:", to)
    console.log("[Resend] Subject:", subject)
    console.log("[Resend] From:", from)

    // Validate environment variable
    if (!process.env.RESEND_API_KEY) {
      console.error("[Resend] RESEND_API_KEY not configured")
      throw new Error("RESEND_API_KEY not configured")
    }

    console.log("[Resend] API Key configured, calling Resend API...")

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    })

    console.log("[Resend] API call completed")
    console.log("[Resend] Response data:", data)
    console.log("[Resend] Response error:", error)

    if (error) {
      console.error("[Resend] Error sending email:", error)
      return {
        success: false,
        error: error.message || "Failed to send email",
      }
    }

    console.log("[Resend] Email sent successfully, message ID:", data?.id)
    return {
      success: true,
      messageId: data?.id,
    }
  } catch (error) {
    console.error("[Resend] Exception caught:", error)
    console.error("[Resend] Error details:", error instanceof Error ? error.message : "Unknown error")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Generate HTML template for debt collection email
 */
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
  paymentLink?: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .amount { font-size: 24px; font-weight: bold; color: #d4af37; }
          .button { display: inline-block; padding: 12px 24px; background: #d4af37; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Altea Pay</h1>
            <p>Notificação de Cobrança</p>
          </div>
          <div class="content">
            <p>Olá, <strong>${customerName}</strong></p>
            <p>Identificamos uma pendência financeira em seu nome junto à <strong>${companyName}</strong>.</p>
            <p>Valor: <span class="amount">R$ ${debtAmount.toFixed(2)}</span></p>
            <p>Vencimento: <strong>${dueDate}</strong></p>
            ${paymentLink ? `<a href="${paymentLink}" class="button">Pagar Agora</a>` : ""}
            <p>Para regularizar sua situação, entre em contato conosco ou realize o pagamento através dos canais disponíveis.</p>
          </div>
          <div class="footer">
            <p>Esta é uma mensagem automática. Por favor, não responda este e-mail.</p>
            <p>&copy; ${new Date().getFullYear()} Altea Pay. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

/**
 * Generate HTML template for agreement confirmation email
 */
export function generateAgreementConfirmationEmail({
  customerName,
  agreementId,
  totalAmount,
  installments,
  companyName,
}: {
  customerName: string
  agreementId: string
  totalAmount: number
  installments: number
  companyName: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .success { color: #22c55e; font-weight: bold; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Altea Pay</h1>
            <p>Confirmação de Acordo</p>
          </div>
          <div class="content">
            <p>Olá, <strong>${customerName}</strong></p>
            <p class="success">✓ Seu acordo foi confirmado com sucesso!</p>
            <p><strong>Número do Acordo:</strong> ${agreementId}</p>
            <p><strong>Empresa:</strong> ${companyName}</p>
            <p><strong>Valor Total:</strong> R$ ${totalAmount.toFixed(2)}</p>
            <p><strong>Parcelas:</strong> ${installments}x de R$ ${(totalAmount / installments).toFixed(2)}</p>
            <p>Você receberá lembretes antes de cada vencimento.</p>
          </div>
          <div class="footer">
            <p>Esta é uma mensagem automática. Por favor, não responda este e-mail.</p>
            <p>&copy; ${new Date().getFullYear()} Altea Pay. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `
}
