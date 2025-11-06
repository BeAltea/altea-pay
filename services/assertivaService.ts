"use server"

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

interface AssertivaScoreCreditoResponse {
  score?: number
  faixa?: string
  probabilidade_inadimplencia?: number
  [key: string]: any
}

interface AssertivaScoreRecupereResponse {
  score?: number
  faixa?: string
  probabilidade_recuperacao?: number
  [key: string]: any
}

interface AssertivaAnaliseAcoesResponse {
  acoes_judiciais?: any[]
  protestos?: any[]
  dividas_ativas?: any[]
  participacao_empresas?: any[]
  [key: string]: any
}

interface AssertivaPerfil360 {
  score_credito?: AssertivaScoreCreditoResponse
  score_recupere?: AssertivaScoreRecupereResponse
  analise_acoes?: AssertivaAnaliseAcoesResponse
  documento: string
  tipo: "PF" | "PJ"
}

// Obter token OAuth2 da Assertiva
// async function getAssertivaToken(): Promise<string> {
//   try {
//     // Verificar se token em cache ainda é válido (renovar 60s antes do expiry)
//     const now = Date.now()
//     if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt - 60000 > now) {
//       console.log("[v0] getAssertivaToken - Using cached token")
//       return tokenCache.token
//     }

//     console.log("[v0] getAssertivaToken - Fetching new token")

//     const clientId = process.env.ASSERTIVA_CLIENT_ID?.trim()
//     const clientSecret = process.env.ASSERTIVA_CLIENT_SECRET?.trim()
//     const baseUrl = process.env.ASSERTIVA_BASE_URL?.trim() || "https://api.assertivasolucoes.com.br"

//     if (!clientId || !clientSecret) {
//       const errorMsg =
//         "❌ ERRO DE CONFIGURAÇÃO: As variáveis de ambiente ASSERTIVA_CLIENT_ID e ASSERTIVA_CLIENT_SECRET não estão configuradas. Por favor, configure-as no painel do Vercel."
//       console.error("[v0] getAssertivaToken -", errorMsg)
//       throw new Error(errorMsg)
//     }

//     console.log("[v0] getAssertivaToken - Environment check:", {
//       hasClientId: !!clientId,
//       clientIdLength: clientId.length,
//       clientIdStart: clientId.substring(0, 10) + "...",
//       clientIdEnd: "..." + clientId.substring(clientId.length - 10),
//       hasClientSecret: !!clientSecret,
//       clientSecretLength: clientSecret.length,
//       clientSecretStart: clientSecret.substring(0, 10) + "...",
//       clientSecretEnd: "..." + clientSecret.substring(clientSecret.length - 10),
//       baseUrl,
//     })

//     // Basic Auth: base64(client_id:client_secret)
//     const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

//     console.log("[v0] getAssertivaToken - Basic Auth created:", {
//       basicAuthLength: basicAuth.length,
//       basicAuthStart: basicAuth.substring(0, 20) + "...",
//       basicAuthEnd: "..." + basicAuth.substring(basicAuth.length - 20),
//     })

//     const tokenUrl = `${baseUrl}/oauth2/v3/token`
//     console.log("[v0] getAssertivaToken - Calling:", tokenUrl)

//     const response = await fetch(tokenUrl, {
//       method: "POST",
//       headers: {
//         Authorization: `Basic ${basicAuth}`,
//         "Content-Type": "application/x-www-form-urlencoded",
//       },
//       body: "grant_type=client_credentials",
//     })

//     console.log("[v0] getAssertivaToken - Response status:", response.status)

//     if (!response.ok) {
//       const errorText = await response.text()
//       console.error("[v0] getAssertivaToken - Error response:", errorText)
//       console.error("[v0] getAssertivaToken - Response headers:", Object.fromEntries(response.headers.entries()))

//       if (response.status === 401) {
//         throw new Error(
//           `❌ ERRO DE AUTENTICAÇÃO ASSERTIVA (401): As credenciais estão sendo rejeitadas pela API. ` +
//             `Verifique se as credenciais no Vercel são EXATAMENTE iguais às do email (sem espaços extras). ` +
//             `Pode ser necessário fazer um REDEPLOY após atualizar as variáveis. ` +
//             `Detalhes: ${errorText}`,
//         )
//       }

//       throw new Error(`Falha ao obter token: ${response.status} ${errorText}`)
//     }

//     const data: AssertivaTokenResponse = await response.json()

//     // Cachear token
//     tokenCache.token = data.access_token
//     tokenCache.expiresAt = now + data.expires_in * 1000

//     console.log("[v0] getAssertivaToken - ✅ Token obtained successfully, expires in:", data.expires_in, "seconds")

//     return data.access_token
//   } catch (error: any) {
//     console.error("[v0] getAssertivaToken - Error:", error)
//     throw error
//   }
// }

// Criar consulta na Assertiva (POST)
// async function createAssertivaConsulta(cpf: string, token: string): Promise<string> {
//   try {
//     const baseUrl = process.env.ASSERTIVA_BASE_URL || "https://api.assertivasolucoes.com.br"
//     const cleanCpf = cpf.replace(/\D/g, "")

//     console.log("[v0] createAssertivaConsulta - Creating for CPF:", cleanCpf)

//     const response = await fetch(`${baseUrl}/v3/consultas`, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ cpf: cleanCpf }),
//     })

//     if (!response.ok) {
//       const errorText = await response.text()
//       console.error("[v0] createAssertivaConsulta - Error response:", errorText)
//       throw new Error(`Falha ao criar consulta: ${response.status} ${errorText}`)
//     }

//     const data: AssertivaConsultaResponse = await response.json()

//     console.log("[v0] createAssertivaConsulta - Consulta created:", data.idConsulta)

//     return data.idConsulta
//   } catch (error: any) {
//     console.error("[v0] createAssertivaConsulta - Error:", error)
//     throw error
//   }
// }

// Buscar resultado da consulta (GET com polling)
// async function getAssertivaResult(idConsulta: string, token: string, maxAttempts = 10, delayMs = 2000): Promise<any> {
//   try {
//     const baseUrl = process.env.ASSERTIVA_BASE_URL || "https://api.assertivasolucoes.com.br"

//     console.log("[v0] getAssertivaResult - Fetching result for:", idConsulta)

//     for (let attempt = 1; attempt <= maxAttempts; attempt++) {
//       const response = await fetch(`${baseUrl}/v3/consultas/${idConsulta}`, {
//         method: "GET",
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       })

//       if (!response.ok) {
//         const errorText = await response.text()
//         console.error("[v0] getAssertivaResult - Error response:", errorText)
//         throw new Error(`Falha ao buscar resultado: ${response.status} ${errorText}`)
//       }

//       const data: AssertivaResultResponse = await response.json()

//       console.log("[v0] getAssertivaResult - Attempt", attempt, "Status:", data.status)

//       // Se resultado está pronto, retornar
//       if (data.status === "CONCLUIDA" && data.resultado) {
//         console.log("[v0] getAssertivaResult - Result ready")
//         return data.resultado
//       }

//       // Se falhou, lançar erro
//       if (data.status === "ERRO" || data.status === "FALHA") {
//         throw new Error(`Consulta falhou com status: ${data.status}`)
//       }

//       // Se ainda está processando, aguardar e tentar novamente
//       if (attempt < maxAttempts) {
//         console.log("[v0] getAssertivaResult - Waiting", delayMs, "ms before retry")
//         await new Promise((resolve) => setTimeout(resolve, delayMs * attempt)) // Exponential backoff
//       }
//     }

//     throw new Error("Timeout: Consulta não foi concluída após múltiplas tentativas")
//   } catch (error: any) {
//     console.error("[v0] getAssertivaResult - Error:", error)
//     throw error
//   }
// }

function detectDocumentType(documento: string): "PF" | "PJ" {
  const clean = documento.replace(/\D/g, "")
  return clean.length === 11 ? "PF" : "PJ"
}

// async function getAssertivaScoreCredito(...): Promise<...> {
//   // ... código comentado ...
// }

// async function getAssertivaScoreRecupere(...): Promise<...> {
//   // ... código comentado ...
// }

// async function getAssertivaAnaliseAcoes(...): Promise<...> {
//   // ... código comentado ...
// }

// async function getAssertivaPerfil360(...): Promise<...> {
//   // ... código comentado ...
// }

// Função principal: Análise detalhada com cache
export async function analyzeDetailedWithCache(
  cpf: string,
  companyId: string,
  userId?: string,
): Promise<{ success: boolean; data?: any; cached?: boolean; error?: string }> {
  console.log("[v0] analyzeDetailedWithCache - TEMPORARILY DISABLED - Assertiva endpoints not available")
  return {
    success: false,
    error: "Análise Assertiva temporariamente desabilitada. Os endpoints da API não estão disponíveis para esta conta.",
  }
}

// Processar lote de CPFs com concurrency control
export async function processBatchAnalysis(
  cpfs: string[],
  companyId: string,
  triggerId: string,
  concurrency = 5,
): Promise<{ success: number; failed: number; cached: number }> {
  console.log("[v0] processBatchAnalysis - TEMPORARILY DISABLED")
  return { success: 0, failed: cpfs.length, cached: 0 }
}
