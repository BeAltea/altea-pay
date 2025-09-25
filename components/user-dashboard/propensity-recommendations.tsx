"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Target, DollarSign, MessageSquare, TrendingUp, CheckCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface PropensityRecommendationsProps {
  paymentScore: number
  loanScore: number
  debts: any[]
}

export function PropensityRecommendations({ paymentScore, loanScore, debts }: PropensityRecommendationsProps) {
  const router = useRouter()

  const handleActionClick = (actionType: string, title: string) => {
    console.log("[v0] PropensityRecommendations - Action clicked:", actionType, title)

    switch (actionType) {
      case "Ver Dívidas em Atraso":
        toast({
          title: "Redirecionando...",
          description: "Abrindo suas dívidas em atraso",
        })
        router.push("/user-dashboard/debts?filter=overdue")
        break

      case "Iniciar Negociação":
        toast({
          title: "Iniciando negociação",
          description: "Redirecionando para a página de negociação",
        })
        router.push("/user-dashboard/negotiation")
        break

      case "Ver Opções":
        toast({
          title: "Opções de crédito",
          description: "Funcionalidade em desenvolvimento. Em breve você poderá ver opções de crédito personalizadas.",
        })
        break

      case "Ver Benefícios":
        toast({
          title: "Benefícios exclusivos",
          description: "Parabéns pelo seu excelente score! Benefícios exclusivos em desenvolvimento.",
        })
        break

      case "Simular Empréstimo":
        toast({
          title: "Simulador de empréstimo",
          description:
            "Funcionalidade em desenvolvimento. Em breve você poderá simular empréstimos com taxas preferenciais.",
        })
        break

      default:
        toast({
          title: title,
          description: "Esta funcionalidade está em desenvolvimento e estará disponível em breve.",
        })
    }
  }

  const recommendations = []

  // Payment-based recommendations
  if (paymentScore < 50) {
    recommendations.push({
      priority: "high",
      icon: Target,
      title: "Quite suas dívidas em atraso",
      description: "Priorize o pagamento das dívidas vencidas para melhorar seu score rapidamente.",
      action: "Ver Dívidas em Atraso",
      actionType: "primary",
      impact: "+15-25 pontos no score",
    })
  }

  if (debts.length > 3) {
    recommendations.push({
      priority: "medium",
      icon: MessageSquare,
      title: "Negocie um acordo",
      description: "Com múltiplas dívidas, uma negociação pode reduzir o valor total e facilitar o pagamento.",
      action: "Iniciar Negociação",
      actionType: "secondary",
      impact: "Redução de até 40% no valor",
    })
  }

  if (paymentScore >= 60 && loanScore < 40) {
    recommendations.push({
      priority: "low",
      icon: TrendingUp,
      title: "Construa histórico de crédito",
      description: "Seu bom histórico de pagamento pode ser usado para acessar produtos de crédito.",
      action: "Ver Opções",
      actionType: "outline",
      impact: "Acesso a melhores taxas",
    })
  }

  if (paymentScore >= 70) {
    recommendations.push({
      priority: "low",
      icon: CheckCircle,
      title: "Mantenha o bom trabalho",
      description: "Continue pagando em dia para manter seu excelente score e acessar benefícios exclusivos.",
      action: "Ver Benefícios",
      actionType: "outline",
      impact: "Descontos e vantagens",
    })
  }

  // Loan-based recommendations
  if (loanScore >= 50 && paymentScore >= 60) {
    recommendations.push({
      priority: "medium",
      icon: DollarSign,
      title: "Considere consolidação de dívidas",
      description: "Seu perfil permite acessar crédito para consolidar dívidas com melhores condições.",
      action: "Simular Empréstimo",
      actionType: "secondary",
      impact: "Taxas reduzidas",
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "Alta Prioridade"
      case "medium":
        return "Média Prioridade"
      case "low":
        return "Baixa Prioridade"
      default:
        return "Prioridade"
    }
  }

  const getButtonVariant = (actionType: string) => {
    switch (actionType) {
      case "primary":
        return "default"
      case "secondary":
        return "secondary"
      case "outline":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-4">
      {recommendations.length > 0 ? (
        recommendations.map((rec, index) => (
          <div
            key={index}
            className="p-4 border rounded-lg hover:shadow-sm transition-shadow bg-white dark:bg-gray-800"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <rec.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{rec.title}</h4>
                  <Badge className={getPriorityColor(rec.priority)} variant="secondary">
                    {getPriorityLabel(rec.priority)}
                  </Badge>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{rec.description}</p>

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Impacto esperado:</span> {rec.impact}
              </div>
              <Button
                size="sm"
                variant={getButtonVariant(rec.actionType)}
                className={cn(
                  "transition-colors",
                  rec.actionType === "primary" ? "bg-blue-600 hover:bg-blue-700 text-white" : "",
                )}
                onClick={() => handleActionClick(rec.action, rec.title)}
              >
                {rec.action}
              </Button>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Excelente perfil financeiro!</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Você está mantendo um bom controle das suas finanças. Continue assim!
          </p>
          <Button
            onClick={() => handleActionClick("Ver Benefícios", "Benefícios exclusivos")}
            className="bg-green-600 hover:bg-green-700"
          >
            Ver Benefícios Exclusivos
          </Button>
        </div>
      )}
    </div>
  )
}

// Import cn utility
import { cn } from "@/lib/utils"
