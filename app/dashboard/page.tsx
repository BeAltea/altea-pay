import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
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

  // Get user data
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Get dashboard stats (mock data for now)
  const stats = {
    totalCustomers: 1247,
    totalDebts: 3456,
    totalAmount: 2847392.5,
    recoveredAmount: 1234567.89,
    recoveryRate: 43.4,
    pendingActions: 89,
  }

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

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Olá, {user.user_metadata?.full_name || "Usuário"}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Aqui está um resumo da sua operação de cobrança hoje.
          </p>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard/import">
              <Calendar className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Importar Dados</span>
              <span className="sm:hidden">Importar</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12% desde o mês passado
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dívidas Ativas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDebts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600 flex items-center">
                <TrendingDown className="h-3 w-3 mr-1" />
                -5% desde o mês passado
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {(stats.totalAmount / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">
              R$ {stats.recoveredAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} recuperados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Recuperação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recoveryRate}%</div>
            <Progress value={stats.recoveryRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Atividade Recente</CardTitle>
            <CardDescription className="text-sm">Últimas ações e eventos do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 sm:space-x-4">
                  <div className="flex-shrink-0">
                    {activity.status === "success" && (
                      <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-full">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                    )}
                    {activity.status === "pending" && (
                      <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-full">
                        <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                    {activity.status === "warning" && (
                      <div className="bg-orange-100 dark:bg-orange-900/20 p-2 rounded-full">
                        <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
                  </div>
                  {activity.amount && (
                    <div className="text-sm font-medium text-green-600 dark:text-green-400 hidden sm:block">
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
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Ações Rápidas</CardTitle>
            <CardDescription className="text-sm">Acesso rápido às principais funcionalidades</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start text-sm">
              <Link href="/dashboard/import">
                <Calendar className="mr-2 h-4 w-4" />
                Importar Dados
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start bg-transparent text-sm">
              <Link href="/dashboard/customers">
                <Users className="mr-2 h-4 w-4" />
                Gerenciar Clientes
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start bg-transparent text-sm">
              <Link href="/dashboard/collection-rules">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Configurar Réguas
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start bg-transparent text-sm">
              <Link href="/dashboard/reports">
                <TrendingUp className="mr-2 h-4 w-4" />
                Ver Relatórios
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Pending Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg sm:text-xl">Ações Pendentes</CardTitle>
              <CardDescription className="text-sm">Itens que precisam da sua atenção</CardDescription>
            </div>
            <Badge variant="secondary">{stats.pendingActions} pendentes</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-orange-900 dark:text-orange-100 text-sm sm:text-base">
                    23 Dívidas Críticas
                  </p>
                  <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-300">Mais de 90 dias em atraso</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-blue-900 dark:text-blue-100 text-sm sm:text-base">
                    45 Emails Agendados
                  </p>
                  <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">Para envio hoje</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-green-900 dark:text-green-100 text-sm sm:text-base">
                    21 Acordos Ativos
                  </p>
                  <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">Acompanhar pagamentos</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
