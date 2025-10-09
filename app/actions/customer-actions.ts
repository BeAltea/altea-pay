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

export async function sendCustomerNotification({
  customer_id,
  company_id,
  channel,
  email,
  phone,
  message,
}: {
  customer_id: string
  company_id: string
  channel: "email" | "sms"
  email?: string
  phone?: string
  message: string
}) {
  try {
    console.log("=".repeat(50))
    console.log("[sendCustomerNotification] Starting")
    console.log("[sendCustomerNotification] Parameters received:")
    console.log("  - customer_id:", customer_id)
    console.log("  - company_id:", company_id)
    console.log("  - channel:", channel)
    console.log("  - email:", email)
    console.log("  - phone:", phone)
    console.log("  - message preview:", message.substring(0, 100))
    console.log("=".repeat(50))

    // Validação completa de parâmetros
    if (!customer_id) {
      console.error("[sendCustomerNotification] ERROR: Missing customer_id")
      return { success: false, message: "ID do cliente é obrigatório" }
    }

    if (!company_id) {
      console.error("[sendCustomerNotification] ERROR: Missing company_id")
      return { success: false, message: "ID da empresa é obrigatória" }
    }

    if (!channel) {
      console.error("[sendCustomerNotification] ERROR: Missing channel")
      return { success: false, message: "Canal de comunicação é obrigatório" }
    }

    if (!message) {
      console.error("[sendCustomerNotification] ERROR: Missing message")
      return { success: false, message: "Mensagem é obrigatória" }
    }

    if (channel === "email" && !email) {
      console.error("[sendCustomerNotification] ERROR: Missing email for email channel")
      return { success: false, message: "Email é obrigatório para envio por email" }
    }

    if (channel === "sms") {
      if (!phone) {
        console.error("[sendCustomerNotification] ERROR: Missing phone for SMS channel")
        return { success: false, message: "Telefone é obrigatório para envio por SMS" }
      }

      if (!phone.startsWith("+")) {
        console.error("[sendCustomerNotification] ERROR: Phone must start with +")
        return { success: false, message: "Telefone deve estar no formato internacional (+55...)" }
      }

      const phoneDigits = phone.replace(/\D/g, "")
      if (phoneDigits.length < 12) {
        console.error("[sendCustomerNotification] ERROR: Phone too short:", phoneDigits.length)
        return {
          success: false,
          message: `Telefone inválido: ${phoneDigits.length} dígitos (mínimo 12 dígitos)`,
        }
      }

      console.log("[sendCustomerNotification] Phone validation passed")
      console.log("  - Phone:", phone)
      console.log("  - Digits:", phoneDigits.length)
    }

    console.log("[sendCustomerNotification] All validations passed")
    console.log("[sendCustomerNotification] Calling helper function...")

    // Chamar o helper apropriado
    let result
    if (channel === "email") {
      console.log("[sendCustomerNotification] Calling sendEmail...")
      result = await sendEmail({ to: email!, subject: "Cobrança Altea Pay", body: message })
    } else {
      console.log("[sendCustomerNotification] Calling sendSMS...")
      console.log("[sendCustomerNotification] SMS details:")
      console.log("  - To:", phone)
      console.log("  - Body preview:", message.substring(0, 50))
      result = await sendSMS({ to: phone!, body: message })
    }

    console.log("[sendCustomerNotification] Helper result:", JSON.stringify(result, null, 2))

    // Registrar ação na tabela collection_actions se bem-sucedido
    if (result.success) {
      console.log("[sendCustomerNotification] Registering action in collection_actions...")
      const supabase = await createServerClient()
      const { error: insertError } = await supabase.from("collection_actions").insert({
        customer_id,
        company_id,
        action_type: "notification",
        channel,
        status: "completed",
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error("[sendCustomerNotification] ERROR registering action:", insertError)
      } else {
        console.log("[sendCustomerNotification] Action registered successfully")
      }

      // Retornar informações detalhadas
      const successMessage =
        channel === "sms"
          ? `SMS enviado com sucesso para ${phone}${result.messageId ? ` (SID: ${result.messageId})` : ""}`
          : `E-mail enviado com sucesso para ${email}${result.messageId ? ` (ID: ${result.messageId})` : ""}`

      console.log("=".repeat(50))
      console.log("[sendCustomerNotification] Finished successfully")
      console.log("[sendCustomerNotification] Success message:", successMessage)
      console.log("=".repeat(50))

      return { success: true, message: successMessage }
    }

    console.log("=".repeat(50))
    console.log("[sendCustomerNotification] Finished with error")
    console.log("=".repeat(50))

    return { success: false, message: result.error || "Erro ao enviar notificação" }
  } catch (error: any) {
    console.error("=".repeat(50))
    console.error("[sendCustomerNotification] EXCEPTION occurred")
    console.error("[sendCustomerNotification] Error message:", error.message)
    console.error("[sendCustomerNotification] Error stack:", error.stack)
    console.error("[sendCustomerNotification] Full error:", JSON.stringify(error, null, 2))
    console.error("=".repeat(50))
    return { success: false, message: error.message || "Erro inesperado ao enviar notificação" }
  }
}
