"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar, DollarSign, MessageSquare, CheckCircle, Clock, XCircle, FileText, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface NegotiationCardProps {
  negotiation: {
    id: string
    original_amount: number
    proposed_amount: number
    discount_amount: number
    discount_percentage: number
    installments: number
    installment_amount: number
    status: string
    payment_method: string
    terms: string
    attendant_name: string
    company_name: string
    customer_name: string
    debt_description: string
    due_date: string | null
    created_at: string
    updated_at: string
    message?: string
    response_message?: string
  }
  onSimulateResponse?: () => void
}

export function NegotiationCard({ negotiation, onSimulateResponse }: NegotiationCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const { toast } = useToast()

  const originalAmount = negotiation.original_amount
  const proposedAmount = negotiation.proposed_amount
  const savings = negotiation.discount_amount
  const savingsPercentage = negotiation.discount_percentage

  const getStatusBadge = () => {
    switch (negotiation.status) {
      case "active":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Ativa</Badge>
      case "accepted":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aceita</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejeitada</Badge>
      case "completed":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Concluída</Badge>
      case "cancelled":
        return <Badge variant="secondary">Cancelada</Badge>
      default:
        return <Badge variant="outline">Desconhecido</Badge>
    }
  }

  const getStatusIcon = () => {
    switch (negotiation.status) {
      case "active":
        return <Clock className="h-5 w-5 text-blue-500" />
      case "accepted":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "completed":
        return <CheckCircle className="h-5 w-5 text-purple-500" />
      default:
        return <MessageSquare className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (negotiation.status) {
      case "accepted":
        return "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
      case "rejected":
        return "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
      case "active":
        return "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20"
      case "completed":
        return "border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20"
      default:
        return ""
    }
  }

  const handlePayment = () => {
    console.log("[v0] NegotiationCard - Payment initiated for negotiation:", negotiation.id)
    toast({
      title: "Processando Pagamento",
      description: "Redirecionando para a página de pagamento...",
    })

    // Simulate payment processing
    setTimeout(() => {
      toast({
        title: "Pagamento Simulado",
        description: `Pagamento de R$ ${proposedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} processado com sucesso!`,
      })
    }, 2000)
  }

  const handleNewProposal = () => {
    console.log("[v0] NegotiationCard - New proposal initiated for negotiation:", negotiation.id)
    toast({
      title: "Nova Proposta",
      description: "Funcionalidade de nova proposta em desenvolvimento.",
    })
  }

  return (
    <Card className={cn("transition-all duration-200 hover:shadow-md", getStatusColor())}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-lg">
                {negotiation.debt_description || `Negociação #${negotiation.id.slice(-8)}`}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Criada em {new Date(negotiation.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Financial Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Valor Original</p>
              <p className="text-lg font-bold">
                R$ {originalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <TrendingDown className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Valor Proposto</p>
              <p className="text-lg font-bold text-green-600">
                R$ {proposedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Parcelas</p>
              <p className="text-lg font-bold">
                {negotiation.installments}x de R${" "}
                {negotiation.installment_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Savings Information */}
        {savings > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Economia Proposta</p>
                <p className="text-lg font-bold text-green-600">
                  R$ {savings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({savingsPercentage.toFixed(1)}%)
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-600">Desconto</p>
                <Progress value={savingsPercentage} className="w-20 h-2 mt-1" />
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {negotiation.message && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <p className="text-sm font-medium mb-1">Sua mensagem:</p>
            <p className="text-sm text-muted-foreground">{negotiation.message}</p>
          </div>
        )}

        {negotiation.response_message && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">Resposta da empresa:</p>
            <p className="text-sm text-blue-700 dark:text-blue-300">{negotiation.response_message}</p>
          </div>
        )}

        {/* Status-specific information */}
        {negotiation.status === "active" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-800">Aguardando resposta da empresa</p>
            </div>
          </div>
        )}

        {negotiation.status === "accepted" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-green-800">Proposta aceita! Proceda com o pagamento.</p>
            </div>
          </div>
        )}

        {negotiation.status === "rejected" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm font-medium text-red-800">
                Proposta rejeitada. Você pode tentar uma nova negociação.
              </p>
            </div>
          </div>
        )}

        {negotiation.status === "completed" && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-purple-600" />
              <p className="text-sm font-medium text-purple-800">Negociação concluída com sucesso!</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="bg-transparent">
                <FileText className="h-4 w-4 mr-2" />
                Detalhes
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Detalhes da Negociação</DialogTitle>
                <DialogDescription>Informações completas sobre esta proposta de negociação</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Informações do Cliente</h4>
                    <p className="text-sm">Nome: {negotiation.customer_name}</p>
                    <p className="text-sm">Documento: {negotiation.debts?.cpf_cnpj || "N/A"}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Informações da Empresa</h4>
                    <p className="text-sm">Empresa: {negotiation.company_name}</p>
                    <p className="text-sm">Atendente: {negotiation.attendant_name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Informações da Dívida</h4>
                    <p className="text-sm text-muted-foreground">{negotiation.debt_description}</p>
                    <p className="text-sm">
                      Valor original: R$ {originalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm">
                      Vencimento:{" "}
                      {negotiation.due_date ? new Date(negotiation.due_date).toLocaleDateString("pt-BR") : "N/A"}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Proposta</h4>
                    <p className="text-sm">
                      Valor proposto: R$ {proposedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm">Parcelas: {negotiation.installments}x</p>
                    <p className="text-sm">
                      Valor da Parcela: R${" "}
                      {negotiation.installment_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm">Desconto: {savingsPercentage.toFixed(1)}%</p>
                    <p className="text-sm text-green-600">
                      Economia: R$ {savings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm">Método: {negotiation.payment_method}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Histórico</h4>
                  <div className="space-y-2 text-sm">
                    <p>Criada em: {new Date(negotiation.created_at).toLocaleDateString("pt-BR")}</p>
                    <p>Última atualização: {new Date(negotiation.updated_at).toLocaleDateString("pt-BR")}</p>
                    <p>Status atual: {getStatusBadge()}</p>
                  </div>
                </div>

                {(negotiation.message || negotiation.response_message) && (
                  <div>
                    <h4 className="font-medium mb-2">Mensagens</h4>
                    {negotiation.message && (
                      <div className="bg-gray-50 rounded p-2 mb-2">
                        <p className="text-xs font-medium">Sua mensagem:</p>
                        <p className="text-sm">{negotiation.message}</p>
                      </div>
                    )}
                    {negotiation.response_message && (
                      <div className="bg-blue-50 rounded p-2">
                        <p className="text-xs font-medium text-blue-800">Resposta da empresa:</p>
                        <p className="text-sm text-blue-700">{negotiation.response_message}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {negotiation.status === "accepted" && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handlePayment}>
              <DollarSign className="h-4 w-4 mr-2" />
              Pagar Acordo
            </Button>
          )}

          {negotiation.status === "rejected" && (
            <Button size="sm" variant="outline" className="bg-transparent" onClick={handleNewProposal}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Nova Proposta
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
