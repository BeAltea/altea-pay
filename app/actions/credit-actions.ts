"use server"

import { db } from "@/lib/db"
import { customers, companies, creditProfiles, vmax } from "@/lib/db/schema"
import { eq, and, gte, inArray, desc, asc } from "drizzle-orm"
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

    let query = db
      .select({ id: customers.id, document: customers.document, name: customers.name })
      .from(customers)
      .where(
        params.customer_ids && params.customer_ids.length > 0
          ? and(eq(customers.companyId, params.company_id), inArray(customers.id, params.customer_ids))
          : eq(customers.companyId, params.company_id)
      )

    const customersData = await query

    if (!customersData || customersData.length === 0) {
      return { success: false, message: "Nenhum cliente encontrado para análise" }
    }

    console.log("[v0] runCreditAnalysis - Found customers:", customersData.length)

    const batchSize = 10
    let processed = 0
    let failed = 0

    for (let i = 0; i < customersData.length; i += batchSize) {
      const batch = customersData.slice(i, i + batchSize)

      const results = await Promise.allSettled(
        batch.map(async (customer) => {
          try {
            // Verificar se já existe análise recente (últimas 24h)
            const [existingAnalysis] = await db
              .select({ id: creditProfiles.id })
              .from(creditProfiles)
              .where(
                and(
                  eq(creditProfiles.customerId, customer.id),
                  gte(creditProfiles.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
                )
              )
              .limit(1)

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
            await db.insert(creditProfiles).values({
              customerId: customer.id,
              companyId: params.company_id,
              score: result.score,
              riskLevel: result.risk_level,
              analysisType: params.analysis_type,
              status: "completed",
              data: result.details,
            })

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

      console.log("[v0] Batch processed:", { processed, failed, total: customersData.length })
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

    const csvContent = Buffer.from(params.file_data, "base64").toString("utf-8")
    const lines = csvContent.split("\n").filter((line) => line.trim())

    if (lines.length < 2) {
      return { success: false, message: "Arquivo CSV vazio ou inválido" }
    }

    // Assumir formato: nome,email,documento,telefone
    const customersToInsert = lines.slice(1).map((line) => {
      const [name, email, document, phone] = line.split(",").map((field) => field.trim())
      return { name, email, document, phone, companyId: params.company_id, status: "active" }
    })

    console.log("[v0] uploadBase - Parsed customers:", customersToInsert.length)

    await db.insert(customers).values(customersToInsert)

    return {
      success: true,
      message: `${customersToInsert.length} clientes importados com sucesso`,
      imported: customersToInsert.length,
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

    let customersData: any[]

    if (params.include_analysis) {
      const results = await db
        .select()
        .from(customers)
        .leftJoin(creditProfiles, eq(customers.id, creditProfiles.customerId))
        .where(eq(customers.companyId, params.company_id))

      // Group credit profiles by customer
      const customerMap = new Map<string, any>()
      for (const row of results) {
        const customerId = row.customers.id
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, { ...row.customers, credit_profiles: [] })
        }
        if (row.credit_profiles) {
          customerMap.get(customerId).credit_profiles.push(row.credit_profiles)
        }
      }
      customersData = Array.from(customerMap.values())
    } else {
      customersData = await db
        .select()
        .from(customers)
        .where(eq(customers.companyId, params.company_id))
    }

    if (!customersData || customersData.length === 0) {
      return { success: false, message: "Nenhum cliente encontrado para exportar" }
    }

    const headers = params.include_analysis
      ? ["Nome", "Email", "Documento", "Telefone", "Score", "Risco", "Tipo Análise", "Data Análise"]
      : ["Nome", "Email", "Documento", "Telefone"]

    const rows = customersData.map((customer: any) => {
      const baseRow = [customer.name, customer.email, customer.document, customer.phone]

      if (params.include_analysis && customer.credit_profiles && customer.credit_profiles.length > 0) {
        const profile = customer.credit_profiles[0]
        return [
          ...baseRow,
          profile.score || "",
          profile.riskLevel || "",
          profile.analysisType || "",
          profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("pt-BR") : "",
        ]
      }

      return params.include_analysis ? [...baseRow, "", "", "", ""] : baseRow
    })

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
    const base64 = Buffer.from(csv).toString("base64")

    return {
      success: true,
      message: `${customersData.length} clientes exportados`,
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
export async function runAssertivaManualAnalysisWrapper(
  customerIds: string[],
  companyId: string,
  analysisType: "restrictive" | "behavioral" = "restrictive",
) {
  try {
    const analysisLabel = analysisType === "restrictive" ? "Restritiva" : "Comportamental"

    await logSecurityEvent({
      event_type: "credit_analysis",
      severity: "high",
      action: `Iniciou análise ${analysisLabel} para ${customerIds.length} cliente(s)`,
      resource_type: "customer",
      company_id: companyId,
      metadata: {
        customer_count: customerIds.length,
        analysis_type: analysisType,
        is_paid: true,
      },
      status: "pending",
    })

    const result = await runAssertivaManualAnalysisService(customerIds, companyId, analysisType)

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

export async function runAssertivaManualAnalysis(
  customerIds: string[],
  companyId: string,
  analysisType: "restrictive" | "behavioral" = "restrictive",
) {
  return runAssertivaManualAnalysisWrapper(customerIds, companyId, analysisType)
}

export async function getAllCompanies() {
  try {
    console.log("[SERVER] getAllCompanies - Starting...")

    const companiesData = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .orderBy(asc(companies.name))

    console.log("[SERVER] getAllCompanies - Companies loaded:", companiesData?.length || 0)

    return { success: true, data: companiesData || [] }
  } catch (error: any) {
    console.error("[SERVER] getAllCompanies - Error:", error)
    return { success: false, error: error.message, data: [] }
  }
}
