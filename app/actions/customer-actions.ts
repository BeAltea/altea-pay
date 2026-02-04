"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { customers, vmax, creditProfiles, companies, profiles, collectionActions } from "@/lib/db/schema"
import { eq, and, ilike, desc, inArray, sql } from "drizzle-orm"
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
    // Validate required fields
    if (!params.id || !params.companyId) {
      return {
        success: false,
        message: "ID do cliente e empresa são obrigatórios",
      }
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (params.name) updateData.name = params.name
    if (params.email) updateData.email = params.email
    if (params.document) {
      updateData.document = params.document
      updateData.documentType = params.document.replace(/\D/g, "").length === 11 ? "cpf" : "cnpj"
    }
    if (params.phone !== undefined) updateData.phone = params.phone

    console.log("[v0] updateCustomer - Update data:", updateData)

    // Update customer
    const [data] = await db
      .update(customers)
      .set(updateData)
      .where(and(eq(customers.id, params.id), eq(customers.companyId, params.companyId)))
      .returning()

    if (!data) {
      return {
        success: false,
        message: "Erro ao atualizar cliente: registro não encontrado",
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
    // Validate required fields
    if (!params.id || !params.companyId) {
      return {
        success: false,
        message: "ID do cliente e empresa são obrigatórios",
      }
    }

    // Delete customer
    await db
      .delete(customers)
      .where(and(eq(customers.id, params.id), eq(customers.companyId, params.companyId)))

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
      await db.insert(collectionActions).values({
        customerId: payload.customer_id,
        companyId: payload.company_id,
        actionType: "notification",
        channel: payload.channel,
        status: "completed",
        createdAt: new Date(),
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
    // Remove formatação do documento
    const cleanDocument = document.replace(/\D/g, "")

    // Buscar na tabela VMAX
    const [vmaxData] = await db
      .select()
      .from(vmax)
      .where(and(eq(vmax.idCompany, companyId), ilike(vmax.cpfCnpj, `%${cleanDocument}%`)))
      .limit(1)

    if (!vmaxData) {
      return { success: false, error: "Cliente não encontrado" }
    }

    // Buscar análises de crédito
    const creditProfilesData = await db
      .select()
      .from(creditProfiles)
      .where(and(eq(creditProfiles.companyId, companyId), eq(creditProfiles.cpf, cleanDocument)))
      .orderBy(desc(creditProfiles.createdAt))

    const latestProfile = creditProfilesData?.[0]

    return {
      success: true,
      data: {
        id: vmaxData.id,
        name: vmaxData.cliente || "N/A",
        document: vmaxData.cpfCnpj || cleanDocument,
        city: vmaxData.cidade || null,
        email: null,
        phone: null,
        created_at: vmaxData.createdAt || new Date().toISOString(),
        score: latestProfile?.score || null,
        analysis_data: latestProfile?.data || null,
        analysis_history: creditProfilesData || [],
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

    // Fetch from customers table
    const customersData = await db
      .select({ id: customers.id, name: customers.name, document: customers.document, companyId: customers.companyId })
      .from(customers)
      .orderBy(customers.name)

    console.log("[SERVER] getAllCustomers - Customers loaded:", customersData?.length || 0)

    // Fetch from VMAX table
    const vmaxData = await db
      .select({ id: vmax.id, cliente: vmax.cliente, cpfCnpj: vmax.cpfCnpj, idCompany: vmax.idCompany, cidade: vmax.cidade })
      .from(vmax)
      .orderBy(vmax.cliente)

    console.log("[SERVER] getAllCustomers - VMAX records loaded:", vmaxData?.length || 0)

    // Combine customers from both tables
    const allCustomers = [
      ...(customersData || []).map((c) => ({
        id: c.id,
        name: c.name,
        document: c.document,
        company_id: c.companyId,
        city: "N/A",
        source_table: "customers" as const,
      })),
      ...(vmaxData || []).map((v) => ({
        id: v.id,
        name: v.cliente,
        document: v.cpfCnpj,
        company_id: v.idCompany,
        city: v.cidade || "N/A",
        source_table: "vmax" as const,
      })),
    ]

    console.log("[SERVER] getAllCustomers - Total customers (customers + VMAX):", allCustomers.length)

    // Fetch company names
    const companyIds = [...new Set(allCustomers.map((c) => c.company_id).filter(Boolean))] as string[]

    let companiesMap = new Map<string, string>()
    if (companyIds.length > 0) {
      const companiesData = await db
        .select({ id: companies.id, name: companies.name })
        .from(companies)
        .where(inArray(companies.id, companyIds))

      companiesMap = new Map(companiesData?.map((c) => [c.id, c.name]) || [])
    }

    // Add company names to customers
    const customersWithCompanies = allCustomers.map((customer) => ({
      ...customer,
      company_name: companiesMap.get(customer.company_id!) || "N/A",
    }))

    console.log("[SERVER] getAllCustomers - Customers with company names:", customersWithCompanies.length)

    return { success: true, data: customersWithCompanies }
  } catch (error: any) {
    console.error("[SERVER] getAllCustomers - Error:", error)
    return { success: false, error: error.message, data: [] }
  }
}
