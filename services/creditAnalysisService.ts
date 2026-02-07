"use server"

// Tipos
export interface CreditProfile {
  id: string
  company_id: string
  cpf: string
  analysis_type: "free" | "detailed"
  source: "assertiva" // Removido 'gov' e 'consolidated'
  data: any
  data_assertiva: any // Apenas Assertiva
  score?: number
  score_assertiva: number // Apenas Assertiva
  created_at: string
  updated_at: string
  customer_id?: string
  name?: string
  city?: string
  email?: string
  phone?: string
  status: "pending" | "running" | "completed" | "failed"
  risk_level: "low" | "medium" | "high" | "very_high"
  has_sanctions: boolean
  has_public_bonds: boolean
  sanctions_count: number
  public_bonds_count: number
  document_type: "CPF" | "CNPJ"
  last_analysis_date: string
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

// const PORTAL_API_KEY = process.env.PORTAL_TRANSPARENCIA_API_KEY || ''

async function searchPaginatedAPI(
  baseUrl: string,
  targetDoc: string,
  extractDocFn: (item: any) => string,
  maxPages = 999999, // Effectively unlimited - will stop when API returns empty
): Promise<any[]> {
  const headers: Record<string, string> = { Accept: "application/json" }
  // Removed API key usage as it's no longer supported
  // if (PORTAL_API_KEY) {
  //   headers["chave-api-dados"] = PORTAL_API_KEY
  // }

  const cleanTarget = targetDoc.replace(/\D/g, "")
  const foundRecords: any[] = []
  let pagesSearched = 0

  console.log(`[v0] 🔍 Starting UNLIMITED paginated search for document: ${cleanTarget} on ${baseUrl}`)

  for (let page = 1; page <= maxPages; page++) {
    pagesSearched++
    const url = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}pagina=${page}`

    try {
      const response = await fetch(url, { headers })

      if (!response.ok) {
        console.log(`[v0] ⚠️ Page ${page} returned status ${response.status}, stopping`)
        break
      }

      const data = await response.json()

      if (!Array.isArray(data) || data.length === 0) {
        console.log(`[v0] 📭 Page ${page} is empty - reached end of results, stopping pagination`)
        break
      }

      console.log(`[v0] 📦 Page ${page} has ${data.length} records, searching...`)

      // Filter records that match the target document
      for (const item of data) {
        const itemDoc = extractDocFn(item)
        if (itemDoc === cleanTarget) {
          foundRecords.push(item)
          console.log(`[v0] ✅ FOUND MATCH on page ${page}:`, {
            target: cleanTarget,
            found: itemDoc,
            name: item.sancionado?.nome || item.pessoa?.nome || item.pessoaJuridica?.nome || "N/A",
          })
        }
      }

      // Always continue to the next page until we hit an empty page
      console.log(`[v0] 🔄 Found ${foundRecords.length} matches so far, continuing to next page...`)

      // Small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (error: any) {
      console.error(`[v0] ❌ Error fetching page ${page}:`, error.message)
      break
    }
  }

  console.log(
    `[v0] 🏁 Pagination complete: ${foundRecords.length} matches found after searching ${pagesSearched} pages`,
  )
  return foundRecords
}

// Análise gratuita usando APIs públicas do governo
export async function analyzeFree(
  cpf: string,
  companyId?: string,
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = createAdminClient()

  try {
    console.log("[v0] analyzeFree - Starting for CPF:", cpf)

    const cleanCpf = cpf.replace(/\D/g, "")

    if (cleanCpf.length !== 11 && cleanCpf.length !== 14) {
      return { success: false, error: "CPF/CNPJ inválido" }
    }

    if (cleanCpf.length === 14) {
      console.log("[v0] analyzeFree - CNPJ detected, using PAGINATED search on Portal da Transparência APIs")

      const logStartTime = Date.now()

      try {
        // CEIS - Empresas Inidôneas (with pagination)
        const ceisData = await searchPaginatedAPI(
          "https://api.portaldatransparencia.gov.br/api-de-dados/ceis",
          cleanCpf,
          (item) =>
            item.sancionado?.codigoFormatado?.replace(/\D/g, "") ||
            item.pessoa?.cnpjFormatado?.replace(/\D/g, "") ||
            "",
        )

        // CNEP - Empresas Punidas (with pagination)
        const cnepData = await searchPaginatedAPI(
          "https://api.portaldatransparencia.gov.br/api-de-dados/cnep",
          cleanCpf,
          (item) =>
            item.sancionado?.codigoFormatado?.replace(/\D/g, "") ||
            item.pessoa?.cnpjFormatado?.replace(/\D/g, "") ||
            "",
        )

        // CEPIM - Entidades Impedidas (with pagination)
        const cepimData = await searchPaginatedAPI(
          "https://api.portaldatransparencia.gov.br/api-de-dados/cepim",
          cleanCpf,
          (item) => item.pessoaJuridica?.cnpjFormatado?.replace(/\D/g, "") || "",
        )

        // CEAF - Acordo de Leniência (with pagination)
        const ceafData = await searchPaginatedAPI(
          "https://api.portaldatransparencia.gov.br/api-de-dados/ceaf",
          cleanCpf,
          (item) => item.pessoa?.cnpjFormatado?.replace(/\D/g, "") || "",
        )

        const duration = Date.now() - logStartTime

        console.log("[v0] analyzeFree - CNPJ Pagination Results:", {
          ceis_found: ceisData.length,
          cnep_found: cnepData.length,
          cepim_found: cepimData.length,
          ceaf_found: ceafData.length,
          total_sanctions: ceisData.length + cnepData.length + cepimData.length + ceafData.length,
          duration_ms: duration,
        })

        let score = 700 // Base score for clean records
        const sanctions = [...ceisData, ...cnepData, ...cepimData, ...ceafData]

        console.log("[v0] analyzeFree - Total sanctions/impediments:", {
          cnpj: cleanCpf,
          ceis: ceisData.length,
          cnep: cnepData.length,
          cepim: cepimData.length,
          ceaf: ceafData.length,
          total: sanctions.length,
        })

        if (sanctions.length > 0) {
          // Calculate score based on severity and recency of sanctions
          const now = new Date()

          // Count active/recent sanctions (last 24 months)
          const recentSanctions = sanctions.filter((s: any) => {
            const sanctionDate = s.dataInicioSancao || s.dataPublicacao || s.dataImpedimento || s.dataReferencia
            if (!sanctionDate || sanctionDate === "Sem informação") return false

            try {
              // Handle different date formats
              let date: Date
              if (sanctionDate.includes("/")) {
                const parts = sanctionDate.split("/")
                date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
              } else {
                date = new Date(sanctionDate)
              }

              const monthsAgo = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30)
              return monthsAgo <= 24
            } catch {
              return false
            }
          })

          // Count very recent sanctions (last 12 months)
          const veryRecentSanctions = sanctions.filter((s: any) => {
            const sanctionDate = s.dataInicioSancao || s.dataPublicacao || s.dataImpedimento || s.dataReferencia
            if (!sanctionDate || sanctionDate === "Sem informação") return false

            try {
              let date: Date
              if (sanctionDate.includes("/")) {
                const parts = sanctionDate.split("/")
                date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
              } else {
                date = new Date(sanctionDate)
              }

              const monthsAgo = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30)
              return monthsAgo <= 12
            } catch {
              return false
            }
          })

          // Calculate score based on number and recency
          if (veryRecentSanctions.length >= 3) {
            score = 250 // Very high risk - multiple very recent sanctions
          } else if (veryRecentSanctions.length >= 1) {
            score = 350 // High risk - at least one very recent sanction
          } else if (recentSanctions.length >= 3) {
            score = 450 // Medium-high risk - multiple recent sanctions
          } else if (recentSanctions.length >= 1) {
            score = 550 // Medium risk - at least one recent sanction
          } else {
            score = 650 // Low-medium risk - only old sanctions
          }

          console.log("[v0] analyzeFree - CNPJ has sanctions:", {
            total: sanctions.length,
            recent: recentSanctions.length,
            very_recent: veryRecentSanctions.length,
            calculated_score: score,
          })
        } else {
          console.log(
            "[v0] analyzeFree - No sanctions found for this CNPJ after paginated search, score:",
            cleanCpf,
            score,
          )
        }

        const cnpjData = {
          cpf: cleanCpf,
          tipo: "CNPJ",
          situacao_cpf: sanctions.length > 0 ? "COM_RESTRICOES" : "REGULAR",
          vinculos_publicos: [],
          sancoes_ceis: ceisData,
          punicoes_cnep: cnepData,
          impedimentos_cepim: cepimData,
          expulsoes_ceaf: ceafData,
          total_sancoes: sanctions.length,
          historico_financeiro: {
            protestos: 0,
            acoes_judiciais: 0,
          },
          score_calculado: score,
          api_consulted: true,
        }

        await supabase.from("integration_logs").insert({
          company_id: companyId || null,
          cpf: cleanCpf,
          operation: "GOV_API_PAGINATED_QUERY",
          status: "success",
          details: {
            ceis_count: ceisData.length,
            cnep_count: cnepData.length,
            cepim_count: cepimData.length,
            ceaf_count: ceafData.length,
            score: score,
            used_pagination: true,
          },
          duration_ms: duration,
        })

        return { success: true, data: cnpjData }
      } catch (error: any) {
        console.error("[v0] analyzeFree - Error querying CNPJ APIs with pagination:", error)

        const neutralData = {
          cpf: cleanCpf,
          tipo: "CNPJ",
          situacao_cpf: "REGULAR",
          vinculos_publicos: [],
          sancoes_ceis: [],
          punicoes_cnep: [],
          impedimentos_cepim: [],
          expulsoes_ceaf: [],
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

    console.log("[v0] analyzeFree - CPF detected, querying Portal da Transparência APIs")

    // Removed API key retrieval as it's no longer supported
    // const apiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY
    const logStartTime = Date.now()

    const headers: Record<string, string> = {
      Accept: "application/json",
    }

    // Removed API key usage
    // if (apiKey) {
    //   headers["chave-api-dados"] = apiKey
    //   console.log(
    //     "[v0] analyzeFree - API Key configured:",
    //     `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`,
    //   )
    // } else {
    //   console.log("[v0] analyzeFree - API Key NOT configured")
    // }

    try {
      const [ceisResponse, cnepResponse, cepimResponse, ceafResponse] = await Promise.all([
        fetch(`https://api.portaldatransparencia.gov.br/api-de-dados/ceis?cpfSancionado=${cleanCpf}`, {
          headers,
        }),
        fetch(`https://api.portaldatransparencia.gov.br/api-de-dados/cnep?cpfSancionado=${cleanCpf}`, {
          headers,
        }),
        fetch(`https://api.portaldatransparencia.gov.br/api-de-dados/cepim?cpf=${cleanCpf}`, { headers }),
        fetch(`https://api.portaldatransparencia.gov.br/api-de-dados/ceaf?cpf=${cleanCpf}`, { headers }),
      ])

      const duration = Date.now() - logStartTime

      let ceisData = []
      let cnepData = []
      let cepimData = []
      let ceafData = []
      let hasApiError = false

      if (ceisResponse.ok) {
        const rawCeisData = await ceisResponse.json()

        ceisData = Array.isArray(rawCeisData)
          ? rawCeisData.filter((sanction: any) => {
              const sanctionCpf =
                sanction.sancionado?.codigoFormatado?.replace(/\D/g, "") ||
                sanction.pessoa?.cpfFormatado?.replace(/\D/g, "") ||
                sanction.cpfSancionado?.replace(/\D/g, "") ||
                sanction.cpf?.replace(/\D/g, "")

              if (!sanctionCpf) {
                console.log("[v0] analyzeFree - CEIS sanction without CPF field, REJECTING:", {
                  sanction_name: sanction.sancionado?.nome || sanction.pessoa?.nome || "N/A",
                })
                return false
              }

              const matches = sanctionCpf === cleanCpf

              console.log("[v0] analyzeFree - CEIS sanction comparison:", {
                queried_cpf: cleanCpf,
                found_cpf: sanctionCpf,
                matches,
                sanction_name: sanction.sancionado?.nome || sanction.pessoa?.nome || "N/A",
              })

              return matches
            })
          : []

        console.log("[v0] analyzeFree - CEIS:", {
          status: ceisResponse.status,
          raw_count: Array.isArray(rawCeisData) ? rawCeisData.length : 0,
          filtered_count: ceisData.length,
        })
      } else {
        console.log("[v0] analyzeFree - CEIS API Error:", ceisResponse.status)
        hasApiError = true
      }

      if (cnepResponse.ok) {
        const rawCnepData = await cnepResponse.json()

        cnepData = Array.isArray(rawCnepData)
          ? rawCnepData.filter((punishment: any) => {
              const punishmentCpf =
                punishment.sancionado?.codigoFormatado?.replace(/\D/g, "") ||
                punishment.pessoa?.cpfFormatado?.replace(/\D/g, "") ||
                punishment.cpfSancionado?.replace(/\D/g, "") ||
                punishment.cpf?.replace(/\D/g, "")

              if (!punishmentCpf) {
                console.log("[v0] analyzeFree - CNEP punishment without CPF field, REJECTING:", {
                  punishment_name: punishment.sancionado?.nome || punishment.pessoa?.nome || "N/A",
                })
                return false
              }

              const matches = punishmentCpf === cleanCpf

              console.log("[v0] analyzeFree - CNEP punishment comparison:", {
                queried_cpf: cleanCpf,
                found_cpf: punishmentCpf,
                matches,
                punishment_name: punishment.sancionado?.nome || punishment.pessoa?.nome || "N/A",
              })

              return matches
            })
          : []

        console.log("[v0] analyzeFree - CNEP:", {
          status: cnepResponse.status,
          raw_count: Array.isArray(rawCnepData) ? rawCnepData.length : 0,
          filtered_count: cnepData.length,
        })
      } else {
        console.log("[v0] analyzeFree - CNEP API Error:", cnepResponse.status)
        hasApiError = true
      }

      if (cepimResponse.ok) {
        const rawCepimData = await cepimResponse.json()

        cepimData = Array.isArray(rawCepimData)
          ? rawCepimData.filter((impediment: any) => {
              const impedimentCpf =
                impediment.cpf?.replace(/\D/g, "") ||
                impediment.pessoa?.cpfFormatado?.replace(/\D/g, "") ||
                impediment.entidade?.cpf?.replace(/\D/g, "")

              if (!impedimentCpf) {
                console.log("[v0] analyzeFree - CEPIM impediment without CPF field, REJECTING:", {
                  impediment_name: impediment.pessoa?.nome || impediment.entidade?.nome || "N/A",
                })
                return false
              }

              const matches = impedimentCpf === cleanCpf

              console.log("[v0] analyzeFree - CEPIM impediment comparison:", {
                queried_cpf: cleanCpf,
                found_cpf: impedimentCpf,
                matches,
                impediment_name: impediment.pessoa?.nome || impediment.entidade?.nome || "N/A",
              })

              return matches
            })
          : []

        console.log("[v0] analyzeFree - CEPIM:", {
          status: cepimResponse.status,
          raw_count: Array.isArray(rawCepimData) ? rawCepimData.length : 0,
          filtered_count: cepimData.length,
        })
      } else {
        console.log("[v0] analyzeFree - CEPIM API Error:", cepimResponse.status)
      }

      if (ceafResponse.ok) {
        const rawCeafData = await ceafResponse.json()

        ceafData = Array.isArray(rawCeafData)
          ? rawCeafData.filter((expulsion: any) => {
              const expulsionCpf =
                expulsion.pessoa?.cpfFormatado?.replace(/\D/g, "") ||
                expulsion.punicao?.cpfPunidoFormatado?.replace(/\D/g, "") ||
                expulsion.cpf?.replace(/\D/g, "")

              if (!expulsionCpf) {
                console.log("[v0] analyzeFree - CEAF expulsion without CPF field, REJECTING:", {
                  expulsion_name: expulsion.pessoa?.nome || "N/A",
                })
                return false
              }

              const matches = expulsionCpf === cleanCpf

              console.log("[v0] analyzeFree - CEAF expulsion comparison:", {
                queried_cpf: cleanCpf,
                found_cpf: expulsionCpf,
                matches,
                expulsion_name: expulsion.pessoa?.nome || "N/A",
              })

              return matches
            })
          : []

        console.log("[v0] analyzeFree - CEAF:", {
          status: ceafResponse.status,
          raw_count: Array.isArray(rawCeafData) ? rawCeafData.length : 0,
          filtered_count: ceafData.length,
        })
      } else {
        console.log("[v0] analyzeFree - CEAF API Error:", ceafResponse.status)
      }

      let score = 700
      const sanctions = [
        ...(Array.isArray(ceisData) ? ceisData : []),
        ...(Array.isArray(cnepData) ? cnepData : []),
        ...(Array.isArray(cepimData) ? cepimData : []),
        ...(Array.isArray(ceafData) ? ceafData : []),
      ]

      console.log("[v0] analyzeFree - Total sanctions/impediments:", {
        cpf: cleanCpf,
        ceis: ceisData.length,
        cnep: cnepData.length,
        cepim: cepimData.length,
        ceaf: ceafData.length,
        total: sanctions.length,
      })

      if (sanctions.length > 0) {
        const now = new Date()
        const recentSanctions = sanctions.filter((s: any) => {
          const sanctionDate = s.dataInicioSancao || s.dataPublicacao || s.dataImpedimento
          if (!sanctionDate) return false
          const date = new Date(sanctionDate)
          const monthsAgo = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30)
          return monthsAgo <= 24
        })

        // The original code for CPF only considered recent sanctions.
        // For consistency with CNPJ logic, let's keep it simple for CPF for now.
        // If further refinement is needed, the logic here can be expanded.
        if (recentSanctions.length > 0) {
          score = 300 // Alto risco
        } else {
          score = 500 // Médio risco
        }

        console.log("[v0] analyzeFree - CPF has sanctions:", {
          total: sanctions.length,
          recent: recentSanctions.length,
          calculated_score: score,
        })
      } else {
        console.log("[v0] analyzeFree - No sanctions found for this CPF:", cleanCpf)
      }

      const cpfData = {
        cpf: cleanCpf,
        tipo: "CPF",
        situacao_cpf: sanctions.length > 0 ? "COM_RESTRICOES" : "REGULAR",
        vinculos_publicos: [],
        sancoes_ceis: ceisData,
        punicoes_cnep: cnepData,
        impedimentos_cepim: cepimData,
        expulsoes_ceaf: ceafData,
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
        cpf: cleanCpf,
        operation: "GOV_API_FULL_QUERY_CPF",
        status: hasApiError ? "warning" : "success",
        details: {
          ceis_count: ceisData.length,
          cnep_count: cnepData.length,
          cepim_count: cepimData.length,
          ceaf_count: ceafData.length,
          score: score,
        },
        duration_ms: duration,
      })

      return { success: true, data: cpfData }
    } catch (error: any) {
      console.error("[v0] analyzeFree - Error querying CPF APIs:", error)

      const neutralData = {
        cpf: cleanCpf,
        tipo: "CPF",
        situacao_cpf: "REGULAR",
        vinculos_publicos: [],
        sancoes_ceis: [],
        punicoes_cnep: [],
        impedimentos_cepim: [],
        expulsoes_ceaf: [],
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
  } catch (error: any) {
    console.error("[v0] analyzeFree - Error:", error)

    await supabase.from("integration_logs").insert({
      company_id: companyId || null,
      cpf: cpf.replace(/\D/g, ""),
      operation: "PORTAL_TRANSPARENCIA_QUERY",
      status: "error",
      details: { error: error.message },
    })

    return { success: false, error: error.message }
  }
}

// Análise completa usando Assertiva Soluções
export async function analyzeDetailed(
  cpf: string,
  companyId?: string,
  userId?: string,
  analysisType: "restrictive" | "behavioral" = "restrictive",
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log("[v0] analyzeDetailed - Starting for CPF/CNPJ:", cpf, "Type:", analysisType)

    const cleanCpf = cpf.replace(/\D/g, "")
    const isCnpj = cleanCpf.length === 14
    const documentType = isCnpj ? "CNPJ" : "CPF"

    console.log("[v0] analyzeDetailed - Document type:", documentType, "Analysis type:", analysisType)

    // If companyId provided, use Assertiva service with appropriate endpoints
    if (companyId) {
      const { analyzeRestrictiveOnly, analyze360Full } = await import("./assertivaService")

      if (analysisType === "restrictive") {
        console.log("[v0] analyzeDetailed - Calling Assertiva API for RESTRICTIVE analysis (3 GETs only)...")
        const result = await analyzeRestrictiveOnly(cpf, companyId, userId)
        console.log("[v0] analyzeDetailed - Restrictive result:", {
          success: result.success,
          has_data: !!result.data,
          data_keys: result.data ? Object.keys(result.data) : [],
        })
        return result
      } else {
        console.log("[v0] analyzeDetailed - Calling Assertiva API for FULL 360 analysis (3 GETs + POST)...")
        const result = await analyze360Full(cpf, companyId, userId)
        console.log("[v0] analyzeDetailed - 360 result:", {
          success: result.success,
          has_data: !!result.data,
          data_keys: result.data ? Object.keys(result.data) : [],
        })
        return result
      }
    }

    // Check cache first
    const cached = await getCachedResult(cleanCpf)
    if (cached) {
      console.log("[v0] analyzeDetailed - Using cached result")
      return { success: true, data: cached.data }
    }

    // If no companyId, return error (Assertiva requires company context)
    return {
      success: false,
      error: "Company ID is required for detailed analysis with Assertiva",
    }
  } catch (error: any) {
    console.error("[v0] analyzeDetailed - Error:", error)
    return { success: false, error: error.message }
  }
}

// Armazenar resultado da análise
export async function storeAnalysisResult(
  cpf: string,
  data: any,
  source: "assertiva" | "gov", // Apenas assertiva ou gov
  type: "free" | "detailed",
  companyId: string,
  userId?: string,
  analysisType: "restrictive" | "behavioral" = "restrictive", // Tipo de análise: restritiva ou comportamental
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[v0] storeAnalysisResult - Starting", { cpf, source, type, companyId, userId, analysisType })

    const supabase = createAdminClient()
    const cleanCpf = cpf.replace(/\D/g, "")

    let customerId: string | null = userId || null
    let customerName: string | null = null
    let customerCity: string | null = null
    let customerEmail: string | null = null
    let customerPhone: string | null = null

    // Se já temos o userId (ID do cliente VMAX), buscar diretamente por ID
    if (userId) {
      const { data: vmaxRecord } = await supabase
        .from("VMAX")
        .select('id, "CPF/CNPJ", Cliente, Cidade')
        .eq("id", userId)
        .maybeSingle()

      if (vmaxRecord) {
        customerId = vmaxRecord.id
        customerName = vmaxRecord.Cliente
        customerCity = vmaxRecord.Cidade
        console.log("[v0] storeAnalysisResult - ✅ Found customer by userId:", customerId, "for CPF:", cleanCpf)
      }
    }

    // Se não temos userId ou não encontrou, buscar pelo CPF
    if (!customerId) {
      const { data: vmaxRecords } = await supabase
        .from("VMAX")
        .select('id, "CPF/CNPJ", Cliente, Cidade')
        .eq("id_company", companyId)
        .ilike("CPF/CNPJ", `%${cleanCpf.slice(0, 3)}%${cleanCpf.slice(-3)}%`)

      console.log("[v0] storeAnalysisResult - Query result:", {
        records_found: vmaxRecords?.length || 0,
        searching_for: cleanCpf,
      })

      // Encontrar o registro exato pelo CPF limpo
      const vmaxRecord = vmaxRecords?.find((record) => {
        const recordCpf = record["CPF/CNPJ"]?.replace(/\D/g, "")
        return recordCpf === cleanCpf
      })

      if (vmaxRecord) {
        customerId = vmaxRecord.id
        customerName = vmaxRecord.Cliente
        customerCity = vmaxRecord.Cidade
        console.log("[v0] storeAnalysisResult - ✅ Found customer_id from VMAX by CPF:", customerId)
      } else {
        console.log("[v0] storeAnalysisResult - ⚠️ No customer_id found for CPF:", cleanCpf)
      }
    }

    // Score de Crédito is the PRIMARY score, even if it's 0 (will be converted to 5)
    const creditScore = data.credito?.resposta?.score?.pontos ?? null
    const score =
      creditScore !== null
        ? creditScore
        : // Use credit score (even if 0)
          data.score_credito?.pontos || // Alternative path for credit score
          data.score_assertiva || // Generic assertiva score
          data.score_serasa || // Serasa score
          data.score_calculado || // From Gov analysis
          data.score || // Generic fallback
          0 // Default to 0 if no score found (will be converted to 5)

    const finalScore = score === 0 ? 5 : score

    console.log("[v0] storeAnalysisResult - Extracted score:", {
      originalScore: score,
      finalScore,
      credito_resposta_score_pontos: data.credito?.resposta?.score?.pontos,
      recupere_resposta_score_pontos: data.recupere?.resposta?.score?.pontos,
      score_credito_pontos: data.score_credito?.pontos,
      score_assertiva: data.score_assertiva,
      score_serasa: data.score_serasa,
      score_calculado: data.score_calculado,
    })

    let approvalStatus: "ACEITA" | "ACEITA_ESPECIAL" | "REJEITA" | "PENDENTE" = "PENDENTE"
    let autoCollectionEnabled = false

    if (finalScore >= 400) {
      approvalStatus = "ACEITA"
      autoCollectionEnabled = true
      console.log("[v0] storeAnalysisResult - Score >= 400: ACEITA with auto_collection")
    } else if (finalScore >= 300) {
      approvalStatus = "ACEITA_ESPECIAL"
      autoCollectionEnabled = false
      console.log("[v0] storeAnalysisResult - Score 300-399: ACEITA_ESPECIAL without auto_collection")
    } else {
      approvalStatus = "REJEITA"
      autoCollectionEnabled = false
      console.log("[v0] storeAnalysisResult - Score < 300: REJEITA")
    }

    let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" = "MEDIUM"
    if (finalScore >= 700) riskLevel = "LOW"
    else if (finalScore >= 500) riskLevel = "MEDIUM"
    else if (finalScore >= 300) riskLevel = "HIGH"
    else riskLevel = "VERY_HIGH"

    const hasSanctions =
      (data.sancoes_ceis && Array.isArray(data.sancoes_ceis) && data.sancoes_ceis.length > 0) ||
      (data.punicoes_cnep && Array.isArray(data.punicoes_cnep) && data.punicoes_cnep.length > 0) ||
      (data.impedimentos_cepim && Array.isArray(data.impedimentos_cepim) && data.impedimentos_cepim.length > 0) ||
      (data.expulsoes_ceaf && Array.isArray(data.expulsoes_ceaf) && data.expulsoes_ceaf.length > 0)

    const sanctionsCount =
      (data.sancoes_ceis?.length || 0) +
      (data.punicoes_cnep?.length || 0) +
      (data.impedimentos_cepim?.length || 0) +
      (data.expulsoes_ceaf?.length || 0) +
      (data.total_sancoes || 0) // From Gov analysis

    const hasPublicBonds =
      data.vinculos_publicos && Array.isArray(data.vinculos_publicos) && data.vinculos_publicos.length > 0

    const publicBondsCount = data.vinculos_publicos?.length || 0

    const documentType = cleanCpf.length === 14 ? "CNPJ" : "CPF"

    const { data: existingRecord } = await supabase
      .from("credit_profiles")
      .select("id, source, score_assertiva, score, data_assertiva, created_at")
      .eq("cpf", cleanCpf)
      .eq("company_id", companyId)
      .maybeSingle()

    const profileData: Partial<CreditProfile> = {
      company_id: companyId,
      cpf: cleanCpf,
      analysis_type: type,
      source: source, // Use the provided source
      status: "completed",
      risk_level: riskLevel.toLowerCase() as "low" | "medium" | "high" | "very_high", // Convert to lowercase for credit_profiles table
      has_sanctions: hasSanctions,
      has_public_bonds: hasPublicBonds,
      sanctions_count: sanctionsCount,
      public_bonds_count: publicBondsCount,
      document_type: documentType,
      last_analysis_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (source === "assertiva") {
      profileData.data_assertiva = data // Specific Assertiva data
      profileData.score_assertiva = finalScore // Use finalScore instead of score
      profileData.data = data // Generic data for Assertiva
      profileData.score = finalScore // Use finalScore instead of score
    } else if (source === "gov") {
      profileData.data = data // Generic data from Gov API
      profileData.score = data.score_calculado || finalScore // Use finalScore
      // Ensure score_assertiva and data_assertiva are not set if source is gov
      // This will be handled by not including them in the update/insert if they are not provided
    }

    if (customerId) profileData.customer_id = customerId
    if (customerName) profileData.name = customerName
    if (customerCity) profileData.city = customerCity
    if (customerEmail) profileData.email = customerEmail
    if (customerPhone) profileData.phone = customerPhone

    // Conditionally add created_at only for new records
    if (!existingRecord) {
      profileData.created_at = new Date().toISOString()
    }

    let result
    if (existingRecord) {
      console.log("[v0] storeAnalysisResult - Updating existing record:", existingRecord.id)
      // Ensure we don't overwrite existing assertiva data with gov data if source changes unexpectedly
      if (source === "assertiva" && existingRecord.source === "gov") {
        // If existing is gov and new is assertiva, merge carefully
        // For now, we assume if it's assertiva, it should overwrite or merge as needed.
        // If the logic needs to be more complex (e.g., prefer Assertiva data), it should be handled here.
        console.log("[v0] storeAnalysisResult - Merging Assertiva data into existing Gov record.")
        // We'll update with the new Assertiva data, potentially overwriting some gov fields if they are generic
      } else if (source === "gov" && existingRecord.source === "assertiva") {
        console.log(
          "[v0] storeAnalysisResult - Overwriting Assertiva data with Gov data (preserving score if possible).",
        )
        // When updating with 'gov' source, we might want to keep Assertiva specific fields if they exist and are valuable
        // For now, simply updating with the provided 'data' and 'score' from gov.
        // If existingRecord.score_assertiva exists and is not being explicitly overridden by a gov score, it would remain.
        // However, the current logic overwrites score and data with the new source's information.
      }

      result = await supabase.from("credit_profiles").update(profileData).eq("id", existingRecord.id).select()
    } else {
      console.log("[v0] storeAnalysisResult - Inserting new record")
      result = await supabase
        .from("credit_profiles")
        .insert(profileData as CreditProfile)
        .select() // Cast to CreditProfile for insert
    }

    const { data: insertedData, error } = result

    if (error) {
      console.error("[v0] storeAnalysisResult - Error:", error)
      return { success: false, error: error.message }
    }

    // Atualizar a tabela VMAX com os resultados da análise
    if (customerId) {
      // Preparar dados baseado no tipo de análise
      let updateData: any = {}

      if (analysisType === "restrictive") {
        // Análise RESTRITIVA - salva credit_score, risk_level, approval_status
        updateData = {
          credit_score: finalScore,
          risk_level: riskLevel,
          approval_status: approvalStatus,
          auto_collection_enabled: autoCollectionEnabled,
          restrictive_analysis_logs: data,
          restrictive_analysis_date: new Date().toISOString(),
        }
        console.log("[v0] storeAnalysisResult - Updating VMAX with RESTRICTIVE analysis", {
          customerId,
          credit_score: finalScore,
          risk_level: riskLevel,
          approval_status: approvalStatus,
        })
      } else {
        // Análise COMPORTAMENTAL - salva recovery_score, recovery_class
        const recoveryScore = data.recupere?.resposta?.score?.pontos || null
        const recoveryClass = data.recupere?.resposta?.score?.classe || null
        updateData = {
          recovery_score: recoveryScore,
          recovery_class: recoveryClass,
          behavioral_analysis_logs: data,
          behavioral_analysis_date: new Date().toISOString(),
        }
        console.log("[v0] storeAnalysisResult - Updating VMAX with BEHAVIORAL analysis", {
          customerId,
          recovery_score: recoveryScore,
          recovery_class: recoveryClass,
        })
      }

      const { error: vmaxError } = await supabase
        .from("VMAX")
        .update(updateData)
        .eq("id", customerId)

      if (vmaxError) {
        console.error("[v0] storeAnalysisResult - Error updating VMAX:", vmaxError.message)
      } else {
        console.log("[v0] storeAnalysisResult - Successfully updated VMAX record:", customerId, "type:", analysisType)
      }
    } else {
      console.log("[v0] storeAnalysisResult - No customerId, skipping VMAX update for CPF:", cleanCpf)
    }

    console.log("[v0] storeAnalysisResult - ✅ Success", {
      cpf: cleanCpf,
      source: profileData.source,
      type,
      score: finalScore,
      risk_level: riskLevel,
      approval_status: approvalStatus,
      auto_collection_enabled: autoCollectionEnabled,
      record_id: insertedData?.[0]?.id,
      operation: existingRecord ? "UPDATE" : "INSERT",
    })

    return { success: true }
  } catch (error: any) {
    console.error("[v0] storeAnalysisResult - Fatal error:", error)
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
      .maybeSingle() // Use maybeSingle() to handle cases where no record is found gracefully

    if (error || !data) return null

    // Ensure the 'source' property is compatible with the CreditProfile interface
    // If the data has 'source' as 'consolidated', it's fine.
    // If it's 'gov' or 'assertiva', it's also fine.
    // If the interface was stricter about 'source', we might need more checks here.
    return data as CreditProfile
  } catch (error) {
    console.error("Error fetching cached result:", error)
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
      // Assuming "single" scope means trigger.users contains only one user ID
      userIds = trigger.users || []
      console.log("[v0] runAnalysisTrigger - Single user(s) in scope:", userIds.length)
    }

    // Update total_users with the actual count of users to process
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
              // Use analyzeFree with companyId to potentially log the request
              result = await analyzeFree(customer.document, trigger.company_id)
            } else {
              // analyzeDetailed - default to "restrictive" for trigger-based analysis
              result = await analyzeDetailed(customer.document, trigger.company_id, userId, "restrictive")
            }

            // Armazenar resultado
            if (result.success && result.data) {
              // Determine source based on analysis type
              const source = trigger.analysis_type === "free" ? "gov" : "assertiva"
              await storeAnalysisResult(
                customer.document,
                result.data,
                source,
                trigger.analysis_type,
                trigger.company_id,
                userId,
                "restrictive", // Análise restritiva por padrão
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
  companyId?: string, // Added companyId parameter for logging
): Promise<{ success: boolean; score?: number; risk_level?: string; details?: any; error?: string }> {
  const result = await analyzeFree(document, companyId) // Pass companyId

  if (!result.success) {
    return { success: false, error: result.error }
  }

  // Use finalScore for risk_level calculation as it's the one used for decisions
  const finalScore = result.data?.score_calculado || result.data?.score || 0
  const scoreForDisplay = finalScore === 5 ? 0 : finalScore // Display 0 if it was the special case 5

  let risk_level = "medium"

  if (finalScore >= 700) risk_level = "low"
  else if (finalScore >= 500) risk_level = "medium"
  else if (finalScore >= 300) risk_level = "high"
  else risk_level = "very_high"

  return {
    success: true,
    score: scoreForDisplay, // Return the original score for display purposes
    risk_level,
    details: result.data,
  }
}

export async function analyzeCreditAssertiva(
  document: string,
  companyId?: string, // Added companyId parameter
  userId?: string, // Added userId parameter
): Promise<{ success: boolean; score?: number; risk_level?: string; details?: any; error?: string }> {
  // Pass companyId and userId to analyzeDetailed
  const result = await analyzeDetailed(document, companyId, userId)

  if (!result.success) {
    return { success: false, error: result.error }
  }

  // Prioritize score_assertiva, then score_serasa, then a fallback score if available
  // Use finalScore for risk_level calculation as it's the one used for decisions
  const finalScore = result.data?.score_assertiva || result.data?.score_serasa || result.data?.score || 0
  const scoreForDisplay = finalScore === 5 ? 0 : finalScore // Display 0 if it was the special case 5

  let risk_level = "medium"

  if (finalScore >= 700) risk_level = "low"
  else if (finalScore >= 500) risk_level = "medium"
  else if (finalScore >= 300) risk_level = "high"
  else risk_level = "very_high"

  return {
    success: true,
    score: scoreForDisplay, // Return the original score for display purposes
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

    console.log("[SERVER][v0] runVMAXAutoAnalysis - Querying VMAX table with company_id:", companyId)

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
      await supabase.from("integration_logs").insert({
        company_id: companyId,
        operation: "VMAX_AUTO_ANALYSIS",
        status: "error",
        details: {
          error: vmaxError.message,
          total_records: vmaxRecords?.length || 0,
        },
        duration_ms: Date.now() - startTime,
      })
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
        const analysisResult = await analyzeFree(item.cpf, companyId) // Pass companyId

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

        // Use finalScore for risk_level and display logic
        const finalScore = analysisResult.data?.score_calculado || analysisResult.data?.score || 0
        const scoreForDisplay = finalScore === 5 ? 0 : finalScore // Display 0 if it was the special case 5

        let risk_level = "medium"
        if (finalScore >= 700) risk_level = "low"
        else if (finalScore >= 500) risk_level = "medium"
        else if (finalScore >= 300) risk_level = "high"
        else risk_level = "very_high"

        console.log("[SERVER][v0] runVMAXAutoAnalysis - 📋 CUSTOMER ANALYSIS RESULT:", {
          index: i + 1,
          total: cpfsToAnalyze.length,
          customer_name: item.name,
          customer_city: item.city,
          cpf: item.cpf,
          type: item.isCnpj ? "CNPJ" : "CPF",
          score: scoreForDisplay, // Display the original score
          risk_level: risk_level,
          situacao: analysisResult.data?.situacao_cpf,
          vinculos_count: analysisResult.data?.vinculos_publicos?.length || 0,
          sancoes_count: analysisResult.data?.total_sancoes || 0,
          api_status: analysisResult.data?.api_consulted, // Changed from api_status to api_consulted
        })

        // Store the result - análise restritiva (gov/free)
        await storeAnalysisResult(item.cpf, analysisResult.data, "gov", "free", companyId, undefined, "restrictive")

        analyzedCount++
        cpfsAnalyzed.push(item.cpf)

        if (!sampleResult && analysisResult.data) {
          sampleResult = {
            cpf: item.cpf,
            score: scoreForDisplay, // Use the score for display
            risk_level: risk_level,
            vinculos_count: analysisResult.data.vinculos_publicos?.length || 0,
            sancoes_count: analysisResult.data.total_sancoes || 0,
            situacao: analysisResult.data.situacao_cpf,
            tipo: item.isCnpj ? "CNPJ" : "CPF",
          }
        }

        console.log("[SERVER][v0] runVMAXAutoAnalysis - Successfully analyzed and stored document:", item.cpf, {
          score: scoreForDisplay,
          risk_level: risk_level,
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
      cached: 0, // This function doesn't currently check cache for VMAX records
      failed: failedCount,
      duration_ms: duration,
    })

    await supabase.from("integration_logs").insert({
      company_id: companyId,
      operation: "VMAX_AUTO_ANALYSIS",
      status: "completed",
      details: {
        total_records: vmaxRecords.length,
        cpfs_to_analyze: cpfsToAnalyze.length,
        analyzed: analyzedCount,
        cached: 0,
        failed: failedCount,
        cpfs_analyzed: cpfsAnalyzed,
      },
      duration_ms: duration,
    })

    return {
      success: true,
      total: vmaxRecords.length,
      analyzed: analyzedCount,
      cached: 0,
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
      operation: "VMAX_AUTO_ANALYSIS",
      status: "error",
      details: { error: error.message },
      duration_ms: duration,
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
  analysisType: "restrictive" | "behavioral" = "restrictive", // Tipo de análise
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
  const supabase = createAdminClient()

  try {
    console.log("[v0] runAssertivaManualAnalysis - Starting for customers:", customerIds.length)
    console.log("[v0] runAssertivaManualAnalysis - Received IDs:", customerIds)
    console.log("[v0] runAssertivaManualAnalysis - Company ID (for reference):", companyId)

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

    console.log("[v0] runAssertivaManualAnalysis - Querying VMAX table with IDs:", customerIds)

    const { data: vmaxData, error: vmaxError } = await supabase
      .from("VMAX")
      .select('id, "CPF/CNPJ", Cliente, Cidade, id_company')
      .in("id", customerIds)

    console.log("[v0] runAssertivaManualAnalysis - VMAX query result:", {
      found: vmaxData?.length || 0,
      error: vmaxError?.message,
      sample_data: vmaxData?.map((v) => ({
        id: v.id,
        company: v.id_company,
        name: v.Cliente,
        cpf: v["CPF/CNPJ"]?.substring(0, 6) + "***",
      })),
    })

    if (vmaxError) {
      console.error("[v0] runAssertivaManualAnalysis - Error fetching from VMAX:", vmaxError)
      await supabase.from("integration_logs").insert({
        company_id: companyId,
        operation: "ASSERTIVA_MANUAL_ANALYSIS",
        status: "error",
        details: { error: vmaxError.message, customer_ids: customerIds },
        duration_ms: Date.now() - startTime,
      })
      return {
        success: false,
        total: 0,
        analyzed: 0,
        cached: 0,
        failed: 0,
        duration: Date.now() - startTime,
        customers_analyzed: [],
        error: vmaxError.message,
      }
    }

    if (!vmaxData || vmaxData.length === 0) {
      console.log("[v0] runAssertivaManualAnalysis - No customers found in VMAX")
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

    const customers = vmaxData.map((record) => ({
      id: record.id,
      name: record.Cliente || "N/A",
      document: record["CPF/CNPJ"]?.replace(/\D/g, "") || "",
      city: record.Cidade || "N/A",
      company_id: record.id_company,
    }))

    console.log("[v0] runAssertivaManualAnalysis - ✅ Found customers in VMAX:", customers.length)
    console.log(
      "[v0] runAssertivaManualAnalysis - Customer details:",
      customers.map((c) => ({ id: c.id, name: c.name, document: c.document, city: c.city, company_id: c.company_id })),
    )

    const customersToAnalyze: Array<{ id: string; cpf: string; name: string; city: string; company_id: string }> = []

    for (const customer of customers) {
      const cpf = customer.document

      if (!cpf || (cpf.length !== 11 && cpf.length !== 14)) {
        console.log("[v0] runAssertivaManualAnalysis - ⚠️ Invalid document, skipping:", customer.document)
        continue
      }

      // Always add to analysis queue - manual analysis always runs fresh
      customersToAnalyze.push({
        id: customer.id,
        cpf,
        name: customer.name,
        city: customer.city,
        company_id: customer.company_id,
      })
    }

    console.log("[v0] runAssertivaManualAnalysis - 📊 Analysis summary:", {
      total: customers.length,
      to_analyze: customersToAnalyze.length,
      already_cached: 0, // Always 0 since we're forcing fresh analysis
    })

    // 3. Processar em lotes de 5 (controle de concorrência)
    let analyzedCount = 0
    let failedCount = 0
    const customersAnalyzed: Array<{ id: string; cpf: string; name: string; score?: number }> = []
    const batchSize = 10 // Aumentado para processar mais rápido

    for (let i = 0; i < customersToAnalyze.length; i += batchSize) {
      const batch = customersToAnalyze.slice(i, i + batchSize)

      console.log("[v0] runAssertivaManualAnalysis - Processing batch:", {
        batch_number: Math.floor(i / batchSize) + 1,
        start: i + 1,
        end: Math.min(i + batchSize, customersToAnalyze.length),
        total: customersToAnalyze.length,
      })

      const batchResults = await Promise.allSettled(
        batch.map(async (customer) => {
          try {
            console.log("[v0] runAssertivaManualAnalysis - 🔍 Analyzing customer:", {
              id: customer.id,
              cpf: customer.cpf,
              name: customer.name,
              city: customer.city,
              company_id: customer.company_id,
            })

            // Pass companyId, customer.id (as userId), and analysisType to analyzeDetailed
            const analysisResult = await analyzeDetailed(customer.cpf, customer.company_id, customer.id, analysisType)

            if (!analysisResult.success) {
              console.error(
                "[v0] runAssertivaManualAnalysis - ❌ Analysis failed for customer:",
                customer.id,
                analysisResult.error,
              )
              return { success: false, customerId: customer.id, error: analysisResult.error }
            }

            console.log("[v0] runAssertivaManualAnalysis - 📦 ASSERTIVA API RESPONSE:", {
              customer_id: customer.id,
              customer_name: customer.name,
              customer_city: customer.city,
              cpf: customer.cpf,
              response_keys: analysisResult.data ? Object.keys(analysisResult.data) : [],
              score_assertiva: analysisResult.data?.score_assertiva,
              score_serasa: analysisResult.data?.score_serasa,
              nome_completo: analysisResult.data?.nome_completo,
              data_nascimento: analysisResult.data?.data_nascimento,
              situacao_cpf: analysisResult.data?.situacao_cpf,
              renda_presumida: analysisResult.data?.renda_presumida,
              protestos_count: analysisResult.data?.protestos?.length || 0,
              acoes_judiciais_count: analysisResult.data?.acoes_judiciais?.length || 0,
              dividas_ativas_count: analysisResult.data?.dividas_ativas?.length || 0,
              cheques_sem_fundo_count: analysisResult.data?.cheques_sem_fundo?.length || 0,
              participacao_empresas_count: analysisResult.data?.participacao_empresas?.length || 0,
            })

            if (analysisResult.data) {
              console.log("[v0] runAssertivaManualAnalysis - 📋SAMPLE DATA:", {
                first_protesto: analysisResult.data.protestos?.[0] || "Nenhum",
                first_acao_judicial: analysisResult.data.acoes_judiciais?.[0] || "Nenhuma",
                first_divida_ativa: analysisResult.data.dividas_ativas?.[0] || "Nenhuma",
                first_empresa: analysisResult.data.participacao_empresas?.[0] || "Nenhuma",
              })
            }

            // Store the result - salva baseado no tipo de análise (restritiva ou comportamental)
            const storeResult = await storeAnalysisResult(
              customer.cpf,
              analysisResult.data,
              "assertiva",
              "detailed",
              customer.company_id,
              customer.id,
              analysisType, // Passa o tipo de análise
            )

            if (!storeResult.success) {
              console.error(
                "[v0] runAssertivaManualAnalysis - ❌ Failed to store result for customer:",
                customer.id,
                storeResult.error,
              )
              // Log the storage failure for debugging
              await supabase.from("integration_logs").insert({
                company_id: customer.company_id,
                cpf: customer.cpf,
                operation: "ASSERTIVA_MANUAL_ANALYSIS_STORE",
                status: "error",
                details: {
                  customer_id: customer.id,
                  customer_name: customer.name,
                  error: storeResult.error,
                },
                duration_ms: Date.now() - startTime,
              })
              return { success: false, customerId: customer.id, error: storeResult.error }
            }

            // Calculate score based on Assertiva's fields, prioritizing score_assertiva
            // Use finalScore for risk_level calculation
            const finalScore =
              analysisResult.data?.score_assertiva ||
              analysisResult.data?.score_serasa ||
              analysisResult.data?.score ||
              0
            const scoreForDisplay = finalScore === 5 ? 0 : finalScore // Display 0 if it was the special case 5

            let risk_level = "medium"
            if (finalScore >= 700) risk_level = "low"
            else if (finalScore >= 500) risk_level = "medium"
            else if (finalScore >= 300) risk_level = "high"
            else risk_level = "very_high"

            console.log("[v0] runAssertivaManualAnalysis - ✅ Successfully analyzed and stored customer:", {
              id: customer.id,
              name: customer.name,
              score: scoreForDisplay, // Display the original score
              risk_level: risk_level,
            })

            return {
              success: true,
              customerId: customer.id,
              cpf: customer.cpf,
              name: customer.name,
              score: scoreForDisplay, // Return the original score for display
              risk_level: risk_level,
              data: analysisResult.data, // Include data for potential logging or summary
            }
          } catch (error: any) {
            console.error("[v0] runAssertivaManualAnalysis - ❌ Error processing customer:", customer.id, error)

            // Log the specific error to integration_logs
            try {
              await supabase.from("integration_logs").insert({
                company_id: customer.company_id,
                cpf: customer.cpf, // Added cpf field
                operation: "ASSERTIVA_MANUAL_ANALYSIS",
                status: "failed",
                details: {
                  customer_id: customer.id,
                  customer_name: customer.name,
                  error: error.message,
                },
                duration_ms: Date.now() - startTime,
              })
            } catch (logError) {
              console.error("[v0] runAssertivaManualAnalysis - Failed to log error:", logError)
            }

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
              score: result.value.score, // Store the score for display
            })
          } else {
            failedCount++
          }
        } else {
          // Handle rejected promises (errors that were not caught within the map function)
          console.error("[v0] runAssertivaManualAnalysis - Rejected promise in batch:", result.reason)
          failedCount++
        }
      })

      // Delay between batches to avoid rate limiting (5s para 100 clientes)
      if (i + batchSize < customersToAnalyze.length) {
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
    }

    const duration = Date.now() - startTime

    console.log("[v0] runAssertivaManualAnalysis - 🎉 COMPLETED:", {
      total: customers.length,
      analyzed: analyzedCount,
      cached: 0,
      failed: failedCount,
      duration_ms: duration,
      duration_seconds: (duration / 1000).toFixed(2),
    })

    await supabase.from("integration_logs").insert({
      company_id: companyId,
      cpf: customersToAnalyze.length > 0 ? customersToAnalyze[0].cpf : null, // Log CPF of first analyzed customer if available
      operation: "ASSERTIVA_MANUAL_ANALYSIS",
      status: "completed",
      details: {
        customer_ids: customerIds,
        total_customers: customers.length,
        customers_to_analyze: customersToAnalyze.length,
        analyzed: analyzedCount,
        cached: 0,
        failed: failedCount,
        customers_analyzed: customersAnalyzed.map((c) => ({ id: c.id, cpf: c.cpf, score: c.score })),
      },
      duration_ms: duration,
    })

    return {
      success: true,
      total: customers.length,
      analyzed: analyzedCount,
      cached: 0,
      failed: failedCount,
      duration,
      customers_analyzed: customersAnalyzed,
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error("[v0] runAssertivaManualAnalysis - 💥 FATAL ERROR:", error)
    console.error("[v0] runAssertivaManualAnalysis - Error stack:", error.stack)

    await supabase.from("integration_logs").insert({
      company_id: companyId,
      cpf: null, // Added cpf field (null for batch errors)
      operation: "ASSERTIVA_MANUAL_ANALYSIS",
      status: "error",
      details: { error: error.message, customer_ids: customerIds },
      duration_ms: duration,
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
