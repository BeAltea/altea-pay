"use server"

// Tipos
export interface CreditProfile {
  id: string
  company_id: string
  cpf: string
  analysis_type: "free" | "detailed"
  source: "gov" | "assertiva"
  data: any
  score?: number
  created_at: string
  updated_at: string
  customer_id?: string
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

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

// Análise gratuita usando APIs públicas do governo
export async function analyzeFree(
  cpf: string,
  companyId?: string,
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = createAdminClient()

  try {
    console.log("[v0] analyzeFree - Starting for CPF:", cpf)

    // Limpar CPF (remover pontos e hífens)
    const cleanCpf = cpf.replace(/\D/g, "")

    // Validar CPF (11 dígitos) ou CNPJ (14 dígitos)
    if (cleanCpf.length !== 11 && cleanCpf.length !== 14) {
      return { success: false, error: "CPF/CNPJ inválido" }
    }

    if (cleanCpf.length === 14) {
      console.log("[v0] analyzeFree - CNPJ detected, querying Portal da Transparência CEIS/CNEP APIs")

      const apiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY
      const logStartTime = Date.now()

      const headers: Record<string, string> = {
        Accept: "application/json",
      }

      if (apiKey) {
        headers["chave-api-dados"] = apiKey
      }

      try {
        // Consultar CEIS (Cadastro Nacional de Empresas Inidôneas e Suspensas)
        const ceisResponse = await fetch(
          `https://api.portaldatransparencia.gov.br/api-de-dados/ceis?cnpjSancionado=${cleanCpf}`,
          { headers },
        )

        // Consultar CNEP (Cadastro Nacional de Empresas Punidas)
        const cnepResponse = await fetch(
          `https://api.portaldatransparencia.gov.br/api-de-dados/cnep?cnpjSancionado=${cleanCpf}`,
          { headers },
        )

        const duration = Date.now() - logStartTime

        let ceisData = []
        let cnepData = []
        let hasApiError = false

        if (ceisResponse.ok) {
          ceisData = await ceisResponse.json()
          console.log("[v0] analyzeFree - CEIS Response:", {
            status: ceisResponse.status,
            sanctions_count: Array.isArray(ceisData) ? ceisData.length : 0,
          })
        } else {
          console.log("[v0] analyzeFree - CEIS API Error:", ceisResponse.status)
          hasApiError = true
        }

        if (cnepResponse.ok) {
          cnepData = await cnepResponse.json()
          console.log("[v0] analyzeFree - CNEP Response:", {
            status: cnepResponse.status,
            punishments_count: Array.isArray(cnepData) ? cnepData.length : 0,
          })
        } else {
          console.log("[v0] analyzeFree - CNEP API Error:", cnepResponse.status)
          hasApiError = true
        }

        // Calcular score baseado nas sanções e punições
        let score = 700 // Score inicial bom para empresas sem sanções
        const sanctions = [...(Array.isArray(ceisData) ? ceisData : []), ...(Array.isArray(cnepData) ? cnepData : [])]

        if (sanctions.length > 0) {
          // Verificar se há sanções ativas/recentes
          const now = new Date()
          const recentSanctions = sanctions.filter((s: any) => {
            const sanctionDate = s.dataInicioSancao || s.dataPublicacao
            if (!sanctionDate) return false
            const date = new Date(sanctionDate)
            const monthsAgo = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30)
            return monthsAgo <= 24 // Sanções nos últimos 2 anos
          })

          if (recentSanctions.length > 0) {
            score = 300 // Score baixo para sanções recentes
          } else {
            score = 500 // Score médio para sanções antigas
          }

          console.log("[v0] analyzeFree - CNPJ has sanctions:", {
            total: sanctions.length,
            recent: recentSanctions.length,
            calculated_score: score,
          })
        }

        const cnpjData = {
          cpf: cleanCpf,
          tipo: "CNPJ",
          situacao_cpf: sanctions.length > 0 ? "COM_RESTRICOES" : "REGULAR",
          vinculos_publicos: [],
          sancoes_ceis: ceisData,
          punicoes_cnep: cnepData,
          total_sancoes: sanctions.length,
          historico_financeiro: {
            protestos: 0,
            acoes_judiciais: 0,
          },
          score_calculado: score,
          api_consulted: !hasApiError,
        }

        await supabase.from("integration_logs").insert({
          company_id: companyId || null,
          operation_type: "portal_transparencia_cnpj",
          status: hasApiError ? "warning" : "success",
          request_data: { cnpj: cleanCpf },
          response_data: {
            ceis_count: Array.isArray(ceisData) ? ceisData.length : 0,
            cnep_count: Array.isArray(cnepData) ? cnepData.length : 0,
            score: score,
          },
          duration_ms: duration,
          records_processed: 1,
          records_success: 1,
          records_failed: 0,
        })

        return { success: true, data: cnpjData }
      } catch (error: any) {
        console.error("[v0] analyzeFree - Error querying CNPJ APIs:", error)

        // Retornar dados neutros em caso de erro
        const neutralData = {
          cpf: cleanCpf,
          tipo: "CNPJ",
          situacao_cpf: "REGULAR",
          vinculos_publicos: [],
          sancoes_ceis: [],
          punicoes_cnep: [],
          total_sancoes: 0,
          historico_financeiro: {
            protestos: 0,
            acoes_judiciais: 0,
          },
          score_calculado: 500,
          api_consulted: false,
          error_message: error.message,
        }

        return { success: true, data: neutralData }
      }
    }

    console.log("[v0] analyzeFree - Calling Portal da Transparência API")

    const logStartTime = Date.now()

    const apiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY
    if (apiKey) {
      console.log(
        "[v0] analyzeFree - API Key configured:",
        `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`,
      )
    } else {
      console.log("[v0] analyzeFree - API Key NOT configured")
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    }

    if (apiKey) {
      headers["chave-api-dados"] = apiKey
    }

    const response = await fetch(
      `https://api.portaldatransparencia.gov.br/api-de-dados/servidores/por-cpf?cpf=${cleanCpf}`,
      {
        method: "GET",
        headers,
      },
    )

    const duration = Date.now() - logStartTime

    console.log("[v0] analyzeFree - API Response:", {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
      hasApiKey: !!apiKey,
    })

    if (!response.ok) {
      let errorText = ""
      try {
        errorText = await response.text()
      } catch (e) {
        errorText = "Unable to read error response"
      }

      console.error("[v0] analyzeFree - API Error:", response.status, errorText)

      await supabase.from("integration_logs").insert({
        company_id: companyId || null,
        operation_type: "portal_transparencia_consulta",
        status: "error",
        request_data: { cpf: cleanCpf },
        response_data: { status: response.status, error: errorText },
        duration_ms: duration,
        records_processed: 0,
        records_success: 0,
        records_failed: 1,
      })

      if (response.status === 429 || errorText.includes("Too Many")) {
        return { success: false, error: "Limite de requisições atingido. Aguarde alguns minutos e tente novamente." }
      }

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
          score_calculado: 600, // Score bom para CPF sem vínculos
        }

        console.log("[v0] analyzeFree - CPF not found in government database, returning empty data")

        await supabase.from("integration_logs").insert({
          company_id: companyId || null,
          operation_type: "portal_transparencia_consulta",
          status: "success",
          request_data: { cpf: cleanCpf },
          response_data: { vinculos_count: 0, message: "CPF não encontrado" },
          duration_ms: duration,
          records_processed: 1,
          records_success: 1,
          records_failed: 0,
        })

        return { success: true, data: emptyData }
      }

      if (response.status === 403) {
        console.log("[v0] analyzeFree - API returned 403, saving with neutral score")

        const neutralData = {
          cpf: cleanCpf,
          tipo: "CPF",
          situacao_cpf: "REGULAR",
          vinculos_publicos: [],
          historico_financeiro: {
            protestos: 0,
            acoes_judiciais: 0,
          },
          score_calculado: 500, // Score neutro
          api_status: "403_FORBIDDEN",
          message: apiKey
            ? "API do Portal da Transparência retornou 403. A chave pode estar inválida ou expirada."
            : "API do Portal da Transparência retornou 403. Configure a variável PORTAL_TRANSPARENCIA_API_KEY.",
        }

        await supabase.from("integration_logs").insert({
          company_id: companyId || null,
          operation_type: "portal_transparencia_consulta",
          status: "warning",
          request_data: { cpf: cleanCpf },
          response_data: {
            status: 403,
            message: "API returned 403, saved with neutral score",
            has_api_key: !!apiKey,
          },
          duration_ms: duration,
          records_processed: 1,
          records_success: 1,
          records_failed: 0,
        })

        return { success: true, data: neutralData }
      }

      return { success: false, error: `Erro na API: ${response.status} - ${errorText}` }
    }

    // Parse da resposta
    const apiData = await response.json()
    console.log("[v0] analyzeFree - API Response:", {
      vinculos_count: Array.isArray(apiData) ? apiData.length : 0,
      has_data: !!apiData,
    })

    console.log("[v0] analyzeFree - 📊 DETAILED API DATA:", {
      cpf: cleanCpf,
      raw_data: apiData,
      is_array: Array.isArray(apiData),
      data_keys: apiData ? Object.keys(apiData) : [],
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

    console.log("[v0] analyzeFree - ✅ PROCESSED RESULT:", {
      cpf: cleanCpf,
      vinculos_count: resultData.vinculos_publicos.length,
      score: resultData.score_calculado,
      situacao: resultData.situacao_cpf,
      vinculos_details: resultData.vinculos_publicos.map((v: any) => ({
        nome: v.nome || "N/A",
        orgao: v.orgao || "N/A",
        cargo: v.cargo || "N/A",
      })),
    })

    console.log("[v0] analyzeFree - Success:", {
      cpf: cleanCpf,
      vinculos_count: resultData.vinculos_publicos.length,
      score: resultData.score_calculado,
    })

    await supabase.from("integration_logs").insert({
      company_id: companyId || null,
      operation_type: "portal_transparencia_consulta",
      status: "success",
      request_data: { cpf: cleanCpf },
      response_data: {
        vinculos_count: resultData.vinculos_publicos.length,
        score: resultData.score_calculado,
      },
      duration_ms: duration,
      records_processed: 1,
      records_success: 1,
      records_failed: 0,
    })

    return { success: true, data: resultData }
  } catch (error: any) {
    console.error("[v0] analyzeFree - Error:", error)

    await supabase.from("integration_logs").insert({
      company_id: companyId || null,
      operation_type: "portal_transparencia_consulta",
      status: "error",
      request_data: { cpf: cpf.replace(/\D/g, "") },
      response_data: { error: error.message },
      records_processed: 0,
      records_success: 0,
      records_failed: 1,
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

    const supabase = createAdminClient()
    const cleanCpf = cpf.replace(/\D/g, "")

    let customerId: string | null = null

    const { data: vmaxRecords } = await supabase.from("VMAX").select('id, "CPF/CNPJ"').eq("id_company", companyId)

    // Encontrar o registro que corresponde ao CPF limpo
    const vmaxRecord = vmaxRecords?.find((record) => {
      const recordCpf = record["CPF/CNPJ"]?.replace(/\D/g, "")
      return recordCpf === cleanCpf
    })

    if (vmaxRecord) {
      customerId = vmaxRecord.id
      console.log("[v0] storeAnalysisResult - ✅ Found customer_id from VMAX:", customerId, "for CPF:", cleanCpf)
    } else {
      console.log("[v0] storeAnalysisResult - ⚠️ No customer_id found in VMAX for CPF:", cleanCpf)
    }

    // Calcular score interno
    const score = data.score_calculado || data.score_assertiva || data.score_serasa || 0

    const profileData: any = {
      company_id: companyId,
      cpf: cleanCpf,
      analysis_type: type,
      source,
      data,
      score,
      status: "completed",
      updated_at: new Date().toISOString(),
    }

    if (customerId) {
      profileData.customer_id = customerId
    }

    const { data: insertedData, error } = await supabase
      .from("credit_profiles")
      .upsert(profileData, {
        onConflict: "cpf,company_id",
      })
      .select()

    if (error) {
      console.error("[v0] storeAnalysisResult - Error:", error)
      return { success: false, error: error.message }
    }

    console.log("[v0] storeAnalysisResult - ✅ Success", {
      cpf: cleanCpf,
      source,
      type,
      score,
      customer_id: customerId,
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
    console.log("[SERVER][v0] runVMAXAutoAnalysis - Starting for company:", companyId)

    const supabase = createAdminClient()

    console.log("[SERVER][v0] runVMAXAutoAnalysis - Querying VMAX table with id_company:", companyId)

    const { data: vmaxRecords, error: vmaxError } = await supabase
      .from("VMAX")
      .select('id, id_company, "CPF/CNPJ", Cliente, Cidade')
      .eq("id_company", companyId)

    console.log("[SERVER][v0] runVMAXAutoAnalysis - Query result:", {
      records_found: vmaxRecords?.length || 0,
      has_error: !!vmaxError,
    })

    if (vmaxError) {
      console.error("[SERVER][v0] runVMAXAutoAnalysis - Error fetching VMAX records:", vmaxError)
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
      console.log("[SERVER][v0] runVMAXAutoAnalysis - No records found in VMAX table")
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

    console.log("[SERVER][v0] runVMAXAutoAnalysis - Found VMAX records:", vmaxRecords.length)

    const cpfsToAnalyze: Array<{ cpf: string; name: string; city: string; isCnpj: boolean; vmaxId: string }> = []

    for (const record of vmaxRecords) {
      const document = record["CPF/CNPJ"]?.replace(/\D/g, "")

      if (!document || (document.length !== 11 && document.length !== 14)) {
        console.log("[SERVER][v0] runVMAXAutoAnalysis - Invalid document, skipping:", record["CPF/CNPJ"])
        continue
      }

      const isCnpj = document.length === 14

      console.log("[SERVER][v0] runVMAXAutoAnalysis - Document will be analyzed:", document, "VMAX ID:", record.id)
      cpfsToAnalyze.push({
        cpf: document,
        name: record.Cliente || "N/A",
        city: record.Cidade || "N/A",
        isCnpj,
        vmaxId: record.id,
      })
    }

    console.log("[SERVER][v0] runVMAXAutoAnalysis - Documents to analyze:", cpfsToAnalyze.length)

    let analyzedCount = 0
    let failedCount = 0
    const cpfsAnalyzed: string[] = []
    let sampleResult: any = null

    for (let i = 0; i < cpfsToAnalyze.length; i++) {
      const item = cpfsToAnalyze[i]

      console.log("[SERVER][v0] runVMAXAutoAnalysis - Processing document:", {
        index: i + 1,
        total: cpfsToAnalyze.length,
        cpf: item.cpf,
        name: item.name,
        type: item.isCnpj ? "CNPJ" : "CPF",
        vmaxId: item.vmaxId,
      })

      try {
        const analysisResult = await analyzeFree(item.cpf, companyId)

        if (!analysisResult.success) {
          console.error(
            "[SERVER][v0] runVMAXAutoAnalysis - Analysis failed for document:",
            item.cpf,
            analysisResult.error,
          )
          failedCount++
          if (i < cpfsToAnalyze.length - 1) {
            console.log("[SERVER][v0] runVMAXAutoAnalysis - Waiting 15s before next request...")
            await new Promise((resolve) => setTimeout(resolve, 15000))
          }
          continue
        }

        console.log("[SERVER][v0] runVMAXAutoAnalysis - 📋 CUSTOMER ANALYSIS RESULT:", {
          index: i + 1,
          total: cpfsToAnalyze.length,
          customer_name: item.name,
          customer_city: item.city,
          cpf: item.cpf,
          type: item.isCnpj ? "CNPJ" : "CPF",
          score: analysisResult.data?.score_calculado,
          situacao: analysisResult.data?.situacao_cpf,
          vinculos_count: analysisResult.data?.vinculos_publicos?.length || 0,
          sancoes_count: analysisResult.data?.total_sancoes || 0,
          api_status: analysisResult.data?.api_status || "SUCCESS",
        })

        await storeAnalysisResult(item.cpf, companyId, analysisResult.data.score_calculado, analysisResult.data)

        analyzedCount++
        cpfsAnalyzed.push(item.cpf)

        // Guardar primeiro resultado como amostra
        if (!sampleResult && analysisResult.data) {
          sampleResult = {
            cpf: item.cpf,
            score: analysisResult.data.score_calculado,
            vinculos_count: analysisResult.data.vinculos_publicos?.length || 0,
            sancoes_count: analysisResult.data.total_sancoes || 0,
            situacao: analysisResult.data.situacao_cpf,
            tipo: item.isCnpj ? "CNPJ" : "CPF",
          }
        }

        console.log("[SERVER][v0] runVMAXAutoAnalysis - Successfully analyzed and stored document:", item.cpf, {
          score: analysisResult.data?.score_calculado,
          vinculos: analysisResult.data?.vinculos_publicos?.length || 0,
          sancoes: analysisResult.data?.total_sancoes || 0,
        })
      } catch (error: any) {
        console.error("[SERVER][v0] runVMAXAutoAnalysis - Error processing document:", item.cpf, error)
        failedCount++
      }

      if (i < cpfsToAnalyze.length - 1) {
        console.log("[SERVER][v0] runVMAXAutoAnalysis - Waiting 15s before next request...")
        await new Promise((resolve) => setTimeout(resolve, 15000))
      }
    }

    const duration = Date.now() - startTime

    console.log("[SERVER][v0] runVMAXAutoAnalysis - Completed:", {
      total: vmaxRecords.length,
      analyzed: analyzedCount,
      cached: 0, // No more caching - always fresh data
      failed: failedCount,
      duration_ms: duration,
    })

    await supabase.from("integration_logs").insert({
      company_id: companyId,
      operation_type: "vmax_auto_analysis",
      status: "completed",
      request_data: {
        company_id: companyId,
        total_records: vmaxRecords.length,
        cpfs_to_analyze: cpfsToAnalyze.length,
      },
      response_data: {
        analyzed: analyzedCount,
        cached: 0,
        failed: failedCount,
        cpfs_analyzed: cpfsAnalyzed,
      },
      duration_ms: duration,
      records_processed: vmaxRecords.length,
      records_success: analyzedCount,
      records_failed: failedCount,
    })

    return {
      success: true,
      total: vmaxRecords.length,
      analyzed: analyzedCount,
      cached: 0, // No more caching - always fresh data
      failed: failedCount,
      duration,
      cpfs_analyzed: cpfsAnalyzed,
      sample_result: sampleResult,
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error("[SERVER][v0] runVMAXAutoAnalysis - Error:", error)

    const supabase = createAdminClient()
    await supabase.from("integration_logs").insert({
      company_id: companyId,
      operation_type: "vmax_auto_analysis",
      status: "error",
      request_data: { company_id: companyId },
      response_data: { error: error.message },
      duration_ms: duration,
      records_processed: 0,
      records_success: 0,
      records_failed: 1,
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

// Executar análise manual com Assertiva Soluções
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

      const { data: existingAnalysis } = await supabase
        .from("credit_profiles")
        .select("id, score, created_at")
        .eq("cpf", cpf)
        .eq("company_id", companyId)
        .eq("source", "assertiva")
        .maybeSingle()

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

      // Delay between batches to avoid rate limiting
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
      operation_type: "assertiva_manual_analysis",
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
      operation_type: "assertiva_manual_analysis",
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
