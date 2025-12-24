"use server"

import { createClient } from "@/lib/supabase/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPaymentLink(agreementId: string, channel: "email" | "sms" | "whatsapp") {
  const supabase = await createClient()

  // Buscar acordo com todas as informações
  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .select(`
      *,
      customers (
        id,
        name,
        email,
        phone,
        cpf_cnpj
      ),
      companies (
        id,
        name,
        cnpj
      )
    `)
    .eq("id", agreementId)
    .single()

  if (agreementError || !agreement) {
    console.error("[v0] Erro ao buscar acordo:", agreementError)
    return { success: false, error: "Acordo não encontrado" }
  }

  // Verificar se tem link de pagamento
  if (!agreement.asaas_payment_url) {
    console.error("[v0] Link de pagamento não encontrado no acordo")
    return {
      success: false,
      error: "Link de pagamento não encontrado. Certifique-se de que a cobrança foi criada no Asaas.",
    }
  }

  let customerEmail = agreement.customers?.email
  let customerPhone = agreement.customers?.phone
  const customerName = agreement.customers?.name || "Cliente"
  const cpfCnpj = agreement.customers?.cpf_cnpj

  // Se não encontrou email/telefone em customers, buscar na VMAX
  if ((!customerEmail || !customerPhone) && cpfCnpj) {
    const { data: vmaxData } = await supabase.from("VMAX").select("Email, Telefone").eq('"CPF/CNPJ"', cpfCnpj).single()

    if (vmaxData) {
      customerEmail = customerEmail || vmaxData.Email
      customerPhone = customerPhone || vmaxData.Telefone
    }
  }

  // Validar canal
  if (channel === "email" && !customerEmail) {
    return { success: false, error: "E-mail do cliente não encontrado" }
  }

  if ((channel === "sms" || channel === "whatsapp") && !customerPhone) {
    return { success: false, error: "Telefone do cliente não encontrado" }
  }

  // Enviar por email
  if (channel === "email") {
    try {
      const companyName = agreement.companies?.name || "Nossa Empresa"
      const originalValue = agreement.original_amount
      const finalValue = agreement.agreed_amount
      const discount = originalValue - finalValue
      const discountPercent = ((discount / originalValue) * 100).toFixed(1)
      const installments = agreement.installments || 1

      const { data, error } = await resend.emails.send({
        from: `${companyName} <onboarding@resend.dev>`,
        to: customerEmail,
        subject: `Proposta de Acordo - ${companyName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
                .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                .discount { color: #10b981; font-size: 24px; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                td { padding: 10px; border-bottom: 1px solid #ddd; }
                .label { font-weight: bold; color: #667eea; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Proposta de Acordo</h1>
                  <p>Sua proposta está pronta!</p>
                </div>
                <div class="content">
                  <p>Olá <strong>${customerName}</strong>,</p>
                  <p>Temos uma excelente proposta de acordo para você!</p>
                  
                  <div class="highlight">
                    <table>
                      <tr>
                        <td class="label">Valor Original:</td>
                        <td style="text-align: right;">R$ ${originalValue.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td class="label">Desconto:</td>
                        <td style="text-align: right; color: #10b981; font-weight: bold;">${discountPercent}%</td>
                      </tr>
                      <tr>
                        <td class="label">Valor do Acordo:</td>
                        <td style="text-align: right; font-size: 20px; font-weight: bold; color: #667eea;">R$ ${finalValue.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td class="label">Parcelas:</td>
                        <td style="text-align: right;">${installments}x de R$ ${(finalValue / installments).toFixed(2)}</td>
                      </tr>
                      <tr style="background: #e8f5e9;">
                        <td class="label" style="color: #10b981;">Você economiza:</td>
                        <td class="discount" style="text-align: right;">R$ ${discount.toFixed(2)}</td>
                      </tr>
                    </table>
                  </div>

                  <p>O cliente receberá um link de pagamento gerado pelo Asaas com os detalhes completos do acordo e as opções de pagamento.</p>

                  <div style="text-align: center;">
                    <a href="${agreement.asaas_payment_url}" class="button">Ver Cobrança</a>
                  </div>

                  <div class="footer">
                    <p>${companyName}</p>
                    <p>Esta é uma mensagem automática, não responda este e-mail.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
      })

      if (error) {
        console.error("[v0] Erro ao enviar email:", error)
        return { success: false, error: "Erro ao enviar e-mail" }
      }

      return { success: true, message: "E-mail enviado com sucesso!" }
    } catch (error) {
      console.error("[v0] Erro ao enviar email:", error)
      return { success: false, error: "Erro ao enviar e-mail" }
    }
  }

  // SMS e WhatsApp (implementação futura)
  if (channel === "sms" || channel === "whatsapp") {
    return { success: false, error: "SMS e WhatsApp ainda não implementados" }
  }

  return { success: false, error: "Canal inválido" }
}
