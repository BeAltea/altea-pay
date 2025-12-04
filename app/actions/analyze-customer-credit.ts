"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import {
  decidirEntradaRegua,
  extrairDadosAssertivaParaAnalise,
  type ResultadoRegra,
} from "@/lib/credit-analysis-engine"
import { analyzeDetailedWithCache } from "@/services/assertivaService"

export interface AnalyzeCustomerResult {
  success: boolean
  customerId: string
  resultado?: ResultadoRegra
  error?: string
}

/**
 * Analisa o crédito de um cliente e atualiza o status de aprovação
 * Integra com a API da Assertiva e aplica as regras de negócio
 */
export async function analyzeCustomerCredit(
  customerId: string,
  cpfCnpj: string,
  valorDivida = 0,
): Promise<AnalyzeCustomerResult> {
  try {
    const supabase = createAdminClient()

    console.log(`[v0] Iniciando análise de crédito para cliente ${customerId}`)

    const assertivaResult = await analyzeDetailedWithCache(cpfCnpj, "", "")

    if (!assertivaResult.success || !assertivaResult.data) {
      return {
        success: false,
        customerId,
        error: assertivaResult.error || "Falha ao obter dados da Assertiva",
      }
    }

    console.log("[v0] Dados Assertiva recebidos:", {
      score_geral: assertivaResult.data.score_geral,
      tipo: assertivaResult.data.tipo,
      endpoints_success: Object.keys(assertivaResult.data).filter((k) => !k.includes("_error")).length,
    })

    // 2. Extrair dados para análise
    const clienteData = extrairDadosAssertivaParaAnalise(assertivaResult.data, valorDivida)

    // 3. Aplicar motor de decisão
    const resultado = decidirEntradaRegua(clienteData)

    console.log(`[v0] Decisão para cliente ${customerId}:`, resultado)

    // 4. Atualizar VMAX com o resultado da análise
    const { error: updateError } = await supabase
      .from("VMAX")
      .update({
        approval_status: resultado.decisao,
        approval_reason: resultado.motivo,
        credit_score: clienteData.creditScore,
        risk_level: resultado.riskLevel,
        behavior_classification: resultado.comportamento,
        presumed_income: clienteData.rendaPresumida,
        presumed_limit: clienteData.limitePresumido,
        last_analysis_date: new Date().toISOString(),
        auto_collection_enabled: resultado.autoCollectionEnabled,
        analysis_metadata: {
          assertiva_data: assertivaResult.data,
          decision_timestamp: new Date().toISOString(),
          analysis_version: "1.0",
          cliente_data: clienteData,
        },
      })
      .eq("id", customerId)

    if (updateError) {
      console.error("[v0] Erro ao atualizar VMAX:", updateError)
      return {
        success: false,
        customerId,
        error: updateError.message,
      }
    }

    console.log("[v0] ✅ Cliente atualizado com sucesso no banco")

    return {
      success: true,
      customerId,
      resultado,
    }
  } catch (error: any) {
    console.error("[v0] Erro na análise de crédito:", error)
    return {
      success: false,
      customerId,
      error: error.message || "Erro desconhecido",
    }
  }
}

/**
 * Analisa múltiplos clientes em lote
 */
export async function analyzeBatchCustomers(
  customers: Array<{ id: string; cpfCnpj: string; valorDivida: number }>,
): Promise<AnalyzeCustomerResult[]> {
  const results: AnalyzeCustomerResult[] = []

  for (const customer of customers) {
    const result = await analyzeCustomerCredit(customer.id, customer.cpfCnpj, customer.valorDivida)
    results.push(result)

    // Pequeno delay para não sobrecarregar a API
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return results
}
