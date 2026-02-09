import { createAdminClient, createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
}

export async function GET(request: NextRequest) {
  try {
    // Verify the user is a super admin
    const authSupabase = await createClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401, headers: noCacheHeaders })
    }

    const { data: profile } = await authSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403, headers: noCacheHeaders })
    }

    const companyId = request.nextUrl.searchParams.get("companyId")
    if (!companyId) {
      return NextResponse.json({ error: "companyId obrigatorio" }, { status: 400, headers: noCacheHeaders })
    }

    const supabase = createAdminClient()

    // Load all VMAX customers for this company with pagination
    let vmaxCustomers: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data: vmaxPage, error } = await supabase
        .from("VMAX")
        .select("*")
        .eq("id_company", companyId)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) {
        console.error("[v0] VMAX fetch error:", error.message)
        break
      }

      if (vmaxPage && vmaxPage.length > 0) {
        vmaxCustomers = [...vmaxCustomers, ...vmaxPage]
        page++
        hasMore = vmaxPage.length === pageSize
      } else {
        hasMore = false
      }
    }

    // Load existing agreements for this company to check negotiation status
    // Include "completed" for paid and "cancelled" for cancelled negotiations
    const { data: agreements } = await supabase
      .from("agreements")
      .select("id, customer_id, status, payment_status, asaas_status, asaas_payment_id")
      .eq("company_id", companyId)
      .in("status", ["active", "draft", "pending", "completed", "cancelled"])

    // Load customers mapping (document -> customer data) so we can match agreements and get contact info
    const { data: dbCustomers } = await supabase
      .from("customers")
      .select("id, document, email, phone")
      .eq("company_id", companyId)

    // Build maps for document -> customer id and document -> contact info
    // IMPORTANT: All documents must be normalized (digits only) for consistent lookups
    const customerIdToNormalizedDoc = new Map<string, string>()
    const docToContactInfo = new Map<string, { email: string | null; phone: string | null }>()
    for (const c of dbCustomers || []) {
      const normalizedDoc = (c.document || "").replace(/\D/g, "")
      if (normalizedDoc) {
        customerIdToNormalizedDoc.set(c.id, normalizedDoc)
        docToContactInfo.set(normalizedDoc, { email: c.email, phone: c.phone })
      }
    }

    // Build maps for agreement status by customer document (normalized)
    const docsWithActiveAgreements = new Set<string>()
    const docsWithPaidAgreements = new Set<string>()
    const docsWithCancelledAgreements = new Set<string>() // Cancelled negotiations
    const docsWithAnyNegotiation = new Set<string>() // Any negotiation sent (active or paid, NOT cancelled)
    const docToCancelledCount = new Map<string, number>() // Count of cancelled agreements per customer
    const docToPaymentStatus = new Map<string, {
      paymentStatus: string | null;
      asaasStatus: string | null;
      agreementId: string | null;
      asaasPaymentId: string | null;
      agreementStatus: string | null;
    }>()
    for (const a of agreements || []) {
      const normalizedDoc = customerIdToNormalizedDoc.get(a.customer_id)
      if (normalizedDoc) {
        if (a.status === "cancelled") {
          docsWithCancelledAgreements.add(normalizedDoc)
          // Increment cancelled count for this customer
          docToCancelledCount.set(normalizedDoc, (docToCancelledCount.get(normalizedDoc) || 0) + 1)
          // Only track as "any negotiation" if not cancelled (cancelled = can send again)
        } else {
          docsWithAnyNegotiation.add(normalizedDoc) // Track active/pending/completed negotiations
          if (a.status === "completed") {
            docsWithPaidAgreements.add(normalizedDoc)
          } else {
            docsWithActiveAgreements.add(normalizedDoc)
          }
        }
        // Store the payment status for this customer (latest agreement takes precedence)
        // Only store if this is the latest non-cancelled agreement OR there's no active agreement
        const existingStatus = docToPaymentStatus.get(normalizedDoc)
        if (!existingStatus || a.status !== "cancelled") {
          docToPaymentStatus.set(normalizedDoc, {
            paymentStatus: a.payment_status || null,
            asaasStatus: a.asaas_status || null,
            agreementId: a.id || null,
            asaasPaymentId: a.asaas_payment_id || null,
            agreementStatus: a.status || null,
          })
        }
      }
    }

    // Also check VMAX negotiation_status field
    const customers = vmaxCustomers.map((vmax) => {
      const cpfCnpj = (vmax["CPF/CNPJ"] || "").replace(/\D/g, "")
      const vencidoStr = String(vmax.Vencido || "0")
      const totalDebt =
        Number(vencidoStr.replace(/[^\d,]/g, "").replace(",", ".")) || 0
      const diasInadStr = String(vmax["Dias Inad."] || "0")
      const daysOverdue = Number(diasInadStr.replace(/\./g, "")) || 0

      // Check if this customer's last agreement was cancelled
      const isCancelled = docsWithCancelledAgreements.has(cpfCnpj) &&
        !docsWithActiveAgreements.has(cpfCnpj) &&
        !docsWithPaidAgreements.has(cpfCnpj)

      // Check if paid (VMAX status or agreement status)
      const isPaid =
        docsWithPaidAgreements.has(cpfCnpj) ||
        vmax.negotiation_status === "PAGO"

      // Check if ANY negotiation was sent (paid or active, NOT cancelled) - for "Status Negociação" column
      // Cancelled negotiations should NOT count as "Enviada"
      const hasNegotiation =
        !isCancelled && (
          docsWithAnyNegotiation.has(cpfCnpj) ||
          (vmax.negotiation_status &&
            ["active", "sent", "pending", "in_negotiation", "PAGO"].includes(
              vmax.negotiation_status
            ))
        )

      // Check if has active negotiation (not paid, not cancelled) - for filtering
      const hasActiveNegotiation =
        !isPaid && !isCancelled && (
          docsWithActiveAgreements.has(cpfCnpj) ||
          (vmax.negotiation_status &&
            ["active", "sent", "pending", "in_negotiation"].includes(
              vmax.negotiation_status
            ))
        )

      let status: "active" | "overdue" | "negotiating" | "paid" = "active"
      if (isPaid) status = "paid"
      else if (hasActiveNegotiation) status = "negotiating"
      else if (daysOverdue > 0) status = "overdue"

      // Get contact info from customers table if VMAX doesn't have it
      const contactInfo = docToContactInfo.get(cpfCnpj)
      const email = vmax.Email || contactInfo?.email || null
      const phone = vmax["Telefone 1"] || vmax["Telefone 2"] || contactInfo?.phone || null

      // Get payment status from agreement
      const paymentInfo = docToPaymentStatus.get(cpfCnpj)

      return {
        id: vmax.id,
        name: vmax.Cliente || "Cliente",
        document: vmax["CPF/CNPJ"] || "N/A",
        city: vmax.Cidade || null,
        email,
        phone,
        status,
        totalDebt, // Always return original debt value
        originalDebt: totalDebt, // Keep original for reference
        daysOverdue: isPaid ? 0 : daysOverdue,
        hasNegotiation: !!hasNegotiation, // Any negotiation sent (for "Enviada" status)
        hasActiveNegotiation: !!hasActiveNegotiation, // Active (non-paid) negotiation
        isPaid: !!isPaid,
        isCancelled: !!isCancelled, // Was cancelled (can send new negotiation)
        cancelledCount: docToCancelledCount.get(cpfCnpj) || 0, // Number of cancelled negotiations
        paymentStatus: paymentInfo?.paymentStatus || null,
        asaasStatus: paymentInfo?.asaasStatus || null,
        agreementStatus: paymentInfo?.agreementStatus || null,
        agreementId: paymentInfo?.agreementId || null,
        asaasPaymentId: paymentInfo?.asaasPaymentId || null,
      }
    })

    return NextResponse.json({ customers }, { headers: noCacheHeaders })
  } catch (error: any) {
    console.error("[v0] Error in negotiations customers API:", error)
    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500, headers: noCacheHeaders }
    )
  }
}
