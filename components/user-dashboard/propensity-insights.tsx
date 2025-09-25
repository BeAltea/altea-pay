"use client"
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from "lucide-react"

interface PropensityInsightsProps {
  paymentScore: number
  loanScore: number
  debtsCount: number
  profile: any
}

export function PropensityInsights({ paymentScore, loanScore, debtsCount, profile }: PropensityInsightsProps) {
  const insights = []

  // Payment Score Insights
  if (paymentScore >= 70) {
    insights.push({
      type: "positive",
      icon: CheckCircle,
      title: "Excelente Histórico de Pagamento",
      description: "Você tem alta propensão ao pagamento. Continue mantendo seus compromissos em dia.",
      color: "text-green-600",
      bgColor: "bg-green-50 border-green-200",
    })
  } else if (paymentScore >= 40) {
    insights.push({
      type: "warning",
      icon: AlertTriangle,
      title: "Histórico Moderado",
      description: "Sua propensão ao pagamento pode melhorar. Considere quitar dívidas em atraso.",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 border-yellow-200",
    })
  } else {
    insights.push({
      type: "negative",
      icon: TrendingDown,
      title: "Atenção Necessária",
      description: "Sua propensão ao pagamento está baixa. Recomendamos negociar suas dívidas.",
      color: "text-red-600",
      bgColor: "bg-red-50 border-red-200",
    })
  }

  // Loan Score Insights
  if (loanScore >= 60) {
    insights.push({
      type: "positive",
      icon: TrendingUp,
      title: "Bom Potencial de Crédito",
      description: "Você tem boa elegibilidade para novos produtos financeiros.",
      color: "text-green-600",
      bgColor: "bg-green-50 border-green-200",
    })
  } else if (loanScore >= 30) {
    insights.push({
      type: "info",
      icon: Info,
      title: "Potencial Moderado",
      description: "Melhorando seu histórico, você pode acessar melhores condições de crédito.",
      color: "text-blue-600",
      bgColor: "bg-blue-50 border-blue-200",
    })
  } else {
    insights.push({
      type: "warning",
      icon: AlertTriangle,
      title: "Potencial Limitado",
      description: "Foque em quitar dívidas pendentes para melhorar seu score de crédito.",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 border-yellow-200",
    })
  }

  // Debt Count Insights
  if (debtsCount > 5) {
    insights.push({
      type: "warning",
      icon: AlertTriangle,
      title: "Muitas Dívidas Ativas",
      description: `Você tem ${debtsCount} dívidas em aberto. Considere um plano de consolidação.`,
      color: "text-orange-600",
      bgColor: "bg-orange-50 border-orange-200",
    })
  } else if (debtsCount === 0) {
    insights.push({
      type: "positive",
      icon: CheckCircle,
      title: "Parabéns!",
      description: "Você não possui dívidas em aberto. Mantenha esse excelente controle financeiro.",
      color: "text-green-600",
      bgColor: "bg-green-50 border-green-200",
    })
  }

  return (
    <div className="space-y-4">
      {insights.map((insight, index) => (
        <div key={index} className={`p-4 rounded-lg border ${insight.bgColor}`}>
          <div className="flex items-start space-x-3">
            <insight.icon className={`h-5 w-5 mt-0.5 ${insight.color}`} />
            <div className="flex-1">
              <h4 className={`font-medium ${insight.color}`}>{insight.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{insight.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
