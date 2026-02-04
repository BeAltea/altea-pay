"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { profiles, vmax } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { runAssertivaManualAnalysis } from "@/services/creditAnalysisService"

export async function createCustomerWithAnalysis(data: {
  name: string
  cpf_cnpj: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  companyId?: string // Allow passing company_id directly for super admin
}) {
  try {
    console.log("[v0] createCustomerWithAnalysis - Starting", data)

    let companyId = data.companyId

    if (!companyId) {
      const session = await auth()
      const user = session?.user

      if (!user) {
        return { success: false, message: "Usuário não autenticado" }
      }

      const [profile] = await db
        .select({ companyId: profiles.companyId })
        .from(profiles)
        .where(eq(profiles.id, user.id!))
        .limit(1)

      if (!profile?.companyId) {
        return { success: false, message: "Empresa não encontrada" }
      }

      companyId = profile.companyId
    }

    // Clean CPF/CNPJ
    const cleanDocument = data.cpf_cnpj.replace(/\D/g, "")

    // Check if customer already exists
    const [existingCustomer] = await db
      .select({ id: vmax.id })
      .from(vmax)
      .where(and(eq(vmax.cpfCnpj, data.cpf_cnpj), eq(vmax.idCompany, companyId)))
      .limit(1)

    if (existingCustomer) {
      return { success: false, message: "Cliente já cadastrado nesta empresa" }
    }

    console.log("[v0] Criando novo cliente na tabela VMAX...")

    const [newCustomer] = await db
      .insert(vmax)
      .values({
        cliente: data.name,
        cpfCnpj: data.cpf_cnpj,
        cidade: data.city || null,
        idCompany: companyId,
        autoCollectionEnabled: false,
      })
      .returning()

    if (!newCustomer) {
      console.error("[v0] Error inserting customer")
      return { success: false, message: "Erro ao cadastrar cliente no banco de dados" }
    }

    console.log("[v0] Cliente criado com ID:", newCustomer.id)
    console.log("[v0] Iniciando análise de crédito automática com Assertiva...")

    let creditAnalysis = null
    let analysisError = null

    try {
      const analysisResult = await runAssertivaManualAnalysis([
        {
          id: newCustomer.id,
          cpf: cleanDocument,
          company_id: companyId,
        },
      ])

      console.log("[v0] Resultado da análise:", analysisResult)

      if (analysisResult.success && analysisResult.results.length > 0) {
        const result = analysisResult.results[0]

        if (result.status === "success") {
          creditAnalysis = {
            score: result.score,
            decision: result.decision,
            message: result.message,
          }
          console.log("[v0] Análise de crédito concluída com sucesso:", creditAnalysis)
        } else {
          analysisError = result.error || "Erro desconhecido na análise"
          console.error("[v0] Falha na análise:", analysisError)
        }
      } else {
        analysisError = analysisResult.error || "Nenhum resultado retornado"
        console.error("[v0] Falha na análise:", analysisError)
      }
    } catch (error) {
      analysisError = error instanceof Error ? error.message : "Erro desconhecido"
      console.error("[v0] Exceção na análise de crédito:", error)
    }

    return {
      success: true,
      message: creditAnalysis
        ? `Cliente cadastrado e analisado! Score: ${creditAnalysis.score} pts - ${creditAnalysis.decision}`
        : `Cliente cadastrado com sucesso! ${analysisError ? `Análise falhou: ${analysisError}` : "Análise em andamento..."}`,
      customer: newCustomer,
      creditAnalysis,
      analysisError,
    }
  } catch (error) {
    console.error("[v0] Error creating customer:", error)
    return {
      success: false,
      message: "Erro inesperado ao cadastrar cliente",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}
