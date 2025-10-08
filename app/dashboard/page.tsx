import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
} from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()

  console.log("[v0] Dashboard: Iniciando carregamento da página")

  // Get user data
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
    .select("id, name, subscription_plan")
    .eq("id", profile.company_id)
    .single()

  console.log("[v0] Dashboard: Empresa obtida", { company, error: companyError })
  companyData = company

  const companyId = profile.company_id

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id")
    .eq("company_id", companyId)

  console.log("[v0] Dashboard: Clientes obtidos", { count: customers?.length, error: customersError })

  const { data: debts, error: debtsError } = await supabase
    .from("debts")
    .select("amount, status")
    .eq("company_id", companyId)

  console.log("[v0] Dashboard: Dívidas obtidas", { count: debts?.length, error: debtsError })

  const stats = {
    totalCustomers: customers?.length || 0,
    totalDebts: debts?.length || 0,
    totalAmount: debts?.reduce((sum, debt) => sum + (Number(debt.amount) || 0), 0) || 0,
    recoveredAmount:
      debts?.filter((d) => d.status === "paid").reduce((sum, debt) => sum + (Number(debt.amount) || 0), 0) || 0,
    recoveryRate: 0,
    pendingActions: debts?.filter((d) => d.status === "pending" || d.status === "in_collection").length || 0,
  }

  stats.recoveryRate = stats.totalAmount > 0 ? (stats.recoveredAmount / stats.totalAmount) * 100 : 0

  console.log("[v0] Dashboard: Estatísticas finais", stats)

  const recentActivity = [
    {
      id: 1,
      type: "payment",
      description: "Pagamento recebido de João Silva",
      amount: 1250.0,
      time: "2 horas atrás",
      status: "success",
    },
    {
      id: 2,
      type: "collection",
      description: "Email de cobrança enviado para Maria Santos",
      time: "4 horas atrás",
      status: "pending",
    },
    {
      id: 3,
      type: "import",
      description: "Importação de 152 registros concluída",
      time: "1 dia atrás",
      status: "success",
    },
    {
      id: 4,
      type: "overdue",
      description: "15 novas dívidas vencidas identificadas",
      time: "2 dias atrás",
      status: "warning",
    },
  ]

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
        <div className="flex space-x-2 sm:space-x-3 flex-shrink-0">
          <Button asChild className="w-full sm:w-auto text-xs sm:text-sm">
            <Link href="/dashboard/import">
              <Calendar className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Importar Dados</span>
              <span className="sm:hidden">Importar</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{stats.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                +12% mês passado
              </span>
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
              <span className="text-red-600 flex items-center">
                <TrendingDown className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                -5% mês passado
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">
              R${" "}
              {stats.totalAmount > 1000000
                ? (stats.totalAmount / 1000000).toFixed(1) + "M"
                : (stats.totalAmount / 1000).toFixed(0) + "K"}
            </div>
            <p className="text-xs text-muted-foreground">
              R$ {stats.recoveredAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} recuperados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Taxa de Recuperação</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{stats.recoveryRate.toFixed(1)}%</div>
            <Progress value={stats.recoveryRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

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
                    {activity.status === "pending" && (
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
                    <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
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

        {/* Quick Actions */}
        <Card>
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-base sm:text-lg lg:text-xl">Ações Rápidas</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Acesso rápido às principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6 pb-3 sm:pb-6">
            <Button asChild className="w-full justify-start text-xs sm:text-sm h-8 sm:h-10">
              <Link href="/dashboard/import">
                <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Importar Dados
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full justify-start bg-transparent text-xs sm:text-sm h-8 sm:h-10"
            >
              <Link href="/dashboard/customers">
                <Users className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Gerenciar Clientes
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full justify-start bg-transparent text-xs sm:text-sm h-8 sm:h-10"
            >
              <Link href="/dashboard/collection-rules">
                <ArrowUpRight className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Configurar Réguas
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
                    23 Dívidas Críticas
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
                    45 Emails Agendados
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Para envio hoje</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-green-900 dark:text-green-100 text-xs sm:text-sm lg:text-base">
                    21 Acordos Ativos
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
