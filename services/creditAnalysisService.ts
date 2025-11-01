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
  failed_users?: number
}

// Análise gratuita usando APIs públicas do governo
export async function analyzeFree(cpf: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createClient()

  try {
    console.log("[v0] analyzeFree - Starting for CPF:", cpf)

    // Limpar CPF (remover pontos e hífens)
    const cleanCpf = cpf.replace(/\D/g, "")

    // Validar CPF
    if (cleanCpf.length !== 11) {
      return { success: false, error: "CPF inválido" }
    }

    // Log de início da integração
    const logStartTime = Date.now()
    await supabase.from("integration_logs").insert({
      integration_type: "portal_transparencia",
      operation: "consulta_cpf",
      status: "started",
      request_data: { cpf: cleanCpf },
      created_at: new Date().toISOString(),
    })

    console.log("[v0] analyzeFree - Calling Portal da Transparência API")

    // Chamada real à API do Portal da Transparência
    const response = await fetch(
      `https://api.portaldatransparencia.gov.br/api-de-dados/servidores/por-cpf?cpf=${cleanCpf}`,
      {
        method: "GET",
        headers: {
          "chave-api-dados": process.env.PORTAL_TRANSPARENCIA_API_KEY!,
          Accept: "application/json",
        },
      },
    )

    const duration = Date.now() - logStartTime

    // Verificar se a resposta foi bem-sucedida
    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] analyzeFree - API Error:", response.status, errorText)

      // Log de erro
      await supabase.from("integration_logs").insert({
        integration_type: "portal_transparencia",
        operation: "consulta_cpf",
        status: "error",
        request_data: { cpf: cleanCpf },
        response_data: { status: response.status, error: errorText },
        duration_ms: duration,
        created_at: new Date().toISOString(),
      })

      // Se CPF não encontrado (404), retornar dados vazios mas com sucesso
      if (response.status === 404) {
        const emptyData = {
          cpf: cleanCpf,
          situacao_cpf: "REGULAR",
          vinculos_publicos: [],
          historico_financeiro: {
            protestos: 0,
            acoes_judiciais: 0,
          },
          score_calculado: 500, // Score neutro para CPF sem vínculos
        }

        console.log("[v0] analyzeFree - CPF not found in government database, returning empty data")

        // Log de sucesso com dados vazios
        await supabase.from("integration_logs").insert({
          integration_type: "portal_transparencia",
          operation: "consulta_cpf",
          status: "success",
          request_data: { cpf: cleanCpf },
          response_data: { vinculos_count: 0, message: "CPF não encontrado" },
          duration_ms: duration,
          created_at: new Date().toISOString(),
        })

        return { success: true, data: emptyData }
      }

      return { success: false, error: `Erro na API: ${response.status} - ${errorText}` }
    }

    // Parse da resposta
    const apiData = await response.json()
    console.log("[v0] analyzeFree - API Response:", {
      vinculos_count: Array.isArray(apiData) ? apiData.length : 0,
      has_data: !!apiData,
    })

    // Montar objeto de retorno
    const resultData = {
      cpf: cleanCpf,
      situacao_cpf: apiData?.situacao || "REGULAR",
      vinculos_publicos: Array.isArray(apiData) ? apiData : apiData ? [apiData] : [],
      historico_financeiro: {
        protestos: 0,
        acoes_judiciais: 0,
      },
      // Calcular score baseado nos vínculos públicos
      // Quanto mais vínculos, melhor o score (indica estabilidade)
      score_calculado: Array.isArray(apiData) ? Math.min(700, 400 + apiData.length * 50) : 500,
    }

    console.log("[v0] analyzeFree - Success:", {
      cpf: cleanCpf,
      vinculos_count: resultData.vinculos_publicos.length,
      score: resultData.score_calculado,
    })

    // Log de sucesso
    await supabase.from("integration_logs").insert({
      integration_type: "portal_transparencia",
      operation: "consulta_cpf",
      status: "success",
      request_data: { cpf: cleanCpf },
      response_data: {
        vinculos_count: resultData.vinculos_publicos.length,
        score: resultData.score_calculado,
      },
      duration_ms: duration,
      created_at: new Date().toISOString(),
    })

    return { success: true, data: resultData }
  } catch (error: any) {
    console.error("[v0] analyzeFree - Error:", error)

    // Log de erro
    await supabase.from("integration_logs").insert({
      integration_type: "portal_transparencia",
      operation: "consulta_cpf",
      status: "error",
      request_data: { cpf: cpf.replace(/\D/g, "") },
      response_data: { error: error.message },
      created_at: new Date().toISOString(),
    })

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
    console.log("[v0] storeAnalysisResult - Starting", { cpf, source, type, companyId, userId })

    const supabase = await createClient()
    const cleanCpf = cpf.replace(/\D/g, "")

    // Calcular score interno
    const score = data.score_calculado || data.score_assertiva || data.score_serasa || 0

    // Inserir ou atualizar
    const { data: insertedData, error } = await supabase
      .from("credit_profiles")
      .upsert(
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
      .select()

    if (error) {
      console.error("[v0] storeAnalysisResult - Error:", error)
      return { success: false, error: error.message }
    }

    console.log("[v0] storeAnalysisResult - Success", {
      cpf: cleanCpf,
      source,
      type,
      score,
      record_id: insertedData?.[0]?.id,
    })

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

    console.log("[v0] runAnalysisTrigger - Trigger details:", {
      scope: trigger.trigger_scope,
      type: trigger.analysis_type,
      company_id: trigger.company_id,
    })

    // Atualizar status para running
    await supabase
      .from("analysis_triggers")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
      })
      .eq("id", triggerId)

    // Buscar usuários para análise
    let userIds: string[] = []

    if (trigger.trigger_scope === "all") {
      const { data: users } = await supabase
        .from("customers")
        .select("id, document")
        .eq("company_id", trigger.company_id)

      userIds = users?.map((u) => u.id) || []
      console.log("[v0] runAnalysisTrigger - Found all users:", userIds.length)
    } else if (trigger.trigger_scope === "group") {
      userIds = trigger.users || []
      console.log("[v0] runAnalysisTrigger - Group users:", userIds.length)
    } else {
      userIds = trigger.users || []
      console.log("[v0] runAnalysisTrigger - Single user:", userIds.length)
    }

    // Atualizar total de usuários
    await supabase.from("analysis_triggers").update({ total_users: userIds.length }).eq("id", triggerId)

    // Processar cada usuário com controle de concorrência
    let processed = 0
    let failed = 0
    const batchSize = 5 // Processar 5 por vez para não sobrecarregar as APIs

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize)

      console.log("[v0] runAnalysisTrigger - Processing batch:", {
        start: i,
        end: Math.min(i + batchSize, userIds.length),
        total: userIds.length,
      })

      await Promise.all(
        batch.map(async (userId) => {
          try {
            // Buscar CPF do usuário
            const { data: customer } = await supabase.from("customers").select("document").eq("id", userId).single()

            if (!customer) {
              console.log("[v0] runAnalysisTrigger - Customer not found:", userId)
              failed++
              return
            }

            console.log("[v0] runAnalysisTrigger - Analyzing customer:", {
              userId,
              cpf: customer.document,
              type: trigger.analysis_type,
            })

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

              processed++
              console.log("[v0] runAnalysisTrigger - Success for customer:", userId)
            } else {
              failed++
              console.error("[v0] runAnalysisTrigger - Failed for customer:", userId, result.error)
            }

            // Atualizar progresso
            await supabase
              .from("analysis_triggers")
              .update({
                processed_users: processed,
                failed_users: failed,
              })
              .eq("id", triggerId)
          } catch (error: any) {
            failed++
            console.error("[v0] runAnalysisTrigger - Error processing user:", userId, error)
          }
        }),
      )
    }

    // Atualizar status para completed
    await supabase
      .from("analysis_triggers")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        processed_users: processed,
        failed_users: failed,
      })
      .eq("id", triggerId)

    console.log("[v0] runAnalysisTrigger - Completed:", {
      processed,
      failed,
      total: userIds.length,
    })

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

export async function runVMAXAutoAnalysis(companyId: string): Promise<{
  success: boolean
  total: number
  analyzed: number
  cached: number
  failed: number
  duration: number
  cpfs_analyzed: string[]
  sample_result?: any
  error?: string
}> {
  const startTime = Date.now()

  try {
    console.log("[v0] runVMAXAutoAnalysis - Starting for company:", companyId)

    const supabase = await createClient()

    // 1. Buscar todos os registros da tabela VMAX para a empresa
    const { data: vmaxRecords, error: vmaxError } = await supabase
      .from("VMAX")
      .select('id, id_company, "CPF/CNPJ", Cliente, Cidade')
      .eq("id_company", companyId)

    if (vmaxError) {
      console.error("[v0] runVMAXAutoAnalysis - Error fetching VMAX records:", vmaxError)
      return {
        success: false,
        total: 0,
        analyzed: 0,
        cached: 0,
        failed: 0,
        duration: Date.now() - startTime,
        cpfs_analyzed: [],
        error: vmaxError.message,
      }
    }

    if (!vmaxRecords || vmaxRecords.length === 0) {
      console.log("[v0] runVMAXAutoAnalysis - No records found in VMAX table")
      return {
        success: true,
        total: 0,
        analyzed: 0,
        cached: 0,
        failed: 0,
        duration: Date.now() - startTime,
        cpfs_analyzed: [],
      }
    }

    console.log("[v0] runVMAXAutoAnalysis - Found VMAX records:", vmaxRecords.length)

    // 2. Verificar quais já têm análise em credit_profiles com source='gov'
    const cpfsToAnalyze: Array<{ cpf: string; name: string; city: string }> = []
    let cachedCount = 0

    for (const record of vmaxRecords) {
      const cpf = record["CPF/CNPJ"]?.replace(/\D/g, "")

      if (!cpf || cpf.length !== 11) {
        console.log("[v0] runVMAXAutoAnalysis - Invalid CPF, skipping:", record["CPF/CNPJ"])
        continue
      }

      // Verificar se já existe análise
      const { data: existingAnalysis } = await supabase
        .from("credit_profiles")
        .select("id, score, created_at")
        .eq("cpf", cpf)
        .eq("company_id", companyId)
        .eq("source", "gov")
        .single()

      if (existingAnalysis) {
        console.log("[v0] runVMAXAutoAnalysis - CPF already analyzed (cached):", cpf)
        cachedCount++
      } else {
        cpfsToAnalyze.push({
          cpf,
          name: record.Cliente || "N/A",
          city: record.Cidade || "N/A",
        })
      }
    }

    console.log("[v0] runVMAXAutoAnalysis - CPFs to analyze:", cpfsToAnalyze.length)
    console.log("[v0] runVMAXAutoAnalysis - CPFs already cached:", cachedCount)

    // 3. Processar em lotes de 5 (controle de concorrência)
    let analyzedCount = 0
    let failedCount = 0
    const cpfsAnalyzed: string[] = []
    let sampleResult: any = null
    const batchSize = 5

    for (let i = 0; i < cpfsToAnalyze.length; i += batchSize) {
      const batch = cpfsToAnalyze.slice(i, i + batchSize)

      console.log("[v0] runVMAXAutoAnalysis - Processing batch:", {
        start: i + 1,
        end: Math.min(i + batchSize, cpfsToAnalyze.length),
        total: cpfsToAnalyze.length,
      })

      const batchResults = await Promise.allSettled(
        batch.map(async (item) => {
          try {
            console.log("[v0] runVMAXAutoAnalysis - Analyzing CPF:", {
              cpf: item.cpf,
              name: item.name,
              city: item.city,
            })

            // Executar análise gratuita (Portal da Transparência)
            const analysisResult = await analyzeFree(item.cpf)

            if (!analysisResult.success) {
              console.error("[v0] runVMAXAutoAnalysis - Analysis failed for CPF:", item.cpf, analysisResult.error)
              return { success: false, cpf: item.cpf, error: analysisResult.error }
            }

            // Salvar resultado em credit_profiles
            const storeResult = await storeAnalysisResult(
              item.cpf,
              analysisResult.data,
              "gov",
              "free",
              companyId,
              undefined,
            )

            if (!storeResult.success) {
              console.error("[v0] runVMAXAutoAnalysis - Failed to store result for CPF:", item.cpf, storeResult.error)
              return { success: false, cpf: item.cpf, error: storeResult.error }
            }

            console.log("[v0] runVMAXAutoAnalysis - Successfully analyzed and stored CPF:", item.cpf, {
              score: analysisResult.data?.score_calculado,
              vinculos: analysisResult.data?.vinculos_publicos?.length || 0,
            })

            return {
              success: true,
              cpf: item.cpf,
              data: analysisResult.data,
            }
          } catch (error: any) {
            console.error("[v0] runVMAXAutoAnalysis - Error processing CPF:", item.cpf, error)
            return { success: false, cpf: item.cpf, error: error.message }
          }
        }),
      )

      // Processar resultados do batch
      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          if (result.value.success) {
            analyzedCount++
            cpfsAnalyzed.push(result.value.cpf)

            // Guardar primeiro resultado como amostra
            if (!sampleResult && result.value.data) {
              sampleResult = {
                cpf: result.value.cpf,
                score: result.value.data.score_calculado,
                vinculos_count: result.value.data.vinculos_publicos?.length || 0,
                situacao_cpf: result.value.data.situacao_cpf,
              }
            }
          } else {
            failedCount++
          }
        } else {
          failedCount++
        }
      })

      // Pequeno delay entre batches para não sobrecarregar a API
      if (i + batchSize < cpfsToAnalyze.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    const duration = Date.now() - startTime

    console.log("[v0] runVMAXAutoAnalysis - Completed:", {
      total: vmaxRecords.length,
      analyzed: analyzedCount,
      cached: cachedCount,
      failed: failedCount,
      duration_ms: duration,
    })

    // Log final consolidado
    await supabase.from("integration_logs").insert({
      integration_type: "vmax_auto_analysis",
      operation: "batch_analysis",
      status: "completed",
      request_data: {
        company_id: companyId,
        total_records: vmaxRecords.length,
        cpfs_to_analyze: cpfsToAnalyze.length,
      },
      response_data: {
        analyzed: analyzedCount,
        cached: cachedCount,
        failed: failedCount,
        cpfs_analyzed: cpfsAnalyzed,
      },
      duration_ms: duration,
      created_at: new Date().toISOString(),
    })

    return {
      success: true,
      total: vmaxRecords.length,
      analyzed: analyzedCount,
      cached: cachedCount,
      failed: failedCount,
      duration,
      cpfs_analyzed: cpfsAnalyzed,
      sample_result: sampleResult,
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error("[v0] runVMAXAutoAnalysis - Error:", error)

    // Log de erro
    const supabase = await createClient()
    await supabase.from("integration_logs").insert({
      integration_type: "vmax_auto_analysis",
      operation: "batch_analysis",
      status: "error",
      request_data: { company_id: companyId },
      response_data: { error: error.message },
      duration_ms: duration,
      created_at: new Date().toISOString(),
    })

    return {
      success: false,
      total: 0,
      analyzed: 0,
      cached: 0,
      failed: 0,
      duration,
      cpfs_analyzed: [],
      error: error.message,
    }
  }
}

export async function runAssertivaManualAnalysis(
  customerIds: string[],
  companyId: string,
): Promise<{
  success: boolean
  total: number
  analyzed: number
  cached: number
  failed: number
  duration: number
  customers_analyzed: Array<{ id: string; cpf: string; name: string; score?: number }>
  error?: string
}> {
  const startTime = Date.now()

  try {
    console.log("[v0] runAssertivaManualAnalysis - Starting for customers:", customerIds.length)

    if (!customerIds || customerIds.length === 0) {
      return {
        success: false,
        total: 0,
        analyzed: 0,
        cached: 0,
        failed: 0,
        duration: 0,
        customers_analyzed: [],
        error: "Nenhum cliente selecionado",
      }
    }

    const supabase = await createClient()

    // 1. Buscar dados dos clientes selecionados
    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("id, name, document")
      .in("id", customerIds)
      .eq("company_id", companyId)

    if (customersError) {
      console.error("[v0] runAssertivaManualAnalysis - Error fetching customers:", customersError)
      return {
        success: false,
        total: 0,
        analyzed: 0,
        cached: 0,
        failed: 0,
        duration: Date.now() - startTime,
        customers_analyzed: [],
        error: customersError.message,
      }
    }

    if (!customers || customers.length === 0) {
      console.log("[v0] runAssertivaManualAnalysis - No customers found")
      return {
        success: true,
        total: 0,
        analyzed: 0,
        cached: 0,
        failed: 0,
        duration: Date.now() - startTime,
        customers_analyzed: [],
      }
    }

    console.log("[v0] runAssertivaManualAnalysis - Found customers:", customers.length)

    // 2. Verificar quais já têm análise Assertiva em cache
    const customersToAnalyze: Array<{ id: string; cpf: string; name: string }> = []
    let cachedCount = 0

    for (const customer of customers) {
      const cpf = customer.document?.replace(/\D/g, "")

      if (!cpf || (cpf.length !== 11 && cpf.length !== 14)) {
        console.log("[v0] runAssertivaManualAnalysis - Invalid document, skipping:", customer.document)
        continue
      }

      // Verificar se já existe análise Assertiva
      const { data: existingAnalysis } = await supabase
        .from("credit_profiles")
        .select("id, score, created_at")
        .eq("cpf", cpf)
        .eq("company_id", companyId)
        .eq("source", "assertiva")
        .single()

      if (existingAnalysis) {
        console.log("[v0] runAssertivaManualAnalysis - Customer already analyzed (cached):", customer.id)
        cachedCount++
      } else {
        customersToAnalyze.push({
          id: customer.id,
          cpf,
          name: customer.name || "N/A",
        })
      }
    }

    console.log("[v0] runAssertivaManualAnalysis - Customers to analyze:", customersToAnalyze.length)
    console.log("[v0] runAssertivaManualAnalysis - Customers already cached:", cachedCount)

    // 3. Processar em lotes de 5 (controle de concorrência)
    let analyzedCount = 0
    let failedCount = 0
    const customersAnalyzed: Array<{ id: string; cpf: string; name: string; score?: number }> = []
    const batchSize = 5

    for (let i = 0; i < customersToAnalyze.length; i += batchSize) {
      const batch = customersToAnalyze.slice(i, i + batchSize)

      console.log("[v0] runAssertivaManualAnalysis - Processing batch:", {
        start: i + 1,
        end: Math.min(i + batchSize, customersToAnalyze.length),
        total: customersToAnalyze.length,
      })

      const batchResults = await Promise.allSettled(
        batch.map(async (customer) => {
          try {
            console.log("[v0] runAssertivaManualAnalysis - Analyzing customer:", {
              id: customer.id,
              cpf: customer.cpf,
              name: customer.name,
            })

            // Executar análise detalhada (Assertiva)
            const analysisResult = await analyzeDetailed(customer.cpf, companyId, customer.id)

            if (!analysisResult.success) {
              console.error(
                "[v0] runAssertivaManualAnalysis - Analysis failed for customer:",
                customer.id,
                analysisResult.error,
              )
              return { success: false, customerId: customer.id, error: analysisResult.error }
            }

            // Salvar resultado em credit_profiles
            const storeResult = await storeAnalysisResult(
              customer.cpf,
              analysisResult.data,
              "assertiva",
              "detailed",
              companyId,
              customer.id,
            )

            if (!storeResult.success) {
              console.error(
                "[v0] runAssertivaManualAnalysis - Failed to store result for customer:",
                customer.id,
                storeResult.error,
              )
              return { success: false, customerId: customer.id, error: storeResult.error }
            }

            const score = analysisResult.data?.score_assertiva || analysisResult.data?.score_serasa || 0

            console.log("[v0] runAssertivaManualAnalysis - Successfully analyzed and stored customer:", customer.id, {
              score,
            })

            return {
              success: true,
              customerId: customer.id,
              cpf: customer.cpf,
              name: customer.name,
              score,
              data: analysisResult.data,
            }
          } catch (error: any) {
            console.error("[v0] runAssertivaManualAnalysis - Error processing customer:", customer.id, error)
            return { success: false, customerId: customer.id, error: error.message }
          }
        }),
      )

      // Processar resultados do batch
      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          if (result.value.success) {
            analyzedCount++
            customersAnalyzed.push({
              id: result.value.customerId,
              cpf: result.value.cpf,
              name: result.value.name,
              score: result.value.score,
            })
          } else {
            failedCount++
          }
        } else {
          failedCount++
        }
      })

      // Pequeno delay entre batches para não sobrecarregar a API
      if (i + batchSize < customersToAnalyze.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }

    const duration = Date.now() - startTime

    console.log("[v0] runAssertivaManualAnalysis - Completed:", {
      total: customers.length,
      analyzed: analyzedCount,
      cached: cachedCount,
      failed: failedCount,
      duration_ms: duration,
    })

    // Log final consolidado
    await supabase.from("integration_logs").insert({
      integration_type: "assertiva_manual_analysis",
      operation: "batch_analysis",
      status: "completed",
      request_data: {
        company_id: companyId,
        customer_ids: customerIds,
        total_customers: customers.length,
        customers_to_analyze: customersToAnalyze.length,
      },
      response_data: {
        analyzed: analyzedCount,
        cached: cachedCount,
        failed: failedCount,
        customers_analyzed: customersAnalyzed.map((c) => ({ id: c.id, cpf: c.cpf, score: c.score })),
      },
      duration_ms: duration,
      created_at: new Date().toISOString(),
    })

    return {
      success: true,
      total: customers.length,
      analyzed: analyzedCount,
      cached: cachedCount,
      failed: failedCount,
      duration,
      customers_analyzed: customersAnalyzed,
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error("[v0] runAssertivaManualAnalysis - Error:", error)

    // Log de erro
    const supabase = await createClient()
    await supabase.from("integration_logs").insert({
      integration_type: "assertiva_manual_analysis",
      operation: "batch_analysis",
      status: "error",
      request_data: { company_id: companyId, customer_ids: customerIds },
      response_data: { error: error.message },
      duration_ms: duration,
      created_at: new Date().toISOString(),
    })

    return {
      success: false,
      total: 0,
      analyzed: 0,
      cached: 0,
      failed: 0,
      duration,
      customers_analyzed: [],
      error: error.message,
    }
  }
}
