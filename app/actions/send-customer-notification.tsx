"use server"

import { createClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/notifications/email"
import { sendSMS } from "@/lib/notifications/sms"

export interface SendCustomerNotificationParams {
  customerId: string
  channel: "email" | "sms" | "whatsapp"
  companyId: string
}

export interface SendCustomerNotificationResult {
  success: boolean
  message: string
  error?: string
}

/**
 * Send notification to customer from Admin Dashboard
 * Called from Customers page action menu
 */
export async function sendCustomerNotification({
  customerId,
  channel,
  companyId,
}: SendCustomerNotificationParams): Promise<SendCustomerNotificationResult> {
  try {
    console.log("[v0] sendCustomerNotification - Starting", { customerId, channel, companyId })

    const supabase = await createClient()

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("id", customerId)
      .eq("company_id", companyId)
      .single()

    if (customerError || !customer) {
      console.error("[v0] sendCustomerNotification - Customer not found:", customerError)
      return {
        success: false,
        message: "Cliente não encontrado",
        error: customerError?.message,
      }
    }

    console.log("[v0] sendCustomerNotification - Customer found:", customer.name)

    // Get company details
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .single()

    if (companyError || !company) {
      console.error("[v0] sendCustomerNotification - Company not found:", companyError)
      return {
        success: false,
        message: "Empresa não encontrada",
        error: companyError?.message,
      }
    }

    console.log("[v0] sendCustomerNotification - Company found:", company.name)

    // Validate customer contact info
    if (channel === "email" && !customer.email) {
      return {
        success: false,
        message: "Cliente não possui e-mail cadastrado",
      }
    }

    if ((channel === "sms" || channel === "whatsapp") && !customer.phone) {
      return {
        success: false,
        message: "Cliente não possui telefone cadastrado",
      }
    }

    // Get customer's debts for the notification
    const { data: debts } = await supabase
      .from("debts")
      .select("id, amount, due_date, status")
      .eq("customer_id", customerId)
      .eq("company_id", companyId)
      .in("status", ["pending", "in_collection"])
      .order("due_date", { ascending: true })

    const totalDebt = debts?.reduce((sum, debt) => sum + Number(debt.amount || 0), 0) || 0

    console.log("[v0] sendCustomerNotification - Total debt:", totalDebt)

    // Send notification based on channel
    let result: { success: boolean; messageId?: string; error?: string }

    if (channel === "email") {
      const html = `
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
              .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${company.name}</h1>
                <p>Notificação de Cobrança</p>
              </div>
              <div class="content">
                <p>Olá, <strong>${customer.name}</strong></p>
                <p>Identificamos pendências financeiras em seu nome junto à <strong>${company.name}</strong>.</p>
                ${totalDebt > 0 ? `<p>Valor Total: <span class="amount">R$ ${totalDebt.toFixed(2)}</span></p>` : ""}
                <p>Para regularizar sua situação, entre em contato conosco.</p>
              </div>
              <div class="footer">
                <p>Esta é uma mensagem automática. Por favor, não responda este e-mail.</p>
                <p>&copy; ${new Date().getFullYear()} ${company.name}. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `

      result = await sendEmail({
        to: customer.email,
        subject: `Notificação de Cobrança - ${company.name}`,
        html,
        from: `${company.name} <noreply@alteapay.com>`,
      })
    } else if (channel === "sms" || channel === "whatsapp") {
      const body =
        totalDebt > 0
          ? `Olá ${customer.name}, você tem pendências de R$ ${totalDebt.toFixed(2)} com ${company.name}. Entre em contato para regularizar.`
          : `Olá ${customer.name}, entre em contato com ${company.name} para verificar sua situação.`

      result = await sendSMS({
        to: customer.phone,
        body,
      })
    } else {
      return {
        success: false,
        message: "Canal de notificação inválido",
      }
    }

    console.log("[v0] sendCustomerNotification - Notification result:", result)

    // Log the notification action
    if (result.success) {
      await supabase.from("collection_actions").insert({
        customer_id: customerId,
        action_type: channel,
        status: "sent",
        message_id: result.messageId,
        company_id: companyId,
        created_at: new Date().toISOString(),
      })

      console.log("[v0] sendCustomerNotification - Action logged successfully")
    }

    return {
      success: result.success,
      message: result.success
        ? `Notificação enviada com sucesso via ${channel === "email" ? "E-mail" : channel === "sms" ? "SMS" : "WhatsApp"}`
        : `Erro ao enviar notificação: ${result.error}`,
      error: result.error,
    }
  } catch (error) {
    console.error("[v0] sendCustomerNotification - Error:", error)
    return {
      success: false,
      message: "Erro ao enviar notificação",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
