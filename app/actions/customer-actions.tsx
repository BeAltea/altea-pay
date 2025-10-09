"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { sendEmail } from "@/lib/notifications/email"
import { sendSMS } from "@/lib/notifications/sms"

export interface CreateCustomerParams {
  name: string
  email: string
  document: string
  phone?: string
  companyId: string
}

export interface UpdateCustomerParams extends CreateCustomerParams {
  id: string
}

export interface DeleteCustomerParams {
  id: string
  companyId: string
}

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

export async function createCustomer(params: CreateCustomerParams) {
  try {
    console.log("[v0] createCustomer - Starting with params:", JSON.stringify(params, null, 2))

    const supabase = await createClient()
    console.log("[v0] createCustomer - Supabase client created")

    if (!params.name || !params.email || !params.document || !params.companyId) {
      console.log("[v0] createCustomer - Missing required fields")
      return {
        success: false,
        message: "Todos os campos obrigatórios devem ser preenchidos",
        error: "Missing required fields",
      }
    }

    const documentType = params.document.replace(/\D/g, "").length === 11 ? "cpf" : "cnpj"
    console.log("[v0] createCustomer - Document type determined:", documentType)

    const customerData = {
      name: params.name,
      email: params.email,
      document: params.document,
      document_type: documentType,
      phone: params.phone || null,
      company_id: params.companyId,
    }

    console.log("[v0] createCustomer - Inserting customer with data:", JSON.stringify(customerData, null, 2))

    const { data, error } = await supabase.from("customers").insert(customerData).select().single()

    if (error) {
      console.error("[v0] createCustomer - Database error:", JSON.stringify(error, null, 2))
      console.error("[v0] createCustomer - Error code:", error.code)
      console.error("[v0] createCustomer - Error message:", error.message)
      console.error("[v0] createCustomer - Error details:", error.details)
      console.error("[v0] createCustomer - Error hint:", error.hint)
      return {
        success: false,
        message: `Erro ao criar cliente: ${error.message}`,
        error: error.message,
      }
    }

    console.log("[v0] createCustomer - Customer created successfully:", JSON.stringify(data, null, 2))

    revalidatePath("/dashboard/customers")

    return {
      success: true,
      message: "Cliente criado com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] createCustomer - Unexpected error:", error)
    console.error("[v0] createCustomer - Error type:", typeof error)
    console.error("[v0] createCustomer - Error constructor:", error?.constructor?.name)

    if (error instanceof Error) {
      console.error("[v0] createCustomer - Error message:", error.message)
      console.error("[v0] createCustomer - Error stack:", error.stack)
    }

    return {
      success: false,
      message: "Erro inesperado ao criar cliente",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function updateCustomer(params: UpdateCustomerParams) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("customers")
      .update({
        name: params.name,
        email: params.email,
        document: params.document,
        phone: params.phone || null,
      })
      .eq("id", params.id)
      .eq("company_id", params.companyId)
      .select()
      .single()

    if (error) throw error

    revalidatePath("/dashboard/customers")

    return {
      success: true,
      message: "Cliente atualizado com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] Update customer error:", error)
    return {
      success: false,
      message: "Erro ao atualizar cliente",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function deleteCustomer(params: DeleteCustomerParams) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from("customers").delete().eq("id", params.id).eq("company_id", params.companyId)

    if (error) throw error

    revalidatePath("/dashboard/customers")

    return {
      success: true,
      message: "Cliente excluído com sucesso!",
    }
  } catch (error) {
    console.error("[v0] Delete customer error:", error)
    return {
      success: false,
      message: "Erro ao excluir cliente",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
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
