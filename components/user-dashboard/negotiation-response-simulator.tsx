"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, MessageSquare, Clock, TrendingUp, AlertTriangle, Bot } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface NegotiationResponseSimulatorProps {
  isOpen: boolean
  onClose: () => void
  negotiation: {
    id: string
    debt: {
      description: string
      amount: string
    }
    proposedAmount: string
    installments: number
    message?: string
  }
}

export function NegotiationResponseSimulator({ isOpen, onClose, negotiation }: NegotiationResponseSimulatorProps) {
  const [selectedResponse, setSelectedResponse] = useState<"accept" | "reject" | "counter" | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const originalAmount = Number(negotiation.debt.amount)
  const proposedAmount = Number(negotiation.proposedAmount)
  const discountPercentage = ((originalAmount - proposedAmount) / originalAmount) * 100

  const responseOptions = [
    {
      type: "accept" as const,
      title: "Aceitar Proposta",
      description: "A empresa aceita sua proposta integralmente",
      probability: discountPercentage < 30 ? 85 : discountPercentage < 50 ? 60 : 25,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      type: "counter" as const,
      title: "Contraproposta",
      description: "A empresa faz uma contraproposta",
      probability: discountPercentage < 30 ? 10 : discountPercentage < 50 ? 30 : 60,
      icon: MessageSquare,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      type: "reject" as const,
      title: "Rejeitar",
      description: "A empresa rejeita a proposta",
      probability: discountPercentage < 30 ? 5 : discountPercentage < 50 ? 10 : 15,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
  ]

  const generateResponse = (type: "accept" | "reject" | "counter") => {
    const responses = {
      accept: [
        "Sua proposta foi aceita! Reconhecemos sua situação e aprovamos as condições solicitadas. Proceda com o pagamento conforme acordado.",
        "Proposta aprovada! O desconto oferecido está dentro dos nossos parâmetros de negociação. Aguardamos o pagamento nas condições estabelecidas.",
        "Aceitamos sua proposta de pagamento. Agradecemos por buscar uma solução amigável para quitar sua dívida.",
      ],
      reject: [
        "Infelizmente não podemos aceitar esta proposta. O desconto solicitado está fora dos nossos parâmetros atuais. Você pode fazer uma nova proposta.",
        "Sua proposta foi analisada, mas não podemos aprová-la nas condições apresentadas. Sugerimos uma nova negociação com valores mais próximos ao original.",
        "Não foi possível aceitar sua proposta. Entre em contato conosco para discutir outras alternativas de pagamento.",
      ],
      counter: [
        "Analisamos sua proposta e gostaríamos de fazer uma contraproposta que seja viável para ambas as partes.",
        "Sua proposta foi considerada. Podemos oferecer condições alternativas que atendam melhor aos nossos critérios.",
        "Reconhecemos sua situação e preparamos uma contraproposta que pode ser mais adequada para resolvermos esta pendência.",
      ],
    }

    return responses[type][Math.floor(Math.random() * responses[type].length)]
  }

  const generateCounterOffer = () => {
    const maxDiscount = 0.4 // 40% max discount
    const counterAmount = originalAmount * (1 - maxDiscount)
    const counterInstallments = Math.max(negotiation.installments, 3)

    return {
      amount: counterAmount,
      installments: counterInstallments,
      conditions: "Pagamento da primeira parcela em até 15 dias",
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    }
  }

  const handleSimulateResponse = async (type: "accept" | "reject" | "counter") => {
    setSelectedResponse(type)
    setIsProcessing(true)

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const response = generateResponse(type)
    const counterOffer = type === "counter" ? generateCounterOffer() : null

    setIsProcessing(false)

    toast({
      title: "Resposta simulada",
      description: `A empresa ${type === "accept" ? "aceitou" : type === "reject" ? "rejeitou" : "fez uma contraproposta para"} sua negociação.`,
    })

    // Here you would normally update the database with the simulated response
    console.log("Simulated response:", { type, response, counterOffer })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Simulador de Resposta da Empresa
          </DialogTitle>
          <DialogDescription>
            Simule diferentes tipos de resposta que a empresa pode dar à sua negociação
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="simulate">Simular Resposta</TabsTrigger>
            <TabsTrigger value="analytics">Análise IA</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes da Negociação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Dívida</p>
                    <p className="font-medium">{negotiation.debt.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Valor Original</p>
                    <p className="font-bold text-red-600">
                      R$ {originalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Valor Proposto</p>
                    <p className="font-bold text-blue-600">
                      R$ {proposedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span>Desconto solicitado:</span>
                    <Badge
                      variant={
                        discountPercentage > 50 ? "destructive" : discountPercentage > 30 ? "secondary" : "default"
                      }
                    >
                      {discountPercentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span>Parcelas:</span>
                    <span className="font-medium">{negotiation.installments}x</span>
                  </div>
                </div>

                {negotiation.message && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-1">Sua mensagem:</p>
                    <p className="text-sm text-blue-700">{negotiation.message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="simulate" className="space-y-4">
            <div className="grid gap-4">
              {responseOptions.map((option) => (
                <Card
                  key={option.type}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedResponse === option.type ? `${option.bgColor} ${option.borderColor} border-2` : ""
                  }`}
                  onClick={() => !isProcessing && handleSimulateResponse(option.type)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <option.icon className={`h-6 w-6 ${option.color}`} />
                        <div>
                          <h4 className="font-medium">{option.title}</h4>
                          <p className="text-sm text-gray-600">{option.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{option.probability}% chance</Badge>
                        {selectedResponse === option.type && isProcessing && (
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Processando...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedResponse === "counter" && !isProcessing && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-800">Contraproposta Simulada</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const counterOffer = generateCounterOffer()
                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-blue-600">Valor Proposto</p>
                            <p className="text-lg font-bold">
                              R$ {counterOffer.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-blue-600">Parcelas</p>
                            <p className="text-lg font-bold">{counterOffer.installments}x</p>
                          </div>
                          <div>
                            <p className="text-sm text-blue-600">Desconto</p>
                            <p className="text-lg font-bold text-green-600">
                              {(((originalAmount - counterOffer.amount) / originalAmount) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-blue-700">{counterOffer.conditions}</p>
                        <p className="text-xs text-blue-600">
                          Válida até: {counterOffer.validUntil.toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Análise de Probabilidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-2">Fatores que influenciam a resposta:</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Percentual de desconto solicitado: {discountPercentage.toFixed(1)}%</li>
                      <li>• Número de parcelas: {negotiation.installments}x</li>
                      <li>• Histórico de pagamentos do cliente</li>
                      <li>• Políticas internas da empresa</li>
                      <li>• Valor absoluto da dívida</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-800">Recomendação IA:</p>
                        <p className="text-sm text-yellow-700">
                          {discountPercentage > 50
                            ? "Desconto muito alto. Considere reduzir para aumentar chances de aceitação."
                            : discountPercentage > 30
                              ? "Desconto moderado. Boa chance de contraproposta."
                              : "Desconto conservador. Alta probabilidade de aceitação."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
            Fechar Simulador
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
