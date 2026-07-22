import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { asaasChargeCreateQueue } from "@/lib/queue"
import type { AsaasChargeCreateJobData } from "@/lib/queue"

export const dynamic = "force-dynamic"

/**
 * Fechamento de acordo (Contrato C — roadmap-v1 WS-5).
 *
 * Chamado pelo negotiation-agent quando o cliente ACEITA uma oferta. Regra
 * NEGOCIAÇÃO-PRIMEIRO: a cobrança ASAAS só é criada AQUI, após o acordo — nunca
 * na abertura da conversa. Reusa a fila `alteapay-asaas-charge-create` (mesmo
 * caminho de batch de cobranças); o worker cria a cobrança no ASAAS e persiste
 * asaas_payment_id + URLs no agreement.
 *
 * Auth: serviço-a-serviço via header `x-agent-token` == AGENT_APP_TOKEN.
 * company_id chega no corpo, mas é validado server-side contra o registro do débito.
 */

interface CloseAgreementBody {
  company_id: string
  thread_id: string
  debt_id: string
  offer_id: string
  channel?: string
}

/** offer_id -> nº de parcelas. 'avista'/'à vista' = 1; 'parc_6' = 6; default 1. */
function installmentsFromOfferId(offerId: string): number {
  const id = (offerId || "").toLowerCase()
  const m = id.match(/(\d+)/)
  if (id.includes("parc") && m) return Math.max(1, parseInt(m[1], 10))
  return 1
}

function parseBrlAmount(raw: unknown): number {
  const s = String(raw ?? "0")
  return (
    Number(
      s.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", "."),
    ) || 0
  )
}

function dueDatePlusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

export async function POST(request: NextRequest) {
  // 1. Auth serviço-a-serviço
  const expected = process.env.AGENT_APP_TOKEN
  if (!expected) {
    console.error("[CLOSE-AGREEMENT] AGENT_APP_TOKEN não configurado")
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }
  if (request.headers.get("x-agent-token") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Body
  let body: CloseAgreementBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const { company_id, thread_id, debt_id, offer_id, channel } = body || ({} as CloseAgreementBody)
  if (!company_id || !debt_id || !offer_id) {
    return NextResponse.json(
      { error: "company_id, debt_id e offer_id são obrigatórios" },
      { status: 400 },
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Supabase credentials not configured" }, { status: 500 })
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })

  // 3. Resolver débito + cliente (debts/customers; fallback VMAX). Tudo filtrado
  //    por company_id (derivação server-side preservada).
  let amount = 0
  let customerName = "Cliente"
  let cpfCnpj = ""
  let phone = ""
  let resolvedDebtId: string | null = null
  let resolvedCustomerId: string | null = null

  const { data: debt } = await supabase
    .from("debts")
    .select("*")
    .eq("id", debt_id)
    .eq("company_id", company_id)
    .maybeSingle()

  if (debt) {
    resolvedDebtId = debt.id
    amount = Number(debt.current_amount ?? debt.amount ?? debt.original_amount ?? 0)
    if (debt.customer_id) {
      const { data: cust } = await supabase
        .from("customers")
        .select("id, name, document, phone")
        .eq("id", debt.customer_id)
        .eq("company_id", company_id)
        .maybeSingle()
      if (cust) {
        resolvedCustomerId = cust.id
        customerName = cust.name || customerName
        cpfCnpj = String(cust.document || "").replace(/\D/g, "")
        phone = String(cust.phone || "").replace(/\D/g, "")
      }
    }
  } else {
    // Fallback VMAX (isolamento por id_company; coluna "CPF/CNPJ" entre aspas).
    const { data: vmax } = await supabase
      .from("VMAX")
      .select("*")
      .eq("id", debt_id)
      .eq("id_company", company_id)
      .maybeSingle()
    if (!vmax) {
      return NextResponse.json(
        { error: `débito não encontrado para debt_id='${debt_id}' na empresa` },
        { status: 404 },
      )
    }
    amount = parseBrlAmount(vmax["Vencido"])
    customerName = vmax["Cliente"] || customerName
    cpfCnpj = String(vmax["CPF/CNPJ"] || "").replace(/\D/g, "")
    phone = String(vmax["Telefone 1"] || vmax["Telefone 2"] || "").replace(/\D/g, "")
  }

  if (amount <= 0) {
    return NextResponse.json({ error: "valor do débito inválido (<= 0)" }, { status: 422 })
  }
  if (!cpfCnpj) {
    return NextResponse.json({ error: "CPF/CNPJ do cliente ausente" }, { status: 422 })
  }

  const installments = installmentsFromOfferId(offer_id)
  const dueDate = dueDatePlusDays(3)
  const installmentAmount = amount / installments

  // 4. Criar o agreement (negociação aceita). status 'pending' até a cobrança.
  const agreementData: Record<string, any> = {
    company_id,
    debt_id: resolvedDebtId,
    customer_id: resolvedCustomerId,
    original_amount: amount,
    agreed_amount: amount,
    installments,
    installment_amount: installmentAmount,
    due_date: dueDate,
    status: "pending",
    payment_status: "pending",
    terms: `Acordo via ${channel || "whatsapp"} (thread ${thread_id}, oferta ${offer_id})`,
  }
  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .insert(agreementData)
    .select()
    .single()
  if (agreementError || !agreement) {
    console.error("[CLOSE-AGREEMENT] Falha ao criar agreement:", agreementError)
    return NextResponse.json({ error: "Falha ao criar acordo" }, { status: 500 })
  }

  // 5. Batch (total 1) + enfileirar cobrança (reuso do caminho asaas-charge-create).
  const { data: batch, error: batchError } = await supabase
    .from("asaas_batches")
    .insert({
      company_id,
      type: "charge_create",
      total_jobs: 1,
      status: "pending",
      metadata: { createdVia: "agent", thread_id, offer_id, channel: channel || "whatsapp" },
    })
    .select()
    .single()
  if (batchError || !batch) {
    console.error("[CLOSE-AGREEMENT] Falha ao criar batch:", batchError)
    return NextResponse.json({ error: "Falha ao criar batch de cobrança" }, { status: 500 })
  }

  const jobData: AsaasChargeCreateJobData = {
    batchId: batch.id,
    jobIndex: 0,
    customer: { name: customerName, cpfCnpj, mobilePhone: phone || undefined },
    payment: {
      billingType: "UNDEFINED",
      value: amount,
      dueDate,
      description: `Acordo ${agreement.id} (oferta ${offer_id})`,
      externalReference: `agreement_${agreement.id}`,
      installmentCount: installments > 1 ? installments : undefined,
      installmentValue: installments > 1 ? installmentAmount : undefined,
    },
    agreementId: agreement.id,
    debtId: resolvedDebtId || undefined,
    companyId: company_id,
    sendEmail: false,
  }
  await asaasChargeCreateQueue.add(`close-agreement-${agreement.id}`, jobData)

  console.log(`[CLOSE-AGREEMENT] agreement=${agreement.id} batch=${batch.id} enfileirado`)
  return NextResponse.json({
    success: true,
    agreement_id: agreement.id,
    batch_id: batch.id,
    installments,
    value: amount,
    // Negociação-primeiro: a cobrança é gerada de forma assíncrona; o cliente
    // recebe o link/boleto pela ASAAS (WhatsApp/SMS) quando o worker concluir.
    message: "Acordo registrado. A cobrança está sendo gerada e o cliente receberá o link de pagamento em instantes.",
  })
}
