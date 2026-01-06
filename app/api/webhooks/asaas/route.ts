import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("[v0] Received Asaas webhook:", JSON.stringify(body, null, 2))

    const event = body.event
    const payment = body.payment

    if (!payment?.id) {
      console.error("[v0] Invalid webhook payload - missing payment.id")
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    console.log("[v0] Processing event:", event, "for payment:", payment.id)
    console.log("[v0] Payment details:", {
      description: payment.description,
      externalReference: payment.externalReference,
      customer: payment.customer,
      value: payment.value,
    })

    let agreement = null
    let searchMethod = ""

    // Strategy 1: Direct payment ID match (most reliable)
    const { data: agreementByPaymentId } = await supabase
      .from("agreements")
      .select("*")
      .eq("asaas_payment_id", payment.id)
      .maybeSingle()

    if (agreementByPaymentId) {
      agreement = agreementByPaymentId
      searchMethod = "payment_id"
    }

    // Strategy 2: Subscription ID (for installment payments)
    if (!agreement && payment.subscription) {
      const { data: agreementBySubscription } = await supabase
        .from("agreements")
        .select("*")
        .eq("asaas_subscription_id", payment.subscription)
        .maybeSingle()

      if (agreementBySubscription) {
        agreement = agreementBySubscription
        searchMethod = "subscription_id"
      }
    }

    // Strategy 3: External reference with "agreement_" prefix
    if (!agreement && payment.externalReference?.startsWith("agreement_")) {
      const vmaxId = payment.externalReference.replace("agreement_", "")

      const { data: agreementByExternalRef } = await supabase
        .from("agreements")
        .select(`
          *,
          debts!inner(external_id)
        `)
        .eq("debts.external_id", vmaxId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (agreementByExternalRef) {
        agreement = agreementByExternalRef
        searchMethod = "external_reference"
      }
    }

    // Strategy 4: Search by Asaas customer ID
    if (!agreement && payment.customer) {
      const { data: agreementByCustomer } = await supabase
        .from("agreements")
        .select("*")
        .eq("asaas_customer_id", payment.customer)
        .eq("agreed_amount", payment.value)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (agreementByCustomer) {
        agreement = agreementByCustomer
        searchMethod = "customer_id_and_amount"

        // Update with payment ID for future lookups
        await supabase.from("agreements").update({ asaas_payment_id: payment.id }).eq("id", agreementByCustomer.id)
      }
    }

    // If no agreement found, check if this is a platform subscription payment (not debt agreement)
    if (!agreement) {
      console.log("[v0] No agreement found. Checking if this is a platform subscription...")

      // Platform subscriptions have descriptions like "Plano Premium", "Plano Básico", etc.
      const isPlatformSubscription =
        payment.description?.toLowerCase().includes("plano") ||
        payment.description?.toLowerCase().includes("assinatura")

      if (isPlatformSubscription) {
        console.log("[v0] This is a platform subscription payment, not a debt agreement. Ignoring.")
        return NextResponse.json({
          success: true,
          message: "Platform subscription payment - no action needed",
        })
      }

      console.error("[v0] Agreement not found for payment:", payment.id)
      console.error("[v0] Tried all search strategies: payment_id, subscription_id, external_reference, customer_id")
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 })
    }

    console.log("[v0] Found agreement:", agreement.id, "via:", searchMethod)

    // Update agreement status based on payment event
    let paymentStatus = agreement.payment_status
    let agreementStatus = agreement.status

    switch (event) {
      case "PAYMENT_CREATED":
        paymentStatus = "pending"
        break

      case "PAYMENT_CONFIRMED":
        paymentStatus = "confirmed"
        break

      case "PAYMENT_RECEIVED":
        paymentStatus = "received"
        agreementStatus = "paid"

        // Update debt status to paid
        await supabase.from("debts").update({ status: "paid" }).eq("id", agreement.debt_id)

        // Create notification for customer
        if (agreement.user_id) {
          await supabase.from("notifications").insert({
            user_id: agreement.user_id,
            company_id: agreement.company_id,
            type: "payment",
            title: "Pagamento Confirmado",
            description: `Seu pagamento de R$ ${agreement.agreed_amount?.toFixed(2)} foi confirmado com sucesso!`,
          })
        }

        console.log("[v0] Payment received for agreement:", agreement.id)
        break

      case "PAYMENT_OVERDUE":
        paymentStatus = "overdue"
        break

      case "PAYMENT_REFUNDED":
        paymentStatus = "refunded"
        agreementStatus = "cancelled"
        break

      case "PAYMENT_DELETED":
        agreementStatus = "cancelled"
        break
    }

    // Update agreement
    const { error: updateError } = await supabase
      .from("agreements")
      .update({
        payment_status: paymentStatus,
        status: agreementStatus,
        ...(event === "PAYMENT_RECEIVED" && {
          payment_received_at: new Date().toISOString(),
        }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", agreement.id)

    if (updateError) {
      console.error("[v0] Error updating agreement:", updateError)
      throw updateError
    }

    console.log("[v0] Agreement updated successfully:", agreement.id, {
      paymentStatus,
      agreementStatus,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error processing Asaas webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
