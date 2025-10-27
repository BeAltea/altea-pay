"use server"

import { createClient } from "@/lib/supabase/server"
import { analyzeCreditFree, analyzeCreditAssertiva } from "@/services/creditAnalysisService"

export async function runCreditAnalysis(companyId: string, analysisType: "free" | "assertiva") {
  try {
    console.log("[v0] Running credit analysis for company:", companyId, "type:", analysisType)

    const supabase = await createClient()

    // Busca clientes da empresa que não têm análise de crédito
    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("id, name, document")
      .eq("company_id", companyId)
      .is("credit_profile_id", null)

    if (customersError) {
      console.error("[v0] Error fetching customers:", customersError)
      return {
        success: false,
        error: "Erro ao buscar clientes: " + customersError.message,
      }
    }

    if (!customers || customers.length === 0) {
      return {
        success: true,
        message: "Nenhum cliente sem análise de crédito encontrado",
        processed: 0,
      }
    }

    console.log("[v0] Found", customers.length, "customers without credit analysis")

    let successCount = 0
    let failedCount = 0

    // Executa análise para cada cliente
    for (const customer of customers) {
      try {
        const result =
          analysisType === "free"
            ? await analyzeCreditFree(customer.document, customer.name)
            : await analyzeCreditAssertiva(customer.document, customer.name)

        if (result.success) {
          // Salva resultado da análise
          const { error: insertError } = await supabase.from("credit_profiles").insert({
            customer_id: customer.id,
            company_id: companyId,
            document: customer.document,
            score: result.score,
            risk_level: result.risk_level,
            analysis_type: analysisType,
            analysis_data: result.data,
            analyzed_at: new Date().toISOString(),
          })

          if (insertError) {
            console.error("[v0] Error saving credit profile:", insertError)
            failedCount++
          } else {
            successCount++
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
      processed: customers.length,
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

    const supabase = await createClient()

    // Busca a integração
    const { data: integration, error: integrationError } = await supabase
      .from("erp_integrations")
      .select("*")
      .eq("id", integrationId)
      .single()

    if (integrationError || !integration) {
      return {
        success: false,
        error: "Integração não encontrada",
      }
    }

    // Importa o serviço ERP dinamicamente para evitar problemas de importação circular
    const { erpService } = await import("@/lib/integrations/erp/erpService")

    // Sincroniza clientes com análise de crédito
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
