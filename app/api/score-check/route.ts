import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { creditProfiles, integrationLogs } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { cpf, customerId, debtId } = await request.json()

    if (!cpf && !customerId) {
      return NextResponse.json({ error: "CPF ou Customer ID obrigatorio" }, { status: 400 })
    }

    // Buscar perfil de credito do cliente
    let profileResults
    if (customerId) {
      profileResults = await db
        .select({
          id: creditProfiles.id,
          customerId: creditProfiles.customerId,
          cpf: creditProfiles.cpf,
          score: creditProfiles.score,
          riskLevel: creditProfiles.riskLevel,
          metadata: creditProfiles.metadata,
          createdAt: creditProfiles.createdAt,
        })
        .from(creditProfiles)
        .where(eq(creditProfiles.customerId, customerId))
        .orderBy(desc(creditProfiles.createdAt))
        .limit(1)
    } else {
      profileResults = await db
        .select({
          id: creditProfiles.id,
          customerId: creditProfiles.customerId,
          cpf: creditProfiles.cpf,
          score: creditProfiles.score,
          riskLevel: creditProfiles.riskLevel,
          metadata: creditProfiles.metadata,
          createdAt: creditProfiles.createdAt,
        })
        .from(creditProfiles)
        .where(eq(creditProfiles.cpf, cpf))
        .orderBy(desc(creditProfiles.createdAt))
        .limit(1)
    }

    if (!profileResults || profileResults.length === 0) {
      return NextResponse.json(
        {
          error: "Perfil de credito nao encontrado",
          risk_tier: "UNKNOWN",
        },
        { status: 404 },
      )
    }

    const profile = profileResults[0]
    const score = Number(profile.score) || 0

    let risk_tier: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM"

    if (score > 490) {
      risk_tier = "LOW" // Bom pagador
    } else if (score >= 350 && score <= 490) {
      risk_tier = "MEDIUM" // Risco medio
    } else if (score < 350) {
      risk_tier = "HIGH" // Alto risco
    }

    console.log("[v0] Score Check - CPF:", cpf, "Score:", score, "Risk Tier:", risk_tier)

    // Registrar log de decisao
    await db.insert(integrationLogs).values({
      action: "risk_assessment",
      status: "success",
      details: { cpf, customerId, debtId, score, risk_tier, profile_id: profile.id } as any,
    })

    return NextResponse.json({
      success: true,
      risk_tier,
      score,
      profile_id: profile.id,
      customer_id: profile.customerId,
      risk_level: profile.riskLevel,
      analysis_date: profile.createdAt,
    })
  } catch (error: any) {
    console.error("[v0] Score Check Error:", error)

    return NextResponse.json(
      {
        error: error.message || "Erro ao verificar score",
        risk_tier: "UNKNOWN",
      },
      { status: 500 },
    )
  }
}
