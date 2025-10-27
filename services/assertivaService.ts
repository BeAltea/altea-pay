"use server"

// Serviço de integração com a API da Assertiva Soluções
// Documentação: https://integracao.assertivasolucoes.com.br/v3/doc

import { createClient } from "@/lib/supabase/server"

// Cache de token em memória (em produção, usar Redis)
const tokenCache: {
  token: string | null
  expiresAt: number | null
} = {
  token: null,
  expiresAt: null,
}

interface AssertivaTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface AssertivaConsultaResponse {
  idConsulta: string
  status: string
}

interface AssertivaResultResponse {
  idConsulta: string
  status: string
  resultado?: any
}

// Obter token OAuth2 da Assertiva
async function getAssertivaToken(): Promise<string> {
  try {
    // Verificar se token em cache ainda é válido (renovar 60s antes do expiry)
    const now = Date.now()
    if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt - 60000 > now) {
      console.log("[v0] getAssertivaToken - Using cached token")
      return tokenCache.token
    }

    console.log("[v0] getAssertivaToken - Fetching new token")

    const clientId = process.env.ASSERTIVA_CLIENT_ID
    const clientSecret = process.env.ASSERTIVA_CLIENT_SECRET
    const baseUrl = process.env.ASSERTIVA_BASE_URL || "https://api.assertivasolucoes.com.br"

    if (!clientId || !clientSecret) {
      throw new Error("ASSERTIVA_CLIENT_ID e ASSERTIVA_CLIENT_SECRET são obrigatórios")
    }

    // Basic Auth: base64(client_id:client_secret)
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

    const response = await fetch(`${baseUrl}/oauth2/v3/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] getAssertivaToken - Error response:", errorText)
      throw new Error(`Falha ao obter token: ${response.status} ${errorText}`)
    }

    const data: AssertivaTokenResponse = await response.json()

    // Cachear token
    tokenCache.token = data.access_token
    tokenCache.expiresAt = now + data.expires_in * 1000

    console.log("[v0] getAssertivaToken - Token obtained, expires in:", data.expires_in, "seconds")

    return data.access_token
  } catch (error: any) {
    console.error("[v0] getAssertivaToken - Error:", error)
    throw error
  }
}

// Criar consulta na Assertiva (POST)
async function createAssertivaConsulta(cpf: string, token: string): Promise<string> {
  try {
    const baseUrl = process.env.ASSERTIVA_BASE_URL || "https://api.assertivasolucoes.com.br"
    const cleanCpf = cpf.replace(/\D/g, "")

    console.log("[v0] createAssertivaConsulta - Creating for CPF:", cleanCpf)

    const response = await fetch(`${baseUrl}/v3/consultas`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cpf: cleanCpf }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] createAssertivaConsulta - Error response:", errorText)
      throw new Error(`Falha ao criar consulta: ${response.status} ${errorText}`)
    }

    const data: AssertivaConsultaResponse = await response.json()

    console.log("[v0] createAssertivaConsulta - Consulta created:", data.idConsulta)

    return data.idConsulta
  } catch (error: any) {
    console.error("[v0] createAssertivaConsulta - Error:", error)
    throw error
  }
}

// Buscar resultado da consulta (GET com polling)
async function getAssertivaResult(idConsulta: string, token: string, maxAttempts = 10, delayMs = 2000): Promise<any> {
  try {
    const baseUrl = process.env.ASSERTIVA_BASE_URL || "https://api.assertivasolucoes.com.br"

    console.log("[v0] getAssertivaResult - Fetching result for:", idConsulta)

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await fetch(`${baseUrl}/v3/consultas/${idConsulta}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] getAssertivaResult - Error response:", errorText)
        throw new Error(`Falha ao buscar resultado: ${response.status} ${errorText}`)
      }

      const data: AssertivaResultResponse = await response.json()

      console.log("[v0] getAssertivaResult - Attempt", attempt, "Status:", data.status)

      // Se resultado está pronto, retornar
      if (data.status === "CONCLUIDA" && data.resultado) {
        console.log("[v0] getAssertivaResult - Result ready")
        return data.resultado
      }

      // Se falhou, lançar erro
      if (data.status === "ERRO" || data.status === "FALHA") {
        throw new Error(`Consulta falhou com status: ${data.status}`)
      }

      // Se ainda está processando, aguardar e tentar novamente
      if (attempt < maxAttempts) {
        console.log("[v0] getAssertivaResult - Waiting", delayMs, "ms before retry")
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt)) // Exponential backoff
      }
    }

    throw new Error("Timeout: Consulta não foi concluída após múltiplas tentativas")
  } catch (error: any) {
    console.error("[v0] getAssertivaResult - Error:", error)
    throw error
  }
}

// Função principal: Análise detalhada com cache
export async function analyzeDetailedWithCache(
  cpf: string,
  companyId: string,
  userId?: string,
): Promise<{ success: boolean; data?: any; cached?: boolean; error?: string }> {
  try {
    const cleanCpf = cpf.replace(/\D/g, "")

    console.log("[v0] analyzeDetailedWithCache - Starting for CPF:", cleanCpf)

    // 1. Verificar cache local (credit_profiles)
    const supabase = await createClient()
    const { data: cached, error: cacheError } = await supabase
      .from("credit_profiles")
      .select("*")
      .eq("cpf", cleanCpf)
      .eq("company_id", companyId)
      .eq("source", "assertiva")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cached && !cacheError) {
      console.log("[v0] analyzeDetailedWithCache - Using cached result from:", cached.created_at)
      return { success: true, data: cached.data, cached: true }
    }

    // 2. Obter token
    const token = await getAssertivaToken()

    // 3. Criar consulta
    const idConsulta = await createAssertivaConsulta(cleanCpf, token)

    // 4. Log da operação POST
    await supabase.from("integration_logs").insert({
      company_id: companyId,
      cpf: cleanCpf,
      operation: "POST_CONSULTA",
      status: "success",
      details: { idConsulta },
    })

    // 5. Buscar resultado (polling)
    const resultado = await getAssertivaResult(idConsulta, token)

    // 6. Log da operação GET
    await supabase.from("integration_logs").insert({
      company_id: companyId,
      cpf: cleanCpf,
      operation: "GET_RESULT",
      status: "success",
      details: { idConsulta, resultado },
    })

    // 7. Calcular score interno
    const score = resultado?.score || resultado?.pontuacao || 0

    // 8. Salvar em credit_profiles
    const { error: insertError } = await supabase.from("credit_profiles").insert({
      company_id: companyId,
      user_id: userId,
      cpf: cleanCpf,
      analysis_type: "detailed",
      source: "assertiva",
      data: resultado,
      score,
    })

    if (insertError) {
      console.error("[v0] analyzeDetailedWithCache - Error saving to DB:", insertError)
      // Não falhar se não conseguir salvar, mas logar o erro
    }

    console.log("[v0] analyzeDetailedWithCache - Success, score:", score)

    return { success: true, data: resultado, cached: false }
  } catch (error: any) {
    console.error("[v0] analyzeDetailedWithCache - Error:", error)

    // Log de erro
    const supabase = await createClient()
    await supabase.from("integration_logs").insert({
      company_id: companyId,
      cpf: cpf.replace(/\D/g, ""),
      operation: "ANALYZE_DETAILED",
      status: "failed",
      details: { error: error.message, stack: error.stack },
    })

    return { success: false, error: error.message }
  }
}

// Processar lote de CPFs com concurrency control
export async function processBatchAnalysis(
  cpfs: string[],
  companyId: string,
  triggerId: string,
  concurrency = 5,
): Promise<{ success: number; failed: number; cached: number }> {
  console.log("[v0] processBatchAnalysis - Starting batch of", cpfs.length, "CPFs with concurrency", concurrency)

  const supabase = await createClient()
  let success = 0
  let failed = 0
  let cached = 0

  // Processar em lotes com concurrency control
  for (let i = 0; i < cpfs.length; i += concurrency) {
    const batch = cpfs.slice(i, i + concurrency)

    const results = await Promise.allSettled(
      batch.map(async (cpf) => {
        try {
          const result = await analyzeDetailedWithCache(cpf, companyId)

          if (result.success) {
            if (result.cached) {
              cached++
            } else {
              success++
            }

            // Log de sucesso
            await supabase.from("analysis_logs").insert({
              trigger_id: triggerId,
              cpf: cpf.replace(/\D/g, ""),
              status: "success",
            })
          } else {
            failed++

            // Log de erro
            await supabase.from("analysis_logs").insert({
              trigger_id: triggerId,
              cpf: cpf.replace(/\D/g, ""),
              status: "failed",
              error_message: result.error,
            })
          }

          return result
        } catch (error: any) {
          failed++

          // Log de erro
          await supabase.from("analysis_logs").insert({
            trigger_id: triggerId,
            cpf: cpf.replace(/\D/g, ""),
            status: "failed",
            error_message: error.message,
          })

          throw error
        }
      }),
    )

    // Atualizar progresso do trigger
    await supabase
      .from("analysis_triggers")
      .update({
        processed_users: i + batch.length,
      })
      .eq("id", triggerId)

    console.log("[v0] processBatchAnalysis - Processed batch", i / concurrency + 1, "Results:", {
      success,
      failed,
      cached,
    })
  }

  console.log("[v0] processBatchAnalysis - Completed. Final results:", { success, failed, cached })

  return { success, failed, cached }
}
