"use server"

import { db } from "@/lib/db"
import { vmax, creditProfiles } from "@/lib/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { runVMAXAutoAnalysis } from "@/services/creditAnalysisService"

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

export async function runVMAXAnalysisSelected(companyId: string, recordIds: string[], forceRefresh = true) {
  try {
    console.log(
      "[v0] runVMAXAnalysisSelected action - Starting for company:",
      companyId,
      "records:",
      recordIds.length,
      "forceRefresh:",
      forceRefresh,
    )

    // Buscar registros selecionados
    const vmaxRecords = await db
      .select({
        id: vmax.id,
        cpfCnpj: vmax.cpfCnpj,
        cliente: vmax.cliente,
        cidade: vmax.cidade,
      })
      .from(vmax)
      .where(
        and(
          inArray(vmax.id, recordIds),
          eq(vmax.idCompany, companyId),
        ),
      )

    if (!vmaxRecords || vmaxRecords.length === 0) {
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
      const document = record.cpfCnpj?.replace(/\D/g, "")

      if (!document || (document.length !== 11 && document.length !== 14)) {
        console.log("[v0] runVMAXAnalysisSelected - Invalid document, skipping:", record.cpfCnpj)
        failedCount++
        continue
      }

      if (!forceRefresh) {
        const [existingAnalysis] = await db
          .select({
            id: creditProfiles.id,
            customerId: creditProfiles.customerId,
            createdAt: creditProfiles.createdAt,
            score: creditProfiles.score,
          })
          .from(creditProfiles)
          .where(
            and(
              eq(creditProfiles.cpf, document),
              eq(creditProfiles.companyId, companyId),
              eq(creditProfiles.provider, "gov"),
            ),
          )
          .limit(1)

        if (existingAnalysis) {
          console.log("[v0] runVMAXAnalysisSelected - USING CACHED ANALYSIS:", {
            document,
            customer_id: existingAnalysis.customerId,
            cached_at: existingAnalysis.createdAt,
            score: existingAnalysis.score,
            vmax_record: record.cliente,
          })
          cachedCount++
          continue
        }
      } else {
        console.log(
          "[v0] runVMAXAnalysisSelected - FORCE REFRESH: Ignoring cache, running new analysis for:",
          document,
        )
      }

      try {
        console.log("[v0] runVMAXAnalysisSelected - ANALYZING DOCUMENT (NEW API CALL):", {
          index: i + 1,
          total: vmaxRecords.length,
          cpf: document,
          customer_name: record.cliente,
          customer_city: record.cidade,
          vmaxId: record.id,
          force_refresh: forceRefresh,
        })

        // Executar analise
        const analysisResult = await analyzeFree(document, companyId)

        if (!analysisResult.success) {
          console.error("[v0] runVMAXAnalysisSelected - Analysis failed:", document, analysisResult.error)
          failedCount++
          if (i < vmaxRecords.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 5000))
          }
          continue
        }

        console.log("[v0] runVMAXAnalysisSelected - API RETURNED DATA FOR:", {
          document,
          customer_name: record.cliente,
          score: analysisResult.data?.score_calculado,
          sanctions_count: analysisResult.data?.total_sancoes || 0,
          public_bonds_count: analysisResult.data?.vinculos_publicos?.length || 0,
        })

        // Salvar resultado
        const storeResult = await storeAnalysisResult(document, analysisResult.data, "gov", "free", companyId)

        if (!storeResult.success) {
          console.error("[v0] runVMAXAnalysisSelected - Failed to store:", document, storeResult.error)
          failedCount++
        } else {
          analyzedCount++
          console.log("[v0] runVMAXAnalysisSelected - Successfully analyzed and stored:", {
            document,
            customer_name: record.cliente,
            score: analysisResult.data?.score_calculado,
          })
        }
      } catch (error: any) {
        console.error("[v0] runVMAXAnalysisSelected - Error processing:", document, error)
        failedCount++
      }

      if (i < vmaxRecords.length - 1) {
        console.log("[v0] runVMAXAnalysisSelected - Waiting 5s before next request...")
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
    }

    const duration = Date.now() - startTime

    console.log("[v0] runVMAXAnalysisSelected action - COMPLETED:", {
      total: vmaxRecords.length,
      analyzed: analyzedCount,
      cached: cachedCount,
      failed: failedCount,
      duration_ms: duration,
      force_refresh: forceRefresh,
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
