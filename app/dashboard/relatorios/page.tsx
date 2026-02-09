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

  // Fetch agreements
  const { data: agreements } = await supabase
    .from("agreements")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  // Build customer name lookup map from agreements
  const agreementCustomerIds = [...new Set((agreements || []).map((a: any) => a.customer_id).filter(Boolean))]
  let customerNameMap = new Map<string, { name: string | null; cpfCnpj: string | null }>()

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

  // Build a map of customer_id -> agreement status for proper debt status calculation
  const agreementStatusMap = new Map<string, { hasAgreement: boolean; isPaid: boolean; isActive: boolean }>()
  const allAgreements = agreements || []

  allAgreements.forEach((a: any) => {
    const customerId = a.customer_id
    if (!customerId) return

    const existing = agreementStatusMap.get(customerId) || { hasAgreement: false, isPaid: false, isActive: false }
    existing.hasAgreement = true

    // Check if this agreement has been paid (via ASAAS)
    if (a.payment_status === "received" || a.payment_status === "confirmed" || a.status === "completed") {
      existing.isPaid = true
    }

    // Check if this agreement is active (pending payment)
    if ((a.status === "active" || a.status === "draft") && a.payment_status !== "received" && a.payment_status !== "confirmed") {
      existing.isActive = true
    }

    agreementStatusMap.set(customerId, existing)
  })

  // Calculate report data with corrected debt status logic
  const reportData = {
    // Live stats
    totalDebts: vmaxRecords.length,
    totalDebtValue: vmaxRecords.reduce((sum, r) => {
      const vencidoStr = String(r.Vencido || "0")
      const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
      return sum + (Number(cleanValue) || 0)
    }, 0),
    activeNegotiations: allAgreements.filter((a: any) =>
      (a.status === "active" || a.status === "draft") &&
      a.payment_status !== "received" &&
      a.payment_status !== "confirmed"
    ).length,
    recoveryRate: 0, // Will be calculated

    // Debt by status - CORRECTED LOGIC based on ASAAS payment data
    debtsByStatus: {
      // "Em aberto" = no agreement or agreement not active
      em_aberto: vmaxRecords.filter((r: any) => {
        const status = agreementStatusMap.get(r.id)
        return !status || (!status.isPaid && !status.isActive)
      }).length,
      // "Em negociação" = has active agreement pending payment
      em_negociacao: vmaxRecords.filter((r: any) => {
        const status = agreementStatusMap.get(r.id)
        return status?.isActive && !status.isPaid
      }).length,
      // "Acordo firmado" = count of active agreements (same as before)
      acordo_firmado: allAgreements.filter((a: any) =>
        (a.status === "active" || a.status === "draft") &&
        a.payment_status !== "received" &&
        a.payment_status !== "confirmed"
      ).length,
      // "Quitada" = ONLY if payment was received via ASAAS
      quitada: vmaxRecords.filter((r: any) => {
        const status = agreementStatusMap.get(r.id)
        return status?.isPaid === true
      }).length,
    },

    // Top debtors - with corrected status based on ASAAS data
    topDebtors: vmaxRecords
      .map((r: any) => {
        const vencidoStr = String(r.Vencido || "0")
        const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
        const diasInad = Number(String(r["Dias Inad."] || "0").replace(/\./g, "")) || 0
        const agreementStatus = agreementStatusMap.get(r.id)

        let status = "em_aberto"
        if (agreementStatus?.isPaid) {
          status = "quitada"
        } else if (agreementStatus?.isActive) {
          status = "em_negociacao"
        }

        return {
          id: r.id,
          name: r.Cliente,
          value: Number(cleanValue) || 0,
          daysOverdue: diasInad,
          status,
        }
      })
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 10),

    // Recent negotiations with customer names
    recentNegotiations: (agreements || []).slice(0, 10).map((a: any) => {
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

    // Calculate recovery rate
    totalRecovered: (agreements || [])
      .filter((a: any) => a.status === "completed" || a.payment_status === "received")
      .reduce((sum: number, a: any) => sum + (Number(a.agreed_amount) || 0), 0),
  }

  // Calculate recovery rate
  if (reportData.totalDebtValue > 0) {
    reportData.recoveryRate = (reportData.totalRecovered / reportData.totalDebtValue) * 100
  }

  return <AdminRelatoriosContent reportData={reportData} company={company} />
}
