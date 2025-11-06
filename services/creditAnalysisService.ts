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

    const cleanCpf = cpf.replace(/\D/g, "")

    if (cleanCpf.length !== 11 && cleanCpf.length !== 14) {
      return { success: false, error: "CPF/CNPJ inválido" }
    }

    if (cleanCpf.length === 14) {
      console.log("[v0] analyzeFree - CNPJ detected, querying Portal da Transparência APIs")

      const apiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY
      const logStartTime = Date.now()

      const headers: Record<string, string> = {
        Accept: "application/json",
      }

      if (apiKey) {
        headers["chave-api-dados"] = apiKey
      }

      try {
        const [ceisResponse, cnepResponse, cepimResponse, ceafResponse] = await Promise.all([
          fetch(`https://api.portaldatransparencia.gov.br/api-de-dados/ceis?cnpjSancionado=${cleanCpf}`, {
            headers,
          }),
          fetch(`https://api.portaldatransparencia.gov.br/api-de-dados/cnep?cnpjSancionado=${cleanCpf}`, {
            headers,
          }),
          fetch(`https://api.portaldatransparencia.gov.br/api-de-dados/cepim?cnpj=${cleanCpf}`, { headers }),
          fetch(`https://api.portaldatransparencia.gov.br/api-de-dados/ceaf?cnpj=${cleanCpf}`, { headers }),
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
                // Try multiple possible CNPJ fields
                const sanctionCnpj =
                  sanction.sancionado?.codigoFormatado?.replace(/\D/g, "") ||
                  sanction.pessoa?.cnpjFormatado?.replace(/\D/g, "") ||
                  sanction.cnpjSancionado?.replace(/\D/g, "") ||
                  sanction.cnpj?.replace(/\D/g, "")

                // If no CNPJ found in the data, REJECT it (don't include)
                if (!sanctionCnpj) {
                  console.log("[v0] analyzeFree - CEIS sanction without CNPJ field, REJECTING:", {
                    sanction_name: sanction.sancionado?.nome || sanction.pessoa?.nome || "N/A",
                  })
                  return false
                }

                const matches = sanctionCnpj === cleanCpf

                console.log("[v0] analyzeFree - CEIS sanction comparison:", {
                  queried_cnpj: cleanCpf,
                  found_cnpj: sanctionCnpj,
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
            sample_raw_data: Array.isArray(rawCeisData) && rawCeisData.length > 0 ? rawCeisData[0] : null,
          })
        } else {
          console.log("[v0] analyzeFree - CEIS API Error:", ceisResponse.status)
          hasApiError = true
        }

        if (cnepResponse.ok) {
          const rawCnepData = await cnepResponse.json()

          cnepData = Array.isArray(rawCnepData)
            ? rawCnepData.filter((punishment: any) => {
                const punishmentCnpj =
                  punishment.sancionado?.codigoFormatado?.replace(/\D/g, "") ||
                  punishment.pessoa?.cnpjFormatado?.replace(/\D/g, "") ||
                  punishment.cnpjSancionado?.replace(/\D/g, "") ||
                  punishment.cnpj?.replace(/\D/g, "")

                if (!punishmentCnpj) {
                  console.log("[v0] analyzeFree - CNEP punishment without CNPJ field, REJECTING:", {
                    punishment_name: punishment.sancionado?.nome || punishment.pessoa?.nome || "N/A",
                  })
                  return false
                }

                const matches = punishmentCnpj === cleanCpf

                console.log("[v0] analyzeFree - CNEP punishment comparison:", {
                  queried_cnpj: cleanCpf,
                  found_cnpj: punishmentCnpj,
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
            sample_raw_data: Array.isArray(rawCnepData) && rawCnepData.length > 0 ? rawCnepData[0] : null,
          })
        } else {
          console.log("[v0] analyzeFree - CNEP API Error:", cnepResponse.status)
          hasApiError = true
        }

        if (cepimResponse.ok) {
          const rawCepimData = await cepimResponse.json()

          cepimData = Array.isArray(rawCepimData)
            ? rawCepimData.filter((impediment: any) => {
                const impedimentCnpj =
                  impediment.cnpj?.replace(/\D/g, "") ||
                  impediment.pessoa?.cnpjFormatado?.replace(/\D/g, "") ||
                  impediment.entidade?.cnpj?.replace(/\D/g, "") ||
                  impediment.cnpjEntidade?.replace(/\D/g, "")

                if (!impedimentCnpj) {
                  console.log("[v0] analyzeFree - CEPIM impediment without CNPJ field, REJECTING:", {
                    impediment_name: impediment.pessoa?.nome || impediment.entidade?.nome || "N/A",
                  })
                  return false
                }

                const matches = impedimentCnpj === cleanCpf

                console.log("[v0] analyzeFree - CEPIM impediment comparison:", {
                  queried_cnpj: cleanCpf,
                  found_cnpj: impedimentCnpj,
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
            sample_raw_data: Array.isArray(rawCepimData) && rawCepimData.length > 0 ? rawCepimData[0] : null,
          })
        } else {
          console.log("[v0] analyzeFree - CEPIM API Error:", cepimResponse.status)
        }

        if (ceafResponse.ok) {
          const rawCeafData = await ceafResponse.json()

          ceafData = Array.isArray(rawCeafData)
            ? rawCeafData.filter((expulsion: any) => {
                const expulsionDoc =
                  expulsion.pessoa?.cpfFormatado?.replace(/\D/g, "") ||
                  expulsion.pessoa?.cnpjFormatado?.replace(/\D/g, "") ||
                  expulsion.punicao?.cpfPunidoFormatado?.replace(/\D/g, "") ||
                  expulsion.cpf?.replace(/\D/g, "") ||
                  expulsion.cnpj?.replace(/\D/g, "")

                if (!expulsionDoc) {
                  console.log("[v0] analyzeFree - CEAF expulsion without CPF/CNPJ field, REJECTING:", {
                    expulsion_name: expulsion.pessoa?.nome || "N/A",
                  })
                  return false
                }

                const matches = expulsionDoc === cleanCpf

                console.log("[v0] analyzeFree - CEAF expulsion comparison:", {
                  queried_doc: cleanCpf,
                  found_doc: expulsionDoc,
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
            sample_raw_data: Array.isArray(rawCeafData) && rawCeafData.length > 0 ? rawCeafData[0] : null,
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
          cnpj: cleanCpf,
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

          if (recentSanctions.length > 0) {
            score = 300 // Alto risco
          } else {
            score = 500 // Médio risco
          }

          console.log("[v0] analyzeFree - CNPJ has sanctions:", {
            total: sanctions.length,
            recent: recentSanctions.length,
            calculated_score: score,
          })
        } else {
          console.log("[v0] analyzeFree - No sanctions found for this CNPJ:", cleanCpf)
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
          api_consulted: !hasApiError,
        }

        await supabase.from("integration_logs").insert({
          company_id: companyId || null,
          cpf: cleanCpf,
          operation: "GOV_API_FULL_QUERY",
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

        return { success: true, data: cnpjData }
      } catch (error: any) {
        console.error("[v0] analyzeFree - Error querying CNPJ APIs:", error)

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

    const apiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY
    const logStartTime = Date.now()

    const headers: Record<string, string> = {
      Accept: "application/json",
    }

    if (apiKey) {
      headers["chave-api-dados"] = apiKey
      console.log(
        "[v0] analyzeFree - API Key configured:",
        `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`,
      )
    } else {
      console.log("[v0] analyzeFree - API Key NOT configured")
    }

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
    let customerName: string | null = null
    let customerCity: string | null = null
    let customerEmail: string | null = null
    let customerPhone: string | null = null

    const { data: vmaxRecords } = await supabase
      .from("VMAX")
      .select('id, "CPF/CNPJ", Cliente, Cidade')
      .eq("id_company", companyId)

    console.log("[v0] storeAnalysisResult - Query result:", {
      records_found: vmaxRecords?.length || 0,
    })

    if (!vmaxRecords || vmaxRecords.length === 0) {
      console.log("[v0] storeAnalysisResult - No records found in VMAX table")
      return { success: false, error: "No VMAX records found" }
    }

    // Encontrar o registro que corresponde ao CPF limpo
    const vmaxRecord = vmaxRecords?.find((record) => {
      const recordCpf = record["CPF/CNPJ"]?.replace(/\D/g, "")
      return recordCpf === cleanCpf
    })

    if (vmaxRecord) {
      customerId = vmaxRecord.id
      customerName = vmaxRecord.Cliente
      customerCity = vmaxRecord.Cidade
      console.log("[v0] storeAnalysisResult - ✅ Found customer_id from VMAX:", customerId, "for CPF:", cleanCpf)
    } else {
      // Try to find in customers table
      const { data: customerRecord } = await supabase
        .from("customers")
        .select("id, name, city, email, phone")
        .eq("company_id", companyId)
        .eq("document", cleanCpf)
        .maybeSingle()

      if (customerRecord) {
        customerId = customerRecord.id
        customerName = customerRecord.name
        customerCity = customerRecord.city
        customerEmail = customerRecord.email
        customerPhone = customerRecord.phone
        console.log("[v0] storeAnalysisResult - ✅ Found customer_id from customers table:", customerId)
      } else {
        console.log("[v0] storeAnalysisResult - ⚠️ No customer_id found for CPF:", cleanCpf)
      }
    }

    // Calcular score interno
    const score = data.score_calculado || data.score_assertiva || data.score_serasa || 0

    let riskLevel: "low" | "medium" | "high" | "very_high" = "medium"
    if (score >= 700) riskLevel = "low"
    else if (score >= 500) riskLevel = "medium"
    else if (score >= 300) riskLevel = "high"
    else riskLevel = "very_high"

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
      (data.total_sancoes || 0)

    const hasPublicBonds =
      data.vinculos_publicos && Array.isArray(data.vinculos_publicos) && data.vinculos_publicos.length > 0

    const publicBondsCount = data.vinculos_publicos?.length || 0

    const documentType = cleanCpf.length === 14 ? "CNPJ" : "CPF"

    const profileData: any = {
      company_id: companyId,
      cpf: cleanCpf,
      analysis_type: type,
      source,
      data,
      score,
      status: "completed",
      risk_level: riskLevel,
      has_sanctions: hasSanctions,
      has_public_bonds: hasPublicBonds,
      sanctions_count: sanctionsCount,
      public_bonds_count: publicBondsCount,
      document_type: documentType,
      last_analysis_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (customerId) profileData.customer_id = customerId
    if (customerName) profileData.name = customerName
    if (customerCity) profileData.city = customerCity
    if (customerEmail) profileData.email = customerEmail
    if (customerPhone) profileData.phone = customerPhone

    const { data: insertedData, error } = await supabase
      .from("credit_profiles")
      .upsert(profileData, {
        onConflict: "cpf,company_id,source,analysis_type",
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
      risk_level: riskLevel,
      has_sanctions: hasSanctions,
      has_public_bonds: hasPublicBonds,
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

        await storeAnalysisResult(item.cpf, analysisResult.data, "gov", "free", companyId)

        analyzedCount++
        cpfsAnalyzed.push(item.cpf)

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
      cached: 0,
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

    // 2. Verificar quais já têm análise Assertiva em cache
    const customersToAnalyze: Array<{ id: string; cpf: string; name: string; city: string; company_id: string }> = []
    let cachedCount = 0

    for (const customer of customers) {
      const cpf = customer.document

      if (!cpf || (cpf.length !== 11 && cpf.length !== 14)) {
        console.log("[v0] runAssertivaManualAnalysis - ⚠️ Invalid document, skipping:", customer.document)
        continue
      }

      const { data: existingAnalysis } = await supabase
        .from("credit_profiles")
        .select("id, score, created_at")
        .eq("cpf", cpf)
        .eq("company_id", customer.company_id)
        .eq("source", "assertiva")
        .maybeSingle()

      if (existingAnalysis) {
        console.log("[v0] runAssertivaManualAnalysis - 📋 Customer already analyzed (cached):", {
          id: customer.id,
          name: customer.name,
          cpf,
          cached_at: existingAnalysis.created_at,
        })
        cachedCount++
      } else {
        customersToAnalyze.push({
          id: customer.id,
          cpf,
          name: customer.name,
          city: customer.city,
          company_id: customer.company_id,
        })
      }
    }

    console.log("[v0] runAssertivaManualAnalysis - 📊 Analysis summary:", {
      total: customers.length,
      to_analyze: customersToAnalyze.length,
      already_cached: cachedCount,
    })

    // 3. Processar em lotes de 5 (controle de concorrência)
    let analyzedCount = 0
    let failedCount = 0
    const customersAnalyzed: Array<{ id: string; cpf: string; name: string; score?: number }> = []
    const batchSize = 5

    for (let i = 0; i < customersToAnalyze.length; i += batchSize) {
      const batch = customersToAnalyze.slice(i, i + batchSize)

      console.log("[v0] runAssertivaManualAnalysis - 🔄 Processing batch:", {
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

            const analysisResult = await analyzeDetailed(customer.cpf, customer.company_id, customer.id)

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

            const storeResult = await storeAnalysisResult(
              customer.cpf,
              analysisResult.data,
              "assertiva",
              "detailed",
              customer.company_id,
              customer.id,
            )

            if (!storeResult.success) {
              console.error(
                "[v0] runAssertivaManualAnalysis - ❌ Failed to store result for customer:",
                customer.id,
                storeResult.error,
              )
              return { success: false, customerId: customer.id, error: storeResult.error }
            }

            const score = analysisResult.data?.score_assertiva || analysisResult.data?.score_serasa || 0

            console.log("[v0] runAssertivaManualAnalysis - ✅ Successfully analyzed and stored customer:", {
              id: customer.id,
              name: customer.name,
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
            console.error("[v0] runAssertivaManualAnalysis - ❌ Error processing customer:", customer.id, error)

            try {
              await supabase.from("integration_logs").insert({
                company_id: customer.company_id,
                cpf: customer.cpf,
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
        console.log("[v0] runAssertivaManualAnalysis - ⏳ Waiting 2s before next batch...")
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }

    const duration = Date.now() - startTime

    console.log("[v0] runAssertivaManualAnalysis - 🎉 COMPLETED:", {
      total: customers.length,
      analyzed: analyzedCount,
      cached: cachedCount,
      failed: failedCount,
      duration_ms: duration,
      duration_seconds: (duration / 1000).toFixed(2),
    })

    await supabase.from("integration_logs").insert({
      company_id: companyId,
      operation: "ASSERTIVA_MANUAL_ANALYSIS",
      status: "completed",
      details: {
        customer_ids: customerIds,
        total_customers: customers.length,
        customers_to_analyze: customersToAnalyze.length,
        analyzed: analyzedCount,
        cached: cachedCount,
        failed: failedCount,
        customers_analyzed: customersAnalyzed.map((c) => ({ id: c.id, cpf: c.cpf, score: c.score })),
      },
      duration_ms: duration,
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
    console.error("[v0] runAssertivaManualAnalysis - 💥 FATAL ERROR:", error)
    console.error("[v0] runAssertivaManualAnalysis - Error stack:", error.stack)

    await supabase.from("integration_logs").insert({
      company_id: companyId,
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
