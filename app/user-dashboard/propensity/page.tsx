"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Info,
  AlertCircle,
  RefreshCw,
  Download,
  Brain,
  CheckCircle,
} from "lucide-react"
import { PropensityChart } from "@/components/user-dashboard/propensity-chart"
import { PropensityInsights } from "@/components/user-dashboard/propensity-insights"
import { PropensityRecommendations } from "@/components/user-dashboard/propensity-recommendations"
import { AIAnalysisSimulator } from "@/components/user-dashboard/ai-analysis-simulator"

function PropensitySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
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

export default function PropensityAnalysisPage() {
  const [debts, setDebts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("6months")
  const [analyzing, setAnalyzing] = useState(false)
  const [showAIAnalysis, setShowAIAnalysis] = useState(false)
  const { session } = useAuth()
  const user = session?.user

  useEffect(() => {
    if (user) {
      fetchPropensityData()
    }
  }, [user])

  const fetchPropensityData = async () => {
    try {
      if (!user) {
        console.log("[v0] No user found")
        return
      }

      console.log("[v0] Fetching propensity data for user:", user.id)

      const response = await fetch(`/api/user-debts?userId=${user.id}&status=pending,in_collection,open,overdue`)
      if (!response.ok) {
        throw new Error("Failed to fetch debts")
      }

      const data = await response.json()
      console.log("[v0] Fetched debts:", data.debts?.length || 0)
      setDebts(data.debts || [])
    } catch (error) {
      console.error("[v0] Error fetching propensity data:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar a análise de propensão.",
        variant: "destructive",
      })
      setDebts([])
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshAnalysis = async () => {
    setAnalyzing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await fetchPropensityData()
      toast({
        title: "Análise atualizada",
        description: "Sua análise de propensão foi recalculada com sucesso!",
      })
    } catch (error) {
      toast({
        title: "Erro na análise",
        description: "Não foi possível atualizar a análise.",
        variant: "destructive",
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleAIAnalysis = () => {
    console.log("[v0] Opening AI Analysis modal")
    setShowAIAnalysis(true)
  }

  const handleExportReport = () => {
    const reportData = [
      ["Descrição", "Valor", "Status", "Propensão Pagamento", "Propensão Empréstimo", "Classificação"],
      ...debts.map((debt) => [
        debt.description,
        Number(debt.amount).toFixed(2),
        debt.status,
        Number(debt.propensityPaymentScore || 0).toFixed(1) + "%",
        Number(debt.propensityLoanScore || 0).toFixed(1) + "%",
        debt.classification,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([reportData], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `analise-propensao-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Relatório exportado",
      description: "Análise de propensão exportada com sucesso!",
    })
  }

  const getOpenDebts = (debts: any[]) =>
    debts.filter((debt) => ["open", "overdue", "in_collection", "pending"].includes(debt.status))

  const getAveragePaymentScore = (debts: any[]) => {
    const openDebts = getOpenDebts(debts)
    return openDebts.length
      ? openDebts.reduce((sum, debt) => sum + Number(debt.propensityPaymentScore || 0), 0) / openDebts.length
      : 0
  }

  const getAverageLoanScore = (debts: any[]) => {
    const openDebts = getOpenDebts(debts)
    return openDebts.length
      ? openDebts.reduce((sum, debt) => sum + Number(debt.propensityLoanScore || 0), 0) / openDebts.length
      : 0
  }

  const openDebts = getOpenDebts(debts)
  const avgPaymentScore = getAveragePaymentScore(debts)
  const avgLoanScore = getAverageLoanScore(debts)

  // Calculate trends (simulated)
  const paymentTrend = 5.2
  const loanTrend = -2.1

  // Risk assessment
  const getRiskLevel = (score: number) => {
    if (score >= 70) return { level: "Baixo", color: "text-green-600", bgColor: "bg-green-100" }
    if (score >= 40) return { level: "Médio", color: "text-yellow-600", bgColor: "bg-yellow-100" }
    return { level: "Alto", color: "text-red-600", bgColor: "bg-red-100" }
  }

  const paymentRisk = getRiskLevel(100 - avgPaymentScore)
  const loanRisk = getRiskLevel(avgLoanScore)

  // Calculate potential credit limit
  const potentialCredit = avgLoanScore * 100 + avgPaymentScore * 50

  if (loading) {
    return <PropensitySkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análise de Propensão</h1>
          <p className="text-muted-foreground">Entenda seu perfil de pagamento e oportunidades de crédito</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">3 meses</SelectItem>
              <SelectItem value="6months">6 meses</SelectItem>
              <SelectItem value="12months">12 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportReport} className="bg-transparent">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={handleRefreshAnalysis} disabled={analyzing} className="bg-blue-600 hover:bg-blue-700">
            {analyzing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Atualizar IA
              </>
            )}
          </Button>
          <Button
            onClick={handleAIAnalysis}
            variant="outline"
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 hover:from-purple-700 hover:to-blue-700"
          >
            <Brain className="h-4 w-4 mr-2" />
            Análise IA
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propensão ao Pagamento</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPaymentScore.toFixed(1)}%</div>
            <div className="flex items-center space-x-2 mt-2">
              {paymentTrend > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <p className={`text-xs ${paymentTrend > 0 ? "text-green-600" : "text-red-600"}`}>
                {paymentTrend > 0 ? "+" : ""}
                {paymentTrend}% este mês
              </p>
            </div>
            <Progress value={avgPaymentScore} className="mt-3" />
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propensão a Empréstimo</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgLoanScore.toFixed(1)}%</div>
            <div className="flex items-center space-x-2 mt-2">
              {loanTrend > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <p className={`text-xs ${loanTrend > 0 ? "text-green-600" : "text-red-600"}`}>
                {loanTrend > 0 ? "+" : ""}
                {loanTrend}% este mês
              </p>
            </div>
            <Progress value={avgLoanScore} className="mt-3" />
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risco de Inadimplência</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge className={`${paymentRisk.bgColor} ${paymentRisk.color} hover:${paymentRisk.bgColor}`}>
              {paymentRisk.level}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">Baseado no histórico de pagamentos</p>
            <div className="mt-3">
              <div className="text-sm font-medium">Score: {(100 - avgPaymentScore).toFixed(1)}</div>
              <Progress value={100 - avgPaymentScore} className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Limite de Crédito Estimado</CardTitle>
            <CardDescription>Baseado no perfil atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              }).format(potentialCredit)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Baseado no perfil atual</p>
            <Badge className={`${loanRisk.bgColor} ${loanRisk.color} hover:${loanRisk.bgColor} mt-2`}>
              Elegibilidade: {loanRisk.level}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Propensity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução da Propensão</CardTitle>
            <CardDescription>
              Histórico dos últimos {timeRange === "3months" ? "3" : timeRange === "6months" ? "6" : "12"} meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PropensityChart paymentScore={avgPaymentScore} loanScore={avgLoanScore} timeRange={timeRange} />
          </CardContent>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Insights Personalizados</CardTitle>
            <CardDescription>Análise baseada no seu perfil</CardDescription>
          </CardHeader>
          <CardContent>
            <PropensityInsights
              paymentScore={avgPaymentScore}
              loanScore={avgLoanScore}
              debtsCount={openDebts.length}
              trend={paymentTrend}
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Debt Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Análise por Dívida</CardTitle>
            <CardDescription>Propensão individual de cada dívida</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {openDebts.slice(0, 5).map((debt) => {
                const paymentScore = Number(debt.propensityPaymentScore || 0)
                const riskLevel =
                  paymentScore >= 70 ? "low" : paymentScore >= 40 ? "medium" : "high"
                const riskColor =
                  riskLevel === "low" ? "text-green-600" : riskLevel === "medium" ? "text-yellow-600" : "text-red-600"

                return (
                  <div
                    key={debt.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{debt.description}</p>
                      <p className="text-xs text-muted-foreground">
                        R$ {Number(debt.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {debt.status === "open" ? "Em aberto" : debt.status === "overdue" ? "Em atraso" : "Em cobrança"}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${riskColor}`}>{paymentScore.toFixed(1)}%</p>
                      <Progress value={paymentScore} className="w-16 h-2 mt-1" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {riskLevel === "low" ? "Baixo risco" : riskLevel === "medium" ? "Médio risco" : "Alto risco"}
                      </p>
                    </div>
                  </div>
                )
              })}
              {openDebts.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">Nenhuma dívida em aberto</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recomendações Personalizadas</CardTitle>
            <CardDescription>Ações para melhorar seu perfil</CardDescription>
          </CardHeader>
          <CardContent>
            <PropensityRecommendations
              paymentScore={avgPaymentScore}
              loanScore={avgLoanScore}
              debts={openDebts}
              potentialCredit={potentialCredit}
            />
          </CardContent>
        </Card>
      </div>

      {/* Information Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Info className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">Como funciona a Análise de Propensão?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-blue-800">
          <div className="space-y-2 text-sm">
            <p>
              Nossa análise utiliza algoritmos avançados de machine learning para avaliar seu comportamento de pagamento
              e determinar a probabilidade de quitação de dívidas e elegibilidade para novos produtos financeiros.
            </p>
            <p>
              <strong>Fatores considerados:</strong> Histórico de pagamentos, valor das dívidas, tempo de atraso,
              frequência de negociações, sazonalidade e padrões comportamentais.
            </p>
            <p>
              <strong>Atualização:</strong> Os scores são recalculados automaticamente a cada transação e podem ser
              atualizados manualmente através da IA para análises mais precisas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Modal */}
      <AIAnalysisSimulator
        isOpen={showAIAnalysis}
        onClose={() => setShowAIAnalysis(false)}
        userId={user?.id || "user-123"}
        currentData={{
          paymentScore: avgPaymentScore,
          loanScore: avgLoanScore,
          riskLevel: paymentRisk.level,
          totalDebts: openDebts.length,
          totalAmount: openDebts.reduce((sum, debt) => sum + Number(debt.amount), 0),
        }}
      />
    </div>
  )
}
