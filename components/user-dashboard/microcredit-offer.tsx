"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { CreditCard, CheckCircle, AlertCircle, Calculator, Clock, Shield, Zap } from "lucide-react"

interface MicrocreditOfferProps {
  debt: {
    id: string
    description: string
    amount: number
    propensity_payment_score: number
    propensity_loan_score: number
    status: string
  }
}

export function MicrocreditOffer({ debt }: MicrocreditOfferProps) {
  const [isSimulating, setIsSimulating] = useState(false)
  const [showSimulation, setShowSimulation] = useState(false)

  // Verificar elegibilidade: propensão > 70% e dívida < R$1.000
  const isEligible = debt.propensity_payment_score > 70 && debt.amount < 1000

  if (!isEligible) {
    return null
  }

  // Calcular limite de microcrédito baseado na propensão
  const creditLimit = Math.min(1000, debt.propensity_payment_score * 10 + debt.amount * 0.5)
  const interestRate = Math.max(2.5, 5 - (debt.propensity_payment_score - 70) * 0.1)
  const installments = Math.ceil(creditLimit / 100)

  const handleSimulateCredit = async () => {
    setIsSimulating(true)

    // Simular processamento
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsSimulating(false)
    setShowSimulation(true)

    toast({
      title: "Simulação concluída!",
      description: "Sua oferta de microcrédito foi calculada com sucesso.",
    })
  }

  const handleRequestCredit = async () => {
    // Simular solicitação de crédito
    await new Promise((resolve) => setTimeout(resolve, 1000))

    toast({
      title: "Solicitação enviada!",
      description: "Sua solicitação de microcrédito está sendo analisada. Você receberá uma resposta em até 24h.",
    })

    setShowSimulation(false)
  }

  return (
    <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-green-100 rounded-full">
              <CreditCard className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-green-800">Oferta de Microcrédito Disponível</CardTitle>
              <CardDescription className="text-green-600">
                Quite sua dívida à vista e tenha acesso a crédito
              </CardDescription>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <Zap className="h-3 w-3 mr-1" />
            Pré-aprovado
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-green-600 font-medium">Limite Disponível</p>
            <p className="text-lg font-bold text-green-800">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              }).format(creditLimit)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-green-600 font-medium">Taxa de Juros</p>
            <p className="text-lg font-bold text-green-800">{interestRate.toFixed(1)}% a.m.</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-green-600">Score de Elegibilidade</span>
            <span className="font-medium text-green-800">{debt.propensity_payment_score.toFixed(1)}%</span>
          </div>
          <Progress value={debt.propensity_payment_score} className="h-2" />
        </div>

        <div className="flex space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                onClick={handleSimulateCredit}
                disabled={isSimulating}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {isSimulating ? (
                  <>
                    <Calculator className="h-4 w-4 mr-2 animate-pulse" />
                    Simulando...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    Simular Crédito
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  <span>Simulação de Microcrédito</span>
                </DialogTitle>
                <DialogDescription>Condições personalizadas baseadas no seu perfil</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">Valor para quitar dívida</span>
                    <span className="font-bold text-green-800">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(debt.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">Crédito adicional disponível</span>
                    <span className="font-bold text-green-800">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(creditLimit - debt.amount)}
                    </span>
                  </div>
                  <hr className="border-green-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">Total do crédito</span>
                    <span className="text-lg font-bold text-green-800">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(creditLimit)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Taxa de juros</span>
                    <span className="font-medium">{interestRate.toFixed(1)}% ao mês</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Parcelas sugeridas</span>
                    <span className="font-medium">
                      {installments}x de{" "}
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format((creditLimit * (1 + interestRate / 100)) / installments)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Aprovação</span>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-green-600" />
                      <span className="font-medium text-green-600">Imediata</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-xs text-blue-800">
                      <p className="font-medium mb-1">Benefícios inclusos:</p>
                      <ul className="space-y-1">
                        <li>• Quitação imediata da dívida atual</li>
                        <li>• Sem consulta ao SPC/Serasa</li>
                        <li>• Aprovação baseada no seu histórico</li>
                        <li>• Flexibilidade de pagamento</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowSimulation(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleRequestCredit} className="flex-1 bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Solicitar Crédito
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="text-xs text-green-600 bg-green-100 p-2 rounded flex items-start space-x-2">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>Oferta válida por 7 dias. Condições especiais baseadas no seu excelente histórico de pagamentos.</span>
        </div>
      </CardContent>
    </Card>
  )
}
