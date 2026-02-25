import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    // Get authenticated user using Supabase SSR
    const supabase = await createClient()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: "Nao autorizado." }, { status: 401 })
    }

    // Use service client for cross-company queries
    const serviceSupabase = createServiceClient()

    // Get final_client profile
    const { data: profile, error: profileErr } = await serviceSupabase
      .from("final_clients")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Perfil nao encontrado." }, { status: 404 })
    }

    const cleanedDoc = profile.document_number.replace(/[^0-9]/g, "")

    console.log(`[PORTAL-DEBTS] Fetching debts for document: ${cleanedDoc}`)

    // Get all companies for mapping
    const { data: allCompanies } = await serviceSupabase
      .from("companies")
      .select("id, name")

    const companyMap = new Map(allCompanies?.map((c: any) => [c.id, c.name]) || [])

    // Find customer by document
    const { data: customer } = await serviceSupabase
      .from("customers")
      .select("id, name, document, company_id")
      .eq("document", cleanedDoc)
      .maybeSingle()

    // Find all VMAX records matching this document
    const { data: vmaxRecords } = await serviceSupabase.from("VMAX").select("*")

    const matchingVmax = (vmaxRecords || []).filter((v: any) => {
      const doc = v["CPF/CNPJ"]
      if (!doc) return false
      return doc.replace(/[^0-9]/g, "") === cleanedDoc
    })

    // Get agreements for this customer
    let agreements: any[] = []
    if (customer) {
      const { data: customerAgreements } = await serviceSupabase
        .from("agreements")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })

      agreements = customerAgreements || []
    }

    // Build enriched debts list
    const allDebts: any[] = []

    for (const vmax of matchingVmax) {
      // Parse amount
      let amount = 0
      if (vmax.Vencido) {
        const vencidoStr = String(vmax.Vencido)
        const cleanValue = vencidoStr
          .replace(/R\$/g, "")
          .replace(/\s/g, "")
          .replace(/\./g, "")
          .replace(",", ".")
        amount = parseFloat(cleanValue) || 0
      }

      // Parse days overdue
      let daysOverdue = 0
      if (vmax["Dias Inad."]) {
        daysOverdue = parseInt(String(vmax["Dias Inad."]).replace(/\D/g, "")) || 0
      }

      // Get company name
      const companyId = vmax.id_company
      const companyName = companyMap.get(companyId) || "Empresa"

      // Find relevant agreement
      const relevantAgreement = agreements.find(
        (a: any) =>
          a.asaas_status === "RECEIVED" ||
          a.asaas_status === "CONFIRMED" ||
          a.status === "completed" ||
          a.status === "active"
      ) || agreements[0]

      // Determine status from agreement/ASAAS
      let displayStatus = daysOverdue > 0 ? "overdue" : "pending"
      let asaasPaymentUrl = null
      let asaasBoletoUrl = null
      let asaasPixQrcode = null
      let asaasStatus = null

      if (relevantAgreement) {
        asaasPaymentUrl = relevantAgreement.asaas_payment_url
        asaasBoletoUrl = relevantAgreement.asaas_boleto_url
        asaasPixQrcode = relevantAgreement.asaas_pix_qrcode_url
        asaasStatus = relevantAgreement.asaas_status

        // Map ASAAS status
        if (
          asaasStatus === "RECEIVED" ||
          asaasStatus === "CONFIRMED" ||
          asaasStatus === "RECEIVED_IN_CASH"
        ) {
          displayStatus = "paid"
        } else if (asaasStatus === "OVERDUE") {
          displayStatus = "overdue"
        } else if (relevantAgreement.status === "completed") {
          displayStatus = "paid"
        } else if (relevantAgreement.status === "active" && asaasPaymentUrl) {
          displayStatus = "negotiation"
        }
      }

      allDebts.push({
        id: vmax.id,
        client_name: vmax.Cliente,
        company_id: companyId,
        company_name: companyName,
        description: `Fatura - ${vmax.Cliente || "Sem descricao"}`,
        amount,
        due_date: vmax.Vecto || new Date().toISOString(),
        days_overdue: daysOverdue,
        display_status: displayStatus,
        asaas_status: asaasStatus,
        invoice_url: asaasPaymentUrl,
        bankslip_url: asaasBoletoUrl,
        pix_qrcode: asaasPixQrcode,
        agreement_id: relevantAgreement?.id,
        agreement_status: relevantAgreement?.status,
        source: "VMAX",
      })
    }

    // Group by company
    const debtsByCompany: Record<string, any[]> = {}
    allDebts.forEach((debt) => {
      const key = debt.company_name
      if (!debtsByCompany[key]) debtsByCompany[key] = []
      debtsByCompany[key].push(debt)
    })

    // Calculate summary
    const summary = {
      total: allDebts.length,
      total_amount: allDebts.reduce((s, d) => s + (d.amount || 0), 0),
      overdue: allDebts.filter((d) => d.display_status === "overdue").length,
      overdue_amount: allDebts
        .filter((d) => d.display_status === "overdue")
        .reduce((s, d) => s + (d.amount || 0), 0),
      pending: allDebts.filter((d) => d.display_status === "pending").length,
      pending_amount: allDebts
        .filter((d) => d.display_status === "pending")
        .reduce((s, d) => s + (d.amount || 0), 0),
      paid: allDebts.filter((d) => d.display_status === "paid").length,
      paid_amount: allDebts
        .filter((d) => d.display_status === "paid")
        .reduce((s, d) => s + (d.amount || 0), 0),
      in_negotiation: allDebts.filter((d) => d.display_status === "negotiation").length,
      negotiation_amount: allDebts
        .filter((d) => d.display_status === "negotiation")
        .reduce((s, d) => s + (d.amount || 0), 0),
      companies_count: Object.keys(debtsByCompany).length,
    }

    console.log(`[PORTAL-DEBTS] Found ${allDebts.length} debts for ${profile.email}`)

    return NextResponse.json({
      profile: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        document_type: profile.document_type,
        document_number: profile.document_number,
      },
      companies: [...new Set(allDebts.map((d) => d.company_name))].map((name) => ({
        name,
        id: allDebts.find((d) => d.company_name === name)?.company_id,
      })),
      debts_by_company: debtsByCompany,
      all_debts: allDebts,
      summary,
    })
  } catch (err: any) {
    console.error("[PORTAL-DEBTS] Error:", err)
    return NextResponse.json({ error: "Erro interno." }, { status: 500 })
  }
}
