/**
 * Charge Queue API Route
 *
 * POST /api/queue/charge - Add charge creation job to queue
 *
 * CRITICAL: All charges created through this queue have
 * emailNotificationEnabled: false by default.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { queueCharge, type ChargeJobData } from "@/lib/queue"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      )
    }

    // Check if user has permission (super_admin or company_admin)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single()

    if (!profile || !["super_admin", "company_admin", "admin"].includes(profile.role || "")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão" },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.asaasCustomerId || !body.value || !body.dueDate) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios: asaasCustomerId, value, dueDate" },
        { status: 400 }
      )
    }

    const chargeData: ChargeJobData = {
      customerId: body.customerId,
      asaasCustomerId: body.asaasCustomerId,
      billingType: body.billingType || "UNDEFINED",
      value: body.value,
      dueDate: body.dueDate,
      description: body.description,
      externalReference: body.externalReference,
      installmentCount: body.installmentCount,
      installmentValue: body.installmentValue,
      metadata: {
        ...body.metadata,
        companyId: profile.company_id || body.companyId,
        userId: user.id,
      },
    }

    const job = await queueCharge(chargeData, body.priority)

    return NextResponse.json({
      success: true,
      message: "Cobrança adicionada à fila",
      jobId: job.id,
    })
  } catch (error: any) {
    console.error("[API] /api/queue/charge error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    )
  }
}
