import { createAdminClient, createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import {
  NEGOTIATION_REQUEST_STATUSES,
  canAdminRespondToRequest,
} from "@/lib/constants/negotiation-request"

export const dynamic = "force-dynamic"

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
}

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/negotiation-requests/[id]/reject
 * Reject a negotiation request
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const authSupabase = await createClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401, headers: noCacheHeaders })
    }

    const { data: profile } = await authSupabase
      .from("profiles")
      .select("role, company_id, full_name")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Perfil nao encontrado" }, { status: 404, headers: noCacheHeaders })
    }

    // Only admin and super_admin can reject
    if (!["admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Apenas administradores podem rejeitar solicitacoes" },
        { status: 403, headers: noCacheHeaders }
      )
    }

    const supabase = createAdminClient()

    // Get the request
    const { data: requestData, error: fetchError } = await supabase
      .from("negotiation_requests")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !requestData) {
      return NextResponse.json({ error: "Solicitacao nao encontrada" }, { status: 404, headers: noCacheHeaders })
    }

    // Admin can only reject requests for their company
    if (profile.role === "admin" && requestData.company_id !== profile.company_id) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403, headers: noCacheHeaders })
    }

    // Check if can be rejected
    if (!canAdminRespondToRequest(requestData.status)) {
      return NextResponse.json(
        { error: "Solicitacao nao pode mais ser rejeitada" },
        { status: 400, headers: noCacheHeaders }
      )
    }

    const body = await request.json()
    const adminResponse = body.admin_response || "Solicitacao rejeitada"

    // Update the request status
    const { data: updatedRequest, error: updateError } = await supabase
      .from("negotiation_requests")
      .update({
        status: NEGOTIATION_REQUEST_STATUSES.REJECTED,
        admin_response: adminResponse,
        responded_at: new Date().toISOString(),
        responded_by: user.id,
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("[reject] Error updating request:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500, headers: noCacheHeaders })
    }

    return NextResponse.json({ request: updatedRequest }, { headers: noCacheHeaders })
  } catch (error: any) {
    console.error("[reject] Error:", error)
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500, headers: noCacheHeaders })
  }
}
