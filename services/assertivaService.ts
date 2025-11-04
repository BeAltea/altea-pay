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

    const clientId = process.env.ASSERTIVA_CLIENT_ID?.trim()
    const clientSecret = process.env.ASSERTIVA_CLIENT_SECRET?.trim()
    const baseUrl = process.env.ASSERTIVA_BASE_URL?.trim() || "https://api.assertivasolucoes.com.br"

    if (!clientId || !clientSecret) {
      const errorMsg =
        "❌ ERRO DE CONFIGURAÇÃO: As variáveis de ambiente ASSERTIVA_CLIENT_ID e ASSERTIVA_CLIENT_SECRET não estão configuradas. Por favor, configure-as no painel do Vercel."
      console.error("[v0] getAssertivaToken -", errorMsg)
      throw new Error(errorMsg)
    }

    console.log("[v0] getAssertivaToken - Environment check:", {
      hasClientId: !!clientId,
      clientIdLength: clientId.length,
      clientIdStart: clientId.substring(0, 10) + "...",
      clientIdEnd: "..." + clientId.substring(clientId.length - 10),
      hasClientSecret: !!clientSecret,
      clientSecretLength: clientSecret.length,
      clientSecretStart: clientSecret.substring(0, 10) + "...",
      clientSecretEnd: "..." + clientSecret.substring(clientSecret.length - 10),
      baseUrl,
    })

    // Basic Auth: base64(client_id:client_secret)
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

    console.log("[v0] getAssertivaToken - Basic Auth created:", {
      basicAuthLength: basicAuth.length,
      basicAuthStart: basicAuth.substring(0, 20) + "...",
      basicAuthEnd: "..." + basicAuth.substring(basicAuth.length - 20),
    })

    const tokenUrl = `${baseUrl}/oauth2/v3/token`
    console.log("[v0] getAssertivaToken - Calling:", tokenUrl)

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    })

    console.log("[v0] getAssertivaToken - Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] getAssertivaToken - Error response:", errorText)
      console.error("[v0] getAssertivaToken - Response headers:", Object.fromEntries(response.headers.entries()))

      if (response.status === 401) {
        throw new Error(
          `❌ ERRO DE AUTENTICAÇÃO ASSERTIVA (401): As credenciais estão sendo rejeitadas pela API. ` +
            `Verifique se as credenciais no Vercel são EXATAMENTE iguais às do email (sem espaços extras). ` +
            `Pode ser necessário fazer um REDEPLOY após atualizar as variáveis. ` +
            `Detalhes: ${errorText}`,
        )
      }

      throw new Error(`Falha ao obter token: ${response.status} ${errorText}`)
    }

    const data: AssertivaTokenResponse = await response.json()

    // Cachear token
    tokenCache.token = data.access_token
    tokenCache.expiresAt = now + data.expires_in * 1000

    console.log("[v0] getAssertivaToken - ✅ Token obtained successfully, expires in:", data.expires_in, "seconds")

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

    console.log("[v0] analyzeDetailedWithCache - 🚀 Starting for CPF:", cleanCpf)

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
      console.log("[v0] analyzeDetailedWithCache - 📋 Using cached result from:", cached.created_at)
      return { success: true, data: cached.data, cached: true }
    }

    console.log("[v0] analyzeDetailedWithCache - 🔄 No cache found, calling Assertiva API...")

    // 2. Obter token
    console.log("[v0] analyzeDetailedWithCache - 🔑 Getting OAuth token...")
    const token = await getAssertivaToken()
    console.log("[v0] analyzeDetailedWithCache - ✅ Token obtained")

    // 3. Criar consulta
    console.log("[v0] analyzeDetailedWithCache - 📤 Creating Assertiva consultation...")
    const idConsulta = await createAssertivaConsulta(cleanCpf, token)
    console.log("[v0] analyzeDetailedWithCache - ✅ Consultation created, ID:", idConsulta)

    // 5. Buscar resultado (polling)
    console.log("[v0] analyzeDetailedWithCache - ⏳ Fetching result (polling)...")
    const resultado = await getAssertivaResult(idConsulta, token)
    console.log("[v0] analyzeDetailedWithCache - ✅ Result obtained")

    console.log("[v0] analyzeDetailedWithCache - 📦 ASSERTIVA API FULL RESPONSE SAMPLE:", {
      cpf: cleanCpf,
      consultation_id: idConsulta,
      response_keys: resultado ? Object.keys(resultado) : [],
      sample_data: {
        nome_completo: resultado?.nome_completo,
        data_nascimento: resultado?.data_nascimento,
        situacao_cpf: resultado?.situacao_cpf,
        score_serasa: resultado?.score_serasa,
        score_assertiva: resultado?.score_assertiva,
        renda_presumida: resultado?.renda_presumida,
        protestos: resultado?.protestos?.length || 0,
        acoes_judiciais: resultado?.acoes_judiciais?.length || 0,
        cheques_sem_fundo: resultado?.cheques_sem_fundo?.length || 0,
        dividas_ativas: resultado?.dividas_ativas?.length || 0,
        participacao_empresas: resultado?.participacao_empresas?.length || 0,
      },
      has_real_api_data: !!resultado,
    })

    // 7. Calcular score interno
    const score = resultado?.score || resultado?.pontuacao || resultado?.score_assertiva || resultado?.score_serasa || 0

    console.log("[v0] analyzeDetailedWithCache - 📊 Calculated score:", score)

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
      console.error("[v0] analyzeDetailedWithCache - ❌ Error saving to DB:", insertError)
      // Não falhar se não conseguir salvar, mas logar o erro
    } else {
      console.log("[v0] analyzeDetailedWithCache - ✅ Saved to database")
    }

    console.log("[v0] analyzeDetailedWithCache - 🎉 Success, score:", score)

    return { success: true, data: resultado, cached: false }
  } catch (error: any) {
    console.error("[v0] analyzeDetailedWithCache - 💥 Error:", error)
    console.error("[v0] analyzeDetailedWithCache - Error stack:", error.stack)

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
