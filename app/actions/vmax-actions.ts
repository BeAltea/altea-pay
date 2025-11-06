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

    // Buscar análise da Assertiva primeiro
    const { data: assertivaProfile, error: assertivaError } = await supabase
      .from("credit_profiles")
      .select("*")
      .eq("customer_id", vmaxId)
      .eq("source", "assertiva")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (assertivaError) {
      console.error("[SERVER][v0] getCustomerDetails - Error fetching Assertiva profile:", assertivaError)
    }

    // Buscar análise gratuita (gov) como fallback
    const { data: govProfile, error: govError } = await supabase
      .from("credit_profiles")
      .select("*")
      .eq("customer_id", vmaxId)
      .eq("source", "gov")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (govError) {
      console.error("[SERVER][v0] getCustomerDetails - Error fetching Gov profile:", govError)
    }

    // Buscar histórico completo de análises
    const { data: creditProfiles, error: creditError } = await supabase
      .from("credit_profiles")
      .select("*")
      .eq("customer_id", vmaxId)
      .order("created_at", { ascending: false })

    if (creditError) {
      console.error("[SERVER][v0] getCustomerDetails - Error fetching credit profiles:", creditError)
    }

    // Priorizar Assertiva, depois Gov
    const latestProfile = assertivaProfile || govProfile

    console.log("[SERVER][v0] getCustomerDetails - Analysis summary:", {
      has_assertiva: !!assertivaProfile,
      has_gov: !!govProfile,
      using_source: latestProfile?.source || "none",
      total_analyses: creditProfiles?.length || 0,
    })

    if (latestProfile) {
      console.log("[SERVER][v0] getCustomerDetails - Latest analysis:", {
        source: latestProfile.source,
        score: latestProfile.score,
        created_at: latestProfile.created_at,
        has_data: !!latestProfile.data,
        data_keys: latestProfile.data ? Object.keys(latestProfile.data) : [],
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
        first_overdue: vmaxData.Primeira_Vencida || null,
        days_overdue: vmaxData["Dias_Inad."] || null,
        cancellation_date: vmaxData.DT_Cancelamento || null,
        email: null,
        phone: null,
        created_at: vmaxData.Primeira_Vencida || new Date().toISOString(),
        score: latestProfile?.score || null,
        analysis_data: latestProfile?.data || null,
        analysis_status: latestProfile?.status || null,
        analysis_source: latestProfile?.source || null,
        assertiva_analysis: assertivaProfile?.data || null,
        assertiva_score: assertivaProfile?.score || null,
        assertiva_date: assertivaProfile?.created_at || null,
        gov_analysis: govProfile?.data || null,
        gov_score: govProfile?.score || null,
        gov_date: govProfile?.created_at || null,
        analysis_history: creditProfiles || [],
      },
    }
  } catch (error: any) {
    console.error("[SERVER][v0] getCustomerDetails - Error:", error)
    return { success: false, error: error.message }
  }
}
