"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  BarChart3,
  CreditCard,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface DebtCardProps {
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

export function DebtCard({ debt }: DebtCardProps) {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  const isOverdue = (debt.days_overdue || 0) > 0
  const isPaid = debt.status === "paid"
  const paymentScore = Number(debt.propensity_payment_score) || 0
  const loanScore = Number(debt.propensity_loan_score) || 0

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

  const handleSimulatedPayment = async () => {
    if (!paymentMethod) return

    setIsProcessing(true)

    try {
      const supabase = createClient()

      // Create payment record
      const { error: paymentError } = await supabase.from("payments").insert({
        debt_id: debt.id,
        amount: debt.amount,
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: paymentMethod,
        status: "completed",
        transaction_id: `SIM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      })

      if (paymentError) throw paymentError

      // Update debt status to paid
      const { error: debtError } = await supabase
        .from("debts")
        .update({
          status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", debt.id)

      if (debtError) throw debtError

      setIsPaymentDialogOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Error processing simulated payment:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
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
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:flex-1 h-9 text-sm bg-blue-600 hover:bg-blue-700">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pagar Agora
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md sm:max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg">Pagamento Simulado</DialogTitle>
                  <DialogDescription className="text-sm">
                    Simule o pagamento desta dívida. Esta ação atualizará o status para "Pago" no sistema.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 text-sm">Detalhes da Dívida</h4>
                    <p className="text-sm text-muted-foreground">{debt.description}</p>
                    <p className="text-lg font-bold">
                      R$ {Number(debt.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Método de Pagamento</label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                        <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                        <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button
                      onClick={handleSimulatedPayment}
                      disabled={!paymentMethod || isProcessing}
                      className="w-full sm:flex-1 h-10"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      {isProcessing ? "Processando..." : "Confirmar Pagamento"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsPaymentDialogOpen(false)}
                      disabled={isProcessing}
                      className="w-full sm:w-auto h-10"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="w-full sm:flex-1 h-9 text-sm bg-transparent">
              <MessageSquare className="h-4 w-4 mr-2" />
              Negociar
            </Button>
            <Button variant="ghost" className="w-full sm:w-auto h-9 text-sm px-3">
              <BarChart3 className="h-4 w-4 mr-2" />
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
  )
}
