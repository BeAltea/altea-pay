import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, DollarSign, Clock, CheckCircle, AlertCircle, Plus, Filter } from "lucide-react"
import { NegotiationCard } from "@/components/user-dashboard/negotiation-card"
import { NegotiationFilters } from "@/components/user-dashboard/negotiation-filters"
import { CreateNegotiationDialog } from "@/components/user-dashboard/create-negotiation-dialog"

export default async function UserNegotiationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's negotiations with debt information
  const { data: negotiations } = await supabase
    .from("negotiations")
    .select(`
      *,
      debts (
        id,
        description,
        amount,
        due_date,
        status,
        user_id
      )
    `)
    .eq("debts.user_id", user.id)
    .order("created_at", { ascending: false })

  // Get user's open debts for creating new negotiations
  const { data: openDebts } = await supabase
    .from("debts")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["open", "overdue", "in_collection"])
    .order("due_date", { ascending: true })

  // Calculate summary stats
  const totalNegotiations = negotiations?.length || 0
  const activeNegotiations = negotiations?.filter((n) => n.status === "active") || []
  const acceptedNegotiations = negotiations?.filter((n) => n.status === "accepted") || []
  const rejectedNegotiations = negotiations?.filter((n) => n.status === "rejected") || []
  const completedNegotiations = negotiations?.filter((n) => n.status === "completed") || []

  const totalNegotiatedAmount =
    negotiations?.reduce((sum, negotiation) => sum + Number(negotiation.proposed_amount), 0) || 0
  const totalSavings =
    negotiations?.reduce((sum, negotiation) => {
      if (negotiation.status === "accepted" || negotiation.status === "completed") {
        const originalAmount = Number(negotiation.debts?.amount || 0)
        const negotiatedAmount = Number(negotiation.proposed_amount)
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
          <CreateNegotiationDialog openDebts={openDebts || []} />
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
      {openDebts && openDebts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dívidas Disponíveis para Negociação</CardTitle>
            <p className="text-sm text-muted-foreground">
              Você tem {openDebts.length} dívida{openDebts.length > 1 ? "s" : ""} que pode
              {openDebts.length > 1 ? "m" : ""} ser negociada{openDebts.length > 1 ? "s" : ""}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openDebts.slice(0, 3).map((debt) => (
                <div key={debt.id} className="border rounded-lg p-4">
                  <h4 className="font-medium">{debt.description}</h4>
                  <p className="text-sm text-muted-foreground">
                    R$ {Number(debt.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vence em {new Date(debt.due_date).toLocaleDateString("pt-BR")}
                  </p>
                  <CreateNegotiationDialog
                    openDebts={[debt]}
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
              {openDebts && openDebts.length > 0 && (
                <CreateNegotiationDialog
                  openDebts={openDebts}
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
