import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * ROBUST Cancel ASAAS Payment API
 *
 * This endpoint handles cancellation comprehensively:
 * 1. Finds agreement by multiple fields (agreementId, asaas_payment_id, or both)
 * 2. Updates agreements table -> status: 'cancelled', payment_status: 'cancelled'
 * 3. Updates debts table -> status: 'overdue'
 * 4. Finds customer -> gets external_id -> clears VMAX negotiation_status to null
 * 5. Fallback: searches VMAX by CPF if no external_id
 * 6. Deletes from ASAAS (payment + optionally customer)
 * 7. Logs EVERY step with success/error
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  console.log("=".repeat(60))
  console.log("[Cancel] === STARTING CANCEL OPERATION ===")

  try {
    const body = await request.json()
    const { agreementId, asaasPaymentId, vmaxId, companyId, customerId, debtId } = body

    console.log("[Cancel] Input params:", JSON.stringify({ agreementId, asaasPaymentId, vmaxId, companyId, customerId, debtId }, null, 2))

    // Get ASAAS API key
    let apiKey = process.env.ASAAS_API_KEY
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
      console.error("[Cancel] ERROR: No ASAAS API key available")
      return NextResponse.json({ error: "ASAAS API key not configured" }, { status: 500 })
    }
    console.log("[Cancel] ASAAS API key loaded")

    // ====== STEP 1: Find the agreement ======
    let agreement: any = null

    // Try by agreementId first
    if (agreementId) {
      const { data, error } = await supabase
        .from("agreements")
        .select("*, customers(id, document, external_id)")
        .eq("id", agreementId)
        .single()

      if (!error && data) {
        agreement = data
        console.log("[Cancel] Found agreement by ID:", agreement.id)
      } else {
        console.log("[Cancel] Agreement not found by ID:", agreementId, error?.message)
      }
    }

    // Fallback: try by asaas_payment_id
    if (!agreement && asaasPaymentId) {
      const { data, error } = await supabase
        .from("agreements")
        .select("*, customers(id, document, external_id)")
        .eq("asaas_payment_id", asaasPaymentId)
        .single()

      if (!error && data) {
        agreement = data
        console.log("[Cancel] Found agreement by asaas_payment_id:", agreement.id)
      } else {
        console.log("[Cancel] Agreement not found by asaas_payment_id:", asaasPaymentId, error?.message)
      }
    }

    if (!agreement) {
      console.error("[Cancel] ERROR: No agreement found with provided identifiers")
      // Don't fail - still try to delete from ASAAS and update VMAX
    } else {
      console.log("[Cancel] Agreement found:", {
        id: agreement.id,
        status: agreement.status,
        payment_status: agreement.payment_status,
        asaas_payment_id: agreement.asaas_payment_id,
        debt_id: agreement.debt_id,
        customer_id: agreement.customer_id,
      })
    }

    // ====== STEP 2: Delete from ASAAS ======
    const paymentIdToDelete = agreement?.asaas_payment_id || asaasPaymentId
    const asaasUrl = process.env.ASAAS_API_URL || "https://api.asaas.com/v3"

    if (paymentIdToDelete) {
      console.log("[Cancel] Deleting ASAAS payment:", paymentIdToDelete)
      try {
        const deleteResponse = await fetch(`${asaasUrl}/payments/${paymentIdToDelete}`, {
          method: "DELETE",
          headers: {
            "access_token": apiKey,
            "Content-Type": "application/json",
          },
        })

        if (deleteResponse.ok) {
          console.log("[Cancel] SUCCESS: ASAAS payment deleted")
        } else if (deleteResponse.status === 404) {
          console.log("[Cancel] ASAAS payment already deleted or not found (404)")
        } else {
          const errorData = await deleteResponse.json().catch(() => ({}))
          console.error("[Cancel] ASAAS delete failed:", deleteResponse.status, errorData)
        }
      } catch (asaasErr: any) {
        console.error("[Cancel] ASAAS delete exception:", asaasErr.message)
      }
    } else {
      console.log("[Cancel] WARNING: No ASAAS payment ID to delete")
    }

    // ====== STEP 3: Update agreement in DB ======
    if (agreement) {
      console.log("[Cancel] Updating agreement to cancelled...")
      const { error: agreementError } = await supabase
        .from("agreements")
        .update({
          status: "cancelled",
          payment_status: "cancelled",
          asaas_status: "DELETED",
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", agreement.id)

      if (agreementError) {
        console.error("[Cancel] ERROR updating agreement:", agreementError.message)
      } else {
        console.log("[Cancel] SUCCESS: Agreement updated to cancelled")
      }
    }

    // ====== STEP 4: Update debt to overdue ======
    const debtIdToUpdate = agreement?.debt_id || debtId
    if (debtIdToUpdate) {
      console.log("[Cancel] Updating debt to overdue:", debtIdToUpdate)
      const { error: debtError } = await supabase
        .from("debts")
        .update({
          status: "overdue",
          updated_at: new Date().toISOString(),
        })
        .eq("id", debtIdToUpdate)

      if (debtError) {
        console.error("[Cancel] ERROR updating debt:", debtError.message)
      } else {
        console.log("[Cancel] SUCCESS: Debt updated to overdue")
      }
    } else {
      console.log("[Cancel] WARNING: No debt_id to update")
    }

    // ====== STEP 5: Clear VMAX negotiation_status ======
    // Try multiple methods to find the VMAX record

    let vmaxUpdated = false

    // Method 1: Direct vmaxId if provided
    if (vmaxId) {
      console.log("[Cancel] Clearing VMAX by direct vmaxId:", vmaxId)
      const { error: vmaxError } = await supabase
        .from("VMAX")
        .update({ negotiation_status: null })
        .eq("id", vmaxId)

      if (vmaxError) {
        console.error("[Cancel] ERROR updating VMAX by ID:", vmaxError.message)
      } else {
        console.log("[Cancel] SUCCESS: VMAX cleared by direct ID")
        vmaxUpdated = true
      }
    }

    // Method 2: Via customer's external_id
    if (!vmaxUpdated && agreement?.customers?.external_id) {
      const externalId = agreement.customers.external_id
      console.log("[Cancel] Clearing VMAX by customer external_id:", externalId)
      const { error: vmaxError } = await supabase
        .from("VMAX")
        .update({ negotiation_status: null })
        .eq("id", externalId)

      if (vmaxError) {
        console.error("[Cancel] ERROR updating VMAX by external_id:", vmaxError.message)
      } else {
        console.log("[Cancel] SUCCESS: VMAX cleared by customer external_id")
        vmaxUpdated = true
      }
    }

    // Method 3: Via debt's external_id
    if (!vmaxUpdated && debtIdToUpdate) {
      const { data: debt } = await supabase
        .from("debts")
        .select("external_id")
        .eq("id", debtIdToUpdate)
        .single()

      if (debt?.external_id) {
        console.log("[Cancel] Clearing VMAX by debt external_id:", debt.external_id)
        const { error: vmaxError } = await supabase
          .from("VMAX")
          .update({ negotiation_status: null })
          .eq("id", debt.external_id)

        if (vmaxError) {
          console.error("[Cancel] ERROR updating VMAX by debt external_id:", vmaxError.message)
        } else {
          console.log("[Cancel] SUCCESS: VMAX cleared by debt external_id")
          vmaxUpdated = true
        }
      }
    }

    // Method 4: Search VMAX by customer CPF/CNPJ
    if (!vmaxUpdated) {
      let customerDoc: string | null = null

      // Get document from customer
      if (agreement?.customers?.document) {
        customerDoc = agreement.customers.document
      } else if (agreement?.customer_id || customerId) {
        const { data: customer } = await supabase
          .from("customers")
          .select("document")
          .eq("id", agreement?.customer_id || customerId)
          .single()

        customerDoc = customer?.document || null
      }

      if (customerDoc) {
        const normalizedDoc = customerDoc.replace(/\D/g, "")
        console.log("[Cancel] Searching VMAX by CPF/CNPJ:", normalizedDoc)

        // Search VMAX by CPF/CNPJ
        const { data: vmaxRecords, error: vmaxSearchError } = await supabase
          .from("VMAX")
          .select("id")
          .or(`"CPF/CNPJ".ilike.%${normalizedDoc}%,"CPF/CNPJ".eq.${normalizedDoc}`)
          .eq("id_company", companyId || agreement?.company_id)

        if (vmaxSearchError) {
          console.error("[Cancel] ERROR searching VMAX:", vmaxSearchError.message)
        } else if (vmaxRecords && vmaxRecords.length > 0) {
          console.log("[Cancel] Found", vmaxRecords.length, "VMAX records by CPF")
          for (const vmax of vmaxRecords) {
            const { error: updateErr } = await supabase
              .from("VMAX")
              .update({ negotiation_status: null })
              .eq("id", vmax.id)

            if (updateErr) {
              console.error("[Cancel] ERROR updating VMAX", vmax.id, ":", updateErr.message)
            } else {
              console.log("[Cancel] SUCCESS: VMAX", vmax.id, "cleared by CPF search")
              vmaxUpdated = true
            }
          }
        } else {
          console.log("[Cancel] No VMAX records found by CPF")
        }
      }
    }

    if (!vmaxUpdated) {
      console.log("[Cancel] WARNING: Could not find/update any VMAX record")
    }

    // ====== STEP 6: Optionally delete ASAAS customer ======
    // Only if we want to fully clean up (commented out for now to preserve customer for future)
    /*
    if (agreement?.asaas_customer_id) {
      console.log("[Cancel] Deleting ASAAS customer:", agreement.asaas_customer_id)
      try {
        await fetch(`${asaasUrl}/customers/${agreement.asaas_customer_id}`, {
          method: "DELETE",
          headers: { "access_token": apiKey },
        })
        console.log("[Cancel] ASAAS customer deleted")
      } catch (e: any) {
        console.log("[Cancel] ASAAS customer delete failed (may have other payments):", e.message)
      }
    }
    */

    console.log("[Cancel] === CANCEL OPERATION COMPLETE ===")
    console.log("=".repeat(60))

    return NextResponse.json({
      success: true,
      message: "Negotiation cancelled successfully",
      updated: {
        agreement: agreement?.id || null,
        asaasPayment: paymentIdToDelete || null,
        debt: debtIdToUpdate || null,
        vmax: vmaxUpdated,
      },
    })
  } catch (error: any) {
    console.error("[Cancel] FATAL ERROR:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
