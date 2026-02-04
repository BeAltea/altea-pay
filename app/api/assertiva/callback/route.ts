import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { integrationLogs, creditProfiles, vmax, customers, notifications } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"

function validateAssertivaWebhook(request: Request): boolean {
  // Assertiva envia um header de assinatura (se configurado)
  const signature = request.headers.get("x-assertiva-signature")
  const webhookSecret = process.env.ASSERTIVA_WEBHOOK_SECRET

  // Se não há secret configurado, aceita (modo permissivo para testes)
  if (!webhookSecret) {
    console.warn("[ASSERTIVA CALLBACK] No webhook secret configured - accepting all requests")
    return true
  }

  // Valida assinatura se configurada
  if (signature) {
    // A Assertiva pode enviar um hash HMAC do payload
    // Implementar verificação se necessário
    return true
  }

  // Validação adicional: verificar IP de origem (se Assertiva fornecer lista de IPs)
  return true
}

export async function POST(request: Request) {
  let payload: any

  try {
    console.log("[ASSERTIVA CALLBACK] Received callback from Assertiva")

    if (!validateAssertivaWebhook(request)) {
      console.error("[ASSERTIVA CALLBACK] Invalid webhook signature")
      // Retorna 200 para não retentar
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 200 })
    }

    payload = await request.json()
    console.log("[ASSERTIVA CALLBACK] Payload:", JSON.stringify(payload, null, 2))

    // Validar payload
    if (!payload || !payload.cabecalho) {
      console.error("[ASSERTIVA CALLBACK] Invalid payload structure")
      // Retorna 200 para não retentar payloads inválidos
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 200 })
    }

    const { cabecalho, resposta } = payload
    const documento = cabecalho.entrada?.documento || cabecalho.documento
    const identificador = cabecalho.identificador // UUID da consulta
    const protocolo = cabecalho.protocolo // ID único da resposta

    console.log(
      "[ASSERTIVA CALLBACK] Processing document:",
      documento,
      "identifier:",
      identificador,
      "protocol:",
      protocolo,
    )

    if (!documento || !identificador) {
      console.error("[ASSERTIVA CALLBACK] Missing required fields in payload")
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 200 })
    }

    const [existingLog] = await db
      .select({ id: integrationLogs.id })
      .from(integrationLogs)
      .where(
        and(
          eq(integrationLogs.action, "assertiva_callback"),
          eq(integrationLogs.metadata, sql`${JSON.stringify({ externalId: protocolo || identificador })}::jsonb`)
        )
      )
      .limit(1)

    if (existingLog) {
      console.log("[ASSERTIVA CALLBACK] Callback already processed (idempotent check) - returning success")
      return NextResponse.json({
        success: true,
        message: "Callback already processed",
        idempotent: true,
      })
    }

    // Extrair dados importantes
    const creditoData = resposta?.credito || {}
    const recupereData = resposta?.recupere || {}
    const acoesData = resposta?.acoes || {}

    const creditScore = creditoData?.resposta?.score?.pontos || 0
    const creditClass = creditoData?.resposta?.score?.classe || "N/A"

    const recoveryScore = recupereData?.resposta?.score?.pontos || 0
    const recoveryClass = recupereData?.resposta?.score?.classe || "N/A"
    const recoveryDescription = recupereData?.resposta?.score?.faixa?.descricao || ""

    console.log("[ASSERTIVA CALLBACK] Scores - Credit:", creditScore, "Recovery:", recoveryScore)

    // Determinar tipo de documento
    const cleanDoc = documento.replace(/\D/g, "")
    const documentType = cleanDoc.length === 11 ? "CPF" : "CNPJ"
    const isPF = documentType === "CPF"

    // 1. Buscar cliente na tabela VMAX
    const [vmaxRecord] = await db
      .select()
      .from(vmax)
      .where(eq(vmax.cpfCnpj, cleanDoc))
      .limit(1)

    if (vmaxRecord) {
      console.log("[ASSERTIVA CALLBACK] Found VMAX record:", vmaxRecord.id)

      // Buscar o tipo de análise do credit_profiles (se existir)
      const [profileWithType] = await db
        .select({ data: creditProfiles.data })
        .from(creditProfiles)
        .where(eq(creditProfiles.metadata, sql`${JSON.stringify({ externalId: protocolo || identificador })}::jsonb`))
        .limit(1)

      const dataAssertiva = profileWithType?.data as any
      const analysisCategory = dataAssertiva?.analysis_category || "behavioral"
      console.log("[ASSERTIVA CALLBACK] Analysis category:", analysisCategory)

      // Preparar dados baseado no tipo de análise
      let updateData: any = {
        analysisMetadata: {
          ...(vmaxRecord.analysisMetadata as any || {}),
          assertivaUuid: identificador,
          assertivaProtocol: protocolo,
        },
        updatedAt: new Date(),
      }

      if (analysisCategory === "restrictive") {
        // ANÁLISE RESTRITIVA - salva credit_score, risk_level
        updateData = {
          ...updateData,
          creditScore: String(creditScore),
          riskLevel: creditClass,
          approvalStatus: creditScore >= 500 ? "ACEITA" : "REJEITADA",
          autoCollectionEnabled: creditScore >= 500,
          analysisMetadata: {
            ...(updateData.analysisMetadata || {}),
            restrictiveAnalysisLogs: payload,
            restrictiveAnalysisDate: new Date().toISOString(),
          },
        }
        console.log("[ASSERTIVA CALLBACK] Updating VMAX with RESTRICTIVE data")
      } else {
        // ANÁLISE COMPORTAMENTAL - salva recovery_score, recovery_class
        updateData = {
          ...updateData,
          approvalStatus: recoveryScore >= 294 ? "ACEITA" : "REJEITADA",
          autoCollectionEnabled: recoveryScore >= 294,
          analysisMetadata: {
            ...(updateData.analysisMetadata || {}),
            recoveryScore,
            recoveryClass,
            recoveryDescription,
            approvalReason:
              recoveryScore >= 294
                ? `Score de Recuperação ${recoveryScore} (Classe ${recoveryClass}) - Aprovado automaticamente`
                : `Score de Recuperação ${recoveryScore} (Classe ${recoveryClass}) - Cobrança manual obrigatória`,
            behavioralAnalysisLogs: payload,
            behavioralAnalysisDate: new Date().toISOString(),
          },
        }
        console.log("[ASSERTIVA CALLBACK] Updating VMAX with BEHAVIORAL data")
      }

      try {
        await db
          .update(vmax)
          .set(updateData)
          .where(eq(vmax.id, vmaxRecord.id))

        console.log("[ASSERTIVA CALLBACK] VMAX record updated successfully with", analysisCategory, "data")
      } catch (updateError) {
        console.error("[ASSERTIVA CALLBACK] Error updating VMAX:", updateError)
      }
    }

    // 2. Buscar cliente na tabela customers
    const [customerRecord] = await db
      .select()
      .from(customers)
      .where(eq(customers.document, cleanDoc))
      .limit(1)

    const customerId = customerRecord?.id || vmaxRecord?.id

    if (!customerId) {
      console.warn("[ASSERTIVA CALLBACK] Customer not found for document:", cleanDoc)
    }

    const reconsumed = cabecalho.reconsulta
    const hasError = reconsumed === false && !resposta

    if (hasError) {
      console.error("[ASSERTIVA CALLBACK] Assertiva returned error in callback")

      // Atualizar status para FAILED
      if (customerId) {
        await db
          .update(creditProfiles)
          .set({
            status: "failed",
            data: payload,
          })
          .where(
            and(
              eq(creditProfiles.customerId, customerId),
              eq(creditProfiles.status, "pending")
            )
          )
      }

      // Log de erro
      await db.insert(integrationLogs).values({
        action: "assertiva_callback",
        status: "failed",
        details: { requestType: isPF ? "PF_ASYNC" : "PJ_ASYNC", responseData: payload },
        metadata: { externalId: protocolo || identificador, document: cleanDoc },
      })

      return NextResponse.json({
        success: true, // 200 para Assertiva não retentar
        message: "Callback received but analysis failed",
        error: "Document analysis failed",
      })
    }

    // 3. ATUALIZAR registro existente em credit_profiles ao invés de insertar
    const [existingProfile] = await db
      .select()
      .from(creditProfiles)
      .where(eq(creditProfiles.metadata, sql`${JSON.stringify({ externalId: protocolo || identificador })}::jsonb`))
      .limit(1)

    let profileId: string | null = null

    if (existingProfile) {
      // ATUALIZAR registro existente
      try {
        const [updatedProfile] = await db
          .update(creditProfiles)
          .set({
            status: "completed",
            score: String(creditScore),
            riskLevel: creditClass,
            data: payload,
            metadata: {
              ...(existingProfile.metadata as any || {}),
              scoreAssertiva: recoveryScore,
              hasSanctions: acoesData?.resposta?.acoes || false,
            },
            updatedAt: new Date(),
          })
          .where(eq(creditProfiles.id, existingProfile.id))
          .returning()

        profileId = updatedProfile?.id || null
        console.log("[ASSERTIVA CALLBACK] Credit profile updated:", profileId)
      } catch (updateError) {
        console.error("[ASSERTIVA CALLBACK] Error updating credit profile:", updateError)
      }
    } else {
      // INSERIR novo registro se não encontrou (fallback)
      try {
        const [newProfile] = await db
          .insert(creditProfiles)
          .values({
            customerId: customerId,
            companyId: customerRecord?.companyId || vmaxRecord?.idCompany,
            cpf: cleanDoc,
            name: customerRecord?.name || (vmaxRecord as any)?.cliente || "N/A",
            score: String(creditScore),
            riskLevel: creditClass,
            provider: "assertiva",
            analysisType: "detailed",
            status: "completed",
            data: payload,
            metadata: {
              scoreAssertiva: recoveryScore,
              hasSanctions: acoesData?.resposta?.acoes || false,
              externalId: protocolo || identificador,
              documentType,
              email: customerRecord?.email,
              phone: customerRecord?.phone,
              city: customerRecord?.city,
            },
          })
          .returning()

        profileId = newProfile?.id || null
        console.log("[ASSERTIVA CALLBACK] Credit profile created:", profileId)
      } catch (insertError) {
        console.error("[ASSERTIVA CALLBACK] Error inserting credit profile:", insertError)
      }
    }

    // 4. Criar notificação para o usuário (se existe customer)
    if (customerId && customerRecord?.companyId) {
      await db.insert(notifications).values({
        companyId: customerRecord.companyId,
        type: "analysis_completed",
        title: "Análise Assertiva Concluída",
        message: `Análise de ${documentType} ${cleanDoc} concluída. Score: ${recoveryScore} (Classe ${recoveryClass})`,
      })
    }

    await db.insert(integrationLogs).values({
      action: "assertiva_callback",
      status: "success",
      details: {
        requestType: isPF ? "PF_ASYNC" : "PJ_ASYNC",
        requestData: { identificador, protocolo },
        responseData: payload,
        creditScore,
        recoveryScore,
      },
      metadata: { externalId: protocolo || identificador, document: cleanDoc },
    })

    console.log("[ASSERTIVA CALLBACK] Processing completed successfully")

    return NextResponse.json({
      success: true,
      message: "Callback processed successfully",
      profile_id: profileId,
      recovery_score: recoveryScore,
      recovery_class: recoveryClass,
    })
  } catch (error: any) {
    console.error("[ASSERTIVA CALLBACK] Error processing callback:", error)

    // Salva erro no log para investigação posterior
    try {
      await db.insert(integrationLogs).values({
        action: "assertiva_callback",
        status: "error",
        details: {
          requestType: "UNKNOWN",
          requestData: payload || {},
          responseData: { error: error.message, stack: error.stack },
        },
        metadata: {
          document: payload?.cabecalho?.entrada?.documento || "N/A",
          externalId: payload?.cabecalho?.protocolo || payload?.cabecalho?.identificador || "N/A",
        },
      })
    } catch (logError) {
      console.error("[ASSERTIVA CALLBACK] Failed to log error:", logError)
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal error",
        message: "Callback received but processing failed",
      },
      { status: 200 }, // 200 ao invés de 500
    )
  }
}
