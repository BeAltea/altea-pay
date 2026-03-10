"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import {
  MessageSquarePlus,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  Percent,
  CreditCard,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  NEGOTIATION_REQUEST_TYPES,
  MAX_DISCOUNT_PERCENTAGE,
  MAX_INSTALLMENTS,
  MIN_INSTALLMENT_AMOUNT,
  calculateInstallmentAmount,
  type NegotiationRequestType,
  type NegotiationRequest,
  REQUEST_STATUS_LABELS,
} from "@/lib/constants/negotiation-request"

interface Debt {
  id: string
  description: string
  amount: number
  company_id?: string
  company_name?: string
  agreement_id?: string
  asaasPaymentId?: string
}

interface Props {
  debt: Debt
  trigger?: React.ReactNode
}

export function CustomerRequestDialog({ debt, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [existingRequests, setExistingRequests] = useState<NegotiationRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [view, setView] = useState<"form" | "history">("form")

  // Form state
  const [requestType, setRequestType] = useState<NegotiationRequestType>("both")
  const [discountPercentage, setDiscountPercentage] = useState<number>(0)
  const [installments, setInstallments] = useState<number>(1)
  const [justification, setJustification] = useState<string>("")

  const discountedAmount = debt.amount * (1 - discountPercentage / 100)
  const installmentAmount = calculateInstallmentAmount(debt.amount, discountPercentage, installments)
  const totalWithInstallments = installmentAmount * installments

  // Check if installment amount is valid
  const isInstallmentAmountValid = installmentAmount >= MIN_INSTALLMENT_AMOUNT || installments === 1

  useEffect(() => {
    if (open) {
      loadExistingRequests()
    }
  }, [open])

  const loadExistingRequests = async () => {
    setLoadingRequests(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const response = await fetch("/api/negotiation-requests")
      if (!response.ok) return

      const data = await response.json()
      // Filter to show only requests related to this debt's company
      const filtered = (data.requests || []).filter(
        (r: NegotiationRequest) => r.company_id === debt.company_id
      )
      setExistingRequests(filtered)
    } catch (error) {
      console.error("Error loading requests:", error)
    } finally {
      setLoadingRequests(false)
    }
  }

  const handleSubmit = async () => {
    if (!isInstallmentAmountValid) {
      toast.error(`Valor mínimo da parcela é R$ ${MIN_INSTALLMENT_AMOUNT.toFixed(2)}`)
      return
    }

    if (requestType !== "discount" && installments <= 1) {
      toast.error("Selecione pelo menos 2 parcelas para solicitar parcelamento")
      return
    }

    if (requestType !== "installment" && discountPercentage <= 0) {
      toast.error("Selecione um percentual de desconto")
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      const { data: profile } = await supabase
        .from("profiles")
        .select("cpf_cnpj, full_name, email, phone")
        .eq("id", user.id)
        .single()

      const payload = {
        company_id: debt.company_id,
        agreement_id: debt.agreement_id || null,
        vmax_id: debt.id,
        customer_name: profile?.full_name || user.email,
        customer_document: profile?.cpf_cnpj || null,
        customer_email: profile?.email || user.email,
        customer_phone: profile?.phone || null,
        original_amount: debt.amount,
        original_asaas_payment_id: debt.asaasPaymentId || null,
        request_type: requestType,
        requested_discount_percentage: requestType !== "installment" ? discountPercentage : null,
        requested_installments: requestType !== "discount" ? installments : null,
        customer_justification: justification,
      }

      const response = await fetch("/api/negotiation-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro ao criar solicitação")
      }

      toast.success("Solicitação enviada com sucesso! Aguarde a análise do credor.")
      setOpen(false)
      resetForm()
    } catch (error: any) {
      console.error("Error creating request:", error)
      toast.error(error.message || "Erro ao criar solicitação")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setRequestType("both")
    setDiscountPercentage(0)
    setInstallments(1)
    setJustification("")
    setView("form")
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: React.ReactNode; className: string }> = {
      pending: {
        icon: <Clock className="h-3 w-3" />,
        className: "bg-yellow-100 text-yellow-700",
      },
      approved: {
        icon: <CheckCircle className="h-3 w-3" />,
        className: "bg-green-100 text-green-700",
      },
      rejected: {
        icon: <XCircle className="h-3 w-3" />,
        className: "bg-red-100 text-red-700",
      },
      cancelled: {
        icon: <XCircle className="h-3 w-3" />,
        className: "bg-gray-100 text-gray-700",
      },
    }
    const variant = variants[status] || variants.pending
    return (
      <Badge className={`${variant.className} flex items-center gap-1`}>
        {variant.icon}
        {REQUEST_STATUS_LABELS[status as keyof typeof REQUEST_STATUS_LABELS] || status}
      </Badge>
    )
  }

  const hasPendingRequest = existingRequests.some((r) => r.status === "pending")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            Solicitar Desconto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Negociação</DialogTitle>
          <DialogDescription>
            Solicite um desconto ou parcelamento para sua dívida. Sua solicitação será analisada pelo credor.
          </DialogDescription>
        </DialogHeader>

        {/* Tab navigation */}
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={view === "form" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("form")}
          >
            Nova Solicitação
          </Button>
          <Button
            variant={view === "history" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("history")}
          >
            Minhas Solicitações ({existingRequests.length})
          </Button>
        </div>

        {view === "form" ? (
          <div className="space-y-4 py-4">
            {/* Pending request warning */}
            {hasPendingRequest && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-700">
                    Você já tem uma solicitação pendente. Aguarde a resposta antes de criar uma nova.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Debt Info */}
            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-2">
                <p className="font-medium">{debt.description}</p>
                <p className="text-sm text-muted-foreground">{debt.company_name}</p>
                <p className="text-lg font-bold text-red-600">
                  R$ {debt.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>

            {/* Request Type */}
            <div className="space-y-2">
              <Label>O que você deseja solicitar?</Label>
              <Select value={requestType} onValueChange={(v: NegotiationRequestType) => setRequestType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">Apenas Desconto</SelectItem>
                  <SelectItem value="installment">Apenas Parcelamento</SelectItem>
                  <SelectItem value="both">Desconto e Parcelamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Discount Slider */}
            {requestType !== "installment" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Desconto Desejado
                  </Label>
                  <span className="text-lg font-bold text-blue-600">{discountPercentage}%</span>
                </div>
                <Slider
                  value={[discountPercentage]}
                  onValueChange={([value]) => setDiscountPercentage(value)}
                  max={MAX_DISCOUNT_PERCENTAGE}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>{MAX_DISCOUNT_PERCENTAGE}%</span>
                </div>
                {discountPercentage > 0 && (
                  <p className="text-sm text-green-600">
                    Valor com desconto: R$ {discountedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            )}

            {/* Installments Slider */}
            {requestType !== "discount" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Número de Parcelas
                  </Label>
                  <span className="text-lg font-bold text-purple-600">{installments}x</span>
                </div>
                <Slider
                  value={[installments]}
                  onValueChange={([value]) => setInstallments(value)}
                  min={2}
                  max={MAX_INSTALLMENTS}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>2x</span>
                  <span>{MAX_INSTALLMENTS}x</span>
                </div>
                {installments > 1 && (
                  <div className="space-y-1">
                    <p className="text-sm text-purple-600">
                      {installments}x de R$ {installmentAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    {!isInstallmentAmountValid && (
                      <p className="text-sm text-red-600">
                        Valor mínimo da parcela: R$ {MIN_INSTALLMENT_AMOUNT.toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Justification */}
            <div className="space-y-2">
              <Label>Conte-nos sua situação</Label>
              <Textarea
                placeholder="Explique por que você precisa deste desconto ou parcelamento. Isso ajuda na análise da sua solicitação..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Uma boa justificativa aumenta as chances de aprovação.
              </p>
            </div>

            {/* Summary */}
            <Card className="bg-blue-50 dark:bg-blue-950/30">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Resumo da Solicitação</p>
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <div className="flex justify-between">
                    <span>Valor Original:</span>
                    <span className="font-medium">
                      R$ {debt.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {requestType !== "installment" && discountPercentage > 0 && (
                    <div className="flex justify-between text-green-700 dark:text-green-400">
                      <span>Desconto ({discountPercentage}%):</span>
                      <span className="font-medium">
                        -R$ {(debt.amount - discountedAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-2 border-t border-blue-200 dark:border-blue-800">
                    <span>Valor Final:</span>
                    <span>
                      {requestType !== "discount" && installments > 1
                        ? `${installments}x R$ ${installmentAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                        : `R$ ${(requestType === "installment" ? debt.amount : discountedAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* History View */
          <div className="py-4 space-y-4">
            {loadingRequests ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : existingRequests.length > 0 ? (
              existingRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Valor:</span>{" "}
                        <span className="font-medium">
                          R$ {request.original_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {request.requested_discount_percentage && (
                        <div>
                          <span className="text-muted-foreground">Desconto:</span>{" "}
                          <span className="font-medium text-blue-600">{request.requested_discount_percentage}%</span>
                        </div>
                      )}
                      {request.requested_installments && (
                        <div>
                          <span className="text-muted-foreground">Parcelas:</span>{" "}
                          <span className="font-medium text-purple-600">{request.requested_installments}x</span>
                        </div>
                      )}
                    </div>
                    {request.admin_response && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        <p className="text-muted-foreground text-xs mb-1">Resposta:</p>
                        <p>{request.admin_response}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <MessageSquarePlus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Você ainda não fez nenhuma solicitação</p>
              </div>
            )}
          </div>
        )}

        {view === "form" && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || hasPendingRequest || !isInstallmentAmountValid}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Solicitação"
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
