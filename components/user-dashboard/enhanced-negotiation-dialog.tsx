"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MessageSquare,
  Calculator,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Target,
  DollarSign,
  Loader2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface EnhancedNegotiationDialogProps {
  isOpen: boolean
  onClose: () => void
  openDebts: Array<{
    id: string
    description: string
    amount: string
    due_date: string
    status: string
    propensity_payment_score?: string
  }>
}

export function EnhancedNegotiationDialog({ isOpen, onClose, openDebts }: EnhancedNegotiationDialogProps) {
  const [step, setStep] = useState<"select" | "propose" | "processing" | "response">("select")
  const [selectedDebtId, setSelectedDebtId] = useState("")
  const [proposedAmount, setProposedAmount] = useState("")
  const [installments, setInstallments] = useState("1")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [negotiationResult, setNegotiationResult] = useState<{
    status: "accepted" | "rejected" | "counter"
    counterOffer?: {
      amount: string
      installments: number
      conditions: string
    }
    message: string
  } | null>(null)
  const router = useRouter()

  const selectedDebt = openDebts.find((debt) => debt.id === selectedDebtId)
  const originalAmount = selectedDebt ? Number(selectedDebt.amount) : 0
  const proposed = Number(proposedAmount) || 0
  const savings = originalAmount - proposed
  const savingsPercentage = originalAmount > 0 ? (savings / originalAmount) * 100 : 0
  const installmentValue = proposed > 0 && Number(installments) > 0 ? proposed / Number(installments) : 0

  const generateSmartSuggestions = () => {
    if (!selectedDebt) return []

    const paymentScore = Number(selectedDebt.propensity_payment_score) || 50
    const amount = Number(selectedDebt.amount)

    const suggestions = []

    if (paymentScore > 70) {
      suggestions.push({
        percentage: 85,
        reason: "Alto score de pagamento - proposta conservadora",
        installments: 1,
        priority: "high",
      })
      suggestions.push({
        percentage: 70,
        reason: "Desconto atrativo para pagamento à vista",
        installments: 1,
        priority: "medium",
      })
    } else if (paymentScore > 40) {
      suggestions.push({
        percentage: 60,
        reason: "Score médio - proposta equilibrada",
        installments: 3,
        priority: "high",
      })
      suggestions.push({
        percentage: 50,
        reason: "Desconto significativo em parcelas",
        installments: 6,
        priority: "medium",
      })
    } else {
      suggestions.push({
        percentage: 40,
        reason: "Score baixo - proposta agressiva",
        installments: 6,
        priority: "high",
      })
      suggestions.push({
        percentage: 30,
        reason: "Proposta de recuperação mínima",
        installments: 12,
        priority: "medium",
      })
    }

    return suggestions.map((s) => ({
      ...s,
      amount: (amount * s.percentage) / 100,
    }))
  }

  const simulateNegotiationResponse = () => {
    const paymentScore = Number(selectedDebt?.propensity_payment_score) || 50
    const random = Math.random()

    // Higher payment score = higher chance of acceptance
    const acceptanceThreshold = (paymentScore / 100) * 0.7 + 0.1

    if (savingsPercentage < 20) {
      // Small discount - likely accepted
      return {
        status: "accepted" as const,
        message:
          "Sua proposta foi aceita! O desconto oferecido está dentro dos nossos parâmetros. Proceda com o pagamento conforme acordado.",
      }
    } else if (savingsPercentage < 40 && random < acceptanceThreshold) {
      // Medium discount - might be accepted based on score
      return {
        status: "accepted" as const,
        message:
          "Proposta aceita! Reconhecemos sua situação e aprovamos o desconto solicitado. Aguardamos o pagamento nas condições acordadas.",
      }
    } else if (savingsPercentage < 60) {
      // Large discount - counter offer
      const counterAmount = originalAmount * 0.7 // 30% discount max
      return {
        status: "counter" as const,
        counterOffer: {
          amount: counterAmount.toFixed(2),
          installments: Math.max(Number(installments), 3),
          conditions: "Pagamento em até 30 dias da primeira parcela",
        },
        message:
          "Sua proposta foi analisada. Podemos oferecer uma contraproposta com condições mais viáveis para ambas as partes.",
      }
    } else {
      // Very large discount - rejected
      return {
        status: "rejected" as const,
        message:
          "Infelizmente não podemos aceitar esta proposta. O desconto solicitado está fora dos nossos parâmetros. Você pode fazer uma nova proposta ou entrar em contato conosco.",
      }
    }
  }

  const handleSubmit = async () => {
    if (!selectedDebtId || !proposedAmount) return

    setIsSubmitting(true)
    setStep("processing")
    setProgress(0)

    // Simulate processing with progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 15
      })
    }, 300)

    try {
      // TODO: Replace with server action for creating negotiation
      // Simulate negotiation creation
      const mockNegotiation = {
        debt_id: selectedDebtId,
        proposed_amount: proposedAmount,
        proposed_installments: Number(installments),
        message: message || null,
        status: "active",
      }

      console.log("[v0] EnhancedNegotiationDialog - Mock negotiation created:", mockNegotiation)

      // Simulate company response after delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const response = simulateNegotiationResponse()
      setNegotiationResult(response)

      setProgress(100)
      setTimeout(() => {
        setStep("response")
        setIsSubmitting(false)
      }, 500)

      toast({
        title: "Negociação enviada",
        description: "Sua proposta foi enviada e analisada pela empresa.",
      })
    } catch (error) {
      console.error("Error creating negotiation:", error)
      toast({
        title: "Erro",
        description: "Erro ao enviar negociação. Tente novamente.",
        variant: "destructive",
      })
      setIsSubmitting(false)
      onClose()
    }
  }

  const handleClose = () => {
    setStep("select")
    setSelectedDebtId("")
    setProposedAmount("")
    setInstallments("1")
    setMessage("")
    setProgress(0)
    setNegotiationResult(null)
    onClose()
    if (step === "response") {
      router.refresh()
    }
  }

  const smartSuggestions = generateSmartSuggestions()

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "select" && "Nova Negociação"}
            {step === "propose" && "Fazer Proposta"}
            {step === "processing" && "Processando Negociação"}
            {step === "response" && "Resposta da Empresa"}
          </DialogTitle>
          <DialogDescription>
            {step === "select" && "Selecione a dívida que deseja negociar"}
            {step === "propose" && "Faça sua proposta de pagamento"}
            {step === "processing" && "Aguarde enquanto analisamos sua proposta"}
            {step === "response" && "Veja a resposta da empresa para sua proposta"}
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {openDebts.map((debt) => (
                <Card
                  key={debt.id}
                  className={`cursor-pointer transition-all ${
                    selectedDebtId === debt.id ? "ring-2 ring-altea-navy bg-blue-50" : "hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedDebtId(debt.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{debt.description}</h4>
                        <p className="text-sm text-gray-500">
                          Vencimento: {new Date(debt.due_date).toLocaleDateString("pt-BR")}
                        </p>
                        {debt.propensity_payment_score && (
                          <div className="mt-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Target className="h-4 w-4" />
                              <span>Score de Pagamento: {Number(debt.propensity_payment_score).toFixed(1)}%</span>
                            </div>
                            <Progress value={Number(debt.propensity_payment_score)} className="h-1 mt-1" />
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          R$ {Number(debt.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                        <Badge variant={debt.status === "overdue" ? "destructive" : "secondary"}>
                          {debt.status === "overdue" ? "Em Atraso" : "Em Aberto"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setStep("propose")} disabled={!selectedDebtId} className="flex-1">
                Continuar
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {step === "propose" && selectedDebt && (
          <div className="space-y-6">
            <Tabs defaultValue="proposal" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="proposal">Minha Proposta</TabsTrigger>
                <TabsTrigger value="suggestions">Sugestões IA</TabsTrigger>
              </TabsList>

              <TabsContent value="proposal" className="space-y-6">
                {/* Selected Debt Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{selectedDebt.description}</CardTitle>
                    <CardDescription>
                      Vencimento: {new Date(selectedDebt.due_date).toLocaleDateString("pt-BR")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Valor Original</p>
                        <p className="text-2xl font-bold text-red-600">
                          R$ {originalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Score de Pagamento</p>
                        <div className="flex items-center gap-2">
                          <Progress value={Number(selectedDebt.propensity_payment_score)} className="flex-1 h-2" />
                          <span className="text-sm font-medium">
                            {Number(selectedDebt.propensity_payment_score).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Proposal Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="amount">Valor Proposto (R$)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        max={originalAmount}
                        value={proposedAmount}
                        onChange={(e) => setProposedAmount(e.target.value)}
                        placeholder="0,00"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="installments">Número de Parcelas</Label>
                      <Select value={installments} onValueChange={setInstallments}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 10, 12].map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num}x
                              {num > 1 && installmentValue > 0 && (
                                <span className="text-muted-foreground ml-2">
                                  (R$ {installmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} cada)
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="message">Justificativa (Opcional)</Label>
                      <Textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Explique sua situação ou justifique sua proposta..."
                        rows={4}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Quick Percentage Buttons */}
                    <div>
                      <Label>Sugestões Rápidas</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {[70, 50, 30].map((percentage) => (
                          <Button
                            key={percentage}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setProposedAmount((originalAmount * (percentage / 100)).toFixed(2))}
                          >
                            {percentage}%
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Savings Calculation */}
                    {proposed > 0 && originalAmount > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-green-600" />
                            Resumo da Proposta
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span>Valor Original:</span>
                            <span className="font-medium">
                              R$ {originalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Valor Proposto:</span>
                            <span className="font-medium text-blue-600">
                              R$ {proposed.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Economia:</span>
                            <span className="font-bold text-green-600">
                              R$ {savings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (
                              {savingsPercentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Parcelas:</span>
                            <span className="font-medium">
                              {installments}x de R${" "}
                              {installmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="suggestions" className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium text-blue-800">Sugestões Inteligentes</h4>
                  </div>
                  <p className="text-sm text-blue-700">
                    Baseado no score de pagamento e histórico, estas são as propostas com maior chance de aceitação:
                  </p>
                </div>

                <div className="grid gap-4">
                  {smartSuggestions.map((suggestion, index) => (
                    <Card
                      key={index}
                      className={`cursor-pointer transition-all hover:bg-gray-50 ${
                        suggestion.priority === "high" ? "border-green-200 bg-green-50/50" : ""
                      }`}
                      onClick={() => {
                        setProposedAmount(suggestion.amount.toFixed(2))
                        setInstallments(suggestion.installments.toString())
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={suggestion.priority === "high" ? "default" : "secondary"}>
                                {suggestion.priority === "high" ? "Recomendado" : "Alternativa"}
                              </Badge>
                              <span className="text-lg font-bold">
                                R$ {suggestion.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{suggestion.reason}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {suggestion.installments}x parcelas • {suggestion.percentage}% do valor original
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-green-600 font-medium">
                              {(100 - suggestion.percentage).toFixed(0)}% desconto
                            </div>
                            <div className="text-xs text-gray-500">
                              Economia: R${" "}
                              {(originalAmount - suggestion.amount).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={!proposedAmount || isSubmitting} className="flex-1">
                <MessageSquare className="h-4 w-4 mr-2" />
                Enviar Proposta
              </Button>
              <Button variant="outline" onClick={() => setStep("select")}>
                Voltar
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="space-y-6 text-center py-8">
            <div className="flex justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-altea-navy" />
            </div>
            <div>
              <h3 className="text-xl font-medium mb-2">Analisando sua proposta</h3>
              <p className="text-gray-600 mb-4">
                Nossa IA está avaliando sua proposta com base no seu perfil e histórico de pagamentos...
              </p>
              <Progress value={progress} className="w-full max-w-md mx-auto" />
              <p className="text-sm text-gray-500 mt-2">{progress}% concluído</p>
            </div>
          </div>
        )}

        {step === "response" && negotiationResult && (
          <div className="space-y-6">
            <div className="text-center">
              {negotiationResult.status === "accepted" && (
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              )}
              {negotiationResult.status === "rejected" && (
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              )}
              {negotiationResult.status === "counter" && (
                <MessageSquare className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              )}

              <h3 className="text-xl font-bold mb-2">
                {negotiationResult.status === "accepted" && "Proposta Aceita!"}
                {negotiationResult.status === "rejected" && "Proposta Rejeitada"}
                {negotiationResult.status === "counter" && "Contraproposta Recebida"}
              </h3>
            </div>

            <Card>
              <CardContent className="p-6">
                <p className="text-gray-700 mb-4">{negotiationResult.message}</p>

                {negotiationResult.status === "counter" && negotiationResult.counterOffer && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-3">Nossa Contraproposta:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-blue-600">Valor Proposto</p>
                        <p className="text-lg font-bold">
                          R${" "}
                          {Number(negotiationResult.counterOffer.amount).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-600">Parcelas</p>
                        <p className="text-lg font-bold">{negotiationResult.counterOffer.installments}x</p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-600">Economia</p>
                        <p className="text-lg font-bold text-green-600">
                          {(
                            ((originalAmount - Number(negotiationResult.counterOffer.amount)) / originalAmount) *
                            100
                          ).toFixed(1)}
                          %
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-blue-700 mt-3">{negotiationResult.counterOffer.conditions}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              {negotiationResult.status === "accepted" && (
                <Button className="flex-1 bg-green-600 hover:bg-green-700">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pagar Acordo
                </Button>
              )}
              {negotiationResult.status === "counter" && (
                <>
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aceitar Contraproposta
                  </Button>
                  <Button variant="outline" className="flex-1 bg-transparent">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Nova Proposta
                  </Button>
                </>
              )}
              {negotiationResult.status === "rejected" && (
                <Button variant="outline" className="flex-1 bg-transparent">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Fazer Nova Proposta
                </Button>
              )}
              <Button variant="outline" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
