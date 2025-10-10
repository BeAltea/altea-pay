"use server"

import { createServerClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/notifications/email"
import { sendSMS } from "@/lib/notifications/sms"

export interface CreateCustomerParams {
  name: string
  email: string
  document: string
  phone?: string
  companyId: string
}

export interface UpdateCustomerParams {
  id: string
  name?: string
  email?: string
  document?: string
  phone?: string
  companyId: string
}

export interface DeleteCustomerParams {
  id: string
  companyId: string
}

export interface SendCustomerNotificationParams {
  customerId: string
  channel: "email" | "sms"
  companyId: string
  email?: string
  phone?: string
  message: string
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export async function createCustomer(params: CreateCustomerParams) {
  console.log("[v0] createCustomer - Starting", params)

  try {
    const supabase = await createServerClient()

    // Validate required fields
    if (!params.name || !params.email || !params.document || !params.companyId) {
      console.log("[v0] createCustomer - Missing required fields")
      return {
        success: false,
        message: "Campos obrigatórios faltando",
      }
    }

    // Determine document type based on length
    const documentType = params.document.replace(/\D/g, "").length === 11 ? "cpf" : "cnpj"
    console.log("[v0] createCustomer - Document type:", documentType)

    // Create customer data
    const customerData = {
      name: params.name,
      email: params.email,
      document: params.document,
      document_type: documentType,
      phone: params.phone || null,
      company_id: params.companyId,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("[v0] createCustomer - Customer data:", customerData)

    // Insert customer
    const { data, error } = await supabase.from("customers").insert(customerData).select().single()

    if (error) {
      console.error("[v0] createCustomer - Error:", error)
      return {
        success: false,
        message: `Erro ao criar cliente: ${error.message}`,
        error: error.message,
      }
    }

    console.log("[v0] createCustomer - Success:", data)

    return {
      success: true,
      message: "Cliente criado com sucesso",
      data,
    }
  } catch (error) {
    console.error("[v0] createCustomer - Exception:", error)
    return {
      success: false,
      message: "Erro ao criar cliente",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function updateCustomer(params: UpdateCustomerParams) {
  console.log("[v0] updateCustomer - Starting", params)

  try {
    const supabase = await createServerClient()

    // Validate required fields
    if (!params.id || !params.companyId) {
      return {
        success: false,
        message: "ID do cliente e empresa são obrigatórios",
      }
    }

    // Build update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (params.name) updateData.name = params.name
    if (params.email) updateData.email = params.email
    if (params.document) {
      updateData.document = params.document
      updateData.document_type = params.document.replace(/\D/g, "").length === 11 ? "cpf" : "cnpj"
    }
    if (params.phone !== undefined) updateData.phone = params.phone

    console.log("[v0] updateCustomer - Update data:", updateData)

    // Update customer
    const { data, error } = await supabase
      .from("customers")
      .update(updateData)
      .eq("id", params.id)
      .eq("company_id", params.companyId)
      .select()
      .single()

    if (error) {
      console.error("[v0] updateCustomer - Error:", error)
      return {
        success: false,
        message: `Erro ao atualizar cliente: ${error.message}`,
        error: error.message,
      }
    }

    console.log("[v0] updateCustomer - Success:", data)

    return {
      success: true,
      message: "Cliente atualizado com sucesso",
      data,
    }
  } catch (error) {
    console.error("[v0] updateCustomer - Exception:", error)
    return {
      success: false,
      message: "Erro ao atualizar cliente",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function deleteCustomer(params: DeleteCustomerParams) {
  console.log("[v0] deleteCustomer - Starting", params)

  try {
    const supabase = await createServerClient()

    // Validate required fields
    if (!params.id || !params.companyId) {
      return {
        success: false,
        message: "ID do cliente e empresa são obrigatórios",
      }
    }

    // Delete customer
    const { error } = await supabase.from("customers").delete().eq("id", params.id).eq("company_id", params.companyId)

    if (error) {
      console.error("[v0] deleteCustomer - Error:", error)
      return {
        success: false,
        message: `Erro ao excluir cliente: ${error.message}`,
        error: error.message,
      }
    }

    console.log("[v0] deleteCustomer - Success")

    return {
      success: true,
      message: "Cliente excluído com sucesso",
    }
  } catch (error) {
    console.error("[v0] deleteCustomer - Exception:", error)
    return {
      success: false,
      message: "Erro ao excluir cliente",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function sendCustomerNotification(payload: any) {
  console.log("[sendCustomerNotification] Payload recebido:", payload)
  try {
    if (!payload) throw new Error("Payload vazio")
    if (!payload.channel) throw new Error("Canal não especificado")
    if (!payload.company_id || !payload.customer_id) throw new Error("IDs ausentes")
    if (payload.channel === "email" && !payload.email) throw new Error("Email não informado")
    if (payload.channel === "sms" && !payload.phone) throw new Error("Telefone não informado")

    console.log("[sendCustomerNotification] Variáveis de ambiente:", {
      RESEND: !!process.env.RESEND_API_KEY,
      TWILIO_SID: !!process.env.TWILIO_ACCOUNT_SID,
      TWILIO_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
      TWILIO_MSG_SID: !!process.env.TWILIO_MESSAGING_SERVICE_SID,
      TWILIO_PHONE: !!process.env.TWILIO_PHONE_NUMBER,
    })

    // Normalizar telefone
    let phone = payload.phone?.replace(/[^\d]/g, "")
    if (phone && !phone.startsWith("55")) phone = `55${phone}`
    if (phone) phone = `+${phone}`
    console.log("[sendCustomerNotification] Telefone formatado:", phone)

    let response
    if (payload.channel === "email") {
      response = await sendEmail({
        to: payload.email,
        subject: "Cobrança Altea Pay",
        html: payload.message || "Mensagem de cobrança padrão",
      })
    } else {
      response = await sendSMS({
        to: phone!,
        body: payload.message || "Mensagem SMS padrão",
      })
    }

    console.log("[sendCustomerNotification] Resposta do provedor:", response)

    if (response.success) {
      const supabase = await createServerClient()
      await supabase.from("collection_actions").insert({
        customer_id: payload.customer_id,
        company_id: payload.company_id,
        action_type: "notification",
        channel: payload.channel,
        status: "completed",
        created_at: new Date().toISOString(),
      })
    }

    return { success: response.success, message: response.message || response.error, response }
  } catch (err: any) {
    console.error("[sendCustomerNotification] Erro:", err.message, err.stack)
    return { success: false, error: err.message, stack: err.stack }
  }
}
