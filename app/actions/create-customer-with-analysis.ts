"use server"

import { createServerClient, createAdminClient } from "@/lib/supabase/server"
import { runAssertivaManualAnalysis } from "@/services/creditAnalysisService"

export async function createCustomerWithAnalysis(data: {
  name: string
  cpf_cnpj: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  companyId?: string // Allow passing company_id directly for super admin
}) {
  try {
    console.log("[v0] createCustomerWithAnalysis - Starting", data)

    const supabase = await createServerClient()
    const adminSupabase = createAdminClient()

    let companyId = data.companyId

    if (!companyId) {
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

      companyId = profile.company_id
    }

    // Clean CPF/CNPJ
    const cleanDocument = data.cpf_cnpj.replace(/\D/g, "")

    // Check if customer already exists
    const { data: existingCustomer } = await adminSupabase
      .from("VMAX")
      .select("id")
      .eq("CPF/CNPJ", data.cpf_cnpj)
      .eq("id_company", companyId)
      .single()

    if (existingCustomer) {
      return { success: false, message: "Cliente já cadastrado nesta empresa" }
    }

    console.log("[v0] Criando novo cliente na tabela VMAX...")

    const { data: newCustomer, error: insertError } = await adminSupabase
      .from("VMAX")
      .insert({
        Cliente: data.name,
        "CPF/CNPJ": data.cpf_cnpj,
        Email: data.email || null,
        Telefone: data.phone || null,
        Cidade: data.city || null,
        UF: data.state || null,
        id_company: companyId,
        auto_collection_enabled: false,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error inserting customer:", insertError)
      return { success: false, message: "Erro ao cadastrar cliente no banco de dados" }
    }

    console.log("[v0] ✅ Cliente criado com ID:", newCustomer.id)
    console.log("[v0] 🔄 Iniciando análise de crédito automática com Assertiva...")

    let creditAnalysis = null
    let analysisError = null

    try {
      const analysisResult = await runAssertivaManualAnalysis([
        {
          id: newCustomer.id,
          cpf: cleanDocument,
          company_id: companyId,
        },
      ])

      console.log("[v0] Resultado da análise:", analysisResult)

      if (analysisResult.success && analysisResult.results.length > 0) {
        const result = analysisResult.results[0]

        if (result.status === "success") {
          creditAnalysis = {
            score: result.score,
            decision: result.decision,
            message: result.message,
          }
          console.log("[v0] ✅ Análise de crédito concluída com sucesso:", creditAnalysis)
        } else {
          analysisError = result.error || "Erro desconhecido na análise"
          console.error("[v0] ❌ Falha na análise:", analysisError)
        }
      } else {
        analysisError = analysisResult.error || "Nenhum resultado retornado"
        console.error("[v0] ❌ Falha na análise:", analysisError)
      }
    } catch (error) {
      analysisError = error instanceof Error ? error.message : "Erro desconhecido"
      console.error("[v0] ❌ Exceção na análise de crédito:", error)
    }

    return {
      success: true,
      message: creditAnalysis
        ? `Cliente cadastrado e analisado! Score: ${creditAnalysis.score} pts - ${creditAnalysis.decision}`
        : `Cliente cadastrado com sucesso! ${analysisError ? `Análise falhou: ${analysisError}` : "Análise em andamento..."}`,
      customer: newCustomer,
      creditAnalysis,
      analysisError,
    }
  } catch (error) {
    console.error("[v0] Error creating customer:", error)
    return {
      success: false,
      message: "Erro inesperado ao cadastrar cliente",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}
