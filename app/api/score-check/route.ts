import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { cpf, customerId, debtId } = await request.json()

    if (!cpf && !customerId) {
      return NextResponse.json({ error: "CPF ou Customer ID obrigatório" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Buscar perfil de crédito do cliente
    let query = supabase
      .from("credit_profiles")
      .select("id, customer_id, cpf, score_assertiva, risk_level, data_assertiva, created_at")
      .order("created_at", { ascending: false })
      .limit(1)

    if (customerId) {
      query = query.eq("customer_id", customerId)
    } else if (cpf) {
      query = query.eq("cpf", cpf)
    }

    const { data: profiles, error: profileError } = await query

    if (profileError || !profiles || profiles.length === 0) {
      return NextResponse.json(
        {
          error: "Perfil de crédito não encontrado",
          risk_tier: "UNKNOWN",
        },
        { status: 404 },
      )
    }

    const profile = profiles[0]
    const score = profile.score_assertiva || 0

    let risk_tier: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM"

    if (score > 490) {
      risk_tier = "LOW" // Bom pagador
    } else if (score >= 350 && score <= 490) {
      risk_tier = "MEDIUM" // Risco médio
    } else if (score < 350) {
      risk_tier = "HIGH" // Alto risco
    }

    console.log("[v0] Score Check - CPF:", cpf, "Score:", score, "Risk Tier:", risk_tier)

    // Registrar log de decisão
    await supabase.from("integration_logs").insert({
      integration_name: "score_check",
      operation: "risk_assessment",
      request_data: { cpf, customerId, debtId, score },
      response_data: { risk_tier, score, profile_id: profile.id },
      status: "success",
    })

    return NextResponse.json({
      success: true,
      risk_tier,
      score,
      profile_id: profile.id,
      customer_id: profile.customer_id,
      risk_level: profile.risk_level,
      analysis_date: profile.created_at,
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
