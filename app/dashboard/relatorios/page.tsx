import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminRelatoriosContent } from "@/components/dashboard/admin-relatorios-content"

export const dynamic = "force-dynamic"

export default async function RelatoriosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single()

  if (!profile?.company_id) {
    return (
      <div
        className="p-6 rounded-xl"
        style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
      >
        <p style={{ color: "var(--admin-text-secondary)" }}>
          Empresa nao encontrada para o usuario
        </p>
      </div>
    )
  }

  const companyId = profile.company_id

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .single()

  // Fetch all VMAX records for stats
  let vmaxRecords: any[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data: pageData } = await supabase
      .from("VMAX")
      .select("*")
      .eq("id_company", companyId)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (!pageData || pageData.length === 0) break
    vmaxRecords = [...vmaxRecords, ...pageData]
    if (pageData.length < pageSize) break
    page++
  }

  // Fetch ALL agreements for this company (including cancelled for stats)
  const { data: agreements } = await supabase
    .from("agreements")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  // Fetch customers table to map customer_id -> document
  const customerIds = [...new Set((agreements || []).map(a => a.customer_id).filter(Boolean))]
  const customerDocMap = new Map<string, string>()

  if (customerIds.length > 0) {
    const { data: customersData } = await supabase
      .from("customers")
      .select("id, document")
      .in("id", customerIds)

    if (customersData) {
      customersData.forEach((c: any) => {
        const normalizedDoc = (c.document || "").replace(/\D/g, "")
        if (normalizedDoc) {
          customerDocMap.set(c.id, normalizedDoc)
        }
      })
    }
  }

  // Build maps from normalized document -> agreement status
  // This matches Super Admin's logic exactly
  const docToStatus = new Map<string, {
    hasAgreement: boolean
    hasActiveAgreement: boolean
    isPaid: boolean
    isCancelled: boolean
    agreedAmount: number
  }>()

  for (const a of agreements || []) {
    const normalizedDoc = customerDocMap.get(a.customer_id)
    if (!normalizedDoc) continue

    const existing = docToStatus.get(normalizedDoc) || {
      hasAgreement: false,
      hasActiveAgreement: false,
      isPaid: false,
      isCancelled: false,
      agreedAmount: 0,
    }

    if (a.status === "cancelled") {
      existing.isCancelled = true
    } else {
      existing.hasAgreement = true
      existing.hasActiveAgreement = true
      existing.agreedAmount = Math.max(existing.agreedAmount, Number(a.agreed_amount) || 0)

      // Check if paid
      if (a.payment_status === "received" || a.payment_status === "confirmed" || a.status === "completed") {
        existing.isPaid = true
      }
    }

    docToStatus.set(normalizedDoc, existing)
  }

  // Count VMAX customers by their negotiation status (not agreement records)
  let vmaxWithActiveNegotiation = 0
  let vmaxWithPaidNegotiation = 0
  let vmaxWithoutNegotiation = 0
  let totalRecoveredValue = 0

  vmaxRecords.forEach((vmax: any) => {
    const cpfCnpj = (vmax["CPF/CNPJ"] || "").replace(/\D/g, "")
    const status = docToStatus.get(cpfCnpj)

    if (status?.isPaid) {
      vmaxWithPaidNegotiation++
      totalRecoveredValue += status.agreedAmount
    } else if (status?.hasActiveAgreement) {
      vmaxWithActiveNegotiation++
    } else {
      vmaxWithoutNegotiation++
    }
  })

  // Total VMAX customers with any non-cancelled negotiation = 215 (matches Super Admin)
  const totalWithNegotiation = vmaxWithActiveNegotiation + vmaxWithPaidNegotiation

  // Calculate total debt value
  const totalDebtValue = vmaxRecords.reduce((sum, r) => {
    const vencidoStr = String(r.Vencido || "0")
    const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
    return sum + (Number(cleanValue) || 0)
  }, 0)

  // Build customer name lookup for recent negotiations
  let customerNameMap = new Map<string, { name: string | null; cpfCnpj: string | null }>()
  const agreementCustomerIds = [...new Set((agreements || []).map((a: any) => a.customer_id).filter(Boolean))]

  if (agreementCustomerIds.length > 0) {
    // First try VMAX table
    const { data: vmaxCustomers } = await supabase
      .from("VMAX")
      .select("id, Cliente, \"CPF/CNPJ\"")
      .in("id", agreementCustomerIds)

    if (vmaxCustomers) {
      vmaxCustomers.forEach((c: any) => {
        customerNameMap.set(c.id, { name: c.Cliente, cpfCnpj: c["CPF/CNPJ"] })
      })
    }

    // For any customer_ids not found in VMAX, try customers table
    const missingIds = agreementCustomerIds.filter(id => !customerNameMap.has(id))
    if (missingIds.length > 0) {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, document")
        .in("id", missingIds)

      if (customers) {
        customers.forEach((c: any) => {
          customerNameMap.set(c.id, { name: c.name, cpfCnpj: c.document })
        })
      }
    }
  }

  // Calculate report data - counting VMAX customers (not agreement records)
  const reportData = {
    // Live stats
    totalDebts: vmaxRecords.length,
    totalDebtValue,
    // Count VMAX customers with active negotiations (matches Super Admin's 215)
    activeNegotiations: totalWithNegotiation,
    recoveryRate: totalDebtValue > 0 ? (totalRecoveredValue / totalDebtValue) * 100 : 0,

    // Debt by status - count VMAX customers (not agreement records)
    debtsByStatus: {
      // "Em aberto" = VMAX customers without any negotiation
      em_aberto: vmaxWithoutNegotiation,
      // "Em negociação" = VMAX customers with active (unpaid) negotiation
      em_negociacao: vmaxWithActiveNegotiation,
      // "Acordo firmado" = same as em_negociacao (VMAX customers with active negotiation)
      acordo_firmado: totalWithNegotiation,
      // "Quitada" = VMAX customers with paid negotiation
      quitada: vmaxWithPaidNegotiation,
    },

    // Top debtors - with corrected status based on document mapping
    topDebtors: vmaxRecords
      .map((r: any) => {
        const vencidoStr = String(r.Vencido || "0")
        const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
        const diasInad = Number(String(r["Dias Inad."] || "0").replace(/\./g, "")) || 0
        const cpfCnpj = (r["CPF/CNPJ"] || "").replace(/\D/g, "")
        const status = docToStatus.get(cpfCnpj)

        let statusLabel = "em_aberto"
        if (status?.isPaid) {
          statusLabel = "quitada"
        } else if (status?.hasActiveAgreement) {
          statusLabel = "em_negociacao"
        }

        return {
          id: r.id,
          name: r.Cliente,
          value: Number(cleanValue) || 0,
          daysOverdue: diasInad,
          status: statusLabel,
        }
      })
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 10),

    // Recent negotiations (only non-cancelled) with customer names
    recentNegotiations: (agreements || [])
      .filter((a: any) => a.status !== "cancelled")
      .slice(0, 10)
      .map((a: any) => {
        const customerInfo = customerNameMap.get(a.customer_id)
        return {
          id: a.id,
          customerId: a.customer_id,
          customerName: customerInfo?.name || null,
          customerCpfCnpj: customerInfo?.cpfCnpj || null,
          status: a.status,
          value: Number(a.agreed_amount) || 0,
          createdAt: a.created_at,
        }
      }),

    // Total recovered value
    totalRecovered: totalRecoveredValue,
  }

  return <AdminRelatoriosContent reportData={reportData} company={company} />
}
