"use server"

import { db } from "@/lib/db"
import { vmax, creditProfiles } from "@/lib/db/schema"
import { eq, and, asc, desc, inArray, sql } from "drizzle-orm"

export async function getVMAXRecords(companyId: string) {
  try {
    console.log("[SERVER] getVMAXRecords - Fetching for company:", companyId)

    const allData = await db
      .select({
        id: vmax.id,
        cpfCnpj: vmax.cpfCnpj,
        cliente: vmax.cliente,
        cidade: vmax.cidade,
        idCompany: vmax.idCompany,
      })
      .from(vmax)
      .where(eq(vmax.idCompany, companyId))
      .orderBy(asc(vmax.cliente))

    console.log("[SERVER] getVMAXRecords - Found records:", allData.length)

    return { success: true, data: allData }
  } catch (error: any) {
    console.error("[SERVER] getVMAXRecords - Error:", error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getCustomerDetails(vmaxId: string) {
  try {
    console.log("[SERVER][v0] getCustomerDetails - Searching for VMAX ID:", vmaxId)

    // Buscar na tabela VMAX pelo ID
    const [vmaxData] = await db
      .select()
      .from(vmax)
      .where(eq(vmax.id, vmaxId))
      .limit(1)

    if (!vmaxData) {
      console.log("[SERVER][v0] getCustomerDetails - Cliente nao encontrado")
      return { success: false, error: "Cliente nao encontrado" }
    }

    console.log("[SERVER][v0] getCustomerDetails - Found VMAX data:", {
      id: vmaxData.id,
      name: vmaxData.cliente,
      document: vmaxData.cpfCnpj,
    })

    const [creditProfile] = await db
      .select()
      .from(creditProfiles)
      .where(
        and(
          eq(creditProfiles.customerId, vmaxId),
          inArray(creditProfiles.provider, ["assertiva", "credit_analysis"]),
        ),
      )
      .orderBy(desc(creditProfiles.createdAt))
      .limit(1)

    // Buscar historico completo de analises
    const creditProfilesList = await db
      .select()
      .from(creditProfiles)
      .where(eq(creditProfiles.customerId, vmaxId))
      .orderBy(desc(creditProfiles.createdAt))

    console.log("[SERVER][v0] getCustomerDetails - Analysis summary:", {
      has_credit_analysis: !!creditProfile,
      total_analyses: creditProfilesList.length,
    })

    if (creditProfile) {
      console.log("[SERVER][v0] getCustomerDetails - Latest analysis:", {
        source: creditProfile.provider,
        score: creditProfile.score,
        created_at: creditProfile.createdAt,
        has_data: !!creditProfile.data,
        data_keys: creditProfile.data ? Object.keys(creditProfile.data as object) : [],
      })
    } else {
      console.log("[SERVER][v0] getCustomerDetails - No credit profiles found for customer_id:", vmaxId)
    }

    const metadata = vmaxData.analysisMetadata as any

    return {
      success: true,
      data: {
        id: vmaxData.id,
        name: vmaxData.cliente || "N/A",
        document: vmaxData.cpfCnpj || "N/A",
        city: vmaxData.cidade || null,
        company: metadata?.Empresa || null,
        overdue_amount: metadata?.Vencido || null,
        first_overdue: vmaxData.primeiraVencida || null,
        days_overdue: Number(String(vmaxData.maiorAtraso || "0").replace(/\D/g, "")) || null,
        cancellation_date: metadata?.["DT Cancelamento"] || null,
        email: null,
        phone: null,
        created_at: vmaxData.primeiraVencida || new Date().toISOString(),
        score: creditProfile?.score || null,
        analysis_data: creditProfile?.data || null,
        analysis_status: creditProfile?.status || null,
        analysis_source: creditProfile?.provider || null,
        analysis_history: creditProfilesList || [],
      },
    }
  } catch (error: any) {
    console.error("[SERVER][v0] getCustomerDetails - Error:", error)
    return { success: false, error: error.message }
  }
}

export async function getVmaxColumns() {
  try {
    const data = await db.select().from(vmax).limit(1)

    // Get all column names from the first row
    const columns = data && data.length > 0 ? Object.keys(data[0]) : []

    // Filter out system columns
    const userColumns = columns.filter(
      (col) =>
        ![
          "id",
          "idCompany",
          "createdAt",
          "updatedAt",
          "analysisMetadata",
          "lastAnalysisDate",
          "collectionProcessedAt",
          "lastCollectionAttempt",
        ].includes(col),
    )

    console.log("[v0] getVmaxColumns - Found columns:", userColumns.length)

    return { success: true, columns: userColumns }
  } catch (error) {
    console.error("[v0] getVmaxColumns - Error:", error)
    return { success: false, columns: [] }
  }
}

export async function createVmaxClient(data: {
  company_id: string
  [key: string]: any
}) {
  try {
    console.log("[v0] createVmaxClient - Creating client for company:", data.company_id)

    // Extract company_id and prepare insert data
    const { company_id, ...clientData } = data

    // Check if customer already exists
    const cpfCnpj = clientData["CPF/CNPJ"] || clientData.cpf_cnpj
    if (cpfCnpj) {
      const [existingCustomer] = await db
        .select({ id: vmax.id })
        .from(vmax)
        .where(
          and(
            eq(vmax.cpfCnpj, cpfCnpj),
            eq(vmax.idCompany, company_id),
          ),
        )
        .limit(1)

      if (existingCustomer) {
        return { success: false, message: "Cliente ja cadastrado nesta empresa" }
      }
    }

    // Prepare insert object with company_id and default values
    const insertData: any = {
      idCompany: company_id,
      autoCollectionEnabled: false,
      approvalStatus: "PENDENTE",
      cliente: clientData.Cliente || clientData.name,
      cpfCnpj: clientData["CPF/CNPJ"] || clientData.cpf_cnpj,
      cidade: clientData.Cidade || clientData.city,
    }

    // Insert customer into VMAX table
    const [newCustomer] = await db
      .insert(vmax)
      .values(insertData)
      .returning()

    console.log("[v0] createVmaxClient - Cliente criado com sucesso:", newCustomer.id)

    return {
      success: true,
      message: "Cliente cadastrado com sucesso!",
      customer: newCustomer,
    }
  } catch (error) {
    console.error("[v0] createVmaxClient - Error:", error)
    return {
      success: false,
      message: "Erro inesperado ao cadastrar cliente",
    }
  }
}
