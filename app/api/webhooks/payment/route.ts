import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { loadConfig, createPaymentProvider, WebhookService } from "@payment-api/index"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("[payment-api] Received webhook:", JSON.stringify(body, null, 2))

    const config = loadConfig()
    const provider = createPaymentProvider(config)
    const webhookService = new WebhookService(provider)

    const webhook = webhookService.parseWebhook(body)

    if (!webhook.payment?.id) {
      console.error("[payment-api] Invalid webhook payload - missing payment.id")
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    console.log("[payment-api] Processing event:", webhook.event, "for payment:", webhook.payment.id)

    // Find agreement by provider_payment_id
    let agreement = null
    let searchMethod = ""

    // Strategy 1: Direct provider payment ID match
    const { data: agreementByPaymentId } = await supabase
      .from("agreements")
      .select("*")
      .eq("provider_payment_id", webhook.payment.id)
      .maybeSingle()

    if (agreementByPaymentId) {
      agreement = agreementByPaymentId
      searchMethod = "provider_payment_id"
    }

    // Strategy 2: External reference with "agreement_" prefix
    if (!agreement && webhook.payment.externalReference?.startsWith("agreement_")) {
      const vmaxId = webhook.payment.externalReference.replace("agreement_", "")

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

    // Strategy 3: Search by provider customer ID
    if (!agreement && webhook.payment.customer) {
      const { data: agreementByCustomer } = await supabase
        .from("agreements")
        .select("*")
        .eq("provider_customer_id", webhook.payment.customer)
        .eq("agreed_amount", webhook.payment.value)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (agreementByCustomer) {
        agreement = agreementByCustomer
        searchMethod = "provider_customer_id_and_amount"

        // Update with payment ID for future lookups
        await supabase
          .from("agreements")
          .update({ provider_payment_id: webhook.payment.id })
          .eq("id", agreementByCustomer.id)
      }
    }

    if (!agreement) {
      console.error("[payment-api] Agreement not found for payment:", webhook.payment.id)
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 })
    }

    console.log("[payment-api] Found agreement:", agreement.id, "via:", searchMethod)

    // Derive status updates
    const statusUpdate = webhookService.deriveStatusUpdate(
      webhook.event,
      agreement.payment_status,
      agreement.status
    )

    // If payment received, update debt and send notification
    if (webhook.event === "PAYMENT_RECEIVED") {
      await supabase.from("debts").update({ status: "paid" }).eq("id", agreement.debt_id)

      if (agreement.user_id) {
        await supabase.from("notifications").insert({
          user_id: agreement.user_id,
          company_id: agreement.company_id,
          type: "payment",
          title: "Pagamento Confirmado",
          description: `Seu pagamento de R$ ${agreement.agreed_amount?.toFixed(2)} foi confirmado com sucesso!`,
        })
      }
    }

    // Update agreement
    const { error: updateError } = await supabase
      .from("agreements")
      .update(statusUpdate)
      .eq("id", agreement.id)

    if (updateError) {
      console.error("[payment-api] Error updating agreement:", updateError)
      throw updateError
    }

    console.log("[payment-api] Agreement updated successfully:", agreement.id, {
      paymentStatus: statusUpdate.payment_status,
      agreementStatus: statusUpdate.status,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[payment-api] Error processing webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
