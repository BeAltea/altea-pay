"use server"

import { createServerClient } from "@/lib/supabase/server"
import {
  analyzeCreditFree,
  analyzeCreditAssertiva,
  runVMAXAutoAnalysis,
  runAssertivaManualAnalysis as runAssertivaManualAnalysisService,
} from "@/services/creditAnalysisService"
import { logSecurityEvent } from "@/lib/security-logger"

interface RunCreditAnalysisParams {
  company_id: string
  analysis_type: "free" | "assertiva"
  customer_ids?: string[]
}

export async function runCreditAnalysis(params: RunCreditAnalysisParams) {
  try {
    console.log("[v0] runCreditAnalysis - Starting", params)

    const supabase = await createServerClient()

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

    const supabase = await createServerClient()

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

    const supabase = await createServerClient()

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

export async function runVMAXAnalysis(companyId: string) {
  try {
    console.log("[v0] runVMAXAnalysis action - Starting for company:", companyId)

    const result = await runVMAXAutoAnalysis(companyId)

    if (!result.success) {
      return {
        success: false,
        message: `Erro ao executar análise: ${result.error}`,
      }
    }

    const message = `
Análise VMAX concluída com sucesso!

📊 Resumo:
- Total de registros na tabela VMAX: ${result.total}
- Novos CPFs analisados: ${result.analyzed}
- CPFs já analisados (cache): ${result.cached}
- Falhas: ${result.failed}
- Tempo total: ${(result.duration / 1000).toFixed(2)}s

${result.sample_result ? `\n📋 Exemplo de resultado:\n- CPF: ${result.sample_result.cpf}\n- Score: ${result.sample_result.score}\n- Vínculos públicos: ${result.sample_result.vinculos_count}\n- Situação: ${result.sample_result.situacao_cpf}` : ""}

${result.cpfs_analyzed.length > 0 ? `\n✅ CPFs analisados:\n${result.cpfs_analyzed.slice(0, 10).join(", ")}${result.cpfs_analyzed.length > 10 ? `\n... e mais ${result.cpfs_analyzed.length - 10}` : ""}` : ""}
    `.trim()

    return {
      success: true,
      message,
      data: result,
    }
  } catch (error: any) {
    console.error("[v0] runVMAXAnalysis action - Error:", error)
    return {
      success: false,
      message: `Erro ao executar análise: ${error.message}`,
    }
  }
}

// Renamed function to avoid redeclaration
export async function runAssertivaManualAnalysisWrapper(customerIds: string[], companyId: string) {
  try {
    await logSecurityEvent({
      event_type: "credit_analysis",
      severity: "high",
      action: `Iniciou análise Assertiva (paga) para ${customerIds.length} cliente(s)`,
      resource_type: "customer",
      company_id: companyId,
      metadata: {
        customer_count: customerIds.length,
        analysis_type: "assertiva",
        is_paid: true,
      },
      status: "pending",
    })

    const result = await runAssertivaManualAnalysisService(customerIds, companyId)

    if (!result.success) {
      await logSecurityEvent({
        event_type: "credit_analysis",
        severity: "high",
        action: `Análise Assertiva falhou: ${result.error}`,
        resource_type: "customer",
        company_id: companyId,
        metadata: { error: result.error },
        status: "failed",
      })

      return {
        success: false,
        message: `Erro ao executar análise: ${result.error}`,
      }
    }

    await logSecurityEvent({
      event_type: "credit_analysis",
      severity: "high",
      action: `Análise Assertiva concluída - ${result.analyzed} analisados, ${result.cached} em cache, ${result.failed} falharam`,
      resource_type: "customer",
      company_id: companyId,
      metadata: {
        total: result.total,
        analyzed: result.analyzed,
        cached: result.cached,
        failed: result.failed,
        duration_ms: result.duration,
        customers_analyzed: result.customers_analyzed.map((c: any) => c.cpf),
      },
      status: "success",
    })

    const message = `
Análise Assertiva concluída com sucesso!

📊 Resumo:
- Total de clientes selecionados: ${result.total}
- Análises realizadas: ${result.analyzed}
- Já tinham análise (cache): ${result.cached}
- Falhas: ${result.failed}
- Tempo total: ${(result.duration / 1000).toFixed(2)}s

${
  result.customers_analyzed.length > 0
    ? `\n✅ Clientes analisados:\n${result.customers_analyzed
        .slice(0, 5)
        .map((c) => `- ${c.name} (CPF: ${c.cpf}) - Score: ${c.score || "N/A"}`)
        .join(
          "\n",
        )}${result.customers_analyzed.length > 5 ? `\n... e mais ${result.customers_analyzed.length - 5}` : ""}`
    : ""
}
    `.trim()

    return {
      success: true,
      message,
      data: result,
    }
  } catch (error: any) {
    console.error("[v0] runAssertivaManualAnalysis action - Error:", error)

    await logSecurityEvent({
      event_type: "credit_analysis",
      severity: "critical",
      action: `Erro crítico na análise Assertiva: ${error.message}`,
      resource_type: "customer",
      company_id: companyId,
      metadata: { error: error.message },
      status: "failed",
    })

    return {
      success: false,
      message: `Erro ao executar análise: ${error.message}`,
    }
  }
}

export async function runAssertivaManualAnalysis(customerIds: string[], companyId: string) {
  return runAssertivaManualAnalysisWrapper(customerIds, companyId)
}

export async function runGovernmentAnalysis(customerIds: string[], companyId: string) {
  try {
    console.log("[v0] runGovernmentAnalysis action - Starting for customers:", customerIds.length)

    await logSecurityEvent({
      event_type: "credit_analysis",
      severity: "medium",
      action: `Iniciou análise Gov para ${customerIds.length} cliente(s)`,
      resource_type: "customer",
      company_id: companyId,
      metadata: {
        customer_count: customerIds.length,
        analysis_type: "government",
        api: "Portal da Transparência",
      },
      status: "pending",
    })

    const supabase = await createServerClient()

    // Fetch customer data from VMAX table
    const { data: vmaxData, error: vmaxError } = await supabase
      .from("VMAX")
      .select('id, "CPF/CNPJ", Cliente, Cidade, id_company')
      .in("id", customerIds)

    if (vmaxError) throw vmaxError
    if (!vmaxData || vmaxData.length === 0) {
      await logSecurityEvent({
        event_type: "credit_analysis",
        severity: "low",
        action: `Análise Gov falhou - nenhum cliente encontrado`,
        resource_type: "customer",
        company_id: companyId,
        status: "failed",
      })
      return {
        success: false,
        error: "Nenhum cliente encontrado na tabela VMAX",
      }
    }

    console.log("[v0] runGovernmentAnalysis - Found customers:", vmaxData.length)

    const startTime = Date.now()
    let analyzed = 0
    let cached = 0
    let failed = 0
    const customersAnalyzed: any[] = []

    // Process each customer
    for (const customer of vmaxData) {
      try {
        const cpf = customer["CPF/CNPJ"]
        if (!cpf) {
          console.log("[v0] runGovernmentAnalysis - Skipping customer without CPF:", customer.id)
          failed++
          continue
        }

        // Check if analysis already exists
        const { data: existingAnalysis } = await supabase
          .from("credit_profiles")
          .select("id, score")
          .eq("cpf", cpf.replace(/\D/g, ""))
          .eq("company_id", companyId)
          .eq("source", "gov")
          .maybeSingle()

        if (existingAnalysis) {
          console.log("[v0] runGovernmentAnalysis - Analysis already exists for CPF:", cpf)
          cached++
          continue
        }

        // Run free government analysis
        const result = await analyzeCreditFree(cpf)

        if (result.success) {
          analyzed++
          customersAnalyzed.push({
            name: customer.Cliente,
            cpf: cpf,
            score: result.score,
          })
        } else {
          console.error("[v0] runGovernmentAnalysis - Analysis failed for CPF:", cpf, result.error)
          failed++
        }
      } catch (error: any) {
        console.error("[v0] runGovernmentAnalysis - Error processing customer:", customer.id, error)
        failed++
      }
    }

    const duration = Date.now() - startTime

    await logSecurityEvent({
      event_type: "credit_analysis",
      severity: "medium",
      action: `Análise Gov concluída - ${analyzed} analisados, ${cached} em cache, ${failed} falharam`,
      resource_type: "customer",
      company_id: companyId,
      metadata: {
        total: vmaxData.length,
        analyzed,
        cached,
        failed,
        duration_ms: duration,
        customers_analyzed: customersAnalyzed.map((c) => c.cpf),
      },
      status: "success",
    })

    return {
      success: true,
      total: vmaxData.length,
      analyzed,
      cached,
      failed,
      duration,
      customers_analyzed: customersAnalyzed,
    }
  } catch (error: any) {
    console.error("[v0] runGovernmentAnalysis action - Error:", error)

    await logSecurityEvent({
      event_type: "credit_analysis",
      severity: "high",
      action: `Erro na análise Gov: ${error.message}`,
      resource_type: "customer",
      company_id: companyId,
      metadata: { error: error.message },
      status: "failed",
    })

    return {
      success: false,
      error: error.message,
    }
  }
}
