"use server"

import { createServerClient } from "@/lib/supabase/server"
import { analyzeCreditFree, analyzeCreditAssertiva } from "@/services/creditAnalysisService"

interface RunCreditAnalysisParams {
  company_id: string
  analysis_type: "free" | "assertiva"
  customer_ids?: string[]
}

export async function runCreditAnalysis(params: RunCreditAnalysisParams) {
  try {
    console.log("[v0] runCreditAnalysis - Starting", params)

    const supabase = createServerClient()

    let query = supabase.from("customers").select("id, document, name").eq("company_id", params.company_id)

    if (params.customer_ids && params.customer_ids.length > 0) {
      query = query.in("id", params.customer_ids)
    }

    const { data: customers, error: customersError } = await query

    if (customersError) throw customersError
    if (!customers || customers.length === 0) {
      return { success: false, message: "Nenhum cliente encontrado para análise" }
    }

    console.log("[v0] runCreditAnalysis - Found customers:", customers.length)

    const batchSize = 10
    let processed = 0
    let failed = 0

    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize)

      const results = await Promise.allSettled(
        batch.map(async (customer) => {
          try {
            // Verificar se já existe análise recente (últimas 24h)
            const { data: existingAnalysis } = await supabase
              .from("credit_profiles")
              .select("id")
              .eq("customer_id", customer.id)
              .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
              .single()

            if (existingAnalysis) {
              console.log("[v0] Skipping customer (recent analysis):", customer.id)
              return { skipped: true }
            }

            // Executar análise
            const result =
              params.analysis_type === "free"
                ? await analyzeCreditFree(customer.document)
                : await analyzeCreditAssertiva(customer.document)

            if (!result.success) {
              throw new Error(result.error || "Análise falhou")
            }

            // Salvar resultado
            const { error: insertError } = await supabase.from("credit_profiles").insert({
              customer_id: customer.id,
              company_id: params.company_id,
              score: result.score,
              risk_level: result.risk_level,
              analysis_type: params.analysis_type,
              status: "completed",
              completed_at: new Date().toISOString(),
              raw_data: result.details,
            })

            if (insertError) throw insertError

            return { success: true }
          } catch (error: any) {
            console.error("[v0] Error analyzing customer:", customer.id, error)
            return { success: false, error: error.message }
          }
        }),
      )

      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value.success) {
          processed++
        } else if (result.status === "fulfilled" && !result.value.skipped) {
          failed++
        }
      })

      console.log("[v0] Batch processed:", { processed, failed, total: customers.length })
    }

    return {
      success: true,
      message: `Análise concluída: ${processed} processados, ${failed} falharam`,
      processed,
      failed,
    }
  } catch (error: any) {
    console.error("[v0] runCreditAnalysis - Error:", error)
    return {
      success: false,
      message: `Erro ao executar análise: ${error.message}`,
    }
  }
}

interface UploadBaseParams {
  company_id: string
  file_data: string // Base64 encoded CSV
  file_name: string
}

export async function uploadBase(params: UploadBaseParams) {
  try {
    console.log("[v0] uploadBase - Starting", { company_id: params.company_id, file_name: params.file_name })

    const supabase = createServerClient()

    const csvContent = Buffer.from(params.file_data, "base64").toString("utf-8")
    const lines = csvContent.split("\n").filter((line) => line.trim())

    if (lines.length < 2) {
      return { success: false, message: "Arquivo CSV vazio ou inválido" }
    }

    // Assumir formato: nome,email,documento,telefone
    const customers = lines.slice(1).map((line) => {
      const [name, email, document, phone] = line.split(",").map((field) => field.trim())
      return { name, email, document, phone, company_id: params.company_id, status: "active" }
    })

    console.log("[v0] uploadBase - Parsed customers:", customers.length)

    const { data, error } = await supabase.from("customers").insert(customers).select()

    if (error) throw error

    return {
      success: true,
      message: `${customers.length} clientes importados com sucesso`,
      imported: customers.length,
    }
  } catch (error: any) {
    console.error("[v0] uploadBase - Error:", error)
    return {
      success: false,
      message: `Erro ao importar base: ${error.message}`,
    }
  }
}

interface ExportBaseParams {
  company_id: string
  include_analysis?: boolean
}

export async function exportBase(params: ExportBaseParams) {
  try {
    console.log("[v0] exportBase - Starting", params)

    const supabase = createServerClient()

    let query = supabase.from("customers").select("*").eq("company_id", params.company_id)

    if (params.include_analysis) {
      query = supabase
        .from("customers")
        .select(
          `
        *,
        credit_profiles(score, risk_level, analysis_type, completed_at)
      `,
        )
        .eq("company_id", params.company_id)
    }

    const { data: customers, error } = await query

    if (error) throw error
    if (!customers || customers.length === 0) {
      return { success: false, message: "Nenhum cliente encontrado para exportar" }
    }

    const headers = params.include_analysis
      ? ["Nome", "Email", "Documento", "Telefone", "Score", "Risco", "Tipo Análise", "Data Análise"]
      : ["Nome", "Email", "Documento", "Telefone"]

    const rows = customers.map((customer: any) => {
      const baseRow = [customer.name, customer.email, customer.document, customer.phone]

      if (params.include_analysis && customer.credit_profiles && customer.credit_profiles.length > 0) {
        const profile = customer.credit_profiles[0]
        return [
          ...baseRow,
          profile.score || "",
          profile.risk_level || "",
          profile.analysis_type || "",
          profile.completed_at ? new Date(profile.completed_at).toLocaleDateString("pt-BR") : "",
        ]
      }

      return params.include_analysis ? [...baseRow, "", "", "", ""] : baseRow
    })

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
    const base64 = Buffer.from(csv).toString("base64")

    return {
      success: true,
      message: `${customers.length} clientes exportados`,
      file_data: base64,
      file_name: `clientes_${new Date().toISOString().split("T")[0]}.csv`,
    }
  } catch (error: any) {
    console.error("[v0] exportBase - Error:", error)
    return {
      success: false,
      message: `Erro ao exportar base: ${error.message}`,
    }
  }
}

export async function exportCustomerBase(company_id: string, include_analysis = false) {
  return exportBase({ company_id, include_analysis })
}
