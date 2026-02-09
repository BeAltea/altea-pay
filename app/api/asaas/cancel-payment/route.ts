import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * Cancel an ASAAS payment and update the negotiation status in AlteaPay.
 * This endpoint:
 * 1. Deletes the charge on ASAAS
 * 2. Updates the agreement status to 'cancelled'
 * 3. Resets the VMAX negotiation_status back to empty/null
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agreementId, asaasPaymentId, vmaxId, companyId } = body

    console.log("=".repeat(60))
    console.log("[ASAAS Cancel] Starting cancellation...")
    console.log("[ASAAS Cancel] Input:", { agreementId, asaasPaymentId, vmaxId, companyId })

    // Validate required fields
    if (!asaasPaymentId) {
      return NextResponse.json(
        { error: "ASAAS payment ID is required" },
        { status: 400 }
      )
    }

    // Get ASAAS API key
    let apiKey = process.env.ASAAS_API_KEY

    // If companyId provided, try to get company-specific key
    if (companyId) {
      const { data: company } = await supabase
        .from("companies")
        .select("asaas_api_key")
        .eq("id", companyId)
        .single()

      if (company?.asaas_api_key) {
        apiKey = company.asaas_api_key
      }
    }

    if (!apiKey) {
      console.error("[ASAAS Cancel] No API key available")
      return NextResponse.json(
        { error: "ASAAS API key not configured" },
        { status: 500 }
      )
    }

    // 1. Delete the charge on ASAAS
    const asaasUrl = process.env.ASAAS_API_URL || "https://api.asaas.com/v3"
    const deleteResponse = await fetch(
      `${asaasUrl}/payments/${asaasPaymentId}`,
      {
        method: "DELETE",
        headers: {
          "access_token": apiKey,
          "Content-Type": "application/json",
        },
      }
    )

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json().catch(() => ({}))
      console.error("[ASAAS Cancel] Failed to delete payment:", errorData)

      // Check if it's already deleted or not found
      if (deleteResponse.status === 404) {
        console.log("[ASAAS Cancel] Payment already deleted or not found, continuing...")
      } else {
        return NextResponse.json(
          { error: `Failed to cancel on ASAAS: ${errorData.errors?.[0]?.description || deleteResponse.statusText}` },
          { status: 500 }
        )
      }
    } else {
      console.log("[ASAAS Cancel] Payment deleted from ASAAS:", asaasPaymentId)
    }

    // 2. Update agreement status if agreementId provided
    if (!agreementId) {
      console.log("[ASAAS Cancel] WARNING: No agreementId provided - agreement table NOT updated")
    }
    if (agreementId) {
      const { error: agreementError } = await supabase
        .from("agreements")
        .update({
          status: "cancelled",
          payment_status: "deleted",
          asaas_status: "DELETED",
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", agreementId)

      if (agreementError) {
        console.error("[ASAAS Cancel] Error updating agreement:", agreementError)
        // Don't fail the request, payment is already cancelled
      } else {
        console.log("[ASAAS Cancel] Agreement updated:", agreementId)
      }

      // Get the debt_id from agreement to update debt status
      const { data: agreement } = await supabase
        .from("agreements")
        .select("debt_id")
        .eq("id", agreementId)
        .single()

      if (agreement?.debt_id) {
        await supabase
          .from("debts")
          .update({
            status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", agreement.debt_id)

        console.log("[ASAAS Cancel] Debt status reset:", agreement.debt_id)
      }
    }

    // 3. Update VMAX negotiation_status back to empty if vmaxId provided
    if (!vmaxId) {
      console.log("[ASAAS Cancel] WARNING: No vmaxId provided - VMAX table NOT updated")
    }
    if (vmaxId) {
      const { error: vmaxError } = await supabase
        .from("VMAX")
        .update({
          negotiation_status: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", vmaxId)

      if (vmaxError) {
        console.error("[ASAAS Cancel] Error updating VMAX:", vmaxError)
      } else {
        console.log("[ASAAS Cancel] VMAX status reset:", vmaxId)
      }
    }

    console.log("[ASAAS Cancel] COMPLETE - All updates applied")
    console.log("=".repeat(60))

    return NextResponse.json({
      success: true,
      message: "Negotiation cancelled successfully",
      updated: {
        asaasPayment: asaasPaymentId,
        agreement: agreementId || null,
        vmax: vmaxId || null,
      }
    })

  } catch (error: any) {
    console.error("[ASAAS Cancel] Error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
