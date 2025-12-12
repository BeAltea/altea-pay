"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"
import {
  CreditCard,
  DollarSign,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  RefreshCw,
  Filter,
  MessageSquare,
} from "lucide-react"
import { DebtFilters } from "@/components/user-dashboard/debt-filters"
import { EnhancedDebtCard } from "@/components/user-dashboard/enhanced-debt-card"
import { EnhancedExportButton } from "@/components/user-dashboard/enhanced-export-button"
import { CreateNegotiationDialog } from "@/components/user-dashboard/create-negotiation-dialog"

function DebtsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-16 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function UserDebtsPage() {
  const [debts, setDebts] = useState([])
  const [filteredDebts, setFilteredDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchDebts()
  }, [])

  const fetchDebts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()

      if (!profile || !profile.cpf_cnpj) {
        setDebts([])
        setFilteredDebts([])
        setLoading(false)
        return
      }

      const response = await fetch("/api/get-user-debts-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, cpfCnpj: profile.cpf_cnpj }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      const realDebts = data.debts || []
      setDebts(realDebts)
      setFilteredDebts(realDebts)
    } catch (error) {
      console.error("Error fetching debts:", error)
      toast({
        title: "Erro ao carregar dívidas",
        description: "Não foi possível carregar suas dívidas.",
        variant: "destructive",
      })
      setDebts([])
      setFilteredDebts([])
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await fetchDebts()
      toast({
        title: "Dados atualizados",
        description: "Suas dívidas foram atualizadas com sucesso!",
      })
    } catch (error) {
      toast({
        title: "Erro na atualização",
        description: "Não foi possível atualizar os dados.",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const getOpenDebts = (debts: any[]) =>
    debts.filter((debt) => ["open", "overdue", "in_collection"].includes(debt.status))

  const getOverdueDebts = (debts: any[]) => debts.filter((debt) => debt.status === "overdue")

  const getPaidDebts = (debts: any[]) => debts.filter((debt) => debt.status === "paid")

  const getTotalOpenAmount = (debts: any[]) => getOpenDebts(debts).reduce((sum, debt) => sum + Number(debt.amount), 0)

  const getTotalPaidAmount = (debts: any[]) => getPaidDebts(debts).reduce((sum, debt) => sum + Number(debt.amount), 0)

  const getAveragePaymentScore = (debts: any[]) => {
    const openDebts = getOpenDebts(debts)
    return openDebts.length
      ? openDebts.reduce((sum, debt) => sum + Number(debt.propensity_payment_score || 0), 0) / openDebts.length
      : 0
  }

  const totalDebts = debts.length
  const openDebts = getOpenDebts(debts)
  const overdueDebts = getOverdueDebts(debts)
  const paidDebts = getPaidDebts(debts)
  const negotiatedDebts = debts.filter((debt) => debt.status === "negotiated")

  const totalOpenAmount = getTotalOpenAmount(debts)
  const totalOverdueAmount = overdueDebts.reduce((sum, debt) => sum + Number(debt.amount), 0)
  const totalPaidAmount = getTotalPaidAmount(debts)

  const avgPaymentScore = getAveragePaymentScore(debts)

  if (loading) {
    return <DebtsSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Minhas Dívidas</h1>
          <p className="text-muted-foreground">Gerencie suas dívidas e acompanhe o status de pagamento</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="bg-transparent">
            {refreshing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </>
            )}
          </Button>
          <EnhancedExportButton data={filteredDebts} filename="dividas-completas" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Dívidas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDebts}</div>
            <p className="text-xs text-muted-foreground">
              {openDebts.length} em aberto, {paidDebts.length} pagas
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor em Aberto</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalOpenAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">{openDebts.length} dívidas pendentes</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Atraso</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {totalOverdueAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">{overdueDebts.length} dívidas em atraso</p>
            {overdueDebts.length > 0 && (
              <Badge variant="destructive" className="mt-1 text-xs">
                Ação necessária
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {totalPaidAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">{paidDebts.length} dívidas quitadas</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propensão Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPaymentScore.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Propensão ao pagamento</p>
            {negotiatedDebts.length > 0 && (
              <Badge variant="secondary" className="mt-1 text-xs">
                {negotiatedDebts.length} negociada{negotiatedDebts.length > 1 ? "s" : ""}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert for Overdue Debts */}
      {overdueDebts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div className="flex-1">
                <h3 className="font-medium text-red-900">
                  Atenção: {overdueDebts.length} dívida{overdueDebts.length > 1 ? "s" : ""} em atraso
                </h3>
                <p className="text-sm text-red-700">
                  Regularize sua situação o quanto antes para evitar juros e multas adicionais.
                </p>
              </div>
              <CreateNegotiationDialog
                openDebts={overdueDebts}
                triggerButton={
                  <Button size="sm" className="bg-red-600 hover:bg-red-700">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Negociar Agora
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DebtFilters onFilter={setFilteredDebts} debts={debts} />
        </CardContent>
      </Card>

      {/* Debts List */}
      <div className="space-y-4">
        {filteredDebts && filteredDebts.length > 0 ? (
          filteredDebts.map((debt) => (
            <EnhancedDebtCard
              key={debt.id}
              debt={{
                ...debt,
                amount: debt.amount.toString(),
                propensity_payment_score: debt.propensity_payment_score.toString(),
                propensity_loan_score: debt.propensity_loan_score.toString(),
              }}
            />
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma dívida encontrada</h3>
              <p className="text-muted-foreground text-center">
                {debts.length === 0
                  ? "Você não possui dívidas cadastradas no momento."
                  : "Nenhuma dívida corresponde aos filtros aplicados."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary Footer */}
      {filteredDebts && filteredDebts.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Exibindo {filteredDebts.length} de {debts.length} dívida{debts.length > 1 ? "s" : ""} • Total em aberto:
                R$ {totalOpenAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} • Total pago: R${" "}
                {totalPaidAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
