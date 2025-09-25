"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Brain, TrendingUp, Target, Lightbulb, RefreshCw, Zap, Bot, AlertCircle } from "lucide-react"
import { AIAnalysisSimulator } from "./ai-analysis-simulator"

interface AIInsightsPanelProps {
  userId: string
  paymentScore: number
  loanScore: number
  riskLevel: string
  lastAnalysis?: string
}

export function AIInsightsPanel({ userId, paymentScore, loanScore, riskLevel, lastAnalysis }: AIInsightsPanelProps) {
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false)

  const generateQuickInsights = () => {
    const insights = []

    if (paymentScore > 70) {
      insights.push({
        type: "positive",
        title: "Excelente Histórico",
        description: "Seu score de pagamento está acima da média. Continue assim!",
        icon: TrendingUp,
      })
    } else if (paymentScore < 40) {
      insights.push({
        type: "warning",
        title: "Atenção Necessária",
        description: "Score baixo. Considere negociar suas dívidas em aberto.",
        icon: AlertCircle,
      })
    }

    if (loanScore > 60) {
      insights.push({
        type: "info",
        title: "Boa Propensão",
        description: "Você tem boa propensão para empréstimos e financiamentos.",
        icon: Target,
      })
    }

    // Add behavioral insights
    insights.push({
      type: "tip",
      title: "Dica Personalizada",
      description: "Pagamentos no início do mês têm 23% mais desconto em média.",
      icon: Lightbulb,
    })

    return insights
  }

  const quickInsights = generateQuickInsights()

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600"
    if (score >= 40) return "text-yellow-600"
    return "text-red-600"
  }

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "baixo":
        return "default"
      case "alto":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const isAnalysisOld = () => {
    if (!lastAnalysis) return true
    const analysisDate = new Date(lastAnalysis)
    const daysSince = (Date.now() - analysisDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysSince > 7 // Consider old if more than 7 days
  }

  return (
    <>
      <div className="space-y-6">
        {/* AI Scores Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Análise IA
              {isAnalysisOld() && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  Desatualizada
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Scores calculados por inteligência artificial baseados no seu comportamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(paymentScore)}`}>{paymentScore.toFixed(1)}%</div>
                <div className="text-sm text-gray-500">Score de Pagamento</div>
                <Progress value={paymentScore} className="mt-2 h-2" />
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(loanScore)}`}>{loanScore.toFixed(1)}%</div>
                <div className="text-sm text-gray-500">Score de Empréstimo</div>
                <Progress value={loanScore} className="mt-2 h-2" />
              </div>
              <div className="text-center">
                <Badge variant={getRiskBadgeVariant(riskLevel)} className="text-lg px-3 py-1">
                  {riskLevel}
                </Badge>
                <div className="text-sm text-gray-500 mt-2">Nível de Risco</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setIsSimulatorOpen(true)} className="flex-1 bg-purple-600 hover:bg-purple-700">
                <Zap className="h-4 w-4 mr-2" />
                {isAnalysisOld() ? "Atualizar Análise" : "Nova Análise"}
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              Insights Rápidos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickInsights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <insight.icon
                  className={`h-5 w-5 mt-0.5 ${
                    insight.type === "positive"
                      ? "text-green-500"
                      : insight.type === "warning"
                        ? "text-orange-500"
                        : insight.type === "info"
                          ? "text-blue-500"
                          : "text-purple-500"
                  }`}
                />
                <div>
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                  <p className="text-xs text-gray-600">{insight.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Last Analysis Info */}
        {lastAnalysis && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Última análise:</span>
                <span className="font-medium">{new Date(lastAnalysis).toLocaleDateString("pt-BR")}</span>
              </div>
              {isAnalysisOld() && (
                <div className="mt-2 text-xs text-orange-600">
                  Recomendamos atualizar a análise para obter insights mais precisos
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <AIAnalysisSimulator
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        userId={userId}
        currentData={{
          paymentScore,
          loanScore,
          riskLevel,
          totalDebts: 0,
          totalAmount: 0,
        }}
      />
    </>
  )
}
