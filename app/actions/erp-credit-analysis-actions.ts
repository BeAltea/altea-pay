"use server"

import { db } from "@/lib/db"
import { customers, creditProfiles, erpIntegrations } from "@/lib/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { analyzeCreditFree, analyzeCreditAssertiva } from "@/services/creditAnalysisService"

export async function runCreditAnalysis(companyId: string, analysisType: "free" | "assertiva") {
  try {
    console.log("[v0] Running credit analysis for company:", companyId, "type:", analysisType)

    // Busca clientes da empresa que não têm análise restritiva
    const customersData = await db
      .select({ id: customers.id, name: customers.name, document: customers.document })
      .from(customers)
      .where(eq(customers.companyId, companyId))

    if (!customersData || customersData.length === 0) {
      return {
        success: true,
        message: "Nenhum cliente sem análise restritiva encontrado",
        processed: 0,
      }
    }

    console.log("[v0] Found", customersData.length, "customers without credit analysis")

    let successCount = 0
    let failedCount = 0

    // Executa análise para cada cliente
    for (const customer of customersData) {
      try {
        const result =
          analysisType === "free"
            ? await analyzeCreditFree(customer.document, customer.name)
            : await analyzeCreditAssertiva(customer.document, customer.name)

        if (result.success) {
          // Salva resultado da análise
          try {
            await db.insert(creditProfiles).values({
              customerId: customer.id,
              companyId: companyId,
              cpf: customer.document,
              score: result.score,
              riskLevel: result.risk_level,
              analysisType: analysisType,
              data: result.data,
            })
            successCount++
          } catch (insertError) {
            console.error("[v0] Error saving credit profile:", insertError)
            failedCount++
          }
        } else {
          console.error("[v0] Credit analysis failed for customer:", customer.id, result.error)
          failedCount++
        }
      } catch (error) {
        console.error("[v0] Error analyzing customer:", customer.id, error)
        failedCount++
      }
    }

    console.log("[v0] Credit analysis completed:", successCount, "success,", failedCount, "failed")

    return {
      success: true,
      message: `Análise concluída: ${successCount} sucesso, ${failedCount} falhas`,
      processed: customersData.length,
      successCount,
      failedCount,
    }
  } catch (error) {
    console.error("[v0] Error running credit analysis:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}

export async function syncERPWithCreditAnalysis(integrationId: string, analysisType: "free" | "assertiva") {
  try {
    console.log("[v0] Syncing ERP with credit analysis:", integrationId, "type:", analysisType)

    // Busca a integração
    const [integration] = await db
      .select()
      .from(erpIntegrations)
      .where(eq(erpIntegrations.id, integrationId))
      .limit(1)

    if (!integration) {
      return {
        success: false,
        error: "Integração não encontrada",
      }
    }

    // Importa o serviço ERP dinamicamente para evitar problemas de importação circular
    const { erpService } = await import("@/lib/integrations/erp/erpService")

    // Sincroniza clientes com análise restritiva
    const result = await erpService.syncCustomersWithCreditAnalysis(integrationId, analysisType)

    return {
      success: result.success,
      message: `Sincronização concluída: ${result.records_success} sucesso, ${result.records_failed} falhas`,
      processed: result.records_processed,
      successCount: result.records_success,
      failedCount: result.records_failed,
    }
  } catch (error) {
    console.error("[v0] Error syncing ERP with credit analysis:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}
