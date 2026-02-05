"use server"

import { db } from "@/lib/db"
import { vmax, creditProfiles, companies } from "@/lib/db/schema"
import { eq, desc, asc, isNotNull, or, inArray, sql } from "drizzle-orm"

export async function getAnalysesData() {
  try {
    console.log("[SERVER] getAnalysesData - Starting (VMAX ONLY)...")

    // SOMENTE dados da tabela VMAX (tabela customers foi descontinuada)
    // Buscar registros com analise RESTRITIVA (restrictive_analysis_logs ou analysis_metadata antigo)
    const vmaxData = await db
      .select()
      .from(vmax)
      .where(
        or(
          isNotNull(sql`${vmax.analysisMetadata}->'restrictive_analysis_logs'`),
          isNotNull(vmax.analysisMetadata),
        ),
      )
      .orderBy(desc(vmax.lastAnalysisDate))

    console.log("[SERVER] getAnalysesData - VMAX records loaded:", vmaxData.length)

    const profilesData = await db
      .select()
      .from(creditProfiles)
      .where(eq(creditProfiles.provider, "assertiva"))
      .orderBy(desc(creditProfiles.createdAt))

    console.log("[SERVER] getAnalysesData - Profiles loaded:", profilesData.length)

    const allAnalyses = [
      ...vmaxData.map((v) => {
        const metadata = v.analysisMetadata as any
        const restrictiveLogs = metadata?.restrictive_analysis_logs
        const restrictiveDate = metadata?.restrictive_analysis_date
        return {
          id: v.id,
          customer_id: v.id,
          name: v.cliente,
          document: v.cpfCnpj,
          company_id: v.idCompany,
          city: v.cidade || "N/A",
          source_table: "vmax" as const,
          dias_inad: Number(String(v.maiorAtraso || "0").replace(/\D/g, "")) || 0,
          credit_score: v.creditScore,
          risk_level: v.riskLevel,
          approval_status: v.approvalStatus,
          analysis_metadata: restrictiveLogs || v.analysisMetadata,
          last_analysis_date: restrictiveDate || v.lastAnalysisDate,
        }
      }),
      ...profilesData.map((p) => ({
        id: p.id,
        customer_id: p.customerId,
        name: p.name || "N/A",
        document: "N/A",
        company_id: p.companyId,
        city: "N/A",
        source_table: "credit_profiles" as const,
        dias_inad: 0,
        credit_score: p.score,
        risk_level: p.riskLevel,
        approval_status: null,
        analysis_metadata: p.metadata,
        last_analysis_date: p.createdAt,
      })),
    ]

    console.log("[SERVER] getAnalysesData - Total analyses (VMAX + profiles):", allAnalyses.length)

    if (allAnalyses.length === 0) {
      return { success: true, data: [] }
    }

    const companyIds = [...new Set(allAnalyses.map((c) => c.company_id).filter(Boolean))] as string[]
    const companiesData = companyIds.length > 0
      ? await db.select({ id: companies.id, name: companies.name }).from(companies).where(inArray(companies.id, companyIds))
      : []

    const companiesMap = new Map(companiesData.map((c) => [c.id, c]))

    const formattedAnalyses = allAnalyses.map((analysis) => {
      const company = companiesMap.get(analysis.company_id!)

      return {
        id: analysis.id,
        customer_id: analysis.customer_id,
        company_id: analysis.company_id,
        cpf: analysis.document || "N/A",
        score: analysis.credit_score || 0,
        source: "assertiva",
        analysis_type: "detailed",
        status: "completed",
        created_at: analysis.last_analysis_date || new Date().toISOString(),
        customer_name: analysis.name || "N/A",
        company_name: company?.name || "N/A",
        source_table: analysis.source_table,
        data: analysis.analysis_metadata,
        assertiva_data: (analysis.analysis_metadata as any)?.assertiva_data || analysis.analysis_metadata,
        dias_inad: analysis.dias_inad,
        risk_level: analysis.risk_level,
        approval_status: analysis.approval_status,
      }
    })

    console.log("[SERVER] getAnalysesData - Formatted analyses:", formattedAnalyses.length)

    return { success: true, data: formattedAnalyses }
  } catch (error: any) {
    console.error("[SERVER] getAnalysesData - Error:", error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getCustomerDetails(customerId: string) {
  try {
    console.log("[SERVER] getCustomerDetails - Starting for customer:", customerId)

    const [customerData] = await db
      .select()
      .from(vmax)
      .where(eq(vmax.id, customerId))
      .limit(1)

    if (!customerData) {
      throw new Error("Cliente nao encontrado")
    }

    const metadata = customerData.analysisMetadata as any

    const customer = {
      id: customerData.id,
      name: customerData.cliente,
      document: customerData.cpfCnpj,
      company_id: customerData.idCompany,
      city: customerData.cidade,
      // Financial info
      valorTotal: customerData.valorTotal,
      quantidadeTitulos: customerData.quantidadeTitulos,
      primeiraVencida: customerData.primeiraVencida,
      maiorAtraso: customerData.maiorAtraso,
      dias_inad: Number(String(customerData.maiorAtraso || "0").replace(/\D/g, "")) || 0,
      // Status info
      creditScore: customerData.creditScore,
      riskLevel: customerData.riskLevel,
      approvalStatus: customerData.approvalStatus,
      // Collection info
      autoCollectionEnabled: customerData.autoCollectionEnabled,
      collectionProcessedAt: customerData.collectionProcessedAt,
      lastCollectionAttempt: customerData.lastCollectionAttempt,
      lastAnalysisDate: customerData.lastAnalysisDate,
      // Analysis metadata
      analysisMetadata: customerData.analysisMetadata,
      restrictive_analysis_logs: metadata?.restrictive_analysis_logs || null,
      restrictive_analysis_date: metadata?.restrictive_analysis_date || null,
      behavioral_analysis_logs: metadata?.behavioral_analysis_logs || null,
      behavioral_analysis_date: metadata?.behavioral_analysis_date || null,
      recovery_score: metadata?.recovery_score || null,
      recovery_class: metadata?.recovery_class || null,
      // Timestamps
      createdAt: customerData.createdAt,
      updatedAt: customerData.updatedAt,
    }

    const [profileData] = await db
      .select()
      .from(creditProfiles)
      .where(eq(creditProfiles.customerId, customerId))
      .orderBy(desc(creditProfiles.createdAt))
      .limit(1)

    const companyData = customer.company_id
      ? (await db.select().from(companies).where(eq(companies.id, customer.company_id)).limit(1))[0]
      : undefined

    const analysisHistory = await db
      .select()
      .from(creditProfiles)
      .where(eq(creditProfiles.customerId, customerId))
      .orderBy(desc(creditProfiles.createdAt))

    return {
      success: true,
      data: {
        customer,
        profile: profileData,
        company: companyData,
        analysisHistory: analysisHistory || [],
        isVMAX: true,
      },
    }
  } catch (error: any) {
    console.error("[SERVER] getCustomerDetails - Error:", error)
    return { success: false, error: error.message }
  }
}

export async function runAnalysis(customerId: string, document: string) {
  try {
    console.log("[SERVER] runAnalysis - Starting for customer:", customerId, "document:", document)

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [recentProfile] = await db
      .select()
      .from(creditProfiles)
      .where(eq(creditProfiles.customerId, customerId))
      .orderBy(desc(creditProfiles.createdAt))
      .limit(1)

    if (recentProfile && recentProfile.createdAt >= oneDayAgo) {
      console.log("[SERVER] runAnalysis - Recent analysis found, returning existing data")
      return {
        success: true,
        data: recentProfile,
        message: "Analise recente encontrada (ultimas 24 horas)",
      }
    }

    const assertivaUrl = process.env.ASSERTIVA_BASE_URL
    const clientId = process.env.ASSERTIVA_CLIENT_ID
    const clientSecret = process.env.ASSERTIVA_CLIENT_SECRET

    if (!assertivaUrl || !clientId || !clientSecret) {
      throw new Error("Credenciais da API restritiva nao configuradas")
    }

    const response = await fetch(`${assertivaUrl}/credit-analysis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        document: document.replace(/\D/g, ""),
        customer_id: customerId,
      }),
    })

    if (!response.ok) {
      throw new Error(`Erro na API restritiva: ${response.statusText}`)
    }

    const analysisData = await response.json()

    const [newProfile] = await db
      .insert(creditProfiles)
      .values({
        customerId: customerId,
        score: String(analysisData.score || 0),
        provider: "assertiva",
        analysisType: "credit_check",
        data: analysisData,
      })
      .returning()

    console.log("[SERVER] runAnalysis - Analysis completed successfully")

    return {
      success: true,
      data: newProfile,
      message: "Analise restritiva realizada com sucesso",
    }
  } catch (error: any) {
    console.error("[SERVER] runAnalysis - Error:", error)
    return {
      success: false,
      error: error.message,
      message: "Erro ao realizar analise restritiva",
    }
  }
}

export async function getAllCustomers() {
  try {
    // Buscar TODOS os registros VMAX (sem limite)
    const vmaxData = await db
      .select()
      .from(vmax)
      .orderBy(asc(vmax.cliente))

    // SOMENTE dados da tabela VMAX (tabela customers foi descontinuada)
    const allCustomers = vmaxData.map((v) => {
      let score = v.creditScore

      const metadata = v.analysisMetadata as any
      // Usar logs restritivos se existir, senao analysis_metadata (compatibilidade)
      const analysisLogs = metadata?.restrictive_analysis_logs || v.analysisMetadata
      const analysisDate = metadata?.restrictive_analysis_date || v.lastAnalysisDate

      if (!score && analysisLogs) {
        try {
          const meta = analysisLogs as any
          score =
            meta?.assertiva_data?.credito?.resposta?.score?.pontos ||
            meta?.credito?.resposta?.score?.pontos ||
            null
        } catch (e) {
          console.error("[SERVER] Error extracting score from metadata:", e)
        }
      }

      if (score === "0" || score === 0) {
        score = "5"
      }

      return {
        id: v.id,
        name: v.cliente,
        document: v.cpfCnpj,
        company_id: v.idCompany,
        city: v.cidade || "N/A",
        source_table: "VMAX" as const,
        dias_inad: Number(String(v.maiorAtraso || "0").replace(/\D/g, "")) || 0,
        credit_score: score,
        risk_level: v.riskLevel,
        approval_status: v.approvalStatus,
        analysis_metadata: analysisLogs,
        last_analysis_date: analysisDate,
        recovery_score: metadata?.recovery_score || null,
        recovery_class: metadata?.recovery_class || null,
        // Novos campos separados
        restrictive_analysis_logs: metadata?.restrictive_analysis_logs || null,
        restrictive_analysis_date: metadata?.restrictive_analysis_date || null,
        behavioral_analysis_logs: metadata?.behavioral_analysis_logs || null,
        behavioral_analysis_date: metadata?.behavioral_analysis_date || null,
      }
    })

    console.log("[SERVER] getAllCustomers - Total VMAX customers:", allCustomers.length)

    if (allCustomers.length === 0) {
      return { success: true, data: [] }
    }

    const companyIds = [...new Set(allCustomers.map((c) => c.company_id).filter(Boolean))] as string[]
    const companiesData = companyIds.length > 0
      ? await db.select({ id: companies.id, name: companies.name }).from(companies).where(inArray(companies.id, companyIds))
      : []

    const companiesMap = new Map(companiesData.map((c) => [c.id, c]))

    const formattedCustomers = allCustomers.map((customer: any) => {
      const company = companiesMap.get(customer.company_id)

      return {
        id: customer.id,
        name: customer.name || "N/A",
        document: customer.document || "N/A",
        city: customer.city,
        company_name: company?.name || "N/A",
        company_id: customer.company_id,
        source_table: customer.source_table,
        dias_inad: customer.dias_inad,
        credit_score: customer.credit_score,
        risk_level: customer.risk_level,
        approval_status: customer.approval_status,
        analysis_metadata: customer.analysis_metadata,
        last_analysis_date: customer.last_analysis_date,
        recovery_score: customer.recovery_score,
        recovery_class: customer.recovery_class,
        // Novos campos separados para cada tipo de analise
        restrictive_analysis_logs: customer.restrictive_analysis_logs,
        restrictive_analysis_date: customer.restrictive_analysis_date,
        behavioral_analysis_logs: customer.behavioral_analysis_logs,
        behavioral_analysis_date: customer.behavioral_analysis_date,
      }
    })

    console.log("[SERVER] getAllCustomers - Formatted customers:", formattedCustomers.length)

    return { success: true, data: formattedCustomers }
  } catch (error: any) {
    console.error("[SERVER] getAllCustomers - Error:", error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getAllCompanies() {
  try {
    console.log("[SERVER] getAllCompanies - Starting...")

    const companiesData = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .orderBy(asc(companies.name))

    console.log("[SERVER] getAllCompanies - Companies loaded:", companiesData.length)

    return { success: true, data: companiesData }
  } catch (error: any) {
    console.error("[SERVER] getAllCompanies - Error:", error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getAutomaticCollectionStats() {
  try {
    console.log("[v0] getAutomaticCollectionStats - Starting...")

    const allVmax = await db
      .select({
        id: vmax.id,
        cliente: vmax.cliente,
        approvalStatus: vmax.approvalStatus,
        autoCollectionEnabled: vmax.autoCollectionEnabled,
        collectionProcessedAt: vmax.collectionProcessedAt,
      })
      .from(vmax)

    console.log("[v0] Total VMAX records:", allVmax.length)
    console.log("[v0] VMAX with ACEITA status:", allVmax.filter((v) => v.approvalStatus === "ACEITA").length)
    console.log(
      "[v0] VMAX with auto_collection_enabled:",
      allVmax.filter((v) => v.autoCollectionEnabled).length,
    )

    // Buscar clientes elegiveis para regua automatica (ACEITA + auto_collection_enabled)
    const eligible = allVmax.filter(
      (v) => v.approvalStatus === "ACEITA" && v.autoCollectionEnabled,
    )

    console.log("[v0] Eligible for auto collection:", eligible.length)

    // Buscar ultimas acoes de cobranca automatica
    const { collectionActions } = await import("@/lib/db/schema")
    const recentActions = await db
      .select()
      .from(collectionActions)
      .where(eq(collectionActions.actionType, "auto_collection"))
      .orderBy(desc(collectionActions.createdAt))
      .limit(10)

    console.log("[v0] Recent auto collection actions:", recentActions.length)

    // Calcular estatisticas
    const notProcessed = eligible.filter((d) => !d.collectionProcessedAt)
    const alreadyProcessed = eligible.filter((d) => d.collectionProcessedAt)
    const lastExecution = recentActions[0]?.createdAt || null

    console.log(
      "[v0] Stats - eligible:",
      eligible.length,
      "notProcessed:",
      notProcessed.length,
      "alreadyProcessed:",
      alreadyProcessed.length,
    )

    return {
      eligible: eligible.length,
      notProcessed: notProcessed.length,
      alreadyProcessed: alreadyProcessed.length,
      recentActions: recentActions,
      lastExecution,
    }
  } catch (error) {
    console.error("[v0] Error fetching automatic collection stats:", error)
    return {
      eligible: 0,
      notProcessed: 0,
      alreadyProcessed: 0,
      recentActions: [],
      lastExecution: null,
    }
  }
}
