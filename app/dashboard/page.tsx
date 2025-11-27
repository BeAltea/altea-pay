import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, CreditCard, TrendingUp, DollarSign, AlertTriangle, CheckCircle, Clock } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = await createClient()

  console.log("[v0] Dashboard: Iniciando carregamento da página")

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  console.log("[v0] Dashboard: Usuário obtido", { user: user?.id, error: userError })

  if (!user) {
    console.log("[v0] Dashboard: Usuário não encontrado, retornando null")
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, company_id, full_name")
    .eq("id", user.id)
    .single()

  console.log("[v0] Dashboard: Perfil obtido", { profile, error: profileError })

  if (!profile) {
    console.log("[v0] Dashboard: Perfil não encontrado, retornando null")
    return null
  }

  if (!profile.company_id) {
    console.log("[v0] Dashboard: No company_id found, showing warning")
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Sua conta não está vinculada a nenhuma empresa. Entre em contato com o administrador.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  let companyData = null
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", profile.company_id)
    .single()

  console.log("[v0] Dashboard: Empresa obtida", { company, error: companyError })
  companyData = company

  const companyId = profile.company_id

  const { data: allVmaxRecords, error: vmaxError } = await supabase.from("VMAX").select("*")

  if (vmaxError) {
    console.error("[v0] ❌ Erro ao buscar VMAX:", vmaxError)
  } else {
    console.log("[v0] 📊 VMAX total records in database:", allVmaxRecords?.length || 0)
  }

  // Filtrar localmente por company_id (igual ao super-admin)
  const vmaxCustomersFiltered = (allVmaxRecords || []).filter(
    (v: any) =>
      String(v.id_company || "")
        .toLowerCase()
        .trim() === String(companyId).toLowerCase().trim(),
  )

  console.log(`[v0] ✅ VMAX clientes da empresa ${companyData?.name}: ${vmaxCustomersFiltered.length}`)

  // Buscar dados complementares da integration_logs para os IDs dos clientes VMAX
  let integrationLogsData = []
  if (vmaxCustomersFiltered.length > 0) {
    const vmaxIds = vmaxCustomersFiltered.map((v: any) => v.id).filter(Boolean)
    const { data: logsData } = await supabase.from("integration_logs").select("*").in("id", vmaxIds)

    integrationLogsData = logsData || []
    console.log(`[v0] 📊 Integration logs encontrados: ${integrationLogsData.length}`)
  }

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id")
    .eq("company_id", companyId)

  const totalCustomers = (customers?.length || 0) + vmaxCustomersFiltered.length

  console.log("[v0] Dashboard: Clientes obtidos", {
    customersTable: customers?.length,
    vmaxTable: vmaxCustomersFiltered.length,
    total: totalCustomers,
    error: customersError,
  })

  const { data: debts, error: debtsError } = await supabase
    .from("debts")
    .select("amount, status")
    .eq("company_id", companyId)

  const vmaxDebtsFormatted = vmaxCustomersFiltered.map((debt: any) => {
    const vencidoStr = String(debt.Vencido || "0")
    const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
    const amount = Number(cleanValue) || 0

    return {
      amount,
      status: debt.DT_Cancelamento ? "paid" : "pending",
      diasInad: Number(debt.Dias_Inad) || 0,
    }
  })

  const allDebts = [...(debts || []), ...vmaxDebtsFormatted]

  console.log("[v0] Dashboard: Dívidas obtidas", {
    debtsTable: debts?.length,
    vmaxTable: vmaxDebtsFormatted.length,
    total: allDebts.length,
    error: debtsError,
  })

  const stats = {
    totalCustomers,
    totalDebts: allDebts.length,
    totalAmount: allDebts.reduce((sum, debt) => sum + (Number(debt.amount) || 0), 0),
    pendingActions: allDebts.filter((d) => d.status === "pending" || d.status === "in_collection").length,
  }

  const criticalDebts = vmaxDebtsFormatted.filter((d) => d.diasInad > 90).length

  // Since we can't filter by company, we'll just count pending scheduled actions from debts
  const scheduledCount = 0 // Placeholder - would need to join through debt_id to filter by company

  const { data: activeDebts } = await supabase
    .from("debts")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "in_collection")

  const agreementsCount = activeDebts?.length || 0

  console.log("[v0] Dashboard: Estatísticas finais", stats)

  const displayName = profile.full_name || user.user_metadata?.full_name || "Usuário"
  const companyName = companyData?.name

  console.log("[v0] Dashboard: Renderizando página", { displayName, companyName })

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Olá, {displayName}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-xs sm:text-sm lg:text-base">
            {companyName
              ? `Resumo da operação de cobrança da ${companyName} hoje.`
              : "Aqui está um resumo da sua operação de cobrança hoje."}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{stats.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/dashboard/clientes" className="text-blue-600 hover:underline">
                Ver todos os clientes
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Dívidas Ativas</CardTitle>
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{stats.totalDebts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/dashboard/debts" className="text-blue-600 hover:underline">
                Gerenciar dívidas
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Valor Total em Cobrança</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">
              R${" "}
              {stats.totalAmount > 1000000
                ? (stats.totalAmount / 1000000).toFixed(1) + "M"
                : (stats.totalAmount / 1000).toFixed(0) + "K"}
            </div>
            <p className="text-xs text-muted-foreground">{stats.totalDebts} dívidas pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Quick Actions */}
        <Card className="xl:col-span-1">
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-base sm:text-lg lg:text-xl">Ações Rápidas</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Acesso rápido às principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6 pb-3 sm:pb-6">
            <Button
              asChild
              variant="outline"
              className="w-full justify-start bg-transparent text-xs sm:text-sm h-8 sm:h-10"
            >
              <Link href="/dashboard/clientes">
                <Users className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Gerenciar Clientes
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full justify-start bg-transparent text-xs sm:text-sm h-8 sm:h-10"
            >
              <Link href="/dashboard/debts">
                <CreditCard className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Gerenciar Dívidas
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full justify-start bg-transparent text-xs sm:text-sm h-8 sm:h-10"
            >
              <Link href="/dashboard/reports">
                <TrendingUp className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Ver Relatórios
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-base sm:text-lg lg:text-xl">Visão Geral</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Estatísticas da sua operação</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Dívidas Críticas</span>
                  <span className="text-lg font-bold text-orange-600">{criticalDebts}</span>
                </div>
                <div className="text-xs text-gray-500">Mais de 90 dias em atraso</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Ações Agendadas</span>
                  <span className="text-lg font-bold text-blue-600">{scheduledCount}</span>
                </div>
                <div className="text-xs text-gray-500">Cobranças programadas</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Acordos Ativos</span>
                  <span className="text-lg font-bold text-green-600">{agreementsCount}</span>
                </div>
                <div className="text-xs text-gray-500">Acompanhar pagamentos</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total de Clientes VMAX</span>
                  <span className="text-lg font-bold text-purple-600">{vmaxCustomersFiltered.length}</span>
                </div>
                <div className="text-xs text-gray-500">Integrados da base VMAX</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Actions */}
      <Card>
        <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg lg:text-xl">Ações Pendentes</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Itens que precisam da sua atenção</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              {stats.pendingActions} pendentes
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-orange-900 dark:text-orange-100 text-xs sm:text-sm lg:text-base">
                    {criticalDebts} Dívidas Críticas
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300">Mais de 90 dias em atraso</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-blue-900 dark:text-blue-100 text-xs sm:text-sm lg:text-base">
                    {scheduledCount} Ações Agendadas
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Cobranças programadas</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-green-900 dark:text-green-100 text-xs sm:text-sm lg:text-base">
                    {agreementsCount} Acordos Ativos
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">Acompanhar pagamentos</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
