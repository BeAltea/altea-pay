"use server"

import { createServiceClient } from "@/lib/supabase/service"
import { createClient } from "@/lib/supabase/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendProposal(agreementId: string, channel: "email" | "whatsapp" | "sms") {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Usuário não autenticado" }
    }

    // Use service client to get agreement details
    const serviceClient = createServiceClient()
    const { data: agreement, error: agreementError } = await serviceClient
      .from("agreements")
      .select(
        `
        *,
        customers:customer_id (
          name,
          email,
          phone,
          document
        )
      `,
      )
      .eq("id", agreementId)
      .single()

    if (agreementError || !agreement) {
      return { success: false, error: "Acordo não encontrado" }
    }

    // TODO: Implement Asaas integration to generate payment link
    const paymentLink = await generateAsaasPaymentLink(agreement)

    // Send proposal based on selected channel
    switch (channel) {
      case "email":
        return await sendProposalEmail(agreement, paymentLink)
      case "whatsapp":
        return await sendProposalWhatsApp(agreement, paymentLink)
      case "sms":
        return await sendProposalSMS(agreement, paymentLink)
      default:
        return { success: false, error: "Canal de envio inválido" }
    }
  } catch (error) {
    console.error("Error sending proposal:", error)
    return { success: false, error: "Erro ao enviar proposta" }
  }
}

async function generateAsaasPaymentLink(agreement: any): Promise<string> {
  // TODO: Implement Asaas integration
  // This will call Asaas API to create a payment link with:
  // - Customer information
  // - Agreed amount
  // - Number of installments
  // - Due date
  // - Payment methods

  // For now, return a placeholder link
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return `${baseUrl}/payment/${agreement.id}`
}

async function sendProposalEmail(agreement: any, paymentLink: string) {
  const customer = agreement.customers

  if (!customer.email) {
    return { success: false, error: "Cliente não possui e-mail cadastrado" }
  }

  try {
    const { error } = await resend.emails.send({
      from: "CobrançaAuto <noreply@cobrancaauto.com>",
      to: customer.email,
      subject: "Nova Proposta de Acordo - CobrançaAuto",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Olá, ${customer.name}!</h2>
          
          <p>Você recebeu uma nova proposta de acordo:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Detalhes do Acordo</h3>
            <p><strong>Valor Original:</strong> R$ ${agreement.original_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            <p><strong>Desconto:</strong> R$ ${agreement.discount_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${agreement.discount_percentage.toFixed(2)}%)</p>
            <p style="font-size: 18px; color: #22c55e;"><strong>Valor a Pagar:</strong> R$ ${agreement.agreed_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            <p><strong>Parcelamento:</strong> ${agreement.installments}x de R$ ${agreement.installment_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            <p><strong>Vencimento:</strong> ${new Date(agreement.due_date).toLocaleDateString("pt-BR")}</p>
          </div>

          ${agreement.terms ? `<p><strong>Termos:</strong></p><p>${agreement.terms}</p>` : ""}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Acessar Proposta e Realizar Pagamento
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Este link é pessoal e intransferível. Clique no botão acima para acessar a proposta completa e realizar o pagamento.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error("Error sending email:", error)
      return { success: false, error: "Erro ao enviar e-mail" }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in sendProposalEmail:", error)
    return { success: false, error: "Erro ao enviar e-mail" }
  }
}

async function sendProposalWhatsApp(agreement: any, paymentLink: string) {
  const customer = agreement.customers

  if (!customer.phone) {
    return { success: false, error: "Cliente não possui telefone cadastrado" }
  }

  // TODO: Implement WhatsApp integration (Twilio API)
  // For now, return success with placeholder
  console.log(`[WhatsApp] Sending proposal to ${customer.phone}:`, paymentLink)

  try {
    const message = `
Olá, ${customer.name}!

Você recebeu uma nova proposta de acordo:

📋 *Detalhes do Acordo*
Valor Original: R$ ${agreement.original_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
Desconto: R$ ${agreement.discount_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${agreement.discount_percentage.toFixed(2)}%)
*Valor a Pagar: R$ ${agreement.agreed_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*
Parcelamento: ${agreement.installments}x de R$ ${agreement.installment_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
Vencimento: ${new Date(agreement.due_date).toLocaleDateString("pt-BR")}

🔗 Acesse o link abaixo para ver a proposta completa e realizar o pagamento:
${paymentLink}
    `.trim()

    // TODO: Use Twilio API to send WhatsApp message
    // const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
    // const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
    // const twilioWhatsAppNumber = process.env.TWILIO_PHONE_NUMBER

    console.log("WhatsApp message (to be sent):", message)

    return { success: true }
  } catch (error) {
    console.error("Error in sendProposalWhatsApp:", error)
    return { success: false, error: "Erro ao enviar mensagem via WhatsApp" }
  }
}

async function sendProposalSMS(agreement: any, paymentLink: string) {
  const customer = agreement.customers

  if (!customer.phone) {
    return { success: false, error: "Cliente não possui telefone cadastrado" }
  }

  // TODO: Implement SMS integration (Twilio API)
  // For now, return success with placeholder
  console.log(`[SMS] Sending proposal to ${customer.phone}:`, paymentLink)

  try {
    const message = `CobrançaAuto: Nova proposta de acordo! Valor: R$ ${agreement.agreed_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em ${agreement.installments}x. Acesse: ${paymentLink}`

    // TODO: Use Twilio API to send SMS
    // const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
    // const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
    // const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

    console.log("SMS message (to be sent):", message)

    return { success: true }
  } catch (error) {
    console.error("Error in sendProposalSMS:", error)
    return { success: false, error: "Erro ao enviar SMS" }
  }
}
