"use server"

import { runVMAXAutoAnalysis } from "@/services/creditAnalysisService"
import { createAdminClient } from "@/lib/supabase/admin"

export async function runVMAXAnalysisAll(companyId: string) {
  try {
    console.log("[v0] runVMAXAnalysisAll action - Starting for company:", companyId)

    const result = await runVMAXAutoAnalysis(companyId)

    console.log("[v0] runVMAXAnalysisAll action - Result:", result)

    if (!result.success) {
      return { success: false, error: result.error || "Erro desconhecido" }
    }

    return {
      success: true,
      total: result.total,
      analyzed: result.analyzed,
      cached: result.cached,
      failed: result.failed,
      duration: result.duration,
    }
  } catch (error: any) {
    console.error("[v0] runVMAXAnalysisAll action - Error:", error)
    return { success: false, error: error.message }
  }
}

export async function runVMAXAnalysisSelected(companyId: string, recordIds: string[]) {
  try {
    console.log("[v0] runVMAXAnalysisSelected action - Starting for company:", companyId, "records:", recordIds.length)

    const supabase = createAdminClient()

    // Buscar registros selecionados
    const { data: vmaxRecords, error: vmaxError } = await supabase
      .from("VMAX")
      .select('id, "CPF/CNPJ", Cliente, Cidade')
      .in("id", recordIds)
      .eq("id_company", companyId)

    if (vmaxError || !vmaxRecords || vmaxRecords.length === 0) {
      return { success: false, error: "Nenhum registro encontrado" }
    }

    console.log("[v0] runVMAXAnalysisSelected action - Found records:", vmaxRecords.length)

    // Processar registros selecionados
    const { analyzeFree, storeAnalysisResult } = await import("@/services/creditAnalysisService")

    let analyzedCount = 0
    let cachedCount = 0
    let failedCount = 0
    const startTime = Date.now()

    for (let i = 0; i < vmaxRecords.length; i++) {
      const record = vmaxRecords[i]
      const document = record["CPF/CNPJ"]?.replace(/\D/g, "")

      if (!document || (document.length !== 11 && document.length !== 14)) {
        console.log("[v0] runVMAXAnalysisSelected - Invalid document, skipping:", record["CPF/CNPJ"])
        failedCount++
        continue
      }

      const { data: existingAnalysis } = await supabase
        .from("credit_profiles")
        .select("id, customer_id")
        .eq("cpf", document)
        .eq("company_id", companyId)
        .eq("source", "gov")
        .not("customer_id", "is", null) // Só considera cached se tiver customer_id
        .maybeSingle()

      if (existingAnalysis) {
        console.log(
          "[v0] runVMAXAnalysisSelected - Document already analyzed (cached):",
          document,
          "with customer_id:",
          existingAnalysis.customer_id,
        )
        cachedCount++
        continue
      }

      try {
        console.log("[v0] runVMAXAnalysisSelected - Analyzing document:", {
          index: i + 1,
          total: vmaxRecords.length,
          cpf: document,
          vmaxId: record.id,
        })

        // Executar análise
        const analysisResult = await analyzeFree(document, companyId)

        if (!analysisResult.success) {
          console.error("[v0] runVMAXAnalysisSelected - Analysis failed:", document, analysisResult.error)
          failedCount++
          // Aguardar 15 segundos antes da próxima requisição
          if (i < vmaxRecords.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 15000))
          }
          continue
        }

        // Salvar resultado
        const storeResult = await storeAnalysisResult(document, analysisResult.data, "gov", "free", companyId)

        if (!storeResult.success) {
          console.error("[v0] runVMAXAnalysisSelected - Failed to store:", document, storeResult.error)
          failedCount++
        } else {
          analyzedCount++
          console.log("[v0] runVMAXAnalysisSelected - Success:", document)
        }
      } catch (error: any) {
        console.error("[v0] runVMAXAnalysisSelected - Error processing:", document, error)
        failedCount++
      }

      // Aguardar 15 segundos antes da próxima requisição (rate limiting)
      if (i < vmaxRecords.length - 1) {
        console.log("[v0] runVMAXAnalysisSelected - Waiting 15s before next request...")
        await new Promise((resolve) => setTimeout(resolve, 15000))
      }
    }

    const duration = Date.now() - startTime

    console.log("[v0] runVMAXAnalysisSelected action - Completed:", {
      total: vmaxRecords.length,
      analyzed: analyzedCount,
      cached: cachedCount,
      failed: failedCount,
      duration_ms: duration,
    })

    return {
      success: true,
      total: vmaxRecords.length,
      analyzed: analyzedCount,
      cached: cachedCount,
      failed: failedCount,
      duration,
    }
  } catch (error: any) {
    console.error("[v0] runVMAXAnalysisSelected action - Error:", error)
    return { success: false, error: error.message }
  }
}
