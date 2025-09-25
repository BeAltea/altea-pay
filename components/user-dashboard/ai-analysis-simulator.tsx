"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Bot,
  Activity,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface AIAnalysisSimulatorProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  currentData?: {
    paymentScore: number
    loanScore: number
    riskLevel: string
    totalDebts: number
    totalAmount: number
  }
}

export function AIAnalysisSimulator({ isOpen, onClose, userId, currentData }: AIAnalysisSimulatorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [newAnalysis, setNewAnalysis] = useState<{
    paymentScore: number
    loanScore: number
    riskLevel: string
    insights: Array<{
      type: "positive" | "negative" | "neutral"
      title: string
      description: string
      impact: "high" | "medium" | "low"
    }>
    recommendations: Array<{
      category: string
      action: string
      priority: "high" | "medium" | "low"
      estimatedImpact: string
    }>
    trends: {
      paymentTrend: "up" | "down" | "stable"
      riskTrend: "improving" | "worsening" | "stable"
      confidenceLevel: number
    }
  } | null>(null)
  const router = useRouter()

  const generateAIAnalysis = () => {
    // Simulate AI analysis with realistic variations
    const basePaymentScore = currentData?.paymentScore || 50
    const baseLoanScore = currentData?.loanScore || 50

    // Add some realistic variation (-10 to +15 points)
    const paymentVariation = (Math.random() - 0.4) * 25
    const loanVariation = (Math.random() - 0.4) * 25

    const newPaymentScore = Math.max(0, Math.min(100, basePaymentScore + paymentVariation))
    const newLoanScore = Math.max(0, Math.min(100, baseLoanScore + loanVariation))

    // Determine risk level based on scores
    const avgScore = (newPaymentScore + newLoanScore) / 2
    let riskLevel = "Médio"
    if (avgScore > 70) riskLevel = "Baixo"
    else if (avgScore < 40) riskLevel = "Alto"

    // Generate insights based on score changes
    const insights = []
    const paymentChange = newPaymentScore - basePaymentScore
    const loanChange = newLoanScore - baseLoanScore

    if (paymentChange > 5) {
      insights.push({
        type: "positive" as const,
        title: "Melhoria no Score de Pagamento",
        description: `Seu score de pagamento aumentou ${paymentChange.toFixed(1)} pontos, indicando maior propensão a quitar dívidas.`,
        impact: "high" as const,
      })
    } else if (paymentChange < -5) {
      insights.push({
        type: "negative" as const,
        title: "Redução no Score de Pagamento",
        description: `Seu score de pagamento diminuiu ${Math.abs(paymentChange).toFixed(1)} pontos. Recomendamos atenção especial.`,
        impact: "high" as const,
      })
    }

    if (loanChange > 5) {
      insights.push({
        type: "positive" as const,
        title: "Maior Propensão a Empréstimos",
        description: `Análise indica aumento de ${loanChange.toFixed(1)} pontos na propensão a aceitar empréstimos.`,
        impact: "medium" as const,
      })
    }

    // Add behavioral insights
    const behaviorInsights = [
      {
        type: "neutral" as const,
        title: "Padrão de Pagamento Identificado",
        description:
          "IA detectou preferência por pagamentos no final do mês, sugerindo alinhamento com recebimento de salário.",
        impact: "medium" as const,
      },
      {
        type: "positive" as const,
        title: "Histórico de Negociação Positivo",
        description: "Análise mostra que você tem 85% de sucesso em cumprir acordos de negociação.",
        impact: "high" as const,
      },
      {
        type: "neutral" as const,
        title: "Perfil de Comunicação",
        description: "Responde melhor a comunicações por email do que por telefone, com taxa de resposta 40% maior.",
        impact: "low" as const,
      },
    ]

    insights.push(...behaviorInsights.slice(0, Math.floor(Math.random() * 2) + 1))

    // Generate recommendations
    const recommendations = [
      {
        category: "Pagamento",
        action: "Configurar débito automático para evitar atrasos",
        priority: "high" as const,
        estimatedImpact: "+15 pontos no score",
      },
      {
        category: "Negociação",
        action: "Aproveitar propensão alta para negociar descontos",
        priority: "medium" as const,
        estimatedImpact: "Economia de até 30%",
      },
      {
        category: "Comunicação",
        action: "Manter contato proativo para melhores condições",
        priority: "low" as const,
        estimatedImpact: "+5 pontos no relacionamento",
      },
    ]

    // Determine trends
    const paymentTrend = paymentChange > 2 ? "up" : paymentChange < -2 ? "down" : "stable"
    const riskTrend =
      avgScore > (currentData?.paymentScore || 50) + 5
        ? "improving"
        : avgScore < (currentData?.paymentScore || 50) - 5
          ? "worsening"
          : "stable"

    return {
      paymentScore: newPaymentScore,
      loanScore: newLoanScore,
      riskLevel,
      insights,
      recommendations,
      trends: {
        paymentTrend,
        riskTrend,
        confidenceLevel: 85 + Math.random() * 10, // 85-95%
      },
    }
  }

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true)
    setAnalysisProgress(0)

    try {
      // Simulate AI processing with realistic steps
      const steps = [
        "Coletando dados comportamentais...",
        "Analisando histórico de pagamentos...",
        "Processando padrões de comunicação...",
        "Calculando scores preditivos...",
        "Gerando insights personalizados...",
        "Finalizando análise...",
      ]

      for (let i = 0; i < steps.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 800))
        setAnalysisProgress(((i + 1) / steps.length) * 100)

        toast({
          title: "Análise IA em andamento",
          description: steps[i],
        })
      }

      // Generate new analysis
      const analysis = generateAIAnalysis()
      setNewAnalysis(analysis)

      // Update database with new scores (simulated)
      const supabase = createClient()
      await supabase
        .from("profiles")
        .update({
          ai_payment_score: analysis.paymentScore,
          ai_loan_score: analysis.loanScore,
          risk_level: analysis.riskLevel,
          last_analysis: new Date().toISOString(),
        })
        .eq("id", userId)

      setAnalysisComplete(true)

      toast({
        title: "Análise IA concluída",
        description: "Novos insights e recomendações foram gerados com base em seus dados atualizados.",
      })
    } catch (error) {
      console.error("AI Analysis error:", error)
      toast({
        title: "Erro na análise",
        description: "Ocorreu um erro durante a análise IA. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleClose = () => {
    setAnalysisProgress(0)
    setAnalysisComplete(false)
    setNewAnalysis(null)
    onClose()
    if (analysisComplete) {
      router.refresh()
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600"
    if (score >= 40) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 70) return "bg-green-50 border-green-200"
    if (score >= 40) return "bg-yellow-50 border-yellow-200"
    return "bg-red-50 border-red-200"
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "down":
      case "worsening":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Análise IA Avançada
          </DialogTitle>
          <DialogDescription>Recalcule seus scores e obtenha insights personalizados baseados em IA</DialogDescription>
        </DialogHeader>

        {!analysisComplete ? (
          <div className="space-y-6">
            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Status Atual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {currentData?.paymentScore?.toFixed(1) || "50.0"}%
                    </div>
                    <div className="text-sm text-gray-500">Score de Pagamento</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {currentData?.loanScore?.toFixed(1) || "50.0"}%
                    </div>
                    <div className="text-sm text-gray-500">Score de Empréstimo</div>
                  </div>
                  <div className="text-center">
                    <Badge variant={currentData?.riskLevel === "Baixo" ? "default" : "secondary"}>
                      {currentData?.riskLevel || "Médio"}
                    </Badge>
                    <div className="text-sm text-gray-500 mt-1">Nível de Risco</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Process */}
            {isAnalyzing && (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <Bot className="h-12 w-12 text-purple-600 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-2">IA Analisando Seus Dados</h3>
                      <p className="text-gray-600 mb-4">
                        Nossa inteligência artificial está processando seu histórico e comportamento para gerar insights
                        personalizados...
                      </p>
                      <Progress value={analysisProgress} className="w-full max-w-md mx-auto" />
                      <p className="text-sm text-gray-500 mt-2">{analysisProgress.toFixed(0)}% concluído</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Button */}
            {!isAnalyzing && (
              <div className="text-center">
                <Button onClick={handleRunAnalysis} size="lg" className="bg-purple-600 hover:bg-purple-700">
                  <Zap className="h-5 w-5 mr-2" />
                  Executar Análise IA
                </Button>
                <p className="text-sm text-gray-500 mt-2">
                  A análise leva cerca de 5 segundos e utiliza mais de 50 variáveis comportamentais
                </p>
              </div>
            )}
          </div>
        ) : (
          <Tabs defaultValue="scores" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="scores">Novos Scores</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
              <TabsTrigger value="trends">Tendências</TabsTrigger>
            </TabsList>

            <TabsContent value="scores" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className={getScoreBgColor(newAnalysis?.paymentScore || 0)}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Score de Pagamento</span>
                      {getTrendIcon(newAnalysis?.trends.paymentTrend || "stable")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${getScoreColor(newAnalysis?.paymentScore || 0)}`}>
                        {newAnalysis?.paymentScore.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        {newAnalysis && currentData
                          ? `${newAnalysis.paymentScore > currentData.paymentScore ? "+" : ""}${(newAnalysis.paymentScore - currentData.paymentScore).toFixed(1)} pontos`
                          : "Novo score calculado"}
                      </div>
                      <Progress value={newAnalysis?.paymentScore || 0} className="mt-4" />
                    </div>
                  </CardContent>
                </Card>

                <Card className={getScoreBgColor(newAnalysis?.loanScore || 0)}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Score de Empréstimo</span>
                      {getTrendIcon(newAnalysis?.trends.paymentTrend || "stable")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${getScoreColor(newAnalysis?.loanScore || 0)}`}>
                        {newAnalysis?.loanScore.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        {newAnalysis && currentData
                          ? `${newAnalysis.loanScore > currentData.loanScore ? "+" : ""}${(newAnalysis.loanScore - currentData.loanScore).toFixed(1)} pontos`
                          : "Novo score calculado"}
                      </div>
                      <Progress value={newAnalysis?.loanScore || 0} className="mt-4" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Resumo da Análise</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <Badge
                        variant={
                          newAnalysis?.riskLevel === "Baixo"
                            ? "default"
                            : newAnalysis?.riskLevel === "Alto"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {newAnalysis?.riskLevel}
                      </Badge>
                      <div className="text-sm text-gray-500 mt-1">Nível de Risco</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{newAnalysis?.trends.confidenceLevel.toFixed(1)}%</div>
                      <div className="text-sm text-gray-500">Confiança da IA</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{newAnalysis?.insights.length}</div>
                      <div className="text-sm text-gray-500">Insights Gerados</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              {newAnalysis?.insights.map((insight, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {insight.type === "positive" && <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />}
                      {insight.type === "negative" && <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />}
                      {insight.type === "neutral" && <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{insight.title}</h4>
                          <Badge variant={insight.impact === "high" ? "default" : "secondary"}>
                            {insight.impact === "high"
                              ? "Alto Impacto"
                              : insight.impact === "medium"
                                ? "Médio"
                                : "Baixo"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{insight.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              {newAnalysis?.recommendations.map((rec, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{rec.category}</Badge>
                          <Badge
                            variant={
                              rec.priority === "high"
                                ? "destructive"
                                : rec.priority === "medium"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {rec.priority === "high"
                              ? "Alta Prioridade"
                              : rec.priority === "medium"
                                ? "Média"
                                : "Baixa"}
                          </Badge>
                        </div>
                        <h4 className="font-medium mb-1">{rec.action}</h4>
                        <p className="text-sm text-green-600">{rec.estimatedImpact}</p>
                      </div>
                      <Button size="sm" variant="outline">
                        Aplicar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getTrendIcon(newAnalysis?.trends.paymentTrend || "stable")}
                      Tendência de Pagamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-2">
                        {newAnalysis?.trends.paymentTrend === "up"
                          ? "Em Alta"
                          : newAnalysis?.trends.paymentTrend === "down"
                            ? "Em Baixa"
                            : "Estável"}
                      </div>
                      <p className="text-sm text-gray-600">
                        {newAnalysis?.trends.paymentTrend === "up"
                          ? "Sua propensão ao pagamento está melhorando"
                          : newAnalysis?.trends.paymentTrend === "down"
                            ? "Atenção: propensão ao pagamento em declínio"
                            : "Comportamento de pagamento mantém-se consistente"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getTrendIcon(newAnalysis?.trends.riskTrend || "stable")}
                      Tendência de Risco
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-2">
                        {newAnalysis?.trends.riskTrend === "improving"
                          ? "Melhorando"
                          : newAnalysis?.trends.riskTrend === "worsening"
                            ? "Piorando"
                            : "Estável"}
                      </div>
                      <p className="text-sm text-gray-600">
                        {newAnalysis?.trends.riskTrend === "improving"
                          ? "Seu perfil de risco está melhorando"
                          : newAnalysis?.trends.riskTrend === "worsening"
                            ? "Perfil de risco requer atenção"
                            : "Perfil de risco mantém-se estável"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Confiança da Análise</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Nível de Confiança</span>
                        <span className="font-medium">{newAnalysis?.trends.confidenceLevel.toFixed(1)}%</span>
                      </div>
                      <Progress value={newAnalysis?.trends.confidenceLevel || 0} className="h-2" />
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Metodologia:</strong> Esta análise utilizou algoritmos de machine learning treinados com
                        mais de 100.000 perfis similares, considerando 50+ variáveis comportamentais e históricas.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex gap-2">
          {analysisComplete && (
            <Button onClick={() => setAnalysisComplete(false)} variant="outline" className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Nova Análise
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} disabled={isAnalyzing}>
            {analysisComplete ? "Aplicar Mudanças" : "Fechar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
