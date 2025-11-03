"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function getAnalysesData() {
  try {
    console.log("[SERVER] getAnalysesData - Starting...")

    const supabase = createAdminClient()

    const { data: customersData, error: customersError } = await supabase
      .from("customers")
      .select("id, name, document, company_id")
      .order("name")
      .limit(200)

    if (customersError) {
      console.error("[SERVER] getAnalysesData - Error loading customers:", customersError)
      throw customersError
    }

    console.log("[SERVER] getAnalysesData - Customers loaded:", customersData?.length || 0)

    const { data: vmaxData, error: vmaxError } = await supabase
      .from("VMAX")
      .select('id, Cliente, "CPF/CNPJ", id_company, Cidade')
      .order("Cliente")
      .limit(200)

    if (vmaxError) {
      console.error("[SERVER] getAnalysesData - Error loading VMAX:", vmaxError)
    }

    console.log("[SERVER] getAnalysesData - VMAX records loaded:", vmaxData?.length || 0)

    const allCustomers = [
      ...(customersData || []).map((c) => ({
        id: c.id,
        name: c.name,
        document: c.document,
        company_id: c.company_id,
        source_table: "customers" as const,
      })),
      ...(vmaxData || []).map((v) => ({
        id: v.id,
        name: v.Cliente,
        document: v["CPF/CNPJ"],
        company_id: v.id_company,
        source_table: "vmax" as const,
        city: v.Cidade,
      })),
    ]

    console.log("[SERVER] getAnalysesData - Total customers (customers + VMAX):", allCustomers.length)

    if (allCustomers.length === 0) {
      return { success: true, data: [] }
    }

    const customerIds = allCustomers.filter((c) => c.source_table === "customers").map((c) => c.id)
    const vmaxIds = allCustomers.filter((c) => c.source_table === "vmax").map((c) => c.id)

    // Buscar perfis de crédito para clientes da tabela customers
    const { data: profilesData } = await supabase
      .from("credit_profiles")
      .select("*")
      .in("customer_id", [...customerIds, ...vmaxIds])
      .order("created_at", { ascending: false })

    console.log("[SERVER] getAnalysesData - Profiles loaded:", profilesData?.length || 0)

    // Buscar empresas
    const companyIds = [...new Set(allCustomers.map((c) => c.company_id).filter(Boolean))]
    const { data: companiesData } = await supabase.from("companies").select("id, name").in("id", companyIds)

    // Montar dados formatados
    const companiesMap = new Map(companiesData?.map((c) => [c.id, c]) || [])
    const profilesMap = new Map(profilesData?.map((p) => [p.customer_id, p]) || [])

    const formattedAnalyses = allCustomers.map((customer) => {
      const profile = profilesMap.get(customer.id)
      const company = companiesMap.get(customer.company_id)

      return {
        id: profile?.id || customer.id,
        customer_id: customer.id,
        company_id: customer.company_id,
        cpf: customer.document || "N/A",
        score: profile?.score || null,
        source: profile?.source || "none",
        analysis_type: profile?.analysis_type || "none",
        status: profile ? "completed" : "pending",
        created_at: profile?.created_at || new Date().toISOString(),
        customer_name: customer.name || "N/A",
        company_name: company?.name || "N/A",
        source_table: customer.source_table,
      }
    })

    console.log("[SERVER] getAnalysesData - Formatted analyses:", formattedAnalyses.length)

    return { success: true, data: formattedAnalyses }
  } catch (error: any) {
    console.error("[SERVER] getAnalysesData - Error:", error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getCustomerDetails(customerId: string) {
  try {
    console.log("[SERVER] getCustomerDetails - Starting for customer:", customerId)

    const supabase = createAdminClient()

    // Buscar cliente
    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single()

    // Se não encontrar na tabela customers, buscar na VMAX
    let customer = customerData
    let isVMAX = false

    if (customerError || !customerData) {
      const { data: vmaxData, error: vmaxError } = await supabase.from("VMAX").select("*").eq("id", customerId).single()

      if (vmaxError || !vmaxData) {
        throw new Error("Cliente não encontrado")
      }

      customer = {
        id: vmaxData.id,
        name: vmaxData.Cliente,
        document: vmaxData["CPF/CNPJ"],
        company_id: vmaxData.id_company,
        city: vmaxData.Cidade,
      }
      isVMAX = true
    }

    // Buscar perfil de crédito
    const { data: profileData } = await supabase
      .from("credit_profiles")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    // Buscar empresa
    const { data: companyData } = await supabase.from("companies").select("*").eq("id", customer.company_id).single()

    // Buscar histórico de análises
    const { data: analysisHistory } = await supabase
      .from("credit_profiles")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })

    return {
      success: true,
      data: {
        customer,
        profile: profileData,
        company: companyData,
        analysisHistory: analysisHistory || [],
        isVMAX,
      },
    }
  } catch (error: any) {
    console.error("[SERVER] getCustomerDetails - Error:", error)
    return { success: false, error: error.message }
  }
}
