import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { headers } from "next/headers"

/**
 * ASAAS Payment Sync Endpoint (Polling Fallback)
 *
 * This endpoint checks ASAAS for status updates on all pending/active charges.
 * Use as a fallback when webhooks fail or are delayed.
 *
 * Can be triggered by:
 * 1. Manual "Sincronizar com ASAAS" button in admin
 * 2. Cron job (e.g., every 15 minutes via Vercel Cron)
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ASAAS_BASE_URL = process.env.ASAAS_API_URL || "https://api.asaas.com/v3"

// Status that indicate the payment is still pending/active and should be synced
const SYNC_STATUSES = ["pending", "confirmed", "overdue"]

// Minimum time between syncs for the same agreement (5 minutes)
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000

// Rate limiting: max payments to sync per request
const MAX_PAYMENTS_PER_SYNC = 50

async function getBaseUrl(): Promise<string> {
  try {
    const h = await headers()
    const host = h.get("host")
    const proto = h.get("x-forwarded-proto") || "https"
    if (host) return `${proto}://${host}`
  } catch {}
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
}

interface AsaasPaymentResult {
  status: "found" | "deleted" | "error"
  data?: any
  error?: string
}

async function fetchAsaasPaymentStatus(paymentId: string): Promise<AsaasPaymentResult> {
  const baseUrl = await getBaseUrl()

  const response = await fetch(`${baseUrl}/api/asaas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: `/payments/${paymentId}`,
      method: "GET",
    }),
  })

  // Check for 404 - payment was deleted from ASAAS
  if (response.status === 404) {
    return { status: "deleted" }
  }

  if (!response.ok) {
    const error = await response.text()
    return { status: "error", error: `Failed to fetch payment ${paymentId}: ${error}` }
  }

  const data = await response.json()

  // Also check if ASAAS returns an error in the response body indicating not found
  if (data?.errors?.some((e: any) => e.code === "invalid_action" || e.description?.includes("not found"))) {
    return { status: "deleted" }
  }

  return { status: "found", data }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const results = {
    total: 0,
    synced: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  }

  try {
    // Optional: Check for cron secret or admin auth
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get("authorization")
    const isCron = authHeader === `Bearer ${cronSecret}`

    // Parse optional filters from request body
    let filters: { companyId?: string; agreementId?: string } = {}
    try {
      const body = await request.json()
      filters = body
    } catch {
      // No body or invalid JSON - that's fine
    }

    console.log("[ASAAS Sync] Starting payment sync...", filters)

    // Build query for pending/active agreements
    let query = supabase
      .from("agreements")
      .select("id, asaas_payment_id, payment_status, status, asaas_last_synced_at, company_id, debt_id, user_id, agreed_amount")
      .not("asaas_payment_id", "is", null) // Must have ASAAS payment ID
      .in("payment_status", SYNC_STATUSES)
      .order("asaas_last_synced_at", { ascending: true, nullsFirst: true })
      .limit(MAX_PAYMENTS_PER_SYNC)

    // Apply optional filters
    if (filters.companyId) {
      query = query.eq("company_id", filters.companyId)
    }
    if (filters.agreementId) {
      query = query.eq("id", filters.agreementId)
    }

    const { data: agreements, error: fetchError } = await query

    if (fetchError) {
      console.error("[ASAAS Sync] Error fetching agreements:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!agreements || agreements.length === 0) {
      console.log("[ASAAS Sync] No pending agreements to sync")
      return NextResponse.json({
        success: true,
        message: "No pending agreements to sync",
        results,
      })
    }

    results.total = agreements.length
    console.log(`[ASAAS Sync] Found ${agreements.length} agreements to check`)

    // Process each agreement
    for (const agreement of agreements) {
      try {
        // Skip if recently synced (unless explicitly requested by agreementId)
        if (!filters.agreementId && agreement.asaas_last_synced_at) {
          const lastSynced = new Date(agreement.asaas_last_synced_at).getTime()
          const timeSinceSync = Date.now() - lastSynced
          if (timeSinceSync < MIN_SYNC_INTERVAL_MS) {
            results.skipped++
            continue
          }
        }

        // Fetch current status from ASAAS
        const asaasResult = await fetchAsaasPaymentStatus(agreement.asaas_payment_id)
        results.synced++

        // Handle deleted payments (404 from ASAAS)
        if (asaasResult.status === "deleted") {
          console.log(`[ASAAS Sync] Payment ${agreement.asaas_payment_id} was DELETED from ASAAS`)

          // Mark agreement as cancelled
          const { error: cancelError } = await supabase
            .from("agreements")
            .update({
              status: "cancelled",
              payment_status: "cancelled",
              asaas_status: "DELETED",
              asaas_last_synced_at: new Date().toISOString(),
            })
            .eq("id", agreement.id)

          if (cancelError) {
            console.error(`[ASAAS Sync] Failed to cancel agreement ${agreement.id}:`, cancelError)
            results.errors.push(`${agreement.id}: ${cancelError.message}`)
          } else {
            console.log(`[ASAAS Sync] Agreement ${agreement.id} marked as cancelled (ASAAS deleted)`)
            results.updated++
          }

          // Update debt to pending (reopens the debt)
          if (agreement.debt_id) {
            await supabase
              .from("debts")
              .update({ status: "pending" })
              .eq("id", agreement.debt_id)

            // Clear VMAX negotiation_status
            const { data: debt } = await supabase
              .from("debts")
              .select("external_id")
              .eq("id", agreement.debt_id)
              .single()

            if (debt?.external_id) {
              const { error: vmaxError } = await supabase
                .from("VMAX")
                .update({ negotiation_status: null })
                .eq("id", debt.external_id)

              if (vmaxError) {
                console.error(`[ASAAS Sync] Failed to clear VMAX ${debt.external_id}:`, vmaxError)
              } else {
                console.log(`[ASAAS Sync] VMAX ${debt.external_id} negotiation_status cleared`)
              }
            }
          }

          continue // Move to next agreement
        }

        // Handle error fetching payment
        if (asaasResult.status === "error") {
          console.error(`[ASAAS Sync] Error fetching payment ${agreement.asaas_payment_id}:`, asaasResult.error)
          results.errors.push(`${agreement.id}: ${asaasResult.error}`)
          continue
        }

        const asaasPayment = asaasResult.data

        // Map ASAAS status to our payment_status
        const statusMap: Record<string, string> = {
          PENDING: "pending",
          AWAITING_RISK_ANALYSIS: "pending",
          CONFIRMED: "confirmed",
          RECEIVED: "received",
          OVERDUE: "overdue",
          REFUNDED: "refunded",
          REFUND_REQUESTED: "refund_requested",
          CHARGEBACK_REQUESTED: "chargeback_requested",
          CHARGEBACK_DISPUTE: "chargeback_dispute",
          DUNNING_RECEIVED: "received",
          DUNNING_REQUESTED: "overdue",
        }

        const newPaymentStatus = statusMap[asaasPayment.status] || agreement.payment_status

        // Check if status changed
        if (newPaymentStatus !== agreement.payment_status) {
          console.log(`[ASAAS Sync] Status changed for ${agreement.id}: ${agreement.payment_status} -> ${newPaymentStatus}`)

          // Build update object
          const agreementUpdate: Record<string, any> = {
            payment_status: newPaymentStatus,
            asaas_status: asaasPayment.status,
            asaas_last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          // Add ASAAS details
          if (asaasPayment.billingType) agreementUpdate.asaas_billing_type = asaasPayment.billingType
          if (asaasPayment.netValue) agreementUpdate.asaas_net_value = asaasPayment.netValue
          if (asaasPayment.invoiceUrl) agreementUpdate.asaas_invoice_url = asaasPayment.invoiceUrl
          if (asaasPayment.paymentDate) agreementUpdate.asaas_payment_date = asaasPayment.paymentDate

          // Handle payment received
          if (newPaymentStatus === "received") {
            agreementUpdate.status = "completed"  // Use "completed" - it's in the DB constraint
            agreementUpdate.payment_received_at = new Date().toISOString()

            console.log(`[ASAAS Sync] Payment RECEIVED for agreement ${agreement.id}, updating debt and VMAX...`)

            // Update debt to paid
            if (agreement.debt_id) {
              const { data: debtResult, error: debtError } = await supabase
                .from("debts")
                .update({ status: "paid", updated_at: new Date().toISOString() })
                .eq("id", agreement.debt_id)
                .select()

              if (debtError) {
                console.error(`[ASAAS Sync] Failed to update debt ${agreement.debt_id}:`, debtError)
              } else {
                console.log(`[ASAAS Sync] Debt ${agreement.debt_id} updated to paid:`, debtResult)
              }

              // Also update VMAX negotiation_status to reflect payment
              // Get the debt's external_id which links to VMAX
              const { data: debt } = await supabase
                .from("debts")
                .select("external_id")
                .eq("id", agreement.debt_id)
                .single()

              if (debt?.external_id) {
                const { error: vmaxError } = await supabase
                  .from("VMAX")
                  .update({ negotiation_status: "PAGO" })
                  .eq("id", debt.external_id)

                if (vmaxError) {
                  console.error(`[ASAAS Sync] Failed to update VMAX ${debt.external_id}:`, vmaxError)
                } else {
                  console.log(`[ASAAS Sync] VMAX ${debt.external_id} updated to PAGO`)
                }
              }
            }

            // Create notification
            if (agreement.user_id) {
              await supabase.from("notifications").insert({
                user_id: agreement.user_id,
                company_id: agreement.company_id,
                type: "payment",
                title: "Pagamento Confirmado",
                description: `Seu pagamento de R$ ${asaasPayment.value?.toFixed(2) || agreement.agreed_amount?.toFixed(2)} foi confirmado!`,
              })
            }
          }

          // Handle refund/delete - revert debt to open
          if (newPaymentStatus === "refunded" || asaasPayment.status === "DELETED") {
            agreementUpdate.status = "cancelled"
            if (agreement.debt_id) {
              const { error: debtError } = await supabase
                .from("debts")
                .update({ status: "pending", updated_at: new Date().toISOString() })
                .eq("id", agreement.debt_id)

              if (debtError) {
                console.error(`[ASAAS Sync] Failed to revert debt ${agreement.debt_id}:`, debtError)
              }

              // Update VMAX negotiation_status
              const { data: debt } = await supabase
                .from("debts")
                .select("external_id")
                .eq("id", agreement.debt_id)
                .single()

              if (debt?.external_id) {
                await supabase
                  .from("VMAX")
                  .update({ negotiation_status: "CANCELADA" })
                  .eq("id", debt.external_id)
              }
            }
          }

          // Update agreement
          console.log(`[ASAAS Sync] Updating agreement ${agreement.id}:`, agreementUpdate)
          const { data: updateResult, error: updateError } = await supabase
            .from("agreements")
            .update(agreementUpdate)
            .eq("id", agreement.id)
            .select()

          if (updateError) {
            console.error(`[ASAAS Sync] Failed to update agreement ${agreement.id}:`, updateError)
            results.errors.push(`${agreement.id}: ${updateError.message}`)
          } else {
            console.log(`[ASAAS Sync] Agreement ${agreement.id} updated successfully:`, updateResult)
            results.updated++
          }
        } else {
          // Status unchanged, just update sync timestamp
          await supabase
            .from("agreements")
            .update({ asaas_last_synced_at: new Date().toISOString() })
            .eq("id", agreement.id)
        }
      } catch (error: any) {
        console.error(`[ASAAS Sync] Error syncing agreement ${agreement.id}:`, error)
        results.errors.push(`${agreement.id}: ${error.message}`)
      }
    }

    const duration = Date.now() - startTime
    console.log(`[ASAAS Sync] Completed in ${duration}ms:`, results)

    return NextResponse.json({
      success: true,
      message: `Sincronizado! ${results.updated} cobrancas atualizadas`,
      results,
      duration,
    })
  } catch (error: any) {
    console.error("[ASAAS Sync] Fatal error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "ASAAS payment sync endpoint is active",
  })
}
