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

  // Calculate report data
  const reportData = {
    // Live stats
    totalDebts: vmaxRecords.length,
    totalDebtValue: vmaxRecords.reduce((sum, r) => {
      const vencidoStr = String(r.Vencido || "0")
      const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
      return sum + (Number(cleanValue) || 0)
    }, 0),
    activeNegotiations: (agreements || []).filter((a: any) => a.status === "active" || a.status === "draft").length,
    recoveryRate: 0, // Will be calculated

    // Debt by status
    debtsByStatus: {
      em_aberto: vmaxRecords.filter((r: any) => !r["DT Cancelamento"] && r.approval_status !== "ACEITA").length,
      em_negociacao: vmaxRecords.filter((r: any) => r.approval_status === "ACEITA" || r.approval_status === "ACEITA_ESPECIAL").length,
      acordo_firmado: (agreements || []).filter((a: any) => a.status === "active").length,
      quitada: vmaxRecords.filter((r: any) => r["DT Cancelamento"]).length,
    },

    // Top debtors
    topDebtors: vmaxRecords
      .map((r: any) => {
        const vencidoStr = String(r.Vencido || "0")
        const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
        const diasInad = Number(String(r["Dias Inad."] || "0").replace(/\./g, "")) || 0
        return {
          id: r.id,
          name: r.Cliente,
          value: Number(cleanValue) || 0,
          daysOverdue: diasInad,
          status: r["DT Cancelamento"] ? "quitada" : (r.approval_status === "ACEITA" ? "em_negociacao" : "em_aberto"),
        }
      })
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 10),

    // Recent negotiations
    recentNegotiations: (agreements || []).slice(0, 10).map((a: any) => ({
      id: a.id,
      customerId: a.customer_id,
      status: a.status,
      value: Number(a.agreed_amount) || 0,
      createdAt: a.created_at,
    })),

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
