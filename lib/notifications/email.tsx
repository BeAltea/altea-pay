import resend from "resend"
import type { SendEmailParams } from "./types" // Assuming SendEmailParams is declared in a types file

export async function sendEmail({ to, subject, body }: SendEmailParams) {
  try {
    console.log("=".repeat(50))
    console.log("[Resend] Starting email send")
    console.log("[Resend] To:", to)
    console.log("[Resend] Subject:", subject)
    console.log("[Resend] Body preview:", body.substring(0, 100))
    console.log("[Resend] Calling Resend API...")

    const { data, error } = await resend.emails.send({
      from: "Altea Pay <onboarding@resend.dev>",
      to: [to],
      subject,
      html: body,
    })

    if (error) {
      console.error("=".repeat(50))
      console.error("[Resend] ERROR occurred")
      console.error("[Resend] Error message:", error.message)
      console.error("[Resend] Full error:", JSON.stringify(error, null, 2))
      console.error("=".repeat(50))
      return { success: false, message: error.message || "Failed to send email" }
    }

    console.log("[Resend Response] ID:", data?.id)
    console.log("[Resend Response] Full response:", JSON.stringify(data, null, 2))
    console.log("[Resend] Email sent successfully!")
    console.log("=".repeat(50))

    return { success: true, messageId: data?.id }
  } catch (error: any) {
    console.error("=".repeat(50))
    console.error("[Resend] EXCEPTION occurred")
    console.error("[Resend] Error message:", error.message)
    console.error("[Resend] Error stack:", error.stack)
    console.error("[Resend] Full error:", JSON.stringify(error, null, 2))
    console.error("=".repeat(50))
    return { success: false, message: error.message || "Failed to send email" }
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
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .amount { font-size: 24px; font-weight: bold; color: #4F46E5; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${companyName}</h1>
          </div>
          <div class="content">
            <p>Olá ${customerName},</p>
            <p>Você possui uma cobrança pendente:</p>
            <p class="amount">R$ ${debtAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            <p><strong>Vencimento:</strong> ${dueDate}</p>
            <p>Para regularizar sua situação, clique no botão abaixo:</p>
            <a href="${paymentLink}" class="button">Pagar Agora</a>
            <p>Ou acesse: ${paymentLink}</p>
          </div>
          <div class="footer">
            <p>Esta é uma mensagem automática. Por favor, não responda.</p>
            <p>&copy; ${new Date().getFullYear()} ${companyName}. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `
}
// </CHANGE>
