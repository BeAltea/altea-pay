"use server"

import { createClient } from "@/lib/supabase/server"

// Tipos
export interface CreditProfile {
  id: string
  company_id: string
  user_id?: string
  cpf: string
  analysis_type: "free" | "detailed"
  source: "gov" | "assertiva"
  data: any
  score?: number
  created_at: string
  updated_at: string
}

export interface AnalysisTrigger {
  id: string
  company_id: string
  trigger_scope: "single" | "group" | "all"
  users?: string[]
  analysis_type: "free" | "detailed"
  status: "pending" | "running" | "completed" | "failed"
  created_by?: string
  created_at: string
  completed_at?: string
  error_message?: string
  total_users: number
  processed_users: number
}

// Análise gratuita usando APIs públicas do governo
export async function analyzeFree(cpf: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log("[v0] analyzeFree - Starting for CPF:", cpf)

    // Limpar CPF (remover pontos e hífens)
    const cleanCpf = cpf.replace(/\D/g, "")

    // Simular consulta às APIs públicas do governo
    // Em produção, você deve integrar com as APIs reais:
    // - Portal da Transparência: https://portaldatransparencia.gov.br/api-de-dados
    // - Receita Federal: https://www.gov.br/pt-br/servicos/obter-solucao-de-consulta-de-dados-de-cadastro-de-pessoa-fisica-cpf

    const mockData = {
      cpf: cleanCpf,
      nome: "Cliente Exemplo",
      situacao_cpf: "REGULAR",
      data_nascimento: "1990-01-01",
      vinculos_publicos: [],
      historico_financeiro: {
        protestos: 0,
        acoes_judiciais: 0,
      },
      score_calculado: Math.floor(Math.random() * 400) + 300, // Score entre 300-700
    }

    console.log("[v0] analyzeFree - Success:", mockData)
    return { success: true, data: mockData }
  } catch (error: any) {
    console.error("[v0] analyzeFree - Error:", error)
    return { success: false, error: error.message }
  }
}

// Análise completa usando Assertiva Soluções
export async function analyzeDetailed(
  cpf: string,
  companyId?: string,
  userId?: string,
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log("[v0] analyzeDetailed - Starting for CPF:", cpf)

    // Limpar CPF
    const cleanCpf = cpf.replace(/\D/g, "")

    // Se companyId foi fornecido, usar o serviço Assertiva com cache
    if (companyId) {
      const { analyzeDetailedWithCache } = await import("./assertivaService")
      const result = await analyzeDetailedWithCache(cpf, companyId, userId)
      return result
    }

    // Verificar se já existe análise em cache
    const cached = await getCachedResult(cleanCpf)
    if (cached) {
      console.log("[v0] analyzeDetailed - Using cached result")
      return { success: true, data: cached.data }
    }

    // Integração com Assertiva Soluções
    // Documentação: https://integracao.assertivasolucoes.com.br/v3/doc

    // TODO: Implementar integração real com Assertiva
    // const response = await fetch("https://integracao.assertivasolucoes.com.br/v3/consultas", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "Authorization": `Bearer ${process.env.ASSERTIVA_API_KEY}`
    //   },
    //   body: JSON.stringify({ cpf: cleanCpf })
    // })

    // Simular resposta da Assertiva
    const mockData = {
      cpf: cleanCpf,
      nome_completo: "Cliente Exemplo Completo",
      data_nascimento: "1990-01-01",
      situacao_cpf: "REGULAR",
      score_serasa: Math.floor(Math.random() * 400) + 400, // Score entre 400-800
      renda_presumida: Math.floor(Math.random() * 5000) + 2000,
      protestos: [],
      acoes_judiciais: [],
      cheques_sem_fundo: [],
      dividas_ativas: [],
      participacao_empresas: [],
      score_assertiva: Math.floor(Math.random() * 400) + 500, // Score entre 500-900
    }

    console.log("[v0] analyzeDetailed - Success:", mockData)
    return { success: true, data: mockData }
  } catch (error: any) {
    console.error("[v0] analyzeDetailed - Error:", error)
    return { success: false, error: error.message }
  }
}

// Armazenar resultado da análise
export async function storeAnalysisResult(
  cpf: string,
  data: any,
  source: "gov" | "assertiva",
  type: "free" | "detailed",
  companyId: string,
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[v0] storeAnalysisResult - Starting", { cpf, source, type, companyId })

    const supabase = await createClient()
    const cleanCpf = cpf.replace(/\D/g, "")

    // Calcular score interno
    const score = data.score_calculado || data.score_assertiva || data.score_serasa || 0

    // Inserir ou atualizar
    const { error } = await supabase.from("credit_profiles").upsert(
      {
        company_id: companyId,
        user_id: userId,
        cpf: cleanCpf,
        analysis_type: type,
        source,
        data,
        score,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "cpf,company_id",
      },
    )

    if (error) {
      console.error("[v0] storeAnalysisResult - Error:", error)
      return { success: false, error: error.message }
    }

    console.log("[v0] storeAnalysisResult - Success")
    return { success: true }
  } catch (error: any) {
    console.error("[v0] storeAnalysisResult - Error:", error)
    return { success: false, error: error.message }
  }
}

// Buscar resultado em cache
export async function getCachedResult(cpf: string): Promise<CreditProfile | null> {
  try {
    const supabase = await createClient()
    const cleanCpf = cpf.replace(/\D/g, "")

    const { data, error } = await supabase
      .from("credit_profiles")
      .select("*")
      .eq("cpf", cleanCpf)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null

    return data as CreditProfile
  } catch (error) {
    return null
  }
}

// Executar trigger de análise em lote
export async function runAnalysisTrigger(triggerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[v0] runAnalysisTrigger - Starting for trigger:", triggerId)

    const supabase = await createClient()

    // Buscar trigger
    const { data: trigger, error: triggerError } = await supabase
      .from("analysis_triggers")
      .select("*")
      .eq("id", triggerId)
      .single()

    if (triggerError || !trigger) {
      return { success: false, error: "Trigger não encontrado" }
    }

    // Atualizar status para running
    await supabase.from("analysis_triggers").update({ status: "running" }).eq("id", triggerId)

    // Buscar usuários para análise
    let userIds: string[] = []

    if (trigger.trigger_scope === "all") {
      const { data: users } = await supabase
        .from("customers")
        .select("id, document")
        .eq("company_id", trigger.company_id)

      userIds = users?.map((u) => u.id) || []
    } else if (trigger.trigger_scope === "group") {
      userIds = trigger.users || []
    } else {
      userIds = trigger.users || []
    }

    // Atualizar total de usuários
    await supabase.from("analysis_triggers").update({ total_users: userIds.length }).eq("id", triggerId)

    // Processar cada usuário
    let processed = 0
    for (const userId of userIds) {
      try {
        // Buscar CPF do usuário
        const { data: customer } = await supabase.from("customers").select("document").eq("id", userId).single()

        if (!customer) continue

        // Executar análise
        let result
        if (trigger.analysis_type === "free") {
          result = await analyzeFree(customer.document)
        } else {
          result = await analyzeDetailed(customer.document, trigger.company_id, userId)
        }

        // Armazenar resultado
        if (result.success && result.data) {
          await storeAnalysisResult(
            customer.document,
            result.data,
            trigger.analysis_type === "free" ? "gov" : "assertiva",
            trigger.analysis_type,
            trigger.company_id,
            userId,
          )

          // Log de sucesso
          await supabase.from("analysis_logs").insert({
            trigger_id: triggerId,
            cpf: customer.document,
            status: "success",
          })
        } else {
          // Log de erro
          await supabase.from("analysis_logs").insert({
            trigger_id: triggerId,
            cpf: customer.document,
            status: "failed",
            error_message: result.error,
          })
        }

        processed++

        // Atualizar progresso
        await supabase.from("analysis_triggers").update({ processed_users: processed }).eq("id", triggerId)
      } catch (error: any) {
        console.error("[v0] runAnalysisTrigger - Error processing user:", error)

        // Log de erro
        await supabase.from("analysis_logs").insert({
          trigger_id: triggerId,
          cpf: "unknown",
          status: "failed",
          error_message: error.message,
        })
      }
    }

    // Atualizar status para completed
    await supabase
      .from("analysis_triggers")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", triggerId)

    console.log("[v0] runAnalysisTrigger - Completed")
    return { success: true }
  } catch (error: any) {
    console.error("[v0] runAnalysisTrigger - Error:", error)

    // Atualizar status para failed
    const supabase = await createClient()
    await supabase
      .from("analysis_triggers")
      .update({
        status: "failed",
        error_message: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", triggerId)

    return { success: false, error: error.message }
  }
}

export async function analyzeCreditFree(
  document: string,
): Promise<{ success: boolean; score?: number; risk_level?: string; details?: any; error?: string }> {
  const result = await analyzeFree(document)

  if (!result.success) {
    return { success: false, error: result.error }
  }

  const score = result.data?.score_calculado || 0
  let risk_level = "medium"

  if (score >= 700) risk_level = "low"
  else if (score >= 500) risk_level = "medium"
  else if (score >= 300) risk_level = "high"
  else risk_level = "very_high"

  return {
    success: true,
    score,
    risk_level,
    details: result.data,
  }
}

export async function analyzeCreditAssertiva(
  document: string,
): Promise<{ success: boolean; score?: number; risk_level?: string; details?: any; error?: string }> {
  const result = await analyzeDetailed(document)

  if (!result.success) {
    return { success: false, error: result.error }
  }

  const score = result.data?.score_assertiva || result.data?.score_serasa || 0
  let risk_level = "medium"

  if (score >= 700) risk_level = "low"
  else if (score >= 500) risk_level = "medium"
  else if (score >= 300) risk_level = "high"
  else risk_level = "very_high"

  return {
    success: true,
    score,
    risk_level,
    details: result.data,
  }
}
