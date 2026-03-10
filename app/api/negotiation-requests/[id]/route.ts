import { createAdminClient, createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import {
  NEGOTIATION_REQUEST_STATUSES,
  canUserModifyRequest,
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
 * GET /api/negotiation-requests/[id]
 * Get a single negotiation request
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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
      .select("role, company_id, cpf_cnpj")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Perfil nao encontrado" }, { status: 404, headers: noCacheHeaders })
    }

    const supabase = createAdminClient()

    const { data: requestData, error } = await supabase
      .from("negotiation_requests")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !requestData) {
      return NextResponse.json({ error: "Solicitacao nao encontrada" }, { status: 404, headers: noCacheHeaders })
    }

    // Authorization check
    if (profile.role === "admin" && requestData.company_id !== profile.company_id) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403, headers: noCacheHeaders })
    }

    if (profile.role === "user") {
      const normalizedUserDoc = (profile.cpf_cnpj || "").replace(/\D/g, "")
      const normalizedRequestDoc = (requestData.customer_document || "").replace(/\D/g, "")
      const isOwner = requestData.created_by === user.id || normalizedUserDoc === normalizedRequestDoc

      if (!isOwner) {
        return NextResponse.json({ error: "Sem permissao" }, { status: 403, headers: noCacheHeaders })
      }
    }

    return NextResponse.json({ request: requestData }, { headers: noCacheHeaders })
  } catch (error: any) {
    console.error("[negotiation-requests] Error:", error)
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500, headers: noCacheHeaders })
  }
}

/**
 * PATCH /api/negotiation-requests/[id]
 * Update a negotiation request (cancel or update justification)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
      .select("role, company_id, cpf_cnpj")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Perfil nao encontrado" }, { status: 404, headers: noCacheHeaders })
    }

    const supabase = createAdminClient()

    // Get current request
    const { data: currentRequest, error: fetchError } = await supabase
      .from("negotiation_requests")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !currentRequest) {
      return NextResponse.json({ error: "Solicitacao nao encontrada" }, { status: 404, headers: noCacheHeaders })
    }

    // Authorization check
    if (profile.role === "admin" && currentRequest.company_id !== profile.company_id) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403, headers: noCacheHeaders })
    }

    if (profile.role === "user") {
      const normalizedUserDoc = (profile.cpf_cnpj || "").replace(/\D/g, "")
      const normalizedRequestDoc = (currentRequest.customer_document || "").replace(/\D/g, "")
      const isOwner = currentRequest.created_by === user.id || normalizedUserDoc === normalizedRequestDoc

      if (!isOwner) {
        return NextResponse.json({ error: "Sem permissao" }, { status: 403, headers: noCacheHeaders })
      }

      // Users can only modify pending requests
      if (!canUserModifyRequest(currentRequest.status)) {
        return NextResponse.json(
          { error: "Solicitacao nao pode mais ser modificada" },
          { status: 400, headers: noCacheHeaders }
        )
      }
    }

    const body = await request.json()
    const updateData: Record<string, any> = {}

    // User can cancel or update justification
    if (profile.role === "user") {
      if (body.status === NEGOTIATION_REQUEST_STATUSES.CANCELLED) {
        updateData.status = NEGOTIATION_REQUEST_STATUSES.CANCELLED
      }
      if (body.customer_justification !== undefined) {
        updateData.customer_justification = body.customer_justification
      }
    }

    // Admin/super_admin can update admin_response
    if (["admin", "super_admin"].includes(profile.role)) {
      if (body.admin_response !== undefined) {
        updateData.admin_response = body.admin_response
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400, headers: noCacheHeaders })
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from("negotiation_requests")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("[negotiation-requests] Error updating:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500, headers: noCacheHeaders })
    }

    return NextResponse.json({ request: updatedRequest }, { headers: noCacheHeaders })
  } catch (error: any) {
    console.error("[negotiation-requests] Error:", error)
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500, headers: noCacheHeaders })
  }
}

/**
 * DELETE /api/negotiation-requests/[id]
 * Delete a negotiation request (only pending requests by owner or super_admin)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
      .select("role, company_id, cpf_cnpj")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Perfil nao encontrado" }, { status: 404, headers: noCacheHeaders })
    }

    const supabase = createAdminClient()

    // Get current request
    const { data: currentRequest, error: fetchError } = await supabase
      .from("negotiation_requests")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !currentRequest) {
      return NextResponse.json({ error: "Solicitacao nao encontrada" }, { status: 404, headers: noCacheHeaders })
    }

    // Only super_admin or the creator can delete
    if (profile.role !== "super_admin" && currentRequest.created_by !== user.id) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403, headers: noCacheHeaders })
    }

    // Can only delete pending requests
    if (currentRequest.status !== NEGOTIATION_REQUEST_STATUSES.PENDING) {
      return NextResponse.json(
        { error: "Apenas solicitacoes pendentes podem ser excluidas" },
        { status: 400, headers: noCacheHeaders }
      )
    }

    const { error: deleteError } = await supabase.from("negotiation_requests").delete().eq("id", id)

    if (deleteError) {
      console.error("[negotiation-requests] Error deleting:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500, headers: noCacheHeaders })
    }

    return NextResponse.json({ success: true }, { headers: noCacheHeaders })
  } catch (error: any) {
    console.error("[negotiation-requests] Error:", error)
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500, headers: noCacheHeaders })
  }
}
