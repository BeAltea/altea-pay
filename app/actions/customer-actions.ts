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
    console.log("[sendCustomerNotification] Starting at", new Date().toISOString())
    console.log("[sendCustomerNotification] Parameters received:")
    console.log("  - customer_id:", customer_id)
    console.log("  - company_id:", company_id)
    console.log("  - channel:", channel)
    console.log("  - email:", email)
    console.log("  - phone:", phone)
    console.log("  - message preview:", message.substring(0, 100))

    console.log("[sendCustomerNotification] Environment variables check:")
    console.log("  - RESEND_API_KEY:", !!process.env.RESEND_API_KEY)
    console.log("  - TWILIO_ACCOUNT_SID:", !!process.env.TWILIO_ACCOUNT_SID)
    console.log("  - TWILIO_AUTH_TOKEN:", !!process.env.TWILIO_AUTH_TOKEN)
    console.log("  - TWILIO_MESSAGING_SERVICE_SID:", !!process.env.TWILIO_MESSAGING_SERVICE_SID)
    console.log("  - TWILIO_PHONE_NUMBER:", !!process.env.TWILIO_PHONE_NUMBER)
    console.log("=".repeat(50))

    if (!isValidUUID(customer_id)) {
      console.error("[sendCustomerNotification] ERROR: Invalid customer_id UUID")
      return {
        success: false,
        message: "ID do cliente inválido",
        error: "INVALID_CUSTOMER_ID",
        stack: new Error().stack,
      }
    }

    if (!isValidUUID(company_id)) {
      console.error("[sendCustomerNotification] ERROR: Invalid company_id UUID")
      return {
        success: false,
        message: "ID da empresa inválido",
        error: "INVALID_COMPANY_ID",
        stack: new Error().stack,
      }
    }

    console.log("[sendCustomerNotification] UUID validation passed")

    // Validação completa de parâmetros
    if (!customer_id) {
      console.error("[sendCustomerNotification] ERROR: Missing customer_id")
      return { success: false, message: "ID do cliente é obrigatório", error: "MISSING_CUSTOMER_ID" }
    }

    if (!company_id) {
      console.error("[sendCustomerNotification] ERROR: Missing company_id")
      return { success: false, message: "ID da empresa é obrigatória", error: "MISSING_COMPANY_ID" }
    }

    if (!channel) {
      console.error("[sendCustomerNotification] ERROR: Missing channel")
      return { success: false, message: "Canal de comunicação é obrigatório", error: "MISSING_CHANNEL" }
    }

    if (!message) {
      console.error("[sendCustomerNotification] ERROR: Missing message")
      return { success: false, message: "Mensagem é obrigatória", error: "MISSING_MESSAGE" }
    }

    if (channel === "email") {
      if (!email) {
        console.error("[sendCustomerNotification] ERROR: Missing email for email channel")
        return { success: false, message: "Email é obrigatório para envio por email", error: "MISSING_EMAIL" }
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        console.error("[sendCustomerNotification] ERROR: Invalid email format")
        return { success: false, message: "Formato de email inválido", error: "INVALID_EMAIL_FORMAT" }
      }

      if (!process.env.RESEND_API_KEY) {
        console.error("[sendCustomerNotification] ERROR: RESEND_API_KEY not configured")
        return {
          success: false,
          message: "Serviço de email não configurado",
          error: "RESEND_API_KEY_MISSING",
          stack: new Error().stack,
        }
      }
    }

    if (channel === "sms") {
      if (!phone) {
        console.error("[sendCustomerNotification] ERROR: Missing phone for SMS channel")
        return { success: false, message: "Telefone é obrigatório para envio por SMS", error: "MISSING_PHONE" }
      }

      let normalizedPhone = phone.trim()

      // Remover todos os caracteres não numéricos exceto o +
      normalizedPhone = normalizedPhone.replace(/[^\d+]/g, "")

      // Se não começar com +, adicionar +55 (Brasil)
      if (!normalizedPhone.startsWith("+")) {
        // Remover zeros à esquerda
        normalizedPhone = normalizedPhone.replace(/^0+/, "")
        normalizedPhone = "+55" + normalizedPhone
      }

      console.log("[sendCustomerNotification] Phone normalization:")
      console.log("  - Original:", phone)
      console.log("  - Normalized:", normalizedPhone)

      const phoneDigits = normalizedPhone.replace(/\D/g, "")
      console.log("  - Total digits:", phoneDigits.length)

      if (phoneDigits.length < 12) {
        console.error("[sendCustomerNotification] ERROR: Phone too short:", phoneDigits.length)
        return {
          success: false,
          message: `Telefone inválido: ${phoneDigits.length} dígitos (mínimo 12 dígitos no formato +5511999999999)`,
          error: "PHONE_INVALID_FORMAT",
          details: { phone, normalizedPhone, digits: phoneDigits.length },
        }
      }

      // Atualizar phone com o valor normalizado
      phone = normalizedPhone

      console.log("[sendCustomerNotification] Phone validation passed")
      console.log("  - Final phone:", phone)

      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
        console.error("[sendCustomerNotification] ERROR: Twilio env vars not configured")
        return {
          success: false,
          message: "Serviço de SMS não configurado",
          error: "TWILIO_ENV_VARS_MISSING",
          stack: new Error().stack,
        }
      }
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

    return { success: false, message: result.error || "Erro ao enviar notificação", error: result.error }
  } catch (error: any) {
    console.error("=".repeat(50))
    console.error("[sendCustomerNotification] EXCEPTION occurred")
    console.error("[sendCustomerNotification] Error message:", error.message)
    console.error("[sendCustomerNotification] Error stack:", error.stack)
    console.error("[sendCustomerNotification] Full error:", JSON.stringify(error, null, 2))
    console.error("=".repeat(50))

    return {
      success: false,
      message: error.message || "Erro inesperado ao enviar notificação",
      error: error.message,
      stack: error.stack,
      details: {
        name: error.name,
        code: error.code,
        statusCode: error.statusCode,
      },
    }
  }
}
