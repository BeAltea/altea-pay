import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { agreements, debts } from "@/lib/db/schema"
import { eq, desc, inArray } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, DollarSign, Clock, CheckCircle, AlertCircle, Plus, Filter } from "lucide-react"
import { NegotiationCard } from "@/components/user-dashboard/negotiation-card"
import { NegotiationFilters } from "@/components/user-dashboard/negotiation-filters"
import { CreateNegotiationDialog } from "@/components/user-dashboard/create-negotiation-dialog"

export default async function UserNegotiationsPage() {
  const session = await auth()
  const user = session?.user

  if (!user) return null

  // Get user's negotiations
  const negotiationsList = await db
    .select()
    .from(agreements)
    .where(eq(agreements.customerId, user.id))
    .orderBy(desc(agreements.createdAt))

  // Get user's debts to match with negotiations
  const debtsList = await db
    .select()
    .from(debts)
    .where(eq(debts.customerId, user.id))

  // Map negotiations with debt info
  const negotiations = negotiationsList.map((negotiation) => {
    const debt = debtsList.find((d) => d.id === negotiation.debtId)
    return {
      ...negotiation,
      debts: debt ? {
        id: debt.id,
        description: debt.description,
        amount: debt.amount,
        due_date: debt.dueDate,
        status: debt.status,
        user_id: debt.customerId,
      } : null,
    }
  })

  // Get user's open debts for creating new negotiations
  const openDebts = await db
    .select()
    .from(debts)
    .where(eq(debts.customerId, user.id))
    .orderBy(debts.dueDate)

  // Filter open debts by status
  const filteredOpenDebts = openDebts.filter(d =>
    ["open", "overdue", "in_collection"].includes(d.status || "")
  )

  // Calculate summary stats
  const totalNegotiations = negotiations?.length || 0
  const activeNegotiations = negotiations?.filter((n) => n.status === "active") || []
  const acceptedNegotiations = negotiations?.filter((n) => n.status === "accepted") || []
  const rejectedNegotiations = negotiations?.filter((n) => n.status === "rejected") || []
  const completedNegotiations = negotiations?.filter((n) => n.status === "completed") || []

  const totalNegotiatedAmount =
    negotiations?.reduce((sum, negotiation) => sum + Number(negotiation.agreedAmount || 0), 0) || 0
  const totalSavings =
    negotiations?.reduce((sum, negotiation) => {
      if (negotiation.status === "accepted" || negotiation.status === "completed") {
        const originalAmount = Number(negotiation.originalAmount || 0)
        const negotiatedAmount = Number(negotiation.agreedAmount || 0)
        return sum + (originalAmount - negotiatedAmount)
      }
      return sum
    }, 0) || 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Negociações</h1>
          <p className="text-muted-foreground">Gerencie suas propostas de negociação e acordos de pagamento</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <CreateNegotiationDialog openDebts={filteredOpenDebts.map(d => ({
            id: d.id,
            description: d.description || "",
            amount: String(d.amount),
            due_date: d.dueDate,
            status: d.status || "",
          })) || []} />
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
            <CardTitle className="text-sm font-medium">Total de Negociações</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNegotiations}</div>
            <p className="text-xs text-muted-foreground">
              {activeNegotiations.length} ativas, {acceptedNegotiations.length} aceitas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Negociado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalNegotiatedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Em {totalNegotiations} propostas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Economia Total</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {totalSavings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {acceptedNegotiations.length + completedNegotiations.length} acordos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalNegotiations > 0
                ? (((acceptedNegotiations.length + completedNegotiations.length) / totalNegotiations) * 100).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {rejectedNegotiations.length} rejeitadas
              {rejectedNegotiations.length > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  {rejectedNegotiations.length}
                </Badge>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Negotiations Alert */}
      {activeNegotiations.length > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  {activeNegotiations.length} negociação{activeNegotiations.length > 1 ? "ões" : ""} aguardando resposta
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Acompanhe o status das suas propostas e aguarde a resposta da empresa.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions for Open Debts */}
      {filteredOpenDebts && filteredOpenDebts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dívidas Disponíveis para Negociação</CardTitle>
            <p className="text-sm text-muted-foreground">
              Você tem {filteredOpenDebts.length} dívida{filteredOpenDebts.length > 1 ? "s" : ""} que pode
              {filteredOpenDebts.length > 1 ? "m" : ""} ser negociada{filteredOpenDebts.length > 1 ? "s" : ""}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOpenDebts.slice(0, 3).map((debt) => (
                <div key={debt.id} className="border rounded-lg p-4">
                  <h4 className="font-medium">{debt.description}</h4>
                  <p className="text-sm text-muted-foreground">
                    R$ {Number(debt.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vence em {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString("pt-BR") : "-"}
                  </p>
                  <CreateNegotiationDialog
                    openDebts={[{
                      id: debt.id,
                      description: debt.description || "",
                      amount: String(debt.amount),
                      due_date: debt.dueDate,
                      status: debt.status || "",
                    }]}
                    triggerButton={
                      <Button size="sm" className="mt-2 w-full">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Negociar
                      </Button>
                    }
                  />
                </div>
              ))}
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
          <NegotiationFilters />
        </CardContent>
      </Card>

      {/* Negotiations List */}
      <div className="space-y-4">
        {negotiations && negotiations.length > 0 ? (
          negotiations.map((negotiation) => <NegotiationCard key={negotiation.id} negotiation={negotiation} />)
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma negociação encontrada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Você ainda não iniciou nenhuma negociação. Comece negociando suas dívidas em aberto.
              </p>
              {filteredOpenDebts && filteredOpenDebts.length > 0 && (
                <CreateNegotiationDialog
                  openDebts={filteredOpenDebts.map(d => ({
                    id: d.id,
                    description: d.description || "",
                    amount: String(d.amount),
                    due_date: d.dueDate,
                    status: d.status || "",
                  }))}
                  triggerButton={
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Iniciar Negociação
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary Footer */}
      {negotiations && negotiations.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Exibindo {negotiations.length} negociação{negotiations.length > 1 ? "ões" : ""} • Economia total: R${" "}
                {totalSavings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} • Taxa de sucesso:{" "}
                {totalNegotiations > 0
                  ? (((acceptedNegotiations.length + completedNegotiations.length) / totalNegotiations) * 100).toFixed(
                      1,
                    )
                  : 0}
                %
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
