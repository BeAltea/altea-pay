import { createAdminClient, createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // Verify the user is a super admin
    const authSupabase = await createClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
    }

    const { data: profile } = await authSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 })
    }

    const companyId = request.nextUrl.searchParams.get("companyId")
    if (!companyId) {
      return NextResponse.json({ error: "companyId obrigatorio" }, { status: 400 })
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
    const { data: agreements } = await supabase
      .from("agreements")
      .select("customer_id, status")
      .eq("company_id", companyId)
      .in("status", ["active", "draft", "pending"])

    // Load customers mapping (document -> customer id) so we can match agreements
    const { data: dbCustomers } = await supabase
      .from("customers")
      .select("id, document")
      .eq("company_id", companyId)

    // Build set of documents that have active agreements
    const customerIdToDoc = new Map<string, string>()
    for (const c of dbCustomers || []) {
      customerIdToDoc.set(c.id, c.document)
    }

    const docsWithAgreements = new Set<string>()
    for (const a of agreements || []) {
      const doc = customerIdToDoc.get(a.customer_id)
      if (doc) docsWithAgreements.add(doc)
    }

    // Also check VMAX negotiation_status field
    const customers = vmaxCustomers.map((vmax) => {
      const cpfCnpj = (vmax["CPF/CNPJ"] || "").replace(/\D/g, "")
      const vencidoStr = String(vmax.Vencido || "0")
      const totalDebt =
        Number(vencidoStr.replace(/[^\d,]/g, "").replace(",", ".")) || 0
      const diasInadStr = String(vmax["Dias Inad."] || "0")
      const daysOverdue = Number(diasInadStr.replace(/\./g, "")) || 0

      const hasActiveNegotiation =
        docsWithAgreements.has(cpfCnpj) ||
        (vmax.negotiation_status &&
          ["active", "sent", "pending", "in_negotiation"].includes(
            vmax.negotiation_status
          ))

      let status: "active" | "overdue" | "negotiating" | "paid" = "active"
      if (hasActiveNegotiation) status = "negotiating"
      else if (daysOverdue > 0) status = "overdue"

      return {
        id: vmax.id,
        name: vmax.Cliente || "Cliente",
        document: vmax["CPF/CNPJ"] || "N/A",
        city: vmax.Cidade || null,
        email: vmax.Email || null,
        phone: vmax["Telefone 1"] || vmax["Telefone 2"] || null,
        status,
        totalDebt,
        daysOverdue,
        hasActiveNegotiation: !!hasActiveNegotiation,
      }
    })

    return NextResponse.json({ customers })
  } catch (error: any) {
    console.error("[v0] Error in negotiations customers API:", error)
    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500 }
    )
  }
}
