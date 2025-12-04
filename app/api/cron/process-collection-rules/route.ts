import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail, generateDebtCollectionEmail } from "@/lib/notifications/email"
import { sendSMS, generateDebtCollectionSMS } from "@/lib/notifications/sms"

/**
 * Cron Job: Processa réguas de cobrança automaticamente
 * Roda a cada hora para verificar dívidas que precisam de cobrança
 */
export async function GET(request: Request) {
  // Verificar autenticação do cron (Vercel Cron Secret)
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    console.log("[v0] Starting collection rules processing...")

    // 1. Buscar todas as dívidas ativas da tabela VMAX
    const { data: debts, error: debtsError } = await supabase
      .from("VMAX")
      .select("*")
      .eq("approval_status", "ACEITA")
      .eq("auto_collection_enabled", true)
      .is("collection_processed_at", null)

    if (debtsError) {
      console.error("[v0] Error fetching debts:", debtsError)
      return NextResponse.json({ error: debtsError.message }, { status: 500 })
    }

    console.log(`[v0] Found ${debts?.length || 0} debts to process`)

    let processed = 0
    let errors = 0

    // 2. Processar cada dívida
    for (const debt of debts || []) {
      try {
        // Verificar se tem email e telefone
        if (!debt.Email && !debt.Telefone) {
          console.log(`[v0] Skipping debt ${debt.id} - no contact info`)
          continue
        }

        const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://alteapay.com"}/user-dashboard/debts/${debt.id}`

        // Enviar Email
        if (debt.Email) {
          const emailHtml = await generateDebtCollectionEmail({
            customerName: debt.Cliente || "Cliente",
            debtAmount: Number.parseFloat(debt.Vencido?.replace(/[^\d,]/g, "").replace(",", ".") || "0"),
            dueDate: new Date(debt.Vencimento).toLocaleDateString("pt-BR"),
            companyName: "VMAX",
            paymentLink,
          })

          await sendEmail({
            to: debt.Email,
            subject: "Lembrete de Cobrança - VMAX",
            html: emailHtml,
          })
        }

        // Enviar SMS
        if (debt.Telefone) {
          const smsBody = await generateDebtCollectionSMS({
            customerName: debt.Cliente || "Cliente",
            debtAmount: Number.parseFloat(debt.Vencido?.replace(/[^\d,]/g, "").replace(",", ".") || "0"),
            companyName: "VMAX",
            paymentLink,
          })

          await sendSMS({
            to: debt.Telefone,
            body: smsBody,
          })
        }

        // Marcar como processado
        await supabase.from("VMAX").update({ collection_processed_at: new Date().toISOString() }).eq("id", debt.id)

        // Registrar ação
        await supabase.from("collection_actions").insert({
          debt_id: debt.id,
          customer_id: debt.id,
          company_id: debt.id_company,
          action_type: "auto_collection",
          channel: debt.Email && debt.Telefone ? "email_sms" : debt.Email ? "email" : "sms",
          status: "sent",
          message: `Cobrança automática enviada via ${debt.Email && debt.Telefone ? "email e SMS" : debt.Email ? "email" : "SMS"}`,
        })

        processed++
        console.log(`[v0] Processed debt ${debt.id} successfully`)
      } catch (error: any) {
        console.error(`[v0] Error processing debt ${debt.id}:`, error)
        errors++
      }

      // Delay para não sobrecarregar APIs
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    return NextResponse.json({
      success: true,
      processed,
      errors,
      total: debts?.length || 0,
    })
  } catch (error: any) {
    console.error("[v0] Cron job error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
