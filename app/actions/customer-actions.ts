"use server"

import { createServerClient } from "@/lib/supabase/server"
import { sendEmail, generateDebtCollectionEmail } from "@/lib/notifications/email"
import { sendSMS, generateDebtCollectionSMS } from "@/lib/notifications/sms"

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
  channel: "email" | "sms" | "whatsapp"
  companyId: string
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

export async function sendCustomerNotification(params: SendCustomerNotificationParams) {
  console.log("=".repeat(80))
  console.log("[v0] sendCustomerNotification - FUNCTION CALLED")
  console.log("[v0] sendCustomerNotification - Params:", JSON.stringify(params, null, 2))
  console.log("=".repeat(80))

  try {
    if (!params.customerId) {
      console.error("[v0] sendCustomerNotification - Missing customerId")
      return { success: false, message: "Customer ID é obrigatório" }
    }

    if (!params.companyId) {
      console.error("[v0] sendCustomerNotification - Missing companyId")
      return { success: false, message: "Company ID é obrigatório" }
    }

    if (!params.channel) {
      console.error("[v0] sendCustomerNotification - Missing channel")
      return { success: false, message: "Canal de notificação é obrigatório" }
    }

    console.log("[v0] sendCustomerNotification - Parameters validated successfully")

    const supabase = await createServerClient()
    console.log("[v0] sendCustomerNotification - Supabase client created")

    // Fetch customer data
    console.log("[v0] sendCustomerNotification - Fetching customer data...")
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", params.customerId)
      .eq("company_id", params.companyId)
      .single()

    if (customerError || !customer) {
      console.error("[v0] sendCustomerNotification - Customer not found:", customerError)
      return {
        success: false,
        message: "Cliente não encontrado",
      }
    }

    console.log("[v0] sendCustomerNotification - Customer found:", {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    })

    // Fetch company data
    console.log("[v0] sendCustomerNotification - Fetching company data...")
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", params.companyId)
      .single()

    if (companyError || !company) {
      console.error("[v0] sendCustomerNotification - Company not found:", companyError)
      return {
        success: false,
        message: "Empresa não encontrada",
      }
    }

    console.log("[v0] sendCustomerNotification - Company found:", company.name)

    // Fetch customer debts
    console.log("[v0] sendCustomerNotification - Fetching customer debts...")
    const { data: debts } = await supabase
      .from("debts")
      .select("*")
      .eq("customer_id", params.customerId)
      .eq("company_id", params.companyId)
      .eq("status", "pending")

    const totalDebt = debts?.reduce((sum, debt) => sum + Number(debt.amount), 0) || 0
    console.log("[v0] sendCustomerNotification - Total debt calculated:", totalDebt)

    let result: { success: boolean; messageId?: string; error?: string }

    // Send notification based on channel
    if (params.channel === "email") {
      if (!customer.email) {
        console.error("[v0] sendCustomerNotification - Customer has no email")
        return {
          success: false,
          message: "Cliente não possui email cadastrado",
        }
      }

      console.log("[v0] sendCustomerNotification - Preparing email notification")
      console.log("[v0] sendCustomerNotification - Email recipient:", customer.email)

      const emailHtml = generateDebtCollectionEmail({
        customerName: customer.name,
        debtAmount: totalDebt,
        dueDate: new Date().toLocaleDateString("pt-BR"),
        companyName: company.name,
      })

      console.log("[v0] sendCustomerNotification - Email HTML generated, calling sendEmail...")

      result = await sendEmail({
        to: customer.email,
        subject: `Notificação de Cobrança - ${company.name}`,
        html: emailHtml,
      })

      console.log("[v0] sendCustomerNotification - sendEmail returned:", result)
    } else if (params.channel === "sms" || params.channel === "whatsapp") {
      if (!customer.phone) {
        console.error("[v0] sendCustomerNotification - Customer has no phone")
        return {
          success: false,
          message: "Cliente não possui telefone cadastrado",
        }
      }

      console.log("[v0] sendCustomerNotification - Preparing SMS notification")
      console.log("[v0] sendCustomerNotification - SMS recipient:", customer.phone)

      const smsBody = generateDebtCollectionSMS({
        customerName: customer.name,
        debtAmount: totalDebt,
        companyName: company.name,
      })

      console.log("[v0] sendCustomerNotification - SMS body generated, calling sendSMS...")

      result = await sendSMS({
        to: customer.phone,
        body: smsBody,
      })

      console.log("[v0] sendCustomerNotification - sendSMS returned:", result)
    } else {
      console.error("[v0] sendCustomerNotification - Invalid channel:", params.channel)
      return {
        success: false,
        message: "Canal de notificação inválido",
      }
    }

    console.log("[v0] sendCustomerNotification - Notification result:", result)

    // Register action in collection_actions table
    if (result.success) {
      console.log("[v0] sendCustomerNotification - Registering action in collection_actions...")
      const { error: actionError } = await supabase.from("collection_actions").insert({
        customer_id: params.customerId,
        company_id: params.companyId,
        action_type: "notification",
        channel: params.channel,
        status: "completed",
        created_at: new Date().toISOString(),
      })

      if (actionError) {
        console.error("[v0] sendCustomerNotification - Error registering action:", actionError)
      } else {
        console.log("[v0] sendCustomerNotification - Action registered successfully")
      }
    }

    if (result.success) {
      console.log("[v0] sendCustomerNotification - SUCCESS - Returning success response")
      return {
        success: true,
        message: `Notificação enviada com sucesso via ${params.channel === "email" ? "e-mail" : "SMS"}`,
      }
    } else {
      console.error("[v0] sendCustomerNotification - FAILURE - Returning error response")
      return {
        success: false,
        message: `Erro ao enviar notificação: ${result.error}`,
      }
    }
  } catch (error) {
    console.error("=".repeat(80))
    console.error("[v0] sendCustomerNotification - EXCEPTION CAUGHT")
    console.error("[v0] sendCustomerNotification - Error:", error)
    console.error(
      "[v0] sendCustomerNotification - Error message:",
      error instanceof Error ? error.message : "Unknown error",
    )
    console.error(
      "[v0] sendCustomerNotification - Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    )
    console.error("=".repeat(80))
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro desconhecido ao enviar notificação",
    }
  }
}
