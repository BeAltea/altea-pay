"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  BarChart3,
  CreditCard,
  Eye,
  TrendingUp,
  FileText,
  Calculator,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PaymentProcessingModal } from "./payment-processing-modal"
import { CreateNegotiationDialog } from "./create-negotiation-dialog"
import { MicrocreditOffer } from "./microcredit-offer"

interface EnhancedDebtCardProps {
  debt: {
    id: string
    description: string
    amount: string
    due_date: string
    status: string
    days_overdue?: number
    classification?: string
    propensity_payment_score: string
    propensity_loan_score: string
    created_at: string
  }
}

export function EnhancedDebtCard({ debt }: EnhancedDebtCardProps) {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isNegotiationModalOpen, setIsNegotiationModalOpen] = useState(false)

  console.log("[v0] EnhancedDebtCard - Component rendered for debt:", debt.id)

  const handlePaymentClick = () => {
    console.log("[v0] EnhancedDebtCard - Payment button clicked for debt:", debt.id)
    setIsPaymentModalOpen(true)
    console.log("[v0] EnhancedDebtCard - Payment modal state set to true")
  }

  const handleDetailsClick = () => {
    console.log("[v0] EnhancedDebtCard - Details button clicked for debt:", debt.id)
    setIsDetailsModalOpen(true)
    console.log("[v0] EnhancedDebtCard - Details modal state set to true")
  }

  const isOverdue = (debt.days_overdue || 0) > 0
  const isPaid = debt.status === "paid"
  const paymentScore = Number(debt.propensity_payment_score) || 0
  const loanScore = Number(debt.propensity_loan_score) || 0

  const debtForMicrocredit = {
    id: debt.id,
    description: debt.description,
    amount: Number(debt.amount),
    propensity_payment_score: paymentScore,
    propensity_loan_score: loanScore,
    status: debt.status,
  }

  const getStatusBadge = () => {
    if (isPaid) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paga</Badge>
    }
    if (debt.status === "overdue") {
      return <Badge variant="destructive">Em Atraso</Badge>
    }
    if (debt.status === "in_collection") {
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Em Cobrança</Badge>
    }
    if (debt.status === "negotiated") {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Negociada</Badge>
    }
    return <Badge variant="secondary">Em Aberto</Badge>
  }

  const getStatusIcon = () => {
    if (isPaid) return <CheckCircle className="h-5 w-5 text-green-500" />
    if (debt.status === "overdue") return <AlertCircle className="h-5 w-5 text-red-500" />
    if (debt.status === "in_collection") return <AlertCircle className="h-5 w-5 text-orange-500" />
    return <Clock className="h-5 w-5 text-blue-500" />
  }

  const getClassificationBadge = () => {
    if (!debt.classification) return null

    const colors = {
      Baixo: "bg-green-100 text-green-800",
      Médio: "bg-yellow-100 text-yellow-800",
      Alto: "bg-orange-100 text-orange-800",
      Crítico: "bg-red-100 text-red-800",
    }

    return (
      <Badge className={colors[debt.classification as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {debt.classification}
      </Badge>
    )
  }

  const generateDebtDetails = () => {
    const amount = Number(debt.amount)
    const daysOverdue = debt.days_overdue || 0
    const interest = amount * 0.02 * Math.max(daysOverdue / 30, 0) // 2% per month
    const fees = daysOverdue > 0 ? 25.5 : 0
    const totalAmount = amount + interest + fees

    return {
      originalAmount: amount,
      interest,
      fees,
      totalAmount,
      paymentHistory: [
        { date: "2024-01-15", description: "Cobrança inicial enviada", status: "sent" },
        { date: "2024-01-20", description: "Primeiro lembrete", status: "sent" },
        { date: "2024-02-01", description: "Vencimento original", status: "overdue" },
        { date: "2024-02-10", description: "Cobrança por email", status: "sent" },
      ],
    }
  }

  const debtDetails = generateDebtDetails()

  return (
    <>
      <div className="space-y-4">
        {!isPaid && <MicrocreditOffer debt={debtForMicrocredit} />}

        <Card
          className={cn(
            "transition-all duration-200 hover:shadow-md",
            debt.status === "overdue" && "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20",
            isPaid && "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20",
            debt.status === "in_collection" &&
              "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20",
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon()}
                <div>
                  <CardTitle className="text-lg">{debt.description}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Criada em {new Date(debt.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {getStatusBadge()}
                {getClassificationBadge()}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Amount and Due Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="text-lg font-bold">
                    R$ {Number(debt.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Vencimento</p>
                  <p
                    className={cn(
                      "text-lg font-medium",
                      debt.status === "overdue" && "text-red-600",
                      isPaid && "text-green-600",
                    )}
                  >
                    {new Date(debt.due_date).toLocaleDateString("pt-BR")}
                  </p>
                  {isOverdue && !isPaid && <p className="text-sm text-red-600">{debt.days_overdue} dias em atraso</p>}
                </div>
              </div>
            </div>

            {/* Propensity Scores */}
            {!isPaid && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Análise de Propensão</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Propensão ao Pagamento</span>
                      <span className="font-medium">{paymentScore.toFixed(1)}%</span>
                    </div>
                    <Progress value={paymentScore} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Propensão a Empréstimo</span>
                      <span className="font-medium">{loanScore.toFixed(1)}%</span>
                    </div>
                    <Progress value={loanScore} className="h-2" />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            {!isPaid && (
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button onClick={handlePaymentClick} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pagar Agora
                </Button>

                <CreateNegotiationDialog
                  openDebts={[debt]}
                  triggerButton={
                    <Button variant="outline" className="flex-1 bg-transparent">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Negociar
                    </Button>
                  }
                />

                <Button variant="ghost" size="sm" onClick={handleDetailsClick}>
                  <Eye className="h-4 w-4 mr-2" />
                  Detalhes
                </Button>
              </div>
            )}

            {/* Payment Success Message */}
            {isPaid && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-medium text-green-800">Dívida quitada com sucesso!</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Processing Modal */}
      {console.log("[v0] EnhancedDebtCard - Rendering PaymentProcessingModal, isOpen:", isPaymentModalOpen)}
      <PaymentProcessingModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          console.log("[v0] EnhancedDebtCard - Closing payment modal")
          setIsPaymentModalOpen(false)
        }}
        debt={debt}
      />

      {/* Debt Details Modal */}
      {console.log("[v0] EnhancedDebtCard - Rendering Details Dialog, isOpen:", isDetailsModalOpen)}
      <Dialog
        open={isDetailsModalOpen}
        onOpenChange={(open) => {
          console.log("[v0] EnhancedDebtCard - Details modal state changed to:", open)
          setIsDetailsModalOpen(open)
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Dívida</DialogTitle>
            <DialogDescription>Informações completas sobre {debt.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Financial Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Composição do Valor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Valor Original:</span>
                    <span className="font-medium">
                      R$ {debtDetails.originalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {debtDetails.interest > 0 && (
                    <div className="flex justify-between">
                      <span>Juros:</span>
                      <span className="font-medium text-orange-600">
                        R$ {debtDetails.interest.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {debtDetails.fees > 0 && (
                    <div className="flex justify-between">
                      <span>Multa:</span>
                      <span className="font-medium text-red-600">
                        R$ {debtDetails.fees.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total Atual:</span>
                      <span>R$ {debtDetails.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Análise de Risco
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Score de Pagamento</span>
                      <span className="font-medium">{paymentScore.toFixed(1)}%</span>
                    </div>
                    <Progress value={paymentScore} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Score de Empréstimo</span>
                      <span className="font-medium">{loanScore.toFixed(1)}%</span>
                    </div>
                    <Progress value={loanScore} className="h-2" />
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Recomendação:</strong>{" "}
                      {paymentScore > 70
                        ? "Alto potencial de pagamento. Oferecer desconto para pagamento à vista."
                        : "Considerar parcelamento ou negociação."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Histórico de Cobrança
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {debtDetails.paymentHistory.map((event, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          event.status === "sent" && "bg-blue-500",
                          event.status === "overdue" && "bg-red-500",
                        )}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.description}</p>
                        <p className="text-xs text-gray-500">{new Date(event.date).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <Badge variant={event.status === "overdue" ? "destructive" : "secondary"}>
                        {event.status === "sent" ? "Enviado" : "Vencido"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setIsDetailsModalOpen(false)
                  setIsPaymentModalOpen(true)
                }}
                className="flex-1"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pagar Agora
              </Button>
              <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)} className="flex-1">
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
