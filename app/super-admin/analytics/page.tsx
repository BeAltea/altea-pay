"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Clock,
  Zap,
  Brain,
  AlertTriangle,
  CheckCircle,
  Users,
  DollarSign,
  RefreshCw,
  Eye,
  Play,
} from "lucide-react"

interface AnalyticsData {
  recoveryTrends: {
    period: string
    value: number
    change: number
  }[]
  customerSegments: {
    segment: string
    count: number
    recoveryRate: number
    avgAmount: number
  }[]
  predictiveInsights: {
    id: string
    title: string
    description: string
    impact: "high" | "medium" | "low"
    confidence: number
    details: string
    action: string
  }[]
  realTimeMetrics: {
    activeCollections: number
    paymentsToday: number
    avgResponseTime: number
    successRate: number
  }
}

const getAnalyticsData = (timeFilter: string): AnalyticsData => {
  const baseData = {
    "real-time": {
      recoveryTrends: [
        { period: "14:00", value: 45.2, change: 2.1 },
        { period: "15:00", value: 47.8, change: 2.6 },
        { period: "16:00", value: 51.3, change: 3.5 },
        { period: "17:00", value: 49.7, change: -1.6 },
        { period: "18:00", value: 52.4, change: 2.7 },
        { period: "19:00", value: 54.1, change: 1.7 },
      ],
      realTimeMetrics: {
        activeCollections: 1247,
        paymentsToday: 89,
        avgResponseTime: 2.3,
        successRate: 67.8,
      },
    },
    hourly: {
      recoveryTrends: [
        { period: "09h", value: 42.1, change: 1.8 },
        { period: "10h", value: 48.3, change: 6.2 },
        { period: "11h", value: 52.7, change: 4.4 },
        { period: "14h", value: 46.9, change: -5.8 },
        { period: "15h", value: 49.2, change: 2.3 },
        { period: "16h", value: 51.5, change: 2.3 },
      ],
      realTimeMetrics: {
        activeCollections: 1156,
        paymentsToday: 76,
        avgResponseTime: 2.1,
        successRate: 71.2,
      },
    },
    daily: {
      recoveryTrends: [
        { period: "Seg", value: 48.5, change: 3.2 },
        { period: "Ter", value: 52.1, change: 3.6 },
        { period: "Qua", value: 49.8, change: -2.3 },
        { period: "Qui", value: 54.3, change: 4.5 },
        { period: "Sex", value: 51.7, change: -2.6 },
        { period: "Sáb", value: 38.2, change: -13.5 },
      ],
      realTimeMetrics: {
        activeCollections: 1389,
        paymentsToday: 124,
        avgResponseTime: 2.7,
        successRate: 64.3,
      },
    },
    weekly: {
      recoveryTrends: [
        { period: "S1", value: 45.2, change: 2.1 },
        { period: "S2", value: 47.8, change: 2.6 },
        { period: "S3", value: 51.3, change: 3.5 },
        { period: "S4", value: 49.7, change: -1.6 },
      ],
      realTimeMetrics: {
        activeCollections: 1198,
        paymentsToday: 95,
        avgResponseTime: 2.5,
        successRate: 69.1,
      },
    },
  }

  const selectedData = baseData[timeFilter as keyof typeof baseData] || baseData["real-time"]

  return {
    recoveryTrends: selectedData.recoveryTrends,
    customerSegments: [
      { segment: "Alto Valor", count: 234, recoveryRate: 78.5, avgAmount: 15420.5 },
      { segment: "Médio Valor", count: 1456, recoveryRate: 52.3, avgAmount: 5680.25 },
      { segment: "Baixo Valor", count: 2890, recoveryRate: 34.7, avgAmount: 1250.75 },
      { segment: "Inadimplentes Crônicos", count: 567, recoveryRate: 12.8, avgAmount: 8950.3 },
    ],
    predictiveInsights: [
      {
        id: "1",
        title: "Aumento de Inadimplência Previsto",
        description: "Modelo prevê aumento de 15% na inadimplência da Enel nos próximos 30 dias",
        impact: "high",
        confidence: 87,
        details:
          "Análise detalhada mostra que fatores sazonais e econômicos indicam um aumento significativo na inadimplência. Recomenda-se ação preventiva imediata com campanhas de negociação antecipada.",
        action:
          "Iniciar campanha de negociação preventiva para clientes de alto risco identificados pelo modelo preditivo.",
      },
      {
        id: "2",
        title: "Oportunidade de Recuperação",
        description: "Clientes do segmento médio valor mostram 23% mais propensão a pagamento",
        impact: "medium",
        confidence: 72,
        details:
          "Dados comportamentais indicam que clientes do segmento médio valor estão mais receptivos a negociações. Janela de oportunidade de 15 dias identificada.",
        action:
          "Intensificar abordagem comercial para segmento médio valor com ofertas personalizadas de parcelamento.",
      },
      {
        id: "3",
        title: "Padrão Sazonal Identificado",
        description: "Histórico indica queda de 8% nas cobranças durante período de férias",
        impact: "low",
        confidence: 94,
        details:
          "Análise histórica de 5 anos confirma padrão consistente de redução na efetividade de cobranças durante dezembro e janeiro. Planejamento estratégico necessário.",
        action: "Ajustar estratégia de cobrança para período sazonal com foco em acordos antecipados.",
      },
    ],
    realTimeMetrics: selectedData.realTimeMetrics,
  }
}

export default function AnalyticsPage() {
  const [timeFilter, setTimeFilter] = useState("real-time")
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(getAnalyticsData("real-time"))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedInsight, setSelectedInsight] = useState<AnalyticsData["predictiveInsights"][0] | null>(null)

  useEffect(() => {
    console.log("[v0] Filtro de tempo alterado para:", timeFilter)
    setAnalyticsData(getAnalyticsData(timeFilter))
    toast({
      title: "Dados atualizados",
      description: `Visualização alterada para: ${getFilterLabel(timeFilter)}`,
    })
  }, [timeFilter])

  const getFilterLabel = (filter: string) => {
    const labels = {
      "real-time": "Tempo Real",
      hourly: "Por Hora",
      daily: "Diário",
      weekly: "Semanal",
    }
    return labels[filter as keyof typeof labels] || "Tempo Real"
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    console.log("[v0] Atualizando dados do analytics...")

    // Simula chamada de API
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setAnalyticsData(getAnalyticsData(timeFilter))
    setIsRefreshing(false)

    toast({
      title: "Dados atualizados com sucesso",
      description: "Todas as métricas foram sincronizadas.",
    })
  }

  const handleViewDetails = (insight: AnalyticsData["predictiveInsights"][0]) => {
    console.log("[v0] Visualizando detalhes do insight:", insight.id)
    setSelectedInsight(insight)
  }

  const handleApplyAction = (insight: AnalyticsData["predictiveInsights"][0]) => {
    console.log("[v0] Aplicando ação do insight:", insight.id)
    toast({
      title: "Ação aplicada com sucesso",
      description: `${insight.action}`,
    })
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
      case "low":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
    }
  }

  const getImpactLabel = (impact: string) => {
    switch (impact) {
      case "high":
        return "Alto Impacto"
      case "medium":
        return "Médio Impacto"
      case "low":
        return "Baixo Impacto"
      default:
        return "Impacto"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Analytics Avançado</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Insights inteligentes e análises preditivas para otimizar a cobrança.
          </p>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="real-time">Tempo Real</SelectItem>
              <SelectItem value="hourly">Por Hora</SelectItem>
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobranças Ativas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.realTimeMetrics.activeCollections.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +5.2% vs ontem
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.realTimeMetrics.paymentsToday}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12.8% vs média
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.realTimeMetrics.avgResponseTime}s</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingDown className="h-3 w-3 mr-1" />
                -0.5s vs ontem
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.realTimeMetrics.successRate.toFixed(1)}%</div>
            <Progress value={analyticsData.realTimeMetrics.successRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="segments">Segmentação</TabsTrigger>
          <TabsTrigger value="predictions">IA Preditiva</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Evolução da Taxa de Recuperação</span>
                </CardTitle>
                <CardDescription>Filtro atual: {getFilterLabel(timeFilter)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.recoveryTrends.map((trend, index) => (
                    <div key={trend.period} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 text-sm font-medium">{trend.period}</div>
                        <div className="flex-1">
                          <Progress value={trend.value} className="h-2 w-32" />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold">{trend.value.toFixed(1)}%</span>
                        {trend.change > 0 ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                            <TrendingUp className="h-3 w-3 mr-1" />+{trend.change.toFixed(1)}%
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            {trend.change.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Análise de Padrões</span>
                </CardTitle>
                <CardDescription>Insights baseados em dados históricos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900 dark:text-blue-100">Padrão Identificado</span>
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Cobranças realizadas entre 9h-11h têm 34% mais sucesso
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-900 dark:text-green-100">Tendência Positiva</span>
                    </div>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Uso de IA aumentou recuperação em 18% nos últimos 3 meses
                    </p>
                  </div>

                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium text-yellow-900 dark:text-yellow-100">Atenção Necessária</span>
                    </div>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Queda de 8% na recuperação durante feriados prolongados
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Segments Tab */}
        <TabsContent value="segments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="h-5 w-5" />
                <span>Segmentação de Clientes</span>
              </CardTitle>
              <CardDescription>Análise por perfil de cliente e valor da dívida</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.customerSegments.map((segment, index) => (
                  <div
                    key={segment.segment}
                    className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <div
                          className={`w-4 h-4 rounded-full ${
                            index === 0
                              ? "bg-green-500"
                              : index === 1
                                ? "bg-blue-500"
                                : index === 2
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                          }`}
                        ></div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{segment.segment}</h3>
                        <Badge variant="outline">{segment.count.toLocaleString()} clientes</Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Taxa de Recuperação</p>
                          <p className="font-medium">{segment.recoveryRate.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Valor Médio</p>
                          <p className="font-medium">
                            R$ {segment.avgAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Volume Total</p>
                          <p className="font-medium">
                            R$ {((segment.count * segment.avgAmount) / 1000000).toFixed(1)}M
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 lg:mt-0 lg:ml-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-32">
                          <Progress value={segment.recoveryRate} className="h-2" />
                        </div>
                        <span className="text-sm font-medium w-12">{segment.recoveryRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>Insights de IA Preditiva</span>
              </CardTitle>
              <CardDescription>Análises e previsões baseadas em machine learning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.predictiveInsights.map((insight, index) => (
                  <div key={insight.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">{insight.title}</h3>
                          <Badge className={getImpactColor(insight.impact)}>{getImpactLabel(insight.impact)}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{insight.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Confiança:</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={insight.confidence} className="h-2 w-24" />
                          <span className="text-xs font-medium">{insight.confidence}%</span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => handleViewDetails(insight)}>
                              <Eye className="mr-1 h-3 w-3" />
                              Ver Detalhes
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{insight.title}</DialogTitle>
                              <DialogDescription>Análise detalhada do insight preditivo</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">Descrição</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{insight.description}</p>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Análise Detalhada</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{insight.details}</p>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Ação Recomendada</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{insight.action}</p>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium">Impacto:</span>
                                  <Badge className={getImpactColor(insight.impact)}>
                                    {getImpactLabel(insight.impact)}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium">Confiança:</span>
                                  <span className="text-sm">{insight.confidence}%</span>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button size="sm" onClick={() => handleApplyAction(insight)}>
                          <Play className="mr-1 h-3 w-3" />
                          Aplicar Ação
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Recomendações Automáticas</span>
                </CardTitle>
                <CardDescription>Ações sugeridas pela IA</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-900 dark:text-green-100 text-sm">Otimizar Horários</span>
                    </div>
                    <p className="text-xs text-green-800 dark:text-green-200">
                      Concentrar cobranças entre 9h-11h pode aumentar sucesso em 34%
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900 dark:text-blue-100 text-sm">Segmentar Abordagem</span>
                    </div>
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      Personalizar mensagens por segmento pode melhorar conversão
                    </p>
                  </div>

                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium text-yellow-900 dark:text-yellow-100 text-sm">
                        Revisar Estratégia
                      </span>
                    </div>
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      Clientes inadimplentes crônicos precisam de nova abordagem
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Metas Inteligentes</span>
                </CardTitle>
                <CardDescription>Objetivos baseados em dados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Meta de Recuperação Mensal</span>
                      <span className="font-medium">58.5%</span>
                    </div>
                    <Progress value={58.5} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">Baseado em tendência histórica e sazonalidade</p>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Redução de Inadimplência</span>
                      <span className="font-medium">12.3%</span>
                    </div>
                    <Progress value={12.3} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">Meta agressiva mas alcançável com IA</p>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Tempo de Resposta</span>
                      <span className="font-medium">85.7%</span>
                    </div>
                    <Progress value={85.7} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">Manter abaixo de 2.5s em 90% dos casos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Performance do Sistema</span>
                </CardTitle>
                <CardDescription>Métricas técnicas e operacionais</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-100">Uptime</p>
                        <p className="text-sm text-green-700 dark:text-green-300">Sistema operacional</p>
                      </div>
                    </div>
                    <span className="font-bold text-green-600">99.9%</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">Latência Média</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">Tempo de resposta</p>
                      </div>
                    </div>
                    <span className="font-bold text-blue-600">2.3s</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <BarChart3 className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-900 dark:text-yellow-100">Throughput</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">Processamentos/min</p>
                      </div>
                    </div>
                    <span className="font-bold text-yellow-600">1,247</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Eficiência Operacional</span>
                </CardTitle>
                <CardDescription>Indicadores de produtividade</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Automação de Processos</span>
                      <span className="font-medium">78.5%</span>
                    </div>
                    <Progress value={78.5} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">+15% vs trimestre anterior</p>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Precisão da IA</span>
                      <span className="font-medium">94.2%</span>
                    </div>
                    <Progress value={94.2} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">Acurácia nas previsões de pagamento</p>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Satisfação do Cliente</span>
                      <span className="font-medium">87.3%</span>
                    </div>
                    <Progress value={87.3} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">Baseado em feedback e NPS</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
