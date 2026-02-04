import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { profiles, companies, vmax, customers, debts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, CreditCard, TrendingUp, DollarSign, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { NewCustomerModal } from "@/components/dashboard/new-customer-modal"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()
  const user = session?.user

  if (!user) {
    return null
  }

  const [profile] = await db
    .select({ role: profiles.role, companyId: profiles.companyId, fullName: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1)

  if (!profile) {
    return null
  }

  if (!profile.companyId) {
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

  const companyId = profile.companyId

  const [companyData] = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1)

  // Buscar TODOS os registros da empresa
  const vmaxData = await db
    .select()
    .from(vmax)
    .where(eq(vmax.idCompany, companyId))

  const customersList = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.companyId, companyId))

  const totalCustomers = (customersList?.length || 0) + vmaxData.length

  const debtsList = await db
    .select({ amount: debts.amount, status: debts.status })
    .from(debts)
    .where(eq(debts.companyId, companyId))

  const vmaxDebtsFormatted = vmaxData.map((debt: any) => {
    const vencidoStr = String(debt.valorTotal || "0")
    const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
    const amount = Number(cleanValue) || 0

    const diasInadStr = String(debt.maiorAtraso || "0")
    return {
      amount,
      status: "pending",
      diasInad: Number(String(diasInadStr).replace(/\./g, "")) || 0,
    }
  })

  const allDebts = [...(debtsList || []), ...vmaxDebtsFormatted]

  const stats = {
    totalCustomers,
    totalDebts: allDebts.length,
    totalAmount: allDebts.reduce((sum, debt) => sum + (Number(debt.amount) || 0), 0),
    pendingActions: allDebts.filter((d) => d.status === "pending" || d.status === "in_collection").length,
  }

  const criticalDebts = vmaxDebtsFormatted.filter((d) => d.diasInad > 90).length

  const scheduledCount = 0

  const activeDebts = await db
    .select({ id: debts.id })
    .from(debts)
    .where(eq(debts.companyId, companyId))

  const inCollectionDebts = activeDebts?.filter((d: any) => false) || [] // status filter not available in select
  const agreementsCount = 0 // Would need status filter

  const collectionStats = await db
    .select({
      approvalStatus: vmax.approvalStatus,
      autoCollectionEnabled: vmax.autoCollectionEnabled,
      collectionProcessedAt: vmax.collectionProcessedAt,
    })
    .from(vmax)
    .where(eq(vmax.idCompany, companyId))

  const autoCollectedCount = (collectionStats || []).filter((c) => c.collectionProcessedAt).length
  const pendingManualCount = (collectionStats || []).filter(
    (c) => c.approvalStatus === "ACEITA" && !c.autoCollectionEnabled && !c.collectionProcessedAt,
  ).length
  const rejectedCount = (collectionStats || []).filter((c) => c.approvalStatus === "REJEITA").length

  const displayName = profile.fullName || "Usuário"
  const companyName = companyData?.name

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
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
          <NewCustomerModal companyId={companyId} />
        </div>
      </div>

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

      <Card>
        <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-base sm:text-lg lg:text-xl">Status de Cobrança Automática</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Visão de clientes cobrados automaticamente vs manual
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{autoCollectedCount}</p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">Cobrados Automaticamente</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">Por régua de cobrança automática</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-orange-600">{pendingManualCount}</p>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">Pendentes Cobrança Manual</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    Não se encaixam na régua automática
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
              {pendingManualCount > 0 && (
                <Button asChild size="sm" variant="outline" className="w-full mt-3 bg-transparent">
                  <Link href="/dashboard/debts?filter=pending_manual">Ver Clientes Pendentes</Link>
                </Button>
              )}
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">Rejeitados por Análise</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">Score baixo ou risco alto</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
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
                  <span className="text-lg font-bold text-purple-600">{vmaxData.length}</span>
                </div>
                <div className="text-xs text-gray-500">Integrados da base VMAX</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
