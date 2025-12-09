"use server"

import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/notifications/email"
import { sendSMS } from "@/lib/notifications/sms"
import { createCustomerWithAnalysis } from "./create-customer-with-analysis"

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
    const result = await createCustomerWithAnalysis({
      name: params.name,
      cpf_cnpj: params.document,
      email: params.email,
      phone: params.phone,
      companyId: params.companyId,
    })

    if (!result.success) {
      return {
        success: false,
        message: result.message,
        error: result.error,
      }
    }

    console.log("[v0] createCustomer - Success with analysis:", result)

    return {
      success: true,
      message: result.message,
      data: result.customer,
      creditAnalysis: result.creditAnalysis,
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

export async function getCustomerDetails(companyId: string, document: string) {
  try {
    const supabase = createAdminClient()

    // Remove formatação do documento
    const cleanDocument = document.replace(/\D/g, "")

    // Buscar na tabela VMAX
    const { data: vmaxData } = await supabase
      .from("VMAX")
      .select("*")
      .eq("id_company", companyId)
      .ilike("CPF/CNPJ", `%${cleanDocument}%`)
      .single()

    if (!vmaxData) {
      return { success: false, error: "Cliente não encontrado" }
    }

    // Buscar análises de crédito
    const { data: creditProfiles } = await supabase
      .from("credit_profiles")
      .select("*")
      .eq("company_id", companyId)
      .eq("cpf", cleanDocument)
      .order("created_at", { ascending: false })

    const latestProfile = creditProfiles?.[0]

    return {
      success: true,
      data: {
        id: vmaxData.id,
        name: vmaxData.Cliente || vmaxData.cliente || "N/A",
        document: vmaxData["CPF/CNPJ"] || vmaxData.cpf_cnpj || cleanDocument,
        city: vmaxData.Cidade || vmaxData.cidade || null,
        email: null,
        phone: null,
        created_at: vmaxData.Primeira_Vencida || vmaxData.primeira_vencida || new Date().toISOString(),
        score: latestProfile?.score || null,
        analysis_data: latestProfile?.data || null,
        analysis_history: creditProfiles || [],
      },
    }
  } catch (error: any) {
    console.error("[SERVER] getCustomerDetails - Error:", error)
    return { success: false, error: error.message }
  }
}

export async function getAllCustomers() {
  try {
    console.log("[SERVER] getAllCustomers - Starting...")

    const supabase = createAdminClient()

    // Fetch from customers table
    const { data: customersData, error: customersError } = await supabase
      .from("customers")
      .select("id, name, document, company_id")
      .order("name")
      .limit(200)

    if (customersError) {
      console.error("[SERVER] getAllCustomers - Error loading customers:", customersError)
      throw customersError
    }

    console.log("[SERVER] getAllCustomers - Customers loaded:", customersData?.length || 0)

    // Fetch from VMAX table
    const { data: vmaxData, error: vmaxError } = await supabase
      .from("VMAX")
      .select('id, Cliente, "CPF/CNPJ", id_company, Cidade')
      .order("Cliente")
      .limit(200)

    if (vmaxError) {
      console.error("[SERVER] getAllCustomers - Error loading VMAX:", vmaxError)
    }

    console.log("[SERVER] getAllCustomers - VMAX records loaded:", vmaxData?.length || 0)

    // Combine customers from both tables
    const allCustomers = [
      ...(customersData || []).map((c) => ({
        id: c.id,
        name: c.name,
        document: c.document,
        company_id: c.company_id,
        city: "N/A",
        source_table: "customers" as const,
      })),
      ...(vmaxData || []).map((v) => ({
        id: v.id,
        name: v.Cliente,
        document: v["CPF/CNPJ"],
        company_id: v.id_company,
        city: v.Cidade || "N/A",
        source_table: "vmax" as const,
      })),
    ]

    console.log("[SERVER] getAllCustomers - Total customers (customers + VMAX):", allCustomers.length)

    // Fetch company names
    const companyIds = [...new Set(allCustomers.map((c) => c.company_id).filter(Boolean))]
    const { data: companiesData } = await supabase.from("companies").select("id, name").in("id", companyIds)

    const companiesMap = new Map(companiesData?.map((c) => [c.id, c.name]) || [])

    // Add company names to customers
    const customersWithCompanies = allCustomers.map((customer) => ({
      ...customer,
      company_name: companiesMap.get(customer.company_id) || "N/A",
    }))

    console.log("[SERVER] getAllCustomers - Customers with company names:", customersWithCompanies.length)

    return { success: true, data: customersWithCompanies }
  } catch (error: any) {
    console.error("[SERVER] getAllCustomers - Error:", error)
    return { success: false, error: error.message, data: [] }
  }
}
