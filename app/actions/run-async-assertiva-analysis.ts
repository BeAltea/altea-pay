"use server"

import { db } from "@/lib/db"
import { customers, vmax, creditProfiles, integrationLogs } from "@/lib/db/schema"
import { eq, desc, sql } from "drizzle-orm"

interface AsyncAnalysisParams {
  documento: string
  identificador?: string
  tipo: "pf" | "pj"
  customerId?: string
  companyId?: string
  consultasAdicionais?: string[]
  analysisType?: "restrictive" | "behavioral" // Tipo de analise: restritiva ou comportamental
}

export async function runAsyncAssertivaAnalysis(params: AsyncAnalysisParams) {
  try {
    console.log("[RUN ASYNC ANALYSIS] Starting analysis for:", params.documento, "type:", params.tipo)

    const { documento, tipo, identificador, customerId, companyId, consultasAdicionais, analysisType = "behavioral" } = params

    const cleanDoc = documento.replace(/\D/g, "")

    let finalCompanyId = companyId

    if (!finalCompanyId && customerId) {
      // Primeiro tentar na tabela customers
      const [customerData] = await db
        .select({ companyId: customers.companyId })
        .from(customers)
        .where(eq(customers.id, customerId))
        .limit(1)

      if (customerData?.companyId) {
        finalCompanyId = customerData.companyId
        console.log("[RUN ASYNC ANALYSIS] company_id found in customers:", finalCompanyId)
      }

      // Se nao encontrou, buscar na tabela VMAX pelo ID
      if (!finalCompanyId) {
        const [vmaxData] = await db
          .select({ idCompany: vmax.idCompany })
          .from(vmax)
          .where(eq(vmax.id, customerId))
          .limit(1)

        if (vmaxData?.idCompany) {
          finalCompanyId = vmaxData.idCompany
          console.log("[RUN ASYNC ANALYSIS] company_id found in VMAX:", finalCompanyId)
        }
      }
    }

    // Tentar buscar na tabela customers primeiro
    if (!finalCompanyId) {
      const [customerData] = await db
        .select({ companyId: customers.companyId })
        .from(customers)
        .where(eq(customers.document, cleanDoc))
        .limit(1)

      if (customerData?.companyId) {
        finalCompanyId = customerData.companyId
        console.log("[RUN ASYNC ANALYSIS] company_id found in customers:", finalCompanyId)
      }

      // Se nao encontrou, buscar na tabela VMAX
      if (!finalCompanyId) {
        const [vmaxData] = await db
          .select({ idCompany: vmax.idCompany })
          .from(vmax)
          .where(eq(vmax.cpfCnpj, cleanDoc))
          .limit(1)

        if (vmaxData?.idCompany) {
          finalCompanyId = vmaxData.idCompany
          console.log("[RUN ASYNC ANALYSIS] company_id found in VMAX:", finalCompanyId)
        }
      }
    }

    console.log("[RUN ASYNC ANALYSIS] Final company_id:", finalCompanyId)

    if (!finalCompanyId) {
      throw new Error("Cliente nao encontrado no sistema. Importe o cliente antes de fazer a analise.")
    }

    // Validar documento
    if (tipo === "pf" && cleanDoc.length !== 11) {
      throw new Error("CPF invalido")
    }
    if (tipo === "pj" && cleanDoc.length !== 14) {
      throw new Error("CNPJ invalido")
    }

    const baseUrl = process.env.ASSERTIVA_BASE_URL
    const clientId = process.env.ASSERTIVA_CLIENT_ID
    const clientSecret = process.env.ASSERTIVA_CLIENT_SECRET
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://alteapay.com"

    if (!baseUrl || !clientId || !clientSecret) {
      throw new Error("Credenciais da Assertiva nao configuradas")
    }

    console.log("[RUN ASYNC ANALYSIS] Generating OAuth token...")
    const tokenResponse = await fetch(`${baseUrl}/oauth2/v3/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    })

    if (!tokenResponse.ok) {
      throw new Error(`Erro ao gerar token: ${tokenResponse.statusText}`)
    }

    const { access_token } = await tokenResponse.json()
    console.log("[RUN ASYNC ANALYSIS] Token generated successfully")

    const callbackUrl = `${appUrl.replace(/\/$/, "")}/api/assertiva/callback`

    const generatedId = identificador || `${tipo}_${cleanDoc}_${Date.now()}`
    const payload = [
      {
        urlEntregaResultado: callbackUrl,
        identificador: generatedId,
        doc: cleanDoc,
        idFinalidade: 2,
        consultasAdicionais: consultasAdicionais || [],
      },
    ]

    const endpoint = tipo === "pf" ? `${baseUrl}/credito/v1/pf` : `${baseUrl}/credito/v1/pj`

    console.log("[RUN ASYNC ANALYSIS] Calling Assertiva API:", endpoint)
    console.log("[RUN ASYNC ANALYSIS] Payload:", JSON.stringify(payload, null, 2))

    const startTime = Date.now()
    const analysisResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify(payload),
    })

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text()
      console.error("[RUN ASYNC ANALYSIS] API Error:", errorText)
      throw new Error(`Erro na API Assertiva: ${analysisResponse.statusText}`)
    }

    const result = await analysisResponse.json()
    console.log("[RUN ASYNC ANALYSIS] API Response:", JSON.stringify(result, null, 2))

    if (!result?.success || !Array.isArray(result.body) || !result.body[0]?.uuid) {
      throw new Error("Falha ao enviar analise para fila")
    }

    const uuid = result.body[0].uuid
    const identificadorResponse = result.body[0].identificador
    const message = result.body[0].mensagem || "Consulta enviada para processamento"
    const duration = Date.now() - startTime

    console.log("[RUN ASYNC ANALYSIS] Analysis queued successfully. UUID:", uuid)

    console.log("[RUN ASYNC ANALYSIS] Saving to integration_logs...")
    await db.insert(integrationLogs).values({
      companyId: finalCompanyId,
      action: `assertiva_${tipo}_async`,
      status: "success",
      details: {
        uuid,
        identificador: identificadorResponse,
        message,
        tipo,
        documento: cleanDoc,
        endpoint,
        cpf: cleanDoc,
        duration_ms: duration,
      },
    })
    console.log("[RUN ASYNC ANALYSIS] integration_logs saved successfully")

    console.log("[RUN ASYNC ANALYSIS] Saving to credit_profiles...")
    console.log("[RUN ASYNC ANALYSIS] Data:", {
      companyId: finalCompanyId,
      customerId: customerId || null,
      cpf: cleanDoc,
      document_type: tipo === "pf" ? "CPF" : "CNPJ",
    })

    await db
      .insert(creditProfiles)
      .values({
        companyId: finalCompanyId,
        customerId: customerId || null,
        cpf: cleanDoc,
        provider: "assertiva",
        analysisType: "detailed",
        status: "pending",
        metadata: {
          uuid,
          identificador: identificadorResponse,
          queued_at: new Date().toISOString(),
          analysis_category: analysisType,
          document_type: tipo === "pf" ? "CPF" : "CNPJ",
          external_id: identificadorResponse,
        },
      })
      .onConflictDoNothing()

    console.log("[RUN ASYNC ANALYSIS] credit_profiles saved successfully")

    return {
      success: true,
      message: "Analise enviada para processamento assincrono",
      uuid,
      identificador: identificadorResponse,
      estimatedTime: "2-5 minutos",
    }
  } catch (error: any) {
    console.error("[RUN ASYNC ANALYSIS] Error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

export async function checkAsyncAnalysisStatus(identificador: string) {
  try {
    const [profile] = await db
      .select()
      .from(creditProfiles)
      .where(
        sql`${creditProfiles.metadata}->>'external_id' = ${identificador}`,
      )
      .orderBy(desc(creditProfiles.createdAt))
      .limit(1)

    if (!profile) {
      throw new Error("Analysis not found")
    }

    return {
      success: true,
      status: profile.status,
      data: profile,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
}
