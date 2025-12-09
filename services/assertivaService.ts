"use server"

// Cache de token em memória (em produção, usar Redis)
const tokenCache: {
  token: string | null
  expiresAt: number | null
  refreshing: Promise<string> | null
} = {
  token: null,
  expiresAt: null,
  refreshing: null,
}

// Interfaces
interface AssertivaTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface AssertivaScoreResponse {
  score?: number
  faixa?: string
  probabilidade?: number
  [key: string]: any
}

interface AssertivaAnaliseComportamentalResponse {
  idConsulta?: string
  status?: string
  resultado?: any
  [key: string]: any
}

async function getAssertivaToken(): Promise<string> {
  try {
    // Verificar se token em cache ainda é válido (renovar 60s antes do expiry)
    const now = Date.now()
    if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt - 60000 > now) {
      return tokenCache.token
    }

    const clientId = process.env.ASSERTIVA_CLIENT_ID
    const clientSecret = process.env.ASSERTIVA_CLIENT_SECRET
    const baseUrl = process.env.ASSERTIVA_BASE_URL || "https://api.assertivasolucoes.com.br"

    if (!clientId || !clientSecret) {
      throw new Error("❌ ERRO: Variáveis ASSERTIVA_CLIENT_ID e ASSERTIVA_CLIENT_SECRET não configuradas")
    }

    // Basic Auth: base64(client_id:client_secret)
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

    const tokenUrl = `${baseUrl}/oauth2/v3/token`

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] getAssertivaToken - Error:", errorText)

      if (response.status === 401) {
        throw new Error("❌ ERRO 401: Credenciais inválidas. Verifique ASSERTIVA_CLIENT_ID e ASSERTIVA_CLIENT_SECRET")
      }
      if (response.status === 403) {
        throw new Error("❌ ERRO 403: Usuário sem permissão para realizar esta ação")
      }

      throw new Error(`Falha ao obter token: ${response.status} ${errorText}`)
    }

    const data: AssertivaTokenResponse = await response.json()

    // Cachear token
    tokenCache.token = data.access_token
    tokenCache.expiresAt = now + data.expires_in * 1000

    return data.access_token
  } catch (error: any) {
    console.error("[v0] getAssertivaToken - Error:", error)
    throw error
  }
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      if (response.status === 401 && attempt < maxRetries) {
        tokenCache.token = null
        tokenCache.expiresAt = null

        // Wait before retry with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))

        // Get fresh token for next attempt
        const newToken = await getAssertivaToken()
        if (options.headers) {
          ;(options.headers as any).Authorization = `Bearer ${newToken}`
        }
        continue
      }

      return response
    } catch (error: any) {
      lastError = error
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
      }
    }
  }

  throw lastError || new Error("Max retries exceeded")
}

async function getAssertivaData(
  tipo: "pf" | "pj",
  documento: string,
  endpoint: "acoes" | "credito" | "recupere",
): Promise<AssertivaScoreResponse> {
  try {
    const token = await getAssertivaToken()
    const baseUrl = process.env.ASSERTIVA_BASE_URL || "https://api.assertivasolucoes.com.br"
    const cleanDoc = documento.replace(/\D/g, "")

    const url = `${baseUrl}/score/v3/${tipo}/${endpoint}/${cleanDoc}?idFinalidade=2`

    const response = await fetchWithRetry(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] getAssertivaData - Error:", errorText)

      if (response.status === 403) {
        throw new Error("❌ ERRO 403: Usuário sem permissão para realizar esta ação")
      }

      throw new Error(`Falha na consulta ${endpoint}: ${response.status} ${errorText}`)
    }

    const data: AssertivaScoreResponse = await response.json()

    await new Promise((resolve) => setTimeout(resolve, 200))

    return data
  } catch (error: any) {
    console.error("[v0] getAssertivaData - Error:", error)
    throw error
  }
}

async function postAssertivaComportamental(
  tipo: "pf" | "pj",
  documento: string,
  identificador?: string,
): Promise<AssertivaAnaliseComportamentalResponse> {
  try {
    const token = await getAssertivaToken()
    const baseUrl = process.env.ASSERTIVA_BASE_URL || "https://api.assertivasolucoes.com.br"
    const callbackUrl = process.env.ASSERTIVA_CALLBACK_URL || "https://alteapay.com/api/assertiva/callback"
    const cleanDoc = documento.replace(/\D/g, "")

    const url = `${baseUrl}/credito/v1/${tipo}`

    const payload = {
      urlEntregaResultado: callbackUrl,
      identificador: identificador || `${tipo}_${cleanDoc}_${Date.now()}`,
      doc: cleanDoc,
      idFinalidade: 2,
    }

    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify([payload]),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] postAssertivaComportamental - Error:", errorText)

      if (response.status === 403) {
        throw new Error("❌ ERRO 403: Usuário sem permissão para realizar esta ação")
      }

      throw new Error(`Falha na análise comportamental: ${response.status} ${errorText}`)
    }

    const data: AssertivaAnaliseComportamentalResponse = await response.json()

    await new Promise((resolve) => setTimeout(resolve, 200))

    return data
  } catch (error: any) {
    console.error("[v0] postAssertivaComportamental - Error:", error)
    throw error
  }
}

function detectDocumentType(documento: string): "pf" | "pj" {
  const clean = documento.replace(/\D/g, "")
  return clean.length === 11 ? "pf" : "pj"
}

export async function analyzeDetailedWithCache(
  cpf: string,
  companyId: string,
  userId?: string,
): Promise<{ success: boolean; data?: any; cached?: boolean; error?: string }> {
  try {
    const cleanDoc = cpf.replace(/\D/g, "")
    const tipo = detectDocumentType(cleanDoc)

    const result: any = {
      documento: cleanDoc,
      tipo: tipo === "pf" ? "CPF" : "CNPJ",
      timestamp: new Date().toISOString(),
    }

    // Call endpoints sequentially with 500ms delay between each
    try {
      result.acoes = await getAssertivaData(tipo, cleanDoc, "acoes")
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (error: any) {
      console.error("[v0] analyzeDetailedWithCache - ❌ Ações failed:", error.message)
      result.acoes_error = error.message
    }

    try {
      result.credito = await getAssertivaData(tipo, cleanDoc, "credito")
      result.score_credito = result.credito.score
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (error: any) {
      console.error("[v0] analyzeDetailedWithCache - ❌ Crédito failed:", error.message)
      result.credito_error = error.message
    }

    try {
      result.recupere = await getAssertivaData(tipo, cleanDoc, "recupere")
      result.score_recupere = typeof result.recupere.score === "number" ? result.recupere.score : null
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (error: any) {
      console.error("[v0] analyzeDetailedWithCache - ❌ Recupere failed:", error.message)
      result.recupere_error = error.message
    }

    try {
      result.analise_comportamental = await postAssertivaComportamental(tipo, cleanDoc)
      result.id_consulta = result.analise_comportamental.idConsulta
    } catch (error: any) {
      console.error("[v0] analyzeDetailedWithCache - ❌ Análise Comportamental failed:", error.message)
      result.analise_comportamental_error = error.message
    }

    const scores = [result.credito?.score, result.recupere?.score].filter((s) => typeof s === "number")

    if (scores.length > 0) {
      result.score_geral = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    }

    return {
      success: true,
      data: result,
      cached: false,
    }
  } catch (error: any) {
    console.error("[v0] analyzeDetailedWithCache - Error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

export async function processBatchAnalysis(
  cpfs: string[],
  companyId: string,
  triggerId: string,
  concurrency = 2,
): Promise<{ success: number; failed: number; cached: number }> {
  let success = 0
  let failed = 0
  let cached = 0

  // Processar em lotes
  for (let i = 0; i < cpfs.length; i += concurrency) {
    const batch = cpfs.slice(i, i + concurrency)

    const results = await Promise.allSettled(batch.map((cpf) => analyzeDetailedWithCache(cpf, companyId)))

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        if (result.value.success) {
          if (result.value.cached) {
            cached++
          } else {
            success++
          }
        } else {
          failed++
        }
      } else {
        failed++
      }
    })

    if (i + concurrency < cpfs.length) {
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }

  console.log("[v0] processBatchAnalysis - Complete:", {
    success,
    failed,
    cached,
    total: cpfs.length,
  })

  return { success, failed, cached }
}
