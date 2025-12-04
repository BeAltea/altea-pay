"use server"

import { createServerClient, createAdminClient } from "@/lib/supabase/server"
import { analyzeCustomerCredit } from "./analyze-customer-credit"

export async function createCustomerWithAnalysis(data: {
  name: string
  cpf_cnpj: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
}) {
  try {
    const supabase = await createServerClient()
    const adminSupabase = createAdminClient()

    // Get current user and company
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: "Usuário não autenticado" }
    }

    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single()

    if (!profile?.company_id) {
      return { success: false, message: "Empresa não encontrada" }
    }

    // Clean CPF/CNPJ
    const cleanDocument = data.cpf_cnpj.replace(/\D/g, "")

    // Check if customer already exists
    const { data: existingCustomer } = await adminSupabase
      .from("VMAX")
      .select("id")
      .eq("CPF/CNPJ", data.cpf_cnpj)
      .eq("id_company", profile.company_id)
      .single()

    if (existingCustomer) {
      return { success: false, message: "Cliente já cadastrado nesta empresa" }
    }

    console.log("[v0] Criando novo cliente...")

    // Insert customer into VMAX table
    const { data: newCustomer, error: insertError } = await adminSupabase
      .from("VMAX")
      .insert({
        Cliente: data.name,
        "CPF/CNPJ": data.cpf_cnpj,
        Email: data.email || null,
        Telefone: data.phone || null,
        Cidade: data.city || null,
        UF: data.state || null,
        id_company: profile.company_id,
        auto_collection_enabled: false, // Will be enabled after analysis
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error inserting customer:", insertError)
      return { success: false, message: "Erro ao cadastrar cliente no banco de dados" }
    }

    console.log("[v0] Cliente criado, iniciando análise de crédito...")

    let creditAnalysis = null
    try {
      const analysisResult = await analyzeCustomerCredit(
        newCustomer.id,
        cleanDocument,
        0, // valor da dívida default
      )

      if (analysisResult.success) {
        creditAnalysis = analysisResult.resultado
        console.log("[v0] ✅ Análise de crédito concluída:", creditAnalysis)
      } else {
        console.error("[v0] ❌ Falha na análise:", analysisResult.error)
      }
    } catch (error) {
      console.error("[v0] Error in credit analysis:", error)
      // Don't fail the customer creation if analysis fails
    }

    return {
      success: true,
      message: creditAnalysis
        ? `Cliente cadastrado e analisado! Status: ${creditAnalysis.decisao}`
        : "Cliente cadastrado com sucesso! Análise de crédito em andamento...",
      customer: newCustomer,
      creditAnalysis,
    }
  } catch (error) {
    console.error("[v0] Error creating customer:", error)
    return {
      success: false,
      message: "Erro inesperado ao cadastrar cliente",
    }
  }
}
