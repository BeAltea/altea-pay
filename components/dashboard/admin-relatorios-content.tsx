"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  CreditCard,
  DollarSign,
  Handshake,
  TrendingUp,
  Calendar,
  Loader2,
  FileText,
  Send,
  CheckCircle,
} from "lucide-react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface TopDebtor {
  id: string
  name: string
  value: number
  daysOverdue: number
  status: string
}

interface RecentNegotiation {
  id: string
  customerId: string
  customerName: string | null
  customerCpfCnpj: string | null
  status: string
  value: number
  createdAt: string
}

interface ReportData {
  totalDebts: number
  totalDebtValue: number
  activeNegotiations: number
  recoveryRate: number
  debtsByStatus: {
    em_aberto: number
    em_negociacao: number
    acordo_firmado: number
    quitada: number
  }
  topDebtors: TopDebtor[]
  recentNegotiations: RecentNegotiation[]
  totalRecovered: number
}

interface PeriodReportData {
  sent: number
  paid: number
  revenue: number
  paymentRate: number
  activities: Array<{
    id: string
    customerName: string
    customerDocument: string
    type: "sent" | "paid" | "overdue"
    value: number
    date: string
    status: string
  }>
  dailyBreakdown?: Array<{
    day: string
    dayLabel: string
    sent: number
    paid: number
    revenue: number
  }>
  weeklyBreakdown?: Array<{
    week: string
    weekLabel: string
    sent: number
    paid: number
    revenue: number
  }>
  statusBreakdown?: {
    aguardando: number
    pago: number
    vencida: number
    cancelada: number
  }
}

interface AdminRelatoriosContentProps {
  reportData: ReportData
  company: { id: string; name: string } | null
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR")
  } catch {
    return "—"
  }
}

function getDaysColor(days: number): string {
  if (days <= 30) return "var(--admin-green)"
  if (days <= 90) return "var(--admin-orange)"
  return "var(--admin-red)"
}

function getWeekDates(date: Date): { start: Date; end: Date } {
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
  const start = new Date(date)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function getMonthDates(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

const CHART_COLORS = {
  sent: "#EAB308",
  paid: "#22C55E",
  overdue: "#EF4444",
  pending: "#3B82F6",
}

type TabType = "live" | "daily" | "weekly" | "monthly"

export function AdminRelatoriosContent({ reportData, company }: AdminRelatoriosContentProps) {
  const [activeTab, setActiveTab] = useState<TabType>("live")
  const supabase = createClient()

  // Date states
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [selectedWeek, setSelectedWeek] = useState<string>("")
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  )

  // Report data states
  const [dailyReport, setDailyReport] = useState<PeriodReportData | null>(null)
  const [weeklyReport, setWeeklyReport] = useState<PeriodReportData | null>(null)
  const [monthlyReport, setMonthlyReport] = useState<PeriodReportData | null>(null)

  // Loading states
  const [loadingDaily, setLoadingDaily] = useState(false)
  const [loadingWeekly, setLoadingWeekly] = useState(false)
  const [loadingMonthly, setLoadingMonthly] = useState(false)

  const companyName = company?.name || "Empresa"
  const companyId = company?.id

  const tabs = [
    { id: "live" as const, label: "Ao Vivo" },
    { id: "daily" as const, label: "Diario" },
    { id: "weekly" as const, label: "Semanal" },
    { id: "monthly" as const, label: "Mensal" },
  ]

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    em_aberto: { label: "Em aberto", color: "var(--admin-red)", bg: "var(--admin-red-bg)" },
    em_negociacao: { label: "Em negociacao", color: "var(--admin-orange)", bg: "var(--admin-orange-bg)" },
    acordo_firmado: { label: "Acordo firmado", color: "var(--admin-green)", bg: "var(--admin-green-bg)" },
    quitada: { label: "Quitada", color: "var(--admin-green)", bg: "var(--admin-green-bg)" },
    active: { label: "Ativo", color: "var(--admin-blue)", bg: "var(--admin-blue-bg)" },
    draft: { label: "Aberto", color: "var(--admin-blue)", bg: "var(--admin-blue-bg)" },
    completed: { label: "Concluido", color: "var(--admin-green)", bg: "var(--admin-green-bg)" },
  }

  // Fetch customer names for agreements
  async function getCustomerInfo(customerIds: string[]): Promise<Map<string, { name: string; document: string }>> {
    const map = new Map<string, { name: string; document: string }>()
    if (customerIds.length === 0) return map

    // Try VMAX first
    const { data: vmaxData } = await supabase
      .from("VMAX")
      .select("id, Cliente, \"CPF/CNPJ\"")
      .in("id", customerIds)

    if (vmaxData) {
      vmaxData.forEach((c: any) => {
        map.set(c.id, { name: c.Cliente || "Cliente", document: c["CPF/CNPJ"] || "" })
      })
    }

    // Try customers table for missing
    const missingIds = customerIds.filter(id => !map.has(id))
    if (missingIds.length > 0) {
      const { data: customersData } = await supabase
        .from("customers")
        .select("id, name, document")
        .in("id", missingIds)

      if (customersData) {
        customersData.forEach((c: any) => {
          map.set(c.id, { name: c.name || "Cliente", document: c.document || "" })
        })
      }
    }

    return map
  }

  // Fetch Daily Report
  async function fetchDailyReport(date: string) {
    if (!companyId) return
    setLoadingDaily(true)

    try {
      const startOfDay = `${date}T00:00:00.000Z`
      const endOfDay = `${date}T23:59:59.999Z`

      // Fetch agreements created on this date (sent)
      const { data: sentData } = await supabase
        .from("agreements")
        .select("*")
        .eq("company_id", companyId)
        .neq("status", "cancelled")
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)

      // Fetch agreements paid on this date
      const { data: paidData } = await supabase
        .from("agreements")
        .select("*")
        .eq("company_id", companyId)
        .in("payment_status", ["received", "confirmed"])
        .gte("payment_received_at", startOfDay)
        .lte("payment_received_at", endOfDay)

      const sent = sentData || []
      const paid = paidData || []

      // Get customer info
      const allCustomerIds = [...new Set([
        ...sent.map(a => a.customer_id),
        ...paid.map(a => a.customer_id)
      ].filter(Boolean))]
      const customerMap = await getCustomerInfo(allCustomerIds)

      // Build activities
      const activities: PeriodReportData["activities"] = []

      sent.forEach(a => {
        const customer = customerMap.get(a.customer_id)
        activities.push({
          id: a.id,
          customerName: customer?.name || "Cliente",
          customerDocument: customer?.document || "",
          type: "sent",
          value: Number(a.agreed_amount) || 0,
          date: a.created_at,
          status: a.status,
        })
      })

      paid.forEach(a => {
        // Avoid duplicates if same agreement
        if (!activities.some(act => act.id === a.id && act.type === "paid")) {
          const customer = customerMap.get(a.customer_id)
          activities.push({
            id: a.id + "-paid",
            customerName: customer?.name || "Cliente",
            customerDocument: customer?.document || "",
            type: "paid",
            value: Number(a.agreed_amount) || 0,
            date: a.payment_received_at || a.created_at,
            status: "paid",
          })
        }
      })

      // Sort by date desc
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      const revenue = paid.reduce((sum, a) => sum + (Number(a.agreed_amount) || 0), 0)

      // Count unique customers, not agreement records (to match Ao Vivo's 215)
      const uniqueSentCustomers = new Set(sent.map(a => a.customer_id)).size
      const uniquePaidCustomers = new Set(paid.map(a => a.customer_id)).size
      const paymentRate = uniqueSentCustomers > 0 ? (uniquePaidCustomers / uniqueSentCustomers) * 100 : 0

      setDailyReport({
        sent: uniqueSentCustomers,
        paid: uniquePaidCustomers,
        revenue,
        paymentRate,
        activities,
      })
    } catch (error) {
      console.error("Error fetching daily report:", error)
      setDailyReport(null)
    } finally {
      setLoadingDaily(false)
    }
  }

  // Fetch Weekly Report
  async function fetchWeeklyReport(weekStr: string) {
    if (!companyId || !weekStr) return
    setLoadingWeekly(true)

    try {
      // Parse week string (format: "2026-W09")
      const [year, week] = weekStr.split("-W").map(Number)
      const jan1 = new Date(year, 0, 1)
      const daysOffset = (week - 1) * 7
      const weekStart = new Date(jan1)
      weekStart.setDate(jan1.getDate() + daysOffset - jan1.getDay() + 1)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      const startStr = weekStart.toISOString()
      const endStr = weekEnd.toISOString()

      // Fetch sent in this week
      const { data: sentData } = await supabase
        .from("agreements")
        .select("*")
        .eq("company_id", companyId)
        .neq("status", "cancelled")
        .gte("created_at", startStr)
        .lte("created_at", endStr)

      // Fetch paid in this week
      const { data: paidData } = await supabase
        .from("agreements")
        .select("*")
        .eq("company_id", companyId)
        .in("payment_status", ["received", "confirmed"])
        .gte("payment_received_at", startStr)
        .lte("payment_received_at", endStr)

      const sent = sentData || []
      const paid = paidData || []

      // Build daily breakdown - count unique customers per day
      const dailyBreakdown: PeriodReportData["dailyBreakdown"] = []
      const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]

      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(weekStart)
        dayDate.setDate(weekStart.getDate() + i)
        const dayStr = dayDate.toISOString().split("T")[0]

        const daySentAgreements = sent.filter(a => a.created_at?.startsWith(dayStr))
        const dayPaidAgreements = paid.filter(a => a.payment_received_at?.startsWith(dayStr))
        const dayRevenue = dayPaidAgreements.reduce((sum, a) => sum + (Number(a.agreed_amount) || 0), 0)

        // Count unique customers, not agreement records
        const daySentCustomers = new Set(daySentAgreements.map(a => a.customer_id)).size
        const dayPaidCustomers = new Set(dayPaidAgreements.map(a => a.customer_id)).size

        dailyBreakdown.push({
          day: dayStr,
          dayLabel: `${dayNames[dayDate.getDay()]} ${dayDate.getDate()}/${dayDate.getMonth() + 1}`,
          sent: daySentCustomers,
          paid: dayPaidCustomers,
          revenue: dayRevenue,
        })
      }

      const revenue = paid.reduce((sum, a) => sum + (Number(a.agreed_amount) || 0), 0)

      // Count unique customers, not agreement records (to match Ao Vivo's 215)
      const uniqueSentCustomers = new Set(sent.map(a => a.customer_id)).size
      const uniquePaidCustomers = new Set(paid.map(a => a.customer_id)).size
      const paymentRate = uniqueSentCustomers > 0 ? (uniquePaidCustomers / uniqueSentCustomers) * 100 : 0

      // Get customer info for activities
      const allCustomerIds = [...new Set([
        ...sent.map(a => a.customer_id),
        ...paid.map(a => a.customer_id)
      ].filter(Boolean))]
      const customerMap = await getCustomerInfo(allCustomerIds)

      const activities: PeriodReportData["activities"] = []
      sent.forEach(a => {
        const customer = customerMap.get(a.customer_id)
        activities.push({
          id: a.id,
          customerName: customer?.name || "Cliente",
          customerDocument: customer?.document || "",
          type: "sent",
          value: Number(a.agreed_amount) || 0,
          date: a.created_at,
          status: a.status,
        })
      })

      setWeeklyReport({
        sent: uniqueSentCustomers,
        paid: uniquePaidCustomers,
        revenue,
        paymentRate,
        activities,
        dailyBreakdown,
      })
    } catch (error) {
      console.error("Error fetching weekly report:", error)
      setWeeklyReport(null)
    } finally {
      setLoadingWeekly(false)
    }
  }

  // Fetch Monthly Report
  async function fetchMonthlyReport(monthStr: string) {
    if (!companyId || !monthStr) return
    setLoadingMonthly(true)

    try {
      const [year, month] = monthStr.split("-").map(Number)
      const { start, end } = getMonthDates(new Date(year, month - 1, 1))

      const startStr = start.toISOString()
      const endStr = end.toISOString()

      // Fetch sent in this month
      const { data: sentData } = await supabase
        .from("agreements")
        .select("*")
        .eq("company_id", companyId)
        .neq("status", "cancelled")
        .gte("created_at", startStr)
        .lte("created_at", endStr)

      // Fetch paid in this month
      const { data: paidData } = await supabase
        .from("agreements")
        .select("*")
        .eq("company_id", companyId)
        .in("payment_status", ["received", "confirmed"])
        .gte("payment_received_at", startStr)
        .lte("payment_received_at", endStr)

      // Fetch all agreements for status breakdown
      const { data: allAgreements } = await supabase
        .from("agreements")
        .select("*")
        .eq("company_id", companyId)
        .gte("created_at", startStr)
        .lte("created_at", endStr)

      const sent = sentData || []
      const paid = paidData || []
      const all = allAgreements || []

      // Build weekly breakdown - count unique customers per week
      const weeklyBreakdown: PeriodReportData["weeklyBreakdown"] = []
      const weeksInMonth = Math.ceil(end.getDate() / 7)

      for (let w = 0; w < weeksInMonth; w++) {
        const weekStartDay = w * 7 + 1
        const weekEndDay = Math.min((w + 1) * 7, end.getDate())

        const weekSentAgreements = sent.filter(a => {
          const day = new Date(a.created_at).getDate()
          return day >= weekStartDay && day <= weekEndDay
        })

        const weekPaidAgreements = paid.filter(a => {
          const day = new Date(a.payment_received_at || a.created_at).getDate()
          return day >= weekStartDay && day <= weekEndDay
        })
        const weekRevenue = weekPaidAgreements.reduce((sum, a) => sum + (Number(a.agreed_amount) || 0), 0)

        // Count unique customers, not agreement records
        const weekSentCustomers = new Set(weekSentAgreements.map(a => a.customer_id)).size
        const weekPaidCustomers = new Set(weekPaidAgreements.map(a => a.customer_id)).size

        weeklyBreakdown.push({
          week: `Semana ${w + 1}`,
          weekLabel: `${weekStartDay.toString().padStart(2, "0")}-${weekEndDay.toString().padStart(2, "0")}`,
          sent: weekSentCustomers,
          paid: weekPaidCustomers,
          revenue: weekRevenue,
        })
      }

      // Status breakdown - count unique customers per status
      const aguardandoCustomers = new Set(all.filter(a => a.status !== "cancelled" && !["received", "confirmed"].includes(a.payment_status || "") && a.payment_status !== "overdue").map(a => a.customer_id))
      const pagoCustomers = new Set(all.filter(a => ["received", "confirmed"].includes(a.payment_status || "")).map(a => a.customer_id))
      const vencidaCustomers = new Set(all.filter(a => a.payment_status === "overdue").map(a => a.customer_id))
      const canceladaCustomers = new Set(all.filter(a => a.status === "cancelled").map(a => a.customer_id))

      const statusBreakdown = {
        aguardando: aguardandoCustomers.size,
        pago: pagoCustomers.size,
        vencida: vencidaCustomers.size,
        cancelada: canceladaCustomers.size,
      }

      const revenue = paid.reduce((sum, a) => sum + (Number(a.agreed_amount) || 0), 0)

      // Count unique customers, not agreement records (to match Ao Vivo's 215)
      const uniqueSentCustomers = new Set(sent.map(a => a.customer_id)).size
      const uniquePaidCustomers = new Set(paid.map(a => a.customer_id)).size
      const paymentRate = uniqueSentCustomers > 0 ? (uniquePaidCustomers / uniqueSentCustomers) * 100 : 0

      // Get customer info for top payments
      const allCustomerIds = [...new Set(paid.map(a => a.customer_id).filter(Boolean))]
      const customerMap = await getCustomerInfo(allCustomerIds)

      const activities: PeriodReportData["activities"] = paid
        .sort((a, b) => (Number(b.agreed_amount) || 0) - (Number(a.agreed_amount) || 0))
        .slice(0, 10)
        .map(a => {
          const customer = customerMap.get(a.customer_id)
          return {
            id: a.id,
            customerName: customer?.name || "Cliente",
            customerDocument: customer?.document || "",
            type: "paid" as const,
            value: Number(a.agreed_amount) || 0,
            date: a.payment_received_at || a.created_at,
            status: "paid",
          }
        })

      setMonthlyReport({
        sent: uniqueSentCustomers,
        paid: uniquePaidCustomers,
        revenue,
        paymentRate,
        activities,
        weeklyBreakdown,
        statusBreakdown,
      })
    } catch (error) {
      console.error("Error fetching monthly report:", error)
      setMonthlyReport(null)
    } finally {
      setLoadingMonthly(false)
    }
  }

  // Auto-fetch reports when dates change
  useEffect(() => {
    if (activeTab === "daily" && selectedDate) {
      fetchDailyReport(selectedDate)
    }
  }, [selectedDate, activeTab, companyId])

  useEffect(() => {
    if (activeTab === "weekly" && selectedWeek) {
      fetchWeeklyReport(selectedWeek)
    }
  }, [selectedWeek, activeTab, companyId])

  useEffect(() => {
    if (activeTab === "monthly" && selectedMonth) {
      fetchMonthlyReport(selectedMonth)
    }
  }, [selectedMonth, activeTab, companyId])

  // Initialize week selector
  useEffect(() => {
    if (!selectedWeek) {
      const now = new Date()
      const oneJan = new Date(now.getFullYear(), 0, 1)
      const weekNum = Math.ceil(((now.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7)
      setSelectedWeek(`${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`)
    }
  }, [])

  const totalDebtsByStatus = Object.values(reportData.debtsByStatus).reduce((a, b) => a + b, 0)

  // KPI Card Component
  const KPICard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color?: string }) => (
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: color || "var(--admin-blue)" }} />
        <span className="text-xs uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
          {label}
        </span>
      </div>
      <div className="text-xl font-bold" style={{ color: color || "var(--admin-text-primary)" }}>
        {value}
      </div>
    </div>
  )

  // Empty State Component
  const EmptyState = ({ message }: { message: string }) => (
    <div
      className="rounded-xl p-12 text-center"
      style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
    >
      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: "var(--admin-text-muted)" }} />
      <p style={{ color: "var(--admin-text-muted)" }}>{message}</p>
    </div>
  )

  // Loading State Component
  const LoadingState = () => (
    <div
      className="rounded-xl p-12 text-center"
      style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
    >
      <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" style={{ color: "var(--admin-gold-400)" }} />
      <p style={{ color: "var(--admin-text-muted)" }}>Carregando relatorio...</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
            Relatorios — {companyName}
          </h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm lg:text-base">
            Acompanhe o desempenho da sua operacao de cobranca
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-lg"
        style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.id ? "var(--admin-gold-400)" : "transparent",
              color: activeTab === tab.id ? "var(--admin-bg-primary)" : "var(--admin-text-secondary)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Live Tab */}
      {activeTab === "live" && (
        <div className="space-y-6">
          {/* KPIs Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard icon={CreditCard} label="Dividas Ativas" value={reportData.totalDebts.toLocaleString("pt-BR")} color="var(--admin-blue)" />
            <KPICard icon={DollarSign} label="Valor em Aberto" value={formatCurrency(reportData.totalDebtValue)} color="var(--admin-red)" />
            <KPICard icon={Handshake} label="Negociacoes Ativas" value={reportData.activeNegotiations} color="var(--admin-orange)" />
            <KPICard icon={TrendingUp} label="Taxa de Recuperacao" value={`${reportData.recoveryRate.toFixed(1)}%`} color="var(--admin-green)" />
          </div>

          {/* Two column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Debts by Status */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
            >
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}>
                <span className="text-[15px] font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                  Dividas por Status
                </span>
              </div>
              <div className="px-5 py-4 space-y-3">
                {Object.entries(reportData.debtsByStatus).map(([status, count]) => {
                  const config = statusConfig[status] || { label: status, color: "var(--admin-text-muted)", bg: "var(--admin-bg-tertiary)" }
                  const percentage = totalDebtsByStatus > 0 ? (count / totalDebtsByStatus) * 100 : 0
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>{config.label}</span>
                        <span className="text-sm font-bold" style={{ color: config.color }}>{count}</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--admin-border)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, background: config.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent Negotiations */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
            >
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}>
                <span className="text-[15px] font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                  Negociacoes Recentes
                </span>
              </div>
              <div className="px-5 py-2 max-h-[300px] overflow-y-auto">
                {reportData.recentNegotiations.length === 0 ? (
                  <div className="py-8 text-center text-sm" style={{ color: "var(--admin-text-muted)" }}>
                    Nenhuma negociacao encontrada
                  </div>
                ) : (
                  reportData.recentNegotiations.map((neg) => {
                    const status = statusConfig[neg.status] || statusConfig.draft
                    return (
                      <div key={neg.id} className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}>
                        <div>
                          <div className="text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>
                            {neg.customerName || `Cliente #${neg.customerId?.slice(0, 8) || "—"}`}
                          </div>
                          <div className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                            {formatCurrency(neg.value)} - {formatDate(neg.createdAt)}
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded-md text-[10px] font-semibold" style={{ background: status.bg, color: status.color }}>
                          {status.label}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Top 10 Debtors */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}>
              <span className="text-[15px] font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                Top 10 Maiores Devedores
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}>
                    <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--admin-text-muted)" }}>Cliente</th>
                    <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--admin-text-muted)" }}>Valor</th>
                    <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--admin-text-muted)" }}>Dias em Atraso</th>
                    <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--admin-text-muted)" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.topDebtors.map((debtor, index) => {
                    const status = statusConfig[debtor.status] || statusConfig.em_aberto
                    return (
                      <tr key={debtor.id} className="transition-colors hover:bg-[var(--admin-bg-tertiary)]" style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: index < 3 ? "var(--admin-gold-400)" : "var(--admin-border)", color: index < 3 ? "var(--admin-bg-primary)" : "var(--admin-text-muted)" }}>
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>{debtor.name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3"><span className="text-sm font-bold" style={{ color: "var(--admin-text-primary)" }}>{formatCurrency(debtor.value)}</span></td>
                        <td className="px-5 py-3"><span className="text-sm font-bold" style={{ color: getDaysColor(debtor.daysOverdue) }}>{debtor.daysOverdue} dias</span></td>
                        <td className="px-5 py-3"><span className="px-2.5 py-1 rounded-md text-[11px] font-semibold" style={{ background: status.bg, color: status.color }}>{status.label}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Daily Tab */}
      {activeTab === "daily" && (
        <div className="space-y-6">
          {/* Date Picker */}
          <div
            className="rounded-xl p-4 flex items-center gap-4"
            style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
          >
            <Calendar className="w-5 h-5" style={{ color: "var(--admin-gold-400)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>
              Selecione a data:
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ background: "var(--admin-bg-tertiary)", border: "1px solid var(--admin-border)", color: "var(--admin-text-primary)" }}
            />
          </div>

          {loadingDaily ? (
            <LoadingState />
          ) : dailyReport ? (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard icon={Send} label="Cobrancas Enviadas" value={dailyReport.sent} color="#EAB308" />
                <KPICard icon={CheckCircle} label="Cobrancas Pagas" value={dailyReport.paid} color="#22C55E" />
                <KPICard icon={DollarSign} label="Valor Recebido" value={formatCurrency(dailyReport.revenue)} color="#22C55E" />
                <KPICard icon={TrendingUp} label="Taxa de Pagamento" value={`${dailyReport.paymentRate.toFixed(1)}%`} color="var(--admin-blue)" />
              </div>

              {/* Activity Table */}
              {dailyReport.activities.length > 0 ? (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
                >
                  <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}>
                    <span className="text-[15px] font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                      Atividade do Dia - {new Date(selectedDate).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}>
                          <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--admin-text-muted)" }}>Cliente</th>
                          <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--admin-text-muted)" }}>CPF/CNPJ</th>
                          <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--admin-text-muted)" }}>Tipo</th>
                          <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--admin-text-muted)" }}>Valor</th>
                          <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--admin-text-muted)" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyReport.activities.map((act) => (
                          <tr key={act.id} className="transition-colors hover:bg-[var(--admin-bg-tertiary)]" style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}>
                            <td className="px-5 py-3 text-sm" style={{ color: "var(--admin-text-primary)" }}>{act.customerName}</td>
                            <td className="px-5 py-3 text-sm" style={{ color: "var(--admin-text-muted)" }}>{act.customerDocument}</td>
                            <td className="px-5 py-3">
                              <span
                                className="px-2 py-1 rounded-md text-[11px] font-semibold"
                                style={{
                                  background: act.type === "paid" ? "var(--admin-green-bg)" : "rgba(234, 179, 8, 0.1)",
                                  color: act.type === "paid" ? "#22C55E" : "#EAB308"
                                }}
                              >
                                {act.type === "paid" ? "Pagamento Recebido" : "Cobranca Enviada"}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-sm font-bold" style={{ color: "var(--admin-text-primary)" }}>{formatCurrency(act.value)}</td>
                            <td className="px-5 py-3">
                              <span
                                className="px-2 py-1 rounded-md text-[11px] font-semibold"
                                style={{
                                  background: act.type === "paid" ? "var(--admin-green-bg)" : "var(--admin-blue-bg)",
                                  color: act.type === "paid" ? "#22C55E" : "var(--admin-blue)"
                                }}
                              >
                                {act.type === "paid" ? "Pago" : "Aguardando"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <EmptyState message="Nenhuma atividade registrada neste dia." />
              )}
            </>
          ) : (
            <EmptyState message="Selecione uma data para visualizar o relatorio." />
          )}
        </div>
      )}

      {/* Weekly Tab */}
      {activeTab === "weekly" && (
        <div className="space-y-6">
          {/* Week Picker */}
          <div
            className="rounded-xl p-4 flex items-center gap-4"
            style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
          >
            <Calendar className="w-5 h-5" style={{ color: "var(--admin-gold-400)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>
              Selecione a semana:
            </span>
            <input
              type="week"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ background: "var(--admin-bg-tertiary)", border: "1px solid var(--admin-border)", color: "var(--admin-text-primary)" }}
            />
          </div>

          {loadingWeekly ? (
            <LoadingState />
          ) : weeklyReport ? (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard icon={Send} label="Cobrancas Enviadas" value={weeklyReport.sent} color="#EAB308" />
                <KPICard icon={CheckCircle} label="Cobrancas Pagas" value={weeklyReport.paid} color="#22C55E" />
                <KPICard icon={DollarSign} label="Valor Recebido" value={formatCurrency(weeklyReport.revenue)} color="#22C55E" />
                <KPICard icon={TrendingUp} label="Taxa de Pagamento" value={`${weeklyReport.paymentRate.toFixed(1)}%`} color="var(--admin-blue)" />
              </div>

              {/* Chart */}
              {weeklyReport.dailyBreakdown && weeklyReport.dailyBreakdown.length > 0 && (
                <div
                  className="rounded-xl p-5"
                  style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
                >
                  <h3 className="text-[15px] font-semibold mb-4" style={{ color: "var(--admin-text-primary)" }}>
                    Atividade por Dia da Semana
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={weeklyReport.dailyBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
                      <XAxis dataKey="dayLabel" tick={{ fill: "var(--admin-text-muted)", fontSize: 12 }} />
                      <YAxis tick={{ fill: "var(--admin-text-muted)", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)", borderRadius: 8 }}
                        labelStyle={{ color: "var(--admin-text-primary)" }}
                      />
                      <Legend />
                      <Bar dataKey="sent" fill={CHART_COLORS.sent} name="Enviadas" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="paid" fill={CHART_COLORS.paid} name="Pagas" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Summary Table */}
              {weeklyReport.dailyBreakdown && (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
                >
                  <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}>
                    <span className="text-[15px] font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                      Resumo Semanal
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}>
                          <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--admin-text-muted)" }}>Dia</th>
                          <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--admin-text-muted)" }}>Enviadas</th>
                          <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--admin-text-muted)" }}>Pagas</th>
                          <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--admin-text-muted)" }}>Valor Recebido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyReport.dailyBreakdown.map((day) => (
                          <tr key={day.day} className="transition-colors hover:bg-[var(--admin-bg-tertiary)]" style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}>
                            <td className="px-5 py-3 text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>{day.dayLabel}</td>
                            <td className="px-5 py-3 text-sm" style={{ color: "#EAB308" }}>{day.sent}</td>
                            <td className="px-5 py-3 text-sm" style={{ color: "#22C55E" }}>{day.paid}</td>
                            <td className="px-5 py-3 text-sm font-bold" style={{ color: "var(--admin-text-primary)" }}>{formatCurrency(day.revenue)}</td>
                          </tr>
                        ))}
                        <tr style={{ background: "var(--admin-bg-tertiary)" }}>
                          <td className="px-5 py-3 text-sm font-bold" style={{ color: "var(--admin-text-primary)" }}>Total</td>
                          <td className="px-5 py-3 text-sm font-bold" style={{ color: "#EAB308" }}>{weeklyReport.sent}</td>
                          <td className="px-5 py-3 text-sm font-bold" style={{ color: "#22C55E" }}>{weeklyReport.paid}</td>
                          <td className="px-5 py-3 text-sm font-bold" style={{ color: "var(--admin-text-primary)" }}>{formatCurrency(weeklyReport.revenue)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState message="Selecione uma semana para visualizar o relatorio." />
          )}
        </div>
      )}

      {/* Monthly Tab */}
      {activeTab === "monthly" && (
        <div className="space-y-6">
          {/* Month Picker */}
          <div
            className="rounded-xl p-4 flex items-center gap-4"
            style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
          >
            <Calendar className="w-5 h-5" style={{ color: "var(--admin-gold-400)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>
              Selecione o mes:
            </span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ background: "var(--admin-bg-tertiary)", border: "1px solid var(--admin-border)", color: "var(--admin-text-primary)" }}
            />
          </div>

          {loadingMonthly ? (
            <LoadingState />
          ) : monthlyReport ? (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard icon={Send} label="Cobrancas Enviadas" value={monthlyReport.sent} color="#EAB308" />
                <KPICard icon={CheckCircle} label="Cobrancas Pagas" value={monthlyReport.paid} color="#22C55E" />
                <KPICard icon={DollarSign} label="Valor Recebido" value={formatCurrency(monthlyReport.revenue)} color="#22C55E" />
                <KPICard icon={TrendingUp} label="Taxa de Pagamento" value={`${monthlyReport.paymentRate.toFixed(1)}%`} color="var(--admin-blue)" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Weekly Breakdown Chart */}
                {monthlyReport.weeklyBreakdown && monthlyReport.weeklyBreakdown.length > 0 && (
                  <div
                    className="rounded-xl p-5"
                    style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
                  >
                    <h3 className="text-[15px] font-semibold mb-4" style={{ color: "var(--admin-text-primary)" }}>
                      Cobrancas por Semana
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={monthlyReport.weeklyBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
                        <XAxis dataKey="week" tick={{ fill: "var(--admin-text-muted)", fontSize: 12 }} />
                        <YAxis tick={{ fill: "var(--admin-text-muted)", fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)", borderRadius: 8 }}
                          labelStyle={{ color: "var(--admin-text-primary)" }}
                        />
                        <Bar dataKey="sent" fill={CHART_COLORS.sent} name="Enviadas" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="paid" fill={CHART_COLORS.paid} name="Pagas" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Status Breakdown */}
                {monthlyReport.statusBreakdown && (
                  <div
                    className="rounded-xl p-5"
                    style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
                  >
                    <h3 className="text-[15px] font-semibold mb-4" style={{ color: "var(--admin-text-primary)" }}>
                      Cobrancas por Status
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Aguardando", value: monthlyReport.statusBreakdown.aguardando, color: CHART_COLORS.pending },
                            { name: "Pago", value: monthlyReport.statusBreakdown.pago, color: CHART_COLORS.paid },
                            { name: "Vencida", value: monthlyReport.statusBreakdown.vencida, color: CHART_COLORS.overdue },
                            { name: "Cancelada", value: monthlyReport.statusBreakdown.cancelada, color: "#6B7280" },
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {[
                            { name: "Aguardando", value: monthlyReport.statusBreakdown.aguardando, color: CHART_COLORS.pending },
                            { name: "Pago", value: monthlyReport.statusBreakdown.pago, color: CHART_COLORS.paid },
                            { name: "Vencida", value: monthlyReport.statusBreakdown.vencida, color: CHART_COLORS.overdue },
                            { name: "Cancelada", value: monthlyReport.statusBreakdown.cancelada, color: "#6B7280" },
                          ].filter(d => d.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Top Payments Table */}
              {monthlyReport.activities.length > 0 ? (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
                >
                  <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}>
                    <span className="text-[15px] font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                      Maiores Pagamentos Recebidos
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}>
                          <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--admin-text-muted)" }}>#</th>
                          <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--admin-text-muted)" }}>Cliente</th>
                          <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--admin-text-muted)" }}>CPF/CNPJ</th>
                          <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--admin-text-muted)" }}>Valor</th>
                          <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--admin-text-muted)" }}>Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyReport.activities.map((act, index) => (
                          <tr key={act.id} className="transition-colors hover:bg-[var(--admin-bg-tertiary)]" style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}>
                            <td className="px-5 py-3">
                              <span
                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                style={{ background: index < 3 ? "var(--admin-gold-400)" : "var(--admin-border)", color: index < 3 ? "var(--admin-bg-primary)" : "var(--admin-text-muted)" }}
                              >
                                {index + 1}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-sm" style={{ color: "var(--admin-text-primary)" }}>{act.customerName}</td>
                            <td className="px-5 py-3 text-sm" style={{ color: "var(--admin-text-muted)" }}>{act.customerDocument}</td>
                            <td className="px-5 py-3 text-sm font-bold" style={{ color: "#22C55E" }}>{formatCurrency(act.value)}</td>
                            <td className="px-5 py-3 text-sm" style={{ color: "var(--admin-text-muted)" }}>{formatDate(act.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <EmptyState message="Nenhum pagamento recebido neste mes." />
              )}
            </>
          ) : (
            <EmptyState message="Selecione um mes para visualizar o relatorio." />
          )}
        </div>
      )}
    </div>
  )
}
