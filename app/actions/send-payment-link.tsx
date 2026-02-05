"use server"

import { createClient } from "@/lib/supabase/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPaymentLink(agreementId: string, channel: "email" | "sms" | "whatsapp") {
  try {
    const supabase = await createClient()

    // Fetch agreement with optional customer/company joins
    const { data: agreement, error: agreementError } = await supabase
      .from("agreements")
      .select(`
        *,
        customers(id, name, document, email, phone),
        companies(id, name, cnpj)
      `)
      .eq("id", agreementId)
      .single()

    if (agreementError || !agreement) {
      return { success: false, error: "Acordo nao encontrado" }
    }

    const paymentUrl = agreement.asaas_payment_url

    if (!paymentUrl) {
      return {
        success: false,
        error: "Link de pagamento nao encontrado. Certifique-se de que a cobranca foi criada no Asaas.",
      }
    }

    const customer = agreement.customers as any
    const company = agreement.companies as any
    let customerName = customer?.name || "Cliente"
    let customerEmail = customer?.email || ""
    let customerPhone = customer?.phone || ""

    // Always try to enrich from VMAX which is the source of truth
    const cleanedDocument = customer?.document?.replace(/[^\d]/g, "") || ""
    if (cleanedDocument) {
      const { data: vmaxRecord } = await supabase
        .from("VMAX")
        .select('Email, "Telefone 1", "Telefone 2", Cliente')
        .or(`"CPF/CNPJ".eq.${cleanedDocument}`)
        .maybeSingle()

      if (vmaxRecord) {
        customerName = customerName || vmaxRecord.Cliente || "Cliente"
        customerEmail = customerEmail || vmaxRecord.Email || ""
        customerPhone = customerPhone || vmaxRecord["Telefone 1"] || vmaxRecord["Telefone 2"] || ""
      }
    }

    if (channel === "email") {
      if (!customerEmail) {
        return { success: false, error: "Cliente não possui e-mail cadastrado" }
      }

      const originalValue = agreement.original_amount || 0
      const finalValue = agreement.agreed_amount || 0
      const discount = originalValue - finalValue
      const installments = agreement.installments || 1

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Proposta de Acordo</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .detail-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .detail-table td { padding: 12px; border-bottom: 1px solid #eee; }
            .detail-table td:first-child { font-weight: bold; color: #666; }
            .detail-table td:last-child { text-align: right; }
            .discount { color: #10B981; font-weight: bold; }
            .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Proposta de Acordo</h1>
              <p>Sua negociação está pronta!</p>
            </div>
            <div class="content">
              <p>Olá <strong>${customerName}</strong>,</p>
              <p>Sua proposta de acordo foi gerada com sucesso. Confira os detalhes:</p>
              <table class="detail-table">
                <tr>
                  <td>Empresa</td>
                  <td>${company?.name || "N/A"}</td>
                </tr>
                <tr>
                  <td>Valor Original</td>
                  <td>R$ ${originalValue.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Desconto</td>
                  <td class="discount">- R$ ${discount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Valor Final</td>
                  <td style="font-size: 20px; font-weight: bold; color: #667eea;">R$ ${finalValue.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Parcelas</td>
                  <td>${installments}x de R$ ${(finalValue / installments).toFixed(2)}</td>
                </tr>
              </table>
              <p style="text-align: center;">
                <a href="${paymentUrl}" class="button">Ver Cobrança</a>
              </p>
              <p style="font-size: 12px; color: #666;">Este link de pagamento é seguro e foi gerado pelo sistema Asaas.</p>
            </div>
            <div class="footer">
              <p>Este é um e-mail automático. Por favor, não responda.</p>
            </div>
          </div>
        </body>
        </html>
      `

      const { data, error } = await resend.emails.send({
        from: `${company?.name || "Cobrança"} <onboarding@resend.dev>`,
        to: [customerEmail],
        subject: `Proposta de Acordo - ${customerName}`,
        html: emailHtml,
      })

      if (error) {
        console.error("Resend error:", error)
        return { success: false, error: "Erro ao enviar e-mail: " + error.message }
      }

      return { success: true, data: { emailId: data?.id } }
    }

    if (channel === "sms" || channel === "whatsapp") {
      if (!customerPhone) {
        return { success: false, error: "Cliente não possui telefone cadastrado" }
      }

      return { success: false, error: "Envio por SMS/WhatsApp ainda não implementado" }
    }

    return { success: false, error: "Canal inválido" }
  } catch (error: any) {
    console.error("Error in sendPaymentLink:", error)
    return { success: false, error: error.message || "Erro ao enviar proposta" }
  }
}
