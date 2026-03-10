import { createAdminClient, createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import {
  NEGOTIATION_REQUEST_STATUSES,
  canAdminRespondToRequest,
  calculateInstallmentAmount,
} from "@/lib/constants/negotiation-request"

export const dynamic = "force-dynamic"

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
}

interface RouteParams {
  params: Promise<{ id: string }>
}

const ASAAS_API_URL = process.env.ASAAS_API_URL || "https://api.asaas.com/v3"
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || ""

/**
 * POST /api/negotiation-requests/[id]/approve
 * Approve a negotiation request and update ASAAS payment
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

    // Only admin and super_admin can approve
    if (!["admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Apenas administradores podem aprovar solicitacoes" },
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

    // Admin can only approve requests for their company
    if (profile.role === "admin" && requestData.company_id !== profile.company_id) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403, headers: noCacheHeaders })
    }

    // Check if can be approved
    if (!canAdminRespondToRequest(requestData.status)) {
      return NextResponse.json(
        { error: "Solicitacao nao pode mais ser aprovada" },
        { status: 400, headers: noCacheHeaders }
      )
    }

    const body = await request.json()
    const adminResponse = body.admin_response || "Solicitacao aprovada"

    // Calculate new values
    const discountPercentage = requestData.requested_discount_percentage ?? requestData.original_discount_percentage ?? 0
    const installments = requestData.requested_installments ?? requestData.original_installments ?? 1
    const discountedAmount = requestData.original_amount * (1 - discountPercentage / 100)
    const installmentAmount = calculateInstallmentAmount(requestData.original_amount, discountPercentage, installments)

    // Calculate first due date (default: 7 days from now)
    const firstDueDate = requestData.requested_first_due_date ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    let newAsaasPaymentId: string | null = null
    let asaasError: string | null = null

    // If there's an existing ASAAS payment, cancel it and create a new one
    if (requestData.original_asaas_payment_id && ASAAS_API_KEY) {
      try {
        // Step 1: Get current payment details
        const paymentResponse = await fetch(
          `${ASAAS_API_URL}/payments/${requestData.original_asaas_payment_id}`,
          {
            headers: {
              "Content-Type": "application/json",
              access_token: ASAAS_API_KEY,
            },
          }
        )

        if (!paymentResponse.ok) {
          console.error("[approve] Failed to fetch original payment:", await paymentResponse.text())
          asaasError = "Falha ao buscar pagamento original no ASAAS"
        } else {
          const originalPayment = await paymentResponse.json()

          // Step 2: Cancel the original payment
          const cancelResponse = await fetch(
            `${ASAAS_API_URL}/payments/${requestData.original_asaas_payment_id}`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                access_token: ASAAS_API_KEY,
              },
            }
          )

          if (!cancelResponse.ok) {
            const cancelError = await cancelResponse.text()
            console.error("[approve] Failed to cancel payment:", cancelError)
            // Don't fail the approval if cancel fails (payment might already be paid/cancelled)
          }

          // Step 3: Create new payment with updated terms
          if (installments > 1) {
            // Create subscription for installments
            const subscriptionPayload = {
              customer: originalPayment.customer,
              billingType: originalPayment.billingType || "BOLETO",
              value: installmentAmount,
              nextDueDate: firstDueDate,
              cycle: "MONTHLY",
              maxPayments: installments,
              description: `${originalPayment.description || "Cobranca"} (Renegociado - ${discountPercentage}% desc, ${installments}x)`,
              externalReference: originalPayment.externalReference,
            }

            const subscriptionResponse = await fetch(`${ASAAS_API_URL}/subscriptions`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                access_token: ASAAS_API_KEY,
              },
              body: JSON.stringify(subscriptionPayload),
            })

            if (!subscriptionResponse.ok) {
              const subError = await subscriptionResponse.text()
              console.error("[approve] Failed to create subscription:", subError)
              asaasError = "Falha ao criar parcelamento no ASAAS"
            } else {
              const subscription = await subscriptionResponse.json()
              newAsaasPaymentId = subscription.id
              console.log("[approve] Created subscription:", subscription.id)
            }
          } else {
            // Create single payment
            const paymentPayload = {
              customer: originalPayment.customer,
              billingType: originalPayment.billingType || "BOLETO",
              value: discountedAmount,
              dueDate: firstDueDate,
              description: `${originalPayment.description || "Cobranca"} (Renegociado - ${discountPercentage}% desc)`,
              externalReference: originalPayment.externalReference,
            }

            const newPaymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                access_token: ASAAS_API_KEY,
              },
              body: JSON.stringify(paymentPayload),
            })

            if (!newPaymentResponse.ok) {
              const payError = await newPaymentResponse.text()
              console.error("[approve] Failed to create payment:", payError)
              asaasError = "Falha ao criar novo pagamento no ASAAS"
            } else {
              const newPayment = await newPaymentResponse.json()
              newAsaasPaymentId = newPayment.id
              console.log("[approve] Created payment:", newPayment.id)
            }
          }
        }
      } catch (error: any) {
        console.error("[approve] ASAAS integration error:", error)
        asaasError = error.message || "Erro na integracao com ASAAS"
      }
    }

    // Update the request status
    const { data: updatedRequest, error: updateError } = await supabase
      .from("negotiation_requests")
      .update({
        status: NEGOTIATION_REQUEST_STATUSES.APPROVED,
        admin_response: adminResponse + (asaasError ? ` (Aviso: ${asaasError})` : ""),
        responded_at: new Date().toISOString(),
        responded_by: user.id,
        new_asaas_payment_id: newAsaasPaymentId,
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("[approve] Error updating request:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500, headers: noCacheHeaders })
    }

    // Update the agreement if linked
    if (requestData.agreement_id) {
      const agreementUpdate: Record<string, any> = {
        discount_percentage: discountPercentage,
        installments: installments,
        installment_amount: installmentAmount,
        agreed_amount: discountedAmount,
        first_due_date: firstDueDate,
        updated_at: new Date().toISOString(),
      }

      if (newAsaasPaymentId) {
        agreementUpdate.asaas_payment_id = newAsaasPaymentId
        agreementUpdate.asaas_status = "PENDING"
        agreementUpdate.payment_status = "pending"
      }

      await supabase
        .from("agreements")
        .update(agreementUpdate)
        .eq("id", requestData.agreement_id)
    }

    return NextResponse.json(
      {
        request: updatedRequest,
        asaas: {
          cancelled: !!requestData.original_asaas_payment_id,
          newPaymentId: newAsaasPaymentId,
          error: asaasError,
        },
      },
      { headers: noCacheHeaders }
    )
  } catch (error: any) {
    console.error("[approve] Error:", error)
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500, headers: noCacheHeaders })
  }
}
