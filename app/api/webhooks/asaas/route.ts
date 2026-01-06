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

    console.log("[v0] Searching for agreement with payment ID:", payment.id)

    // First, try by asaas_payment_id
    let { data: agreement, error: agreementError } = await supabase
      .from("agreements")
      .select("*")
      .eq("asaas_payment_id", payment.id)
      .single()

    // If not found, try by subscription (for installment payments)
    if (agreementError || !agreement) {
      console.log("[v0] Not found by payment_id, trying by subscription...")
      const result = await supabase
        .from("agreements")
        .select("*")
        .eq("asaas_subscription_id", payment.subscription)
        .single()

      agreement = result.data
      agreementError = result.error
    }

    // If still not found, try by external reference
    if (agreementError || !agreement) {
      console.log("[v0] Not found by subscription, trying by external reference...")
      const externalRef = payment.externalReference
      if (externalRef) {
        const vmaxId = externalRef.replace("agreement_", "")
        const result = await supabase
          .from("agreements")
          .select(`
            *,
            debts!inner(external_id)
          `)
          .eq("debts.external_id", vmaxId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        agreement = result.data
        agreementError = result.error
      }
    }

    if (agreementError || !agreement) {
      console.error("[v0] Agreement not found for payment:", payment.id, "Error:", agreementError)
      console.error("[v0] Tried: payment_id, subscription, external_reference")
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 })
    }

    console.log("[v0] Found agreement:", agreement.id, "Processing event:", event)

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
