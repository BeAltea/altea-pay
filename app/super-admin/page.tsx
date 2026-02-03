import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  Building2,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Eye,
  BarChart3,
} from "lucide-react"

interface CompanyStats {
  id: string
  name: string
  totalCustomers: number
  totalDebts: number
  totalAmount: number
  recoveredAmount: number
  recoveryRate: number
  overdueDebts: number
  admins: number
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function SuperAdminDashboardPage() {
  const supabase = createAdminClient()

  const { data: companies } = await supabase.from("companies").select("id, name").order("name")

  // Buscar TODOS os registros VMAX (paginação para superar limite de 1000)
  let allVmaxRecords: any[] = []
  let page = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data: vmaxPage, error: vmaxPageError } = await supabase
      .from("VMAX")
      .select("*")
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (vmaxPageError) {
      console.log("[v0] VMAX page error:", vmaxPageError.message)
      break
    }

    console.log(`[v0] VMAX page ${page}: ${vmaxPage?.length || 0} records`)

    if (vmaxPage && vmaxPage.length > 0) {
      allVmaxRecords = [...allVmaxRecords, ...vmaxPage]
      page++
      hasMore = vmaxPage.length === pageSize
    } else {
      hasMore = false
    }
  }

  console.log("[v0] TOTAL VMAX records loaded (after pagination):", allVmaxRecords.length)

  const companiesStats: CompanyStats[] = []

  if (companies) {
    for (const company of companies) {
      const { data: customers } = await supabase.from("customers").select("id").eq("company_id", company.id)

      const vmaxCustomers =
        allVmaxRecords?.filter((v) => {
          const match =
            String(v.id_company || "")
              .toLowerCase()
              .trim() === String(company.id).toLowerCase().trim()
          return match
        }) || []

      const totalCustomers = (customers?.length || 0) + (vmaxCustomers?.length || 0)

      const { data: debts } = await supabase
        .from("debts")
        .select("amount, status, due_date")
        .eq("company_id", company.id)

      const vmaxOverdueDebts = vmaxCustomers?.filter((v) => {
        const diasInadStr = String(v["Dias Inad."] || "0")
        return (Number(diasInadStr.replace(/\./g, "")) || 0) > 0
      }).length || 0

      const vmaxTotalAmount =
        vmaxCustomers?.reduce((sum, v) => {
          const vencidoStr = String(v.Vencido || "0")
          const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
          const value = Number(cleanValue) || 0
          return sum + value
        }, 0) || 0

      const vmaxDebtsFormatted =
        vmaxCustomers?.map((debt) => ({
          amount: 0,
          status: debt["DT Cancelamento"] ? "paid" : "pending",
          due_date: new Date().toISOString(),
        })) || []

      const allDebts = [...(debts || []), ...vmaxDebtsFormatted]

      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("company_id", company.id)
        .eq("role", "admin")

      const regularDebtsAmount = (debts || [])
        .filter((d) => d.status !== "paid")
        .reduce((sum, d) => sum + (Number(d.amount) || 0), 0)

      const totalAmount = regularDebtsAmount + vmaxTotalAmount

      const regularOverdueDebts =
        debts?.filter((d) => {
          if (d.status === "paid") return false
          const dueDate = new Date(d.due_date)
          return dueDate < new Date()
        }).length || 0

      companiesStats.push({
        id: company.id,
        name: company.name,
        totalCustomers,
        totalDebts: allDebts.length,
        totalAmount,
        recoveredAmount: 0,
        recoveryRate: 0,
        overdueDebts: regularOverdueDebts + vmaxOverdueDebts,
        admins: admins?.length || 0,
      })
    }
  }

  const totalStats = {
    totalCompanies: companiesStats.length,
    totalCustomers: companiesStats.reduce((sum, company) => sum + company.totalCustomers, 0),
    totalDebts: companiesStats.reduce((sum, company) => sum + company.totalDebts, 0),
    totalAmount: companiesStats.reduce((sum, company) => sum + company.totalAmount, 0),
    totalOverdue: companiesStats.reduce((sum, company) => sum + company.overdueDebts, 0),
    totalAdmins: companiesStats.reduce((sum, company) => sum + company.admins, 0),
  }

  const { data: recentPayments } = await supabase
    .from("payments")
    .select("id, amount, created_at, debt_id, debts(company_id, companies(name))")
    .order("created_at", { ascending: false })
    .limit(4)

  const { data: recentAnalyses } = await supabase
    .from("credit_profiles")
    .select("id, name, company_id, created_at, score, analysis_type, companies(name)")
    .order("created_at", { ascending: false })
    .limit(3)

  const analysisActivities =
    recentAnalyses?.map((analysis) => ({
      id: analysis.id,
      type: "analysis",
      description: `Análise restritiva realizada - Score: ${analysis.score || "N/A"}`,
      company: analysis.companies?.name || "Empresa",
      amount: null,
      time: new Date(analysis.created_at).toLocaleDateString("pt-BR"),
      status: "info",
    })) || []

  const paymentActivities =
    recentPayments?.map((payment) => ({
      id: payment.id,
      type: "payment",
      description: `Pagamento de R$ ${Number(payment.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} recebido`,
      company: payment.debts?.companies?.name || "Empresa",
      amount: Number(payment.amount),
      time: new Date(payment.created_at).toLocaleDateString("pt-BR"),
      status: "success",
    })) || []

  const recentActivity = [...analysisActivities, ...paymentActivities]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 4)

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Painel Altea Pay - Super Admin</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm lg:text-base">
            Visão geral de todas as empresas clientes e suas operações de cobrança.
          </p>
        </div>
        <div className="flex space-x-2 sm:space-x-3 flex-shrink-0">
          <Button asChild className="w-full sm:w-auto text-xs sm:text-sm">
            <Link href="/super-admin/companies/new">
              <Building2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Nova Empresa</span>
              <span className="sm:hidden">Nova</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Global Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{totalStats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">Clientes ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{totalStats.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{totalStats.totalAdmins} administradores ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Valor Total em Cobrança</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">R$ {(totalStats.totalAmount / 1000).toFixed(2)}k</div>
            <p className="text-xs text-muted-foreground">{totalStats.totalDebts.toLocaleString()} dívidas ativas</p>
          </CardContent>
        </Card>
      </div>

      {/* Companies Overview */}
      <Card>
        <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg lg:text-xl">Empresas Clientes</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Performance e estatísticas por empresa</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="text-xs bg-transparent">
              <Link href="/super-admin/companies">
                Ver Todas
                <ArrowUpRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="space-y-3 sm:space-y-4">
            {companiesStats.map((company) => (
              <div
                key={company.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-0">
                    <div className="bg-altea-gold/10 dark:bg-altea-gold/20 p-1.5 sm:p-2 rounded-lg">
                      <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-altea-navy dark:text-altea-gold" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground truncate text-sm sm:text-base">{company.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {company.totalCustomers.toLocaleString()} clientes • {company.totalDebts.toLocaleString()}{" "}
                        dívidas
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row sm:flex-row sm:items-center gap-3 sm:gap-6 mt-3 sm:mt-0">
                  <div className="text-center sm:text-right">
                    <p className="text-xs sm:text-sm font-medium text-foreground">
                      R$ {(company.totalAmount / 1000).toFixed(2)}k
                    </p>
                    <p className="text-xs text-muted-foreground">Em cobrança</p>
                  </div>

                  {company.overdueDebts > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {company.overdueDebts} em atraso
                    </Badge>
                  )}

                  <Button asChild size="sm" variant="outline" className="text-xs bg-transparent">
                    <Link href={`/super-admin/companies/${company.id}`}>
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Ver
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Activity */}
        <Card className="xl:col-span-2">
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-base sm:text-lg lg:text-xl">Atividade Recente</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Últimas ações e eventos do sistema</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="space-y-3 sm:space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
                  <div className="flex-shrink-0">
                    {activity.status === "success" && (
                      <div className="bg-green-100 dark:bg-green-900/20 p-1.5 sm:p-2 rounded-full">
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                      </div>
                    )}
                    {activity.status === "info" && (
                      <div className="bg-blue-100 dark:bg-blue-900/20 p-1.5 sm:p-2 rounded-full">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                    {activity.status === "warning" && (
                      <div className="bg-orange-100 dark:bg-orange-900/20 p-1.5 sm:p-2 rounded-full">
                        <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground">{activity.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-muted-foreground">{activity.company}</p>
                      <span className="text-xs text-gray-400">•</span>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                  {activity.amount && (
                    <div className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400 hidden sm:block">
                      +R$ {activity.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Overview */}
        <Card>
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-base sm:text-lg lg:text-xl">Visão do Sistema</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Status geral da plataforma</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-green-900 dark:text-green-100 text-xs sm:text-sm lg:text-base">
                    Sistema Operacional
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">Todas as empresas conectadas</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-blue-900 dark:text-blue-100 text-xs sm:text-sm lg:text-base">
                    {totalStats.totalOverdue} Casos Críticos
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Requerem atenção</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-orange-900 dark:text-orange-100 text-xs sm:text-sm lg:text-base">
                    Monitoramento Ativo
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300">IA analisando padrões</p>
                </div>
              </div>
            </div>

            <Button asChild className="w-full bg-transparent text-xs sm:text-sm" variant="outline">
              <Link href="/super-admin/reports">
                <BarChart3 className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Ver Relatórios Detalhados
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
