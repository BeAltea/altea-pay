"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, DollarSign, CheckCircle, Clock, AlertCircle, CreditCard, FileText, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaymentCardProps {
  payment: {
    id: string
    amount: string
    payment_date: string
    payment_method: string
    status: string
    transaction_id?: string
    created_at: string
    debts?: {
      description: string
      due_date: string
    }
  }
}

export function PaymentCard({ payment }: PaymentCardProps) {
  const getStatusBadge = () => {
    switch (payment.status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Concluído</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendente</Badge>
      case "failed":
        return <Badge variant="destructive">Falhou</Badge>
      case "cancelled":
        return <Badge variant="secondary">Cancelado</Badge>
      default:
        return <Badge variant="outline">Desconhecido</Badge>
    }
  }

  const getStatusIcon = () => {
    switch (payment.status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <CreditCard className="h-5 w-5 text-gray-500" />
    }
  }

  const getPaymentMethodName = (method: string) => {
    const methods = {
      pix: "PIX",
      boleto: "Boleto Bancário",
      cartao: "Cartão de Crédito",
      transferencia: "Transferência Bancária",
    }
    return methods[method as keyof typeof methods] || method
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "pix":
        return "💳"
      case "boleto":
        return "📄"
      case "cartao":
        return "💳"
      case "transferencia":
        return "🏦"
      default:
        return "💰"
    }
  }

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        payment.status === "completed" && "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20",
        payment.status === "failed" && "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20",
        payment.status === "pending" &&
          "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-lg">
                {payment.debts?.description || `Pagamento #${payment.id.slice(-8)}`}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Realizado em {new Date(payment.payment_date).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Payment Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Valor</p>
              <p className="text-lg font-bold">
                R$ {Number(payment.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-lg">{getPaymentMethodIcon(payment.payment_method)}</span>
            <div>
              <p className="text-sm text-muted-foreground">Método</p>
              <p className="text-sm font-medium">{getPaymentMethodName(payment.payment_method)}</p>
            </div>
          </div>

          {payment.debts?.due_date && (
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Vencimento Original</p>
                <p className="text-sm font-medium">{new Date(payment.debts.due_date).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          )}
        </div>

        {/* Transaction ID */}
        {payment.transaction_id && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">ID da Transação</p>
                <p className="text-xs text-muted-foreground font-mono">{payment.transaction_id}</p>
              </div>
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Status-specific information */}
        {payment.status === "completed" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-green-800">Pagamento processado com sucesso!</p>
            </div>
          </div>
        )}

        {payment.status === "pending" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <p className="text-sm font-medium text-yellow-800">Aguardando confirmação do pagamento</p>
            </div>
          </div>
        )}

        {payment.status === "failed" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm font-medium text-red-800">Falha no processamento</p>
              </div>
              <Button variant="outline" size="sm" className="text-red-600 border-red-200 bg-transparent">
                Tentar Novamente
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="bg-transparent">
            <FileText className="h-4 w-4 mr-2" />
            Comprovante
          </Button>
          {payment.status === "completed" && (
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Detalhes
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
