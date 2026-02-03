"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function getVMAXRecords(companyId: string) {
  try {
    console.log("[SERVER] getVMAXRecords - Fetching for company:", companyId)

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("VMAX")
      .select('id, "CPF/CNPJ", Cliente, Cidade, id_company')
      .eq("id_company", companyId)
      .order("Cliente")

    if (error) {
      console.error("[SERVER] getVMAXRecords - Error:", error)
      throw error
    }

    console.log("[SERVER] getVMAXRecords - Found records:", data?.length || 0)

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error("[SERVER] getVMAXRecords - Error:", error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getCustomerDetails(vmaxId: string) {
  try {
    const supabase = createAdminClient()

    console.log("[SERVER][v0] getCustomerDetails - Searching for VMAX ID:", vmaxId)

    // Buscar na tabela VMAX pelo ID
    const { data: vmaxData, error: vmaxError } = await supabase.from("VMAX").select("*").eq("id", vmaxId).single()

    if (vmaxError || !vmaxData) {
      console.log("[SERVER][v0] getCustomerDetails - Cliente não encontrado:", vmaxError?.message)
      return { success: false, error: "Cliente não encontrado" }
    }

    console.log("[SERVER][v0] getCustomerDetails - Found VMAX data:", {
      id: vmaxData.id,
      name: vmaxData.Cliente,
      document: vmaxData["CPF/CNPJ"],
    })

    const { data: creditProfile, error: creditError } = await supabase
      .from("credit_profiles")
      .select("*")
      .eq("customer_id", vmaxId)
      .in("source", ["assertiva", "credit_analysis"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (creditError) {
      console.error("[SERVER][v0] getCustomerDetails - Error fetching credit profile:", creditError)
    }

    // Buscar histórico completo de análises
    const { data: creditProfiles, error: profilesError } = await supabase
      .from("credit_profiles")
      .select("*")
      .eq("customer_id", vmaxId)
      .order("created_at", { ascending: false })

    if (profilesError) {
      console.error("[SERVER][v0] getCustomerDetails - Error fetching credit profiles:", profilesError)
    }

    console.log("[SERVER][v0] getCustomerDetails - Analysis summary:", {
      has_credit_analysis: !!creditProfile,
      total_analyses: creditProfiles?.length || 0,
    })

    if (creditProfile) {
      console.log("[SERVER][v0] getCustomerDetails - Latest analysis:", {
        source: creditProfile.source,
        score: creditProfile.score,
        created_at: creditProfile.created_at,
        has_data: !!creditProfile.data,
        data_keys: creditProfile.data ? Object.keys(creditProfile.data) : [],
      })
    } else {
      console.log("[SERVER][v0] getCustomerDetails - No credit profiles found for customer_id:", vmaxId)
    }

    return {
      success: true,
      data: {
        id: vmaxData.id,
        name: vmaxData.Cliente || "N/A",
        document: vmaxData["CPF/CNPJ"] || "N/A",
        city: vmaxData.Cidade || null,
        company: vmaxData.Empresa || null,
        overdue_amount: vmaxData.Vencido || null,
        first_overdue: vmaxData.Vecto || null,
        days_overdue: vmaxData["Dias Inad."] || null,
        cancellation_date: vmaxData["DT Cancelamento"] || null,
        email: null,
        phone: null,
        created_at: vmaxData.Vecto || new Date().toISOString(),
        score: creditProfile?.score || null,
        analysis_data: creditProfile?.data || null,
        analysis_status: creditProfile?.status || null,
        analysis_source: creditProfile?.source || null,
        analysis_history: creditProfiles || [],
      },
    }
  } catch (error: any) {
    console.error("[SERVER][v0] getCustomerDetails - Error:", error)
    return { success: false, error: error.message }
  }
}

export async function getVmaxColumns() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase.from("VMAX").select("*").limit(1)

    if (error) {
      console.error("[v0] getVmaxColumns - Error:", error)
      return { success: false, columns: [] }
    }

    // Get all column names from the first row
    const columns = data && data.length > 0 ? Object.keys(data[0]) : []

    // Filter out system columns
    const userColumns = columns.filter(
      (col) =>
        ![
          "id",
          "id_company",
          "created_at",
          "updated_at",
          "analysis_metadata",
          "last_analysis_date",
          "collection_processed_at",
          "last_collection_attempt",
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
    const supabase = createAdminClient()

    console.log("[v0] createVmaxClient - Creating client for company:", data.company_id)

    // Extract company_id and prepare insert data
    const { company_id, ...clientData } = data

    // Check if customer already exists
    const cpfCnpj = clientData["CPF/CNPJ"] || clientData.cpf_cnpj
    if (cpfCnpj) {
      const { data: existingCustomer } = await supabase
        .from("VMAX")
        .select("id")
        .eq("CPF/CNPJ", cpfCnpj)
        .eq("id_company", company_id)
        .single()

      if (existingCustomer) {
        return { success: false, message: "Cliente já cadastrado nesta empresa" }
      }
    }

    // Prepare insert object with company_id and default values
    const insertData: any = {
      ...clientData,
      id_company: company_id,
      auto_collection_enabled: false,
      approval_status: "PENDENTE",
    }

    // Insert customer into VMAX table
    const { data: newCustomer, error: insertError } = await supabase.from("VMAX").insert(insertData).select().single()

    if (insertError) {
      console.error("[v0] createVmaxClient - Error inserting customer:", insertError)
      return { success: false, message: "Erro ao cadastrar cliente no banco de dados" }
    }

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
