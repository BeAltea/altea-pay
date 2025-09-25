import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, DollarSign, Clock, TrendingUp, Download, Filter } from "lucide-react"
import { PaymentCard } from "@/components/user-dashboard/payment-card"
import { PaymentFilters } from "@/components/user-dashboard/payment-filters"
import { PaymentChart } from "@/components/user-dashboard/payment-chart"

export default async function UserPaymentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's payments with debt information
  const { data: payments } = await supabase
    .from("payments")
    .select(`
      *,
      debts (
        description,
        due_date,
        user_id
      )
    `)
    .eq("debts.user_id", user.id)
    .order("payment_date", { ascending: false })

  // Get payment statistics
  const totalPayments = payments?.length || 0
  const completedPayments = payments?.filter((p) => p.status === "completed") || []
  const pendingPayments = payments?.filter((p) => p.status === "pending") || []
  const failedPayments = payments?.filter((p) => p.status === "failed") || []

  const totalPaidAmount = completedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const totalPendingAmount = pendingPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)

  // Calculate monthly payment data for chart
  const monthlyData = payments?.reduce(
    (acc, payment) => {
      if (payment.status === "completed") {
        const month = new Date(payment.payment_date).toLocaleDateString("pt-BR", {
          year: "numeric",
          month: "short",
        })
        acc[month] = (acc[month] || 0) + Number(payment.amount)
      }
      return acc
    },
    {} as Record<string, number>,
  )

  const chartData = Object.entries(monthlyData || {})
    .map(([month, amount]) => ({ month, amount }))
    .slice(-6) // Last 6 months

  // Payment method distribution
  const paymentMethods = payments?.reduce(
    (acc, payment) => {
      if (payment.status === "completed") {
        acc[payment.payment_method] = (acc[payment.payment_method] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico de Pagamentos</h1>
          <p className="text-muted-foreground">Acompanhe todos os seus pagamentos e transações realizadas</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button variant="outline" size="sm" className="bg-transparent">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" size="sm" className="bg-transparent">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pagamentos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayments}</div>
            <p className="text-xs text-muted-foreground">
              {completedPayments.length} concluídos, {pendingPayments.length} pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {totalPaidAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">{completedPayments.length} transações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              R$ {totalPendingAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">{pendingPayments.length} aguardando</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalPayments > 0 ? ((completedPayments.length / totalPayments) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {failedPayments.length} falharam
              {failedPayments.length > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  {failedPayments.length}
                </Badge>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução dos Pagamentos</CardTitle>
            <p className="text-sm text-muted-foreground">Valores pagos nos últimos 6 meses</p>
          </CardHeader>
          <CardContent>
            <PaymentChart data={chartData} />
          </CardContent>
        </Card>
      )}

      {/* Payment Methods Summary */}
      {paymentMethods && Object.keys(paymentMethods).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Métodos de Pagamento</CardTitle>
            <p className="text-sm text-muted-foreground">Distribuição por método utilizado</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(paymentMethods).map(([method, count]) => {
                const methodNames = {
                  pix: "PIX",
                  boleto: "Boleto",
                  cartao: "Cartão",
                  transferencia: "Transferência",
                }
                return (
                  <div key={method} className="text-center">
                    <div className="text-2xl font-bold">{count}</div>
                    <p className="text-sm text-muted-foreground">
                      {methodNames[method as keyof typeof methodNames] || method}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros e Busca</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentFilters />
        </CardContent>
      </Card>

      {/* Payments List */}
      <div className="space-y-4">
        {payments && payments.length > 0 ? (
          payments.map((payment) => <PaymentCard key={payment.id} payment={payment} />)
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum pagamento encontrado</h3>
              <p className="text-muted-foreground text-center">Você ainda não realizou nenhum pagamento.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary Footer */}
      {payments && payments.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Exibindo {payments.length} pagamento{payments.length > 1 ? "s" : ""} • Total pago: R${" "}
                {totalPaidAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} • Taxa de sucesso:{" "}
                {totalPayments > 0 ? ((completedPayments.length / totalPayments) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
