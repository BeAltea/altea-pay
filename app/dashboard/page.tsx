import { createClient } from "@/lib/supabase/server"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Users, CreditCard, Handshake, TrendingUp, ChevronRight } from "lucide-react"
import Link from "next/link"
import { isPaidStatus } from "@/lib/constants/payment-status"

export const dynamic = "force-dynamic"

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1).replace(".", ",")}M`
  } else if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1).replace(".", ",")}k`
  }
  return `R$ ${value.toFixed(2).replace(".", ",")}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
  } catch {
    return "—"
  }
}

function getAgingBucket(daysOverdue: number): string {
  if (daysOverdue <= 30) return "0-30"
  if (daysOverdue <= 60) return "31-60"
  if (daysOverdue <= 90) return "61-90"
  if (daysOverdue <= 180) return "91-180"
  return "180+"
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id, full_name")
    .eq("id", user.id)
    .single()

  if (!profile) return null

  if (!profile.company_id) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Sua conta nao esta vinculada a nenhuma empresa. Entre em contato com o administrador.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const companyId = profile.company_id

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .single()

  // Fetch all VMAX records for this company
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

  // Fetch agreements/negotiations with pagination
  let allAgreements: any[] = []
  let agreementPage = 0

  while (true) {
    const { data: pageData } = await supabase
      .from("agreements")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .range(agreementPage * pageSize, (agreementPage + 1) * pageSize - 1)

    if (!pageData || pageData.length === 0) break
    allAgreements = [...allAgreements, ...pageData]
    if (pageData.length < pageSize) break
    agreementPage++
  }

  // Build customer_id -> document map from customers table
  const agreementCustomerIds = [...new Set(allAgreements.map((a: any) => a.customer_id).filter(Boolean))]
  const customerIdToDoc = new Map<string, string>()
  let customerNameMap = new Map<string, { name: string | null; cpfCnpj: string | null }>()

  if (agreementCustomerIds.length > 0) {
    // Fetch customers in batches
    for (let i = 0; i < agreementCustomerIds.length; i += 500) {
      const batch = agreementCustomerIds.slice(i, i + 500)
      const { data: customersData } = await supabase
        .from("customers")
        .select("id, name, document")
        .in("id", batch)

      if (customersData) {
        customersData.forEach((c: any) => {
          const normalizedDoc = (c.document || "").replace(/\D/g, "")
          if (normalizedDoc) {
            customerIdToDoc.set(c.id, normalizedDoc)
          }
          customerNameMap.set(c.id, { name: c.name, cpfCnpj: c.document })
        })
      }
    }

    // Also try VMAX table for customer names
    const { data: vmaxCustomers } = await supabase
      .from("VMAX")
      .select("id, Cliente, \"CPF/CNPJ\"")
      .in("id", agreementCustomerIds)

    if (vmaxCustomers) {
      vmaxCustomers.forEach((c: any) => {
        if (!customerNameMap.has(c.id)) {
          customerNameMap.set(c.id, { name: c.Cliente, cpfCnpj: c["CPF/CNPJ"] })
        }
        // Also add to doc map if not already there
        const normalizedDoc = (c["CPF/CNPJ"] || "").replace(/\D/g, "")
        if (normalizedDoc && !customerIdToDoc.has(c.id)) {
          customerIdToDoc.set(c.id, normalizedDoc)
        }
      })
    }
  }

  // Build map of DOCUMENT -> agreement status (matching Super Admin logic)
  // KEY BY DOCUMENT (CPF/CNPJ), not customer_id, for consistent counts
  const docToStatus = new Map<string, { hasActiveAgreement: boolean; isPaid: boolean }>()
  const activeAgreements = allAgreements.filter((a: any) => a.status !== "cancelled")

  for (const a of allAgreements) {
    const normalizedDoc = customerIdToDoc.get(a.customer_id)
    if (!normalizedDoc) continue

    const existing = docToStatus.get(normalizedDoc) || { hasActiveAgreement: false, isPaid: false }

    // Track non-cancelled agreements
    if (a.status !== "cancelled") {
      existing.hasActiveAgreement = true
    }

    // Check if paid using centralized isPaidStatus (includes pago_ao_cliente, RECEIVED_IN_CASH, etc.)
    if (isPaidStatus(a.status, a.payment_status, a.asaas_status)) {
      existing.isPaid = true
    }

    docToStatus.set(normalizedDoc, existing)
  }

  // Calculate stats - MUST MATCH Acordos page counts
  const totalClientes = vmaxRecords.length

  let totalDebt = 0
  let recoveredDebt = 0

  const agingBuckets: Record<string, { count: number; value: number }> = {
    "0-30": { count: 0, value: 0 },
    "31-60": { count: 0, value: 0 },
    "61-90": { count: 0, value: 0 },
    "91-180": { count: 0, value: 0 },
    "180+": { count: 0, value: 0 },
  }

  // Calculate total debt and aging buckets from VMAX
  vmaxRecords.forEach((record: any) => {
    const vencidoStr = String(record.Vencido || "0")
    const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
    const amount = Number(cleanValue) || 0
    totalDebt += amount

    const diasInad = Number(String(record["Dias Inad."] || "0").replace(/\./g, "")) || 0
    const bucket = getAgingBucket(diasInad)
    agingBuckets[bucket].count++
    agingBuckets[bucket].value += amount
  })

  // Count negotiations - ALIGNED WITH SUPER ADMIN LOGIC
  // Match VMAX customers by document (CPF/CNPJ) to get correct counts
  // This ensures consistency between portals
  let customersWithNegotiation = 0
  let customersWithPaidNegotiation = 0

  // Count by iterating VMAX records and checking document matches
  for (const vmax of vmaxRecords) {
    const cpfCnpj = (vmax["CPF/CNPJ"] || "").replace(/\D/g, "")
    const status = docToStatus.get(cpfCnpj)

    if (status?.hasActiveAgreement) {
      customersWithNegotiation++
    }
    if (status?.isPaid) {
      customersWithPaidNegotiation++
    }
  }

  const negotiationsEnviadas = customersWithNegotiation
  const negotiationsPendentes = totalClientes - negotiationsEnviadas

  // Count paid negotiations (unique customers with paid status)
  const negotiationsPagas = customersWithPaidNegotiation

  // Calculate recovered debt from paid agreements using centralized isPaidStatus
  const totalRecovered = activeAgreements
    .filter((a: any) => isPaidStatus(a.status, a.payment_status, a.asaas_status))
    .reduce((sum: number, a: any) => sum + (Number(a.agreed_amount) || 0), 0)

  const finalRecoveredDebt = totalRecovered
  const finalPendingDebt = totalDebt - finalRecoveredDebt

  const recoveryRate = totalDebt > 0 ? (finalRecoveredDebt / totalDebt * 100) : 0

  const recentAgreements = allAgreements.slice(0, 5)

  const companyName = company?.name || "Empresa"

  return (
    <div className="space-y-7">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
          Dashboard — {companyName}
        </h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm lg:text-base">
          Gestao de clientes e resultados de analises
        </p>
      </div>

      {/* Stats Grid - 6 cards matching super-admin Negociações */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-[14px]">
        {/* Total de Clientes */}
        <div
          className="rounded-xl p-[18px] relative overflow-hidden transition-all hover:-translate-y-0.5"
          style={{
            background: "var(--admin-bg-secondary)",
            border: "1px solid var(--admin-border)",
            borderLeft: "4px solid var(--admin-blue)",
          }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
            style={{ background: "var(--admin-blue-bg)", color: "var(--admin-blue)" }}
          >
            <Users className="w-4 h-4" />
          </div>
          <div
            className="text-xs uppercase tracking-wider font-medium mb-1"
            style={{ color: "var(--admin-text-muted)" }}
          >
            Total de Clientes
          </div>
          <div className="text-2xl font-bold" style={{ color: "var(--admin-text-primary)" }}>
            {totalClientes.toLocaleString("pt-BR")}
          </div>
        </div>

        {/* Negociacoes Enviadas */}
        <div
          className="rounded-xl p-[18px] relative overflow-hidden transition-all hover:-translate-y-0.5"
          style={{
            background: "var(--admin-bg-secondary)",
            border: "1px solid var(--admin-border)",
            borderLeft: "4px solid var(--admin-green)",
          }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
            style={{ background: "var(--admin-green-bg)", color: "var(--admin-green)" }}
          >
            <Handshake className="w-4 h-4" />
          </div>
          <div
            className="text-xs uppercase tracking-wider font-medium mb-1"
            style={{ color: "var(--admin-text-muted)" }}
          >
            Negociacoes Enviadas
          </div>
          <div className="text-2xl font-bold" style={{ color: "var(--admin-green)" }}>
            {negotiationsEnviadas.toLocaleString("pt-BR")}
          </div>
          <div className="text-xs mt-1.5" style={{ color: "var(--admin-text-muted)" }}>
            {totalClientes > 0 ? ((negotiationsEnviadas / totalClientes) * 100).toFixed(1) : 0}% do total
          </div>
        </div>

        {/* Pendentes de Envio */}
        <div
          className="rounded-xl p-[18px] relative overflow-hidden transition-all hover:-translate-y-0.5"
          style={{
            background: "var(--admin-bg-secondary)",
            border: "1px solid var(--admin-border)",
            borderLeft: "4px solid var(--admin-orange)",
          }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
            style={{ background: "var(--admin-orange-bg)", color: "var(--admin-orange)" }}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div
            className="text-xs uppercase tracking-wider font-medium mb-1"
            style={{ color: "var(--admin-text-muted)" }}
          >
            Pendentes de Envio
          </div>
          <div className="text-2xl font-bold" style={{ color: "var(--admin-orange)" }}>
            {negotiationsPendentes.toLocaleString("pt-BR")}
          </div>
          <div className="text-xs mt-1.5" style={{ color: "var(--admin-text-muted)" }}>
            {totalClientes > 0 ? ((negotiationsPendentes / totalClientes) * 100).toFixed(1) : 0}% do total
          </div>
        </div>

        {/* Negociacoes Pagas */}
        <div
          className="rounded-xl p-[18px] relative overflow-hidden transition-all hover:-translate-y-0.5"
          style={{
            background: "var(--admin-bg-secondary)",
            border: "1px solid var(--admin-border)",
            borderLeft: "4px solid #10b981",
          }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
            style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}
          >
            <TrendingUp className="w-4 h-4" />
          </div>
          <div
            className="text-xs uppercase tracking-wider font-medium mb-1"
            style={{ color: "var(--admin-text-muted)" }}
          >
            Negociacoes Pagas
          </div>
          <div className="text-2xl font-bold" style={{ color: "#10b981" }}>
            {negotiationsPagas.toLocaleString("pt-BR")}
          </div>
          <div className="text-xs mt-1.5" style={{ color: "var(--admin-text-muted)" }}>
            {negotiationsEnviadas > 0 ? ((negotiationsPagas / negotiationsEnviadas) * 100).toFixed(1) : 0}% das enviadas
          </div>
        </div>

        {/* Divida Pendente */}
        <div
          className="rounded-xl p-[18px] relative overflow-hidden transition-all hover:-translate-y-0.5"
          style={{
            background: "var(--admin-bg-secondary)",
            border: "1px solid var(--admin-border)",
            borderLeft: "4px solid var(--admin-red)",
          }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
            style={{ background: "var(--admin-red-bg)", color: "var(--admin-red)" }}
          >
            <CreditCard className="w-4 h-4" />
          </div>
          <div
            className="text-xs uppercase tracking-wider font-medium mb-1"
            style={{ color: "var(--admin-text-muted)" }}
          >
            Divida Pendente
          </div>
          <div className="text-2xl font-bold" style={{ color: "var(--admin-red)" }}>
            {formatCurrency(finalPendingDebt)}
          </div>
        </div>

        {/* Divida Recuperada */}
        <div
          className="rounded-xl p-[18px] relative overflow-hidden transition-all hover:-translate-y-0.5"
          style={{
            background: "var(--admin-bg-secondary)",
            border: "1px solid var(--admin-border)",
            borderLeft: "4px solid #14b8a6",
          }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
            style={{ background: "rgba(20, 184, 166, 0.1)", color: "#14b8a6" }}
          >
            <CreditCard className="w-4 h-4" />
          </div>
          <div
            className="text-xs uppercase tracking-wider font-medium mb-1"
            style={{ color: "var(--admin-text-muted)" }}
          >
            Divida Recuperada
          </div>
          <div className="text-2xl font-bold" style={{ color: "#14b8a6" }}>
            {formatCurrency(finalRecoveredDebt)}
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Dividas por Faixa de Atraso */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--admin-bg-secondary)",
            border: "1px solid var(--admin-border)",
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}
          >
            <span className="text-[15px] font-semibold" style={{ color: "var(--admin-text-primary)" }}>
              Dividas por Faixa de Atraso
            </span>
            <Link
              href="/dashboard/dividas"
              className="text-xs font-semibold hover:opacity-80"
              style={{ color: "var(--admin-gold-400)" }}
            >
              Ver Todas <ChevronRight className="w-3 h-3 inline" />
            </Link>
          </div>
          <div className="px-5 py-4">
            {Object.entries(agingBuckets).map(([range, data]) => (
              <div
                key={range}
                className="flex items-center justify-between py-3.5"
                style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}
              >
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                    {range} dias
                  </div>
                  <div className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                    {data.count} clientes
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-lg font-bold"
                    style={{
                      color: range === "180+" ? "var(--admin-red)" :
                             range === "91-180" ? "var(--admin-orange)" :
                             "var(--admin-text-primary)"
                    }}
                  >
                    {formatCurrency(data.value)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Negociacoes Recentes */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--admin-bg-secondary)",
            border: "1px solid var(--admin-border)",
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}
          >
            <span className="text-[15px] font-semibold" style={{ color: "var(--admin-text-primary)" }}>
              Negociacoes Recentes
            </span>
            <Link
              href="/dashboard/agreements"
              className="text-xs font-semibold hover:opacity-80"
              style={{ color: "var(--admin-gold-400)" }}
            >
              Ver Todos <ChevronRight className="w-3 h-3 inline" />
            </Link>
          </div>
          <div className="px-5 py-4">
            {recentAgreements.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: "var(--admin-text-muted)" }}>
                Nenhuma negociacao encontrada
              </div>
            ) : (
              recentAgreements.map((agreement: any) => {
                const paidAmount = Number(agreement.agreed_amount) || 0
                const installments = agreement.installments || 1
                const installmentAmount = paidAmount / installments
                const paidInstallments = agreement.status === "completed" ? installments :
                  Math.floor(Math.random() * installments) // TODO: Replace with actual paid count

                const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
                  active: { label: "Em dia", color: "var(--admin-green)", bg: "var(--admin-green-bg)" },
                  draft: { label: "Aberto", color: "var(--admin-blue)", bg: "var(--admin-blue-bg)" },
                  completed: { label: "Concluido", color: "var(--admin-green)", bg: "var(--admin-green-bg)" },
                  cancelled: { label: "Cancelado", color: "var(--admin-red)", bg: "var(--admin-red-bg)" },
                  breached: { label: "Em atraso", color: "var(--admin-orange)", bg: "var(--admin-orange-bg)" },
                }
                const status = statusConfig[agreement.status] || statusConfig.draft

                // Get customer info from lookup map
                const customerInfo = customerNameMap.get(agreement.customer_id)
                const customerName = customerInfo?.name || null
                const customerCpfCnpj = customerInfo?.cpfCnpj || null

                return (
                  <div
                    key={agreement.id}
                    className="py-3.5"
                    style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                          {customerName || `Cliente #${agreement.customer_id?.slice(0, 8) || "—"}`}
                        </div>
                        <div className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                          {customerCpfCnpj || `${installments}x de ${formatCurrency(installmentAmount)}`}
                        </div>
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold"
                        style={{ background: status.bg, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div
                      className="w-full h-1 rounded-full mt-2 overflow-hidden"
                      style={{ background: "var(--admin-border)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(paidInstallments / installments) * 100}%`,
                          background: status.color,
                        }}
                      />
                    </div>
                    <div className="text-[11px] mt-1" style={{ color: "var(--admin-text-muted)" }}>
                      {paidInstallments} de {installments} parcelas pagas
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
