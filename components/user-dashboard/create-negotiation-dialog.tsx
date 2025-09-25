"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, MessageSquare, Calculator, CheckCircle, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface CreateNegotiationDialogProps {
  openDebts: Array<{
    id: string
    description: string
    amount: string
    due_date: string
    status: string
  }>
  triggerButton?: React.ReactNode
}

export function CreateNegotiationDialog({ openDebts, triggerButton }: CreateNegotiationDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDebtId, setSelectedDebtId] = useState("")
  const [proposedAmount, setProposedAmount] = useState("")
  const [installments, setInstallments] = useState("1")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  console.log("[v0] CreateNegotiationDialog - Component rendered with", openDebts.length, "debts")

  const selectedDebt = openDebts.find((debt) => debt.id === selectedDebtId)
  const originalAmount = selectedDebt ? Number(selectedDebt.amount) : 0
  const proposed = Number(proposedAmount) || 0
  const savings = originalAmount - proposed
  const savingsPercentage = originalAmount > 0 ? (savings / originalAmount) * 100 : 0
  const installmentValue = proposed > 0 && Number(installments) > 0 ? proposed / Number(installments) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] CreateNegotiationDialog - Form submitted", { selectedDebtId, proposedAmount, installments })

    if (!selectedDebtId || !proposedAmount) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, selecione uma dívida e informe o valor proposto.",
        variant: "destructive",
      })
      return
    }

    if (proposed <= 0 || proposed > originalAmount) {
      toast({
        title: "Valor inválido",
        description: "O valor proposto deve ser maior que zero e menor ou igual ao valor original.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()

      // Create mock negotiation record
      const mockNegotiation = {
        id: `neg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        debt_id: selectedDebtId,
        proposed_amount: proposedAmount,
        proposed_installments: Number(installments),
        message: message || null,
        status: "active",
        created_at: new Date().toISOString(),
        response_date: null,
        response_message: null,
      }

      console.log("[v0] CreateNegotiationDialog - Mock negotiation created:", mockNegotiation)

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Show success message
      toast({
        title: "Proposta enviada com sucesso!",
        description: `Sua proposta de R$ ${proposed.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} foi enviada. Aguarde a resposta da empresa.`,
      })

      setIsOpen(false)
      resetForm()

      // Refresh the page to show updated data
      setTimeout(() => {
        router.refresh()
      }, 100)
    } catch (error) {
      console.error("Error creating negotiation:", error)
      toast({
        title: "Erro ao enviar proposta",
        description: "Ocorreu um erro ao enviar sua proposta. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedDebtId("")
    setProposedAmount("")
    setInstallments("1")
    setMessage("")
  }

  const suggestAmount = (percentage: number) => {
    if (originalAmount > 0) {
      const suggested = originalAmount * (percentage / 100)
      setProposedAmount(suggested.toFixed(2))
      console.log("[v0] CreateNegotiationDialog - Suggested amount:", suggested, "for", percentage, "%")
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) {
      setIsOpen(open)
      if (!open) {
        resetForm()
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Negociação
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Criar Nova Negociação</DialogTitle>
          <DialogDescription className="text-sm">
            Faça uma proposta de pagamento para uma de suas dívidas em aberto. A empresa analisará sua proposta e
            responderá em breve.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Debt Selection */}
          <div>
            <Label htmlFor="debt" className="text-sm">
              Selecione a Dívida *
            </Label>
            <Select value={selectedDebtId} onValueChange={setSelectedDebtId} disabled={isSubmitting}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Escolha uma dívida para negociar" />
              </SelectTrigger>
              <SelectContent>
                {openDebts.map((debt) => (
                  <SelectItem key={debt.id} value={debt.id}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span className="font-medium">{debt.description}</span>
                      <span className="text-sm text-muted-foreground">
                        R$ {Number(debt.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Debt Info */}
          {selectedDebt && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border">
              <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Informações da Dívida Selecionada
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Descrição:</p>
                  <p className="font-medium">{selectedDebt.description}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Valor Original:</p>
                  <p className="font-bold text-lg text-red-600">
                    R$ {Number(selectedDebt.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Vencimento:</p>
                  <p className="text-sm">{new Date(selectedDebt.due_date).toLocaleDateString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status:</p>
                  <p className="capitalize font-medium text-sm">
                    {selectedDebt.status === "overdue" ? "Em Atraso" : selectedDebt.status}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Proposed Amount */}
          <div>
            <Label htmlFor="amount" className="text-sm">
              Valor Proposto (R$) *
            </Label>
            <div className="space-y-2">
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
                disabled={isSubmitting}
                className="h-10"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => suggestAmount(70)}
                  disabled={!selectedDebt || isSubmitting}
                  className="flex-1 h-8 text-xs"
                >
                  70%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => suggestAmount(50)}
                  disabled={!selectedDebt || isSubmitting}
                  className="flex-1 h-8 text-xs"
                >
                  50%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => suggestAmount(30)}
                  disabled={!selectedDebt || isSubmitting}
                  className="flex-1 h-8 text-xs"
                >
                  30%
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Clique nos botões para sugerir valores baseados em percentuais
            </p>
          </div>

          {/* Installments */}
          <div>
            <Label htmlFor="installments" className="text-sm">
              Número de Parcelas
            </Label>
            <Select value={installments} onValueChange={setInstallments} disabled={isSubmitting}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 10, 12].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span>
                        {num}x{num === 1 ? " (à vista)" : ""}
                      </span>
                      {num > 1 && installmentValue > 0 && (
                        <span className="text-muted-foreground text-xs">
                          R$ {installmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} cada
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Savings Calculation */}
          {proposed > 0 && originalAmount > 0 && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Calculator className="h-4 w-4 text-green-600" />
                <h4 className="font-medium text-green-800 dark:text-green-200 text-sm">Resumo da Proposta</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-green-700 dark:text-green-300 text-xs">Valor Original:</p>
                  <p className="font-bold text-base">
                    R$ {originalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-green-700 dark:text-green-300 text-xs">Valor Proposto:</p>
                  <p className="font-bold text-base text-blue-600">
                    R$ {proposed.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-green-700 dark:text-green-300 text-xs">Economia:</p>
                  <p className="font-bold text-base text-green-600">
                    R$ {savings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({savingsPercentage.toFixed(1)}%)
                  </p>
                </div>
                <div>
                  <p className="text-green-700 dark:text-green-300 text-xs">Parcelas:</p>
                  <p className="font-bold text-base">
                    {installments}x de R$ {installmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Message */}
          <div>
            <Label htmlFor="message" className="text-sm">
              Mensagem (Opcional)
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explique sua situação ou justifique sua proposta..."
              rows={3}
              disabled={isSubmitting}
              maxLength={500}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">{message.length}/500 caracteres</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="submit"
              disabled={
                !selectedDebtId || !proposedAmount || isSubmitting || proposed <= 0 || proposed > originalAmount
              }
              className="w-full sm:flex-1 h-10 bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Enviar Proposta
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto h-10"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
