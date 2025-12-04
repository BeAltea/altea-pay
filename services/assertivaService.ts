"use server"

// Cache de token em memória (em produção, usar Redis)
const tokenCache: {
  token: string | null
  expiresAt: number | null
} = {
  token: null,
  expiresAt: null,
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
      console.log("[v0] getAssertivaToken - Using cached token")
      return tokenCache.token
    }

    console.log("[v0] getAssertivaToken - Fetching new token")

    const clientId = process.env.ASSERTIVA_CLIENT_ID
    const clientSecret = process.env.ASSERTIVA_CLIENT_SECRET
    const baseUrl = process.env.ASSERTIVA_BASE_URL || "https://api.assertivasolucoes.com.br"

    if (!clientId || !clientSecret) {
      throw new Error("❌ ERRO: Variáveis ASSERTIVA_CLIENT_ID e ASSERTIVA_CLIENT_SECRET não configuradas")
    }

    // Basic Auth: base64(client_id:client_secret)
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

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

    console.log("[v0] getAssertivaToken - ✅ Token obtained, expires in:", data.expires_in, "seconds")

    return data.access_token
  } catch (error: any) {
    console.error("[v0] getAssertivaToken - Error:", error)
    throw error
  }
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

    console.log("[v0] getAssertivaData - Calling:", { tipo, endpoint, documento: cleanDoc })

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    })

    console.log("[v0] getAssertivaData - Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] getAssertivaData - Error:", errorText)

      if (response.status === 403) {
        throw new Error("❌ ERRO 403: Usuário sem permissão para realizar esta ação")
      }

      throw new Error(`Falha na consulta ${endpoint}: ${response.status} ${errorText}`)
    }

    const data: AssertivaScoreResponse = await response.json()

    console.log("[v0] getAssertivaData - ✅ Success:", { tipo, endpoint, has_data: !!data })

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

    console.log("[v0] postAssertivaComportamental - Calling:", { tipo, documento: cleanDoc, payload })

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify([payload]),
    })

    console.log("[v0] postAssertivaComportamental - Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] postAssertivaComportamental - Error:", errorText)

      if (response.status === 403) {
        throw new Error("❌ ERRO 403: Usuário sem permissão para realizar esta ação")
      }

      throw new Error(`Falha na análise comportamental: ${response.status} ${errorText}`)
    }

    const data: AssertivaAnaliseComportamentalResponse = await response.json()

    console.log("[v0] postAssertivaComportamental - ✅ Success:", { tipo, idConsulta: data.idConsulta })

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
    console.log("[v0] analyzeDetailedWithCache - Starting for document:", cpf)

    const cleanDoc = cpf.replace(/\D/g, "")
    const tipo = detectDocumentType(cleanDoc)

    console.log("[v0] analyzeDetailedWithCache - Document type:", tipo === "pf" ? "CPF" : "CNPJ")

    // Buscar todas as informações em paralelo
    const [acoes, credito, recupere, analiseComportamental] = await Promise.allSettled([
      getAssertivaData(tipo, cleanDoc, "acoes"),
      getAssertivaData(tipo, cleanDoc, "credito"),
      getAssertivaData(tipo, cleanDoc, "recupere"),
      postAssertivaComportamental(tipo, cleanDoc),
    ])

    // Consolidar resultados
    const result: any = {
      documento: cleanDoc,
      tipo: tipo === "pf" ? "CPF" : "CNPJ",
      timestamp: new Date().toISOString(),
    }

    if (acoes.status === "fulfilled") {
      result.acoes = acoes.value
      console.log("[v0] analyzeDetailedWithCache - ✅ Ações:", acoes.value)
    } else {
      console.error("[v0] analyzeDetailedWithCache - ❌ Ações failed:", acoes.reason)
      result.acoes_error = acoes.reason?.message
    }

    if (credito.status === "fulfilled") {
      result.credito = credito.value
      result.score_credito = credito.value.score
      console.log("[v0] analyzeDetailedWithCache - ✅ Crédito:", credito.value)
    } else {
      console.error("[v0] analyzeDetailedWithCache - ❌ Crédito failed:", credito.reason)
      result.credito_error = credito.reason?.message
    }

    if (recupere.status === "fulfilled") {
      result.recupere = recupere.value
      result.score_recupere = recupere.value.score
      console.log("[v0] analyzeDetailedWithCache - ✅ Recupere:", recupere.value)
    } else {
      console.error("[v0] analyzeDetailedWithCache - ❌ Recupere failed:", recupere.reason)
      result.recupere_error = recupere.reason?.message
    }

    if (analiseComportamental.status === "fulfilled") {
      result.analise_comportamental = analiseComportamental.value
      result.id_consulta = analiseComportamental.value.idConsulta
      console.log("[v0] analyzeDetailedWithCache - ✅ Análise Comportamental:", analiseComportamental.value)
    } else {
      console.error("[v0] analyzeDetailedWithCache - ❌ Análise Comportamental failed:", analiseComportamental.reason)
      result.analise_comportamental_error = analiseComportamental.reason?.message
    }

    const scores = [result.credito?.score, result.recupere?.score].filter((s) => s !== undefined && s !== null)

    if (scores.length > 0) {
      result.score_geral = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    }

    console.log("[v0] analyzeDetailedWithCache - ✅ Analysis complete:", {
      documento: cleanDoc,
      tipo: result.tipo,
      score_geral: result.score_geral,
      endpoints_success: [acoes, credito, recupere, analiseComportamental].filter((r) => r.status === "fulfilled")
        .length,
      endpoints_failed: [acoes, credito, recupere, analiseComportamental].filter((r) => r.status === "rejected").length,
    })

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
  concurrency = 5,
): Promise<{ success: number; failed: number; cached: number }> {
  console.log("[v0] processBatchAnalysis - Starting batch:", {
    total: cpfs.length,
    concurrency,
  })

  let success = 0
  let failed = 0
  let cached = 0

  // Processar em lotes
  for (let i = 0; i < cpfs.length; i += concurrency) {
    const batch = cpfs.slice(i, i + concurrency)

    console.log("[v0] processBatchAnalysis - Processing batch:", {
      start: i + 1,
      end: Math.min(i + concurrency, cpfs.length),
      total: cpfs.length,
    })

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

    // Delay entre lotes para evitar rate limiting
    if (i + concurrency < cpfs.length) {
      console.log("[v0] processBatchAnalysis - Waiting 2s before next batch...")
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  console.log("[v0] processBatchAnalysis - ✅ Batch complete:", {
    success,
    failed,
    cached,
    total: cpfs.length,
  })

  return { success, failed, cached }
}
