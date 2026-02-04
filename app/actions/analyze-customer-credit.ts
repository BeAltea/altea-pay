"use server"

import { db } from "@/lib/db"
import { vmax } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { decidirEntradaRegua, extrairDadosAssertivaParaAnalise } from "@/lib/credit-analysis-engine"
import type { ResultadoRegra } from "@/lib/credit-analysis-types"
import { analyzeDetailedWithCache } from "@/services/assertivaService"

export interface AnalyzeCustomerResult {
  success: boolean
  customerId: string
  resultado?: ResultadoRegra
  error?: string
}

/**
 * Analisa o credito de um cliente e atualiza o status de aprovacao
 * Integra com a API da Assertiva e aplica as regras de negocio
 */
export async function analyzeCustomerCredit(
  customerId: string,
  cpfCnpj: string,
  valorDivida = 0,
): Promise<AnalyzeCustomerResult> {
  try {
    console.log(`[v0] Iniciando analise de credito para cliente ${customerId}`)

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

    // 2. Extrair dados para analise
    const clienteData = await extrairDadosAssertivaParaAnalise(assertivaResult.data, valorDivida)

    // 3. Aplicar motor de decisao
    const resultado = await decidirEntradaRegua(clienteData)

    console.log(`[v0] Decisao para cliente ${customerId}:`, resultado)

    // 4. Atualizar VMAX com o resultado da analise
    await db
      .update(vmax)
      .set({
        approvalStatus: resultado.decisao,
        creditScore: String(clienteData.creditScore),
        riskLevel: resultado.riskLevel,
        lastAnalysisDate: new Date(),
        autoCollectionEnabled: resultado.autoCollectionEnabled,
        analysisMetadata: {
          assertiva_data: assertivaResult.data,
          decision_timestamp: new Date().toISOString(),
          analysis_version: "1.0",
          cliente_data: clienteData,
          approval_reason: resultado.motivo,
          behavior_classification: resultado.comportamento,
          presumed_income: clienteData.rendaPresumida,
          presumed_limit: clienteData.limitePresumido,
        },
      })
      .where(eq(vmax.id, customerId))

    console.log("[v0] Cliente atualizado com sucesso no banco")

    return {
      success: true,
      customerId,
      resultado,
    }
  } catch (error: any) {
    console.error("[v0] Erro na analise de credito:", error)
    return {
      success: false,
      customerId,
      error: error.message || "Erro desconhecido",
    }
  }
}

/**
 * Analisa multiplos clientes em lote
 */
export async function analyzeBatchCustomers(
  customers: Array<{ id: string; cpfCnpj: string; valorDivida: number }>,
): Promise<AnalyzeCustomerResult[]> {
  const results: AnalyzeCustomerResult[] = []

  for (const customer of customers) {
    const result = await analyzeCustomerCredit(customer.id, customer.cpfCnpj, customer.valorDivida)
    results.push(result)

    // Pequeno delay para nao sobrecarregar a API
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return results
}
