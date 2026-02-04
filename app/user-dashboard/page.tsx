import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { profiles, companies, vmax, payments, agreements } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  BarChart3,
  Calendar,
  ArrowUpRight,
} from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"
import { EnhancedDebtCard } from "@/components/user-dashboard/enhanced-debt-card"
import { EnhancedExportButton } from "@/components/user-dashboard/enhanced-export-button"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <Skeleton className="h-7 w-64 mb-1" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="h-7 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))}
      </div>
    </div>
  )
}

export default async function UserDashboardPage() {
  try {
    const session = await auth()
    const user = session?.user

    if (!user) {
      redirect("/auth/login")
    }

    let profile: any = null
    try {
      const [profileData] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1)

      if (!profileData) {
        profile = {
          fullName: user.email?.split("@")[0] || "Usuário",
          email: user.email,
        }
      } else {
        profile = profileData
      }
    } catch (error) {
      console.error("Exception fetching profile:", error)
      profile = {
        fullName: user.email?.split("@")[0] || "Usuário",
        email: user.email,
      }
    }

    const allDebts: any[] = []

    if (profile?.cpfCnpj) {
      const cleanCpfCnpj = profile.cpfCnpj.replace(/\D/g, "")
      const formattedCpfCnpj = profile.cpfCnpj

      try {
        // Buscar TODOS os registros VMAX
        const allRecords = await db.select().from(vmax)

        if (allRecords.length > 0) {
          const matchingRecords = allRecords.filter((record: any) => {
            const value = String(record.cpfCnpj || "")
            const cleanValue = value.replace(/\D/g, "")
            return cleanValue === cleanCpfCnpj || value === formattedCpfCnpj
          })

          if (matchingRecords.length > 0) {
            let companyId = profile.companyId
            let companyName = "VMAX"

            const [vmaxCompany] = await db
              .select({ id: companies.id, name: companies.name })
              .from(companies)
              .where(eq(companies.name, "VMAX"))
              .limit(1)

            if (vmaxCompany) {
              companyId = vmaxCompany.id
              companyName = vmaxCompany.name
            }

            const formattedDebts = matchingRecords.map((debt) => {
              let amount = 0
              if (debt.valorTotal) {
                const vencidoStr = String(debt.valorTotal)
                const cleanValue = vencidoStr
                  .replace(/R\$/g, "")
                  .replace(/\s/g, "")
                  .replace(/\./g, "")
                  .replace(",", ".")
                amount = Number.parseFloat(cleanValue) || 0
              }

              let daysOverdue = 0
              if (debt.maiorAtraso) {
                daysOverdue = Number.parseInt(String(debt.maiorAtraso).replace(/\D/g, "")) || 0
              }

              const dueDate = debt.primeiraVencida || new Date().toISOString()

              return {
                id: debt.id || `VMAX-${Math.random()}`,
                user_id: user.id,
                customer_id: null,
                amount: amount,
                due_date: dueDate,
                status: daysOverdue > 0 ? "overdue" : "open",
                description: `Fatura - ${debt.cliente || "Sem descrição"}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                propensity_payment_score: 0,
                propensity_loan_score: 0,
                classification: daysOverdue > 90 ? "high_risk" : daysOverdue > 30 ? "medium_risk" : "low_risk",
                source_system: "VMAX",
                external_id: debt.id,
                company_id: companyId,
                company_name: companyName,
                days_overdue: daysOverdue,
              }
            })

            allDebts.push(...formattedDebts)
          }
        }
      } catch (error) {
        console.error("Error searching VMAX:", error)
      }
    }

    const paymentsList = await db
      .select()
      .from(payments)
      .where(eq(payments.customerId, user.id))
      .orderBy(desc(payments.createdAt))

    const agreementsList = await db
      .select()
      .from(agreements)
      .where(eq(agreements.customerId, user.id))
      .orderBy(desc(agreements.createdAt))

    const getOpenDebts = (debts: any[]) =>
      debts?.filter((debt) => ["open", "overdue", "in_collection"].includes(debt.status)) || []

    const getOverdueDebts = (debts: any[]) => debts?.filter((debt) => debt.status === "overdue") || []

    const getPaidDebts = (debts: any[]) => debts?.filter((debt) => debt.status === "paid") || []

    const getTotalOpenAmount = (debts: any[]) => getOpenDebts(debts).reduce((sum, debt) => sum + Number(debt.amount), 0)

    const getTotalPaidAmount = (debts: any[]) => getPaidDebts(debts).reduce((sum, debt) => sum + Number(debt.amount), 0)

    const getAveragePaymentScore = (debts: any[]) => {
      const openDebts = getOpenDebts(debts)
      return openDebts.length
        ? openDebts.reduce((sum, debt) => sum + Number(debt.propensity_payment_score || 0), 0) / openDebts.length
        : 0
    }

    const getAverageLoanScore = (debts: any[]) => {
      const openDebts = getOpenDebts(debts)
      return openDebts.length
        ? openDebts.reduce((sum, debt) => sum + Number(debt.propensity_loan_score || 0), 0) / openDebts.length
        : 0
    }

    const totalDebts = allDebts?.length || 0
    const openDebts = getOpenDebts(allDebts || [])
    const paidDebts = getPaidDebts(allDebts || [])
    const overdueDebts = getOverdueDebts(allDebts || [])

    const totalOpenAmount = getTotalOpenAmount(allDebts || [])
    const totalPaidAmount = getTotalPaidAmount(allDebts || [])

    const avgPaymentScore = getAveragePaymentScore(allDebts || [])
    const avgLoanScore = getAverageLoanScore(allDebts || [])

    const recentActivity: any[] = []

    if (paymentsList && paymentsList.length > 0) {
      paymentsList.slice(0, 2).forEach((payment) => {
        const debt = allDebts?.find((d) => d.id === payment.debtId)
        recentActivity.push({
          id: `payment-${payment.id}`,
          type: "payment",
          message: `Pagamento ${payment.status === "completed" ? "concluído" : payment.status === "pending" ? "pendente" : "falhou"} - ${debt?.description || "Dívida"}`,
          amount: payment.status === "completed" ? Number(payment.amount) : null,
          date: new Date(payment.createdAt).toLocaleDateString("pt-BR"),
          icon: payment.status === "completed" ? CheckCircle : payment.status === "pending" ? Clock : AlertCircle,
          color:
            payment.status === "completed"
              ? "text-green-600"
              : payment.status === "pending"
                ? "text-blue-600"
                : "text-red-600",
        })
      })
    }

    if (agreementsList && agreementsList.length > 0) {
      agreementsList.slice(0, 1).forEach((agreement) => {
        const debt = allDebts?.find((d) => d.id === agreement.debtId)
        recentActivity.push({
          id: `agreement-${agreement.id}`,
          type: "negotiation",
          message: `Negociação ${agreement.status === "accepted" ? "aceita" : agreement.status === "pending" ? "pendente" : "em análise"} - ${debt?.description || "Dívida"}`,
          date: new Date(agreement.createdAt).toLocaleDateString("pt-BR"),
          icon: MessageSquare,
          color: agreement.status === "accepted" ? "text-green-600" : "text-blue-600",
        })
      })
    }

    if (overdueDebts.length > 0) {
      recentActivity.push({
        id: "overdue-notification",
        type: "overdue",
        message: `${overdueDebts.length} dívida${overdueDebts.length > 1 ? "s" : ""} em atraso`,
        date: "Hoje",
        icon: AlertCircle,
        color: "text-red-600",
      })
    }

    recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const limitedActivity = recentActivity.slice(0, 5)

    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                Olá, {profile?.fullName || "Usuário"}!
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm lg:text-base">
                Acompanhe suas dívidas, histórico de pagamentos e negocie acordos.
              </p>
            </div>
            {overdueDebts.length > 0 && (
              <div className="flex-shrink-0">
                <Badge variant="destructive" className="text-xs">
                  {overdueDebts.length} dívida{overdueDebts.length > 1 ? "s" : ""} em atraso
                </Badge>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Dívidas em Aberto</CardTitle>
                <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3">
                <div className="text-lg sm:text-2xl font-bold">{openDebts.length}</div>
                <p className="text-xs text-muted-foreground">
                  R$ {totalOpenAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                {overdueDebts.length > 0 && (
                  <Badge variant="destructive" className="mt-1 text-xs">
                    {overdueDebts.length} em atraso
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Dívidas Pagas</CardTitle>
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3">
                <div className="text-lg sm:text-2xl font-bold">{paidDebts.length}</div>
                <p className="text-xs text-muted-foreground">
                  R$ {totalPaidAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                {totalDebts > 0 && <Progress value={(paidDebts.length / totalDebts) * 100} className="mt-1" />}
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Propensão ao Pagamento</CardTitle>
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3">
                <div className="text-lg sm:text-2xl font-bold">{avgPaymentScore.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Média geral</p>
                <Progress value={avgPaymentScore} className="mt-1" />
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Propensão a Empréstimo</CardTitle>
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3">
                <div className="text-lg sm:text-2xl font-bold">{avgLoanScore.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Média geral</p>
                <Progress value={avgLoanScore} className="mt-1" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4">
            <Card className="xl:col-span-2">
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Dívidas Recentes</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Suas dívidas que precisam de atenção
                    </CardDescription>
                  </div>
                  <EnhancedExportButton data={openDebts} filename="dividas-recentes" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="space-y-2 sm:space-y-3">
                  {openDebts.slice(0, 4).map((debt) => (
                    <EnhancedDebtCard key={debt.id} debt={debt} />
                  ))}
                  {openDebts.length === 0 && (
                    <div className="text-center py-4 sm:py-6">
                      <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-500 mx-auto mb-2" />
                      <p className="text-muted-foreground text-xs sm:text-sm">Parabéns! Nenhuma dívida em aberto</p>
                    </div>
                  )}
                </div>
                <div className="mt-2 sm:mt-3">
                  <Link href="/user-dashboard/debts">
                    <Button
                      variant="outline"
                      className="w-full bg-transparent hover:bg-altea-gold/10 border-altea-gold/30 text-altea-navy dark:text-altea-gold transition-colors text-xs sm:text-sm"
                    >
                      Ver Todas as Dívidas
                      <ArrowUpRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-base sm:text-lg">Atividade Recente</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Últimas ações e eventos</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="space-y-2 sm:space-y-3">
                  {limitedActivity.length > 0 ? (
                    limitedActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-2 sm:space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          {activity.icon && (
                            <div className="bg-altea-gold/10 dark:bg-altea-gold/20 p-1 sm:p-1.5 rounded-full">
                              <activity.icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${activity.color}`} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-foreground leading-tight">
                            {activity.message}
                          </p>
                          {activity.amount && (
                            <p className="text-xs sm:text-sm text-green-600 font-medium">
                              R$ {activity.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">{activity.date}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-3 sm:py-4 text-xs sm:text-sm">
                      Nenhuma atividade recente
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-base sm:text-lg">Ações Rápidas</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Acesso rápido às principais funcionalidades
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <Link href="/user-dashboard/debts">
                  <Button className="w-full h-12 sm:h-14 flex flex-col space-y-1 bg-altea-navy hover:bg-altea-navy/90 text-altea-gold transition-colors">
                    <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">Ver Dívidas</span>
                  </Button>
                </Link>
                <Link href="/user-dashboard/history">
                  <Button
                    variant="outline"
                    className="w-full h-12 sm:h-14 flex flex-col space-y-1 bg-transparent hover:bg-altea-gold/10 border-altea-gold/30 text-altea-navy dark:text-altea-gold transition-colors"
                  >
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">Histórico</span>
                  </Button>
                </Link>
                <Link href="/user-dashboard/negotiation">
                  <Button
                    variant="outline"
                    className="w-full h-12 sm:h-14 flex flex-col space-y-1 bg-transparent hover:bg-altea-gold/10 border-altea-gold/30 text-altea-navy dark:text-altea-gold transition-colors"
                  >
                    <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">Negociar</span>
                  </Button>
                </Link>
                <Link href="/user-dashboard/propensity">
                  <Button
                    variant="outline"
                    className="w-full h-12 sm:h-14 flex flex-col space-y-1 bg-transparent hover:bg-altea-gold/10 border-altea-gold/30 text-altea-navy dark:text-altea-gold transition-colors"
                  >
                    <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">Análise</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </Suspense>
    )
  } catch (error) {
    console.error("Error:", error)
    throw error
  }
}
