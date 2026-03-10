"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Search,
  RefreshCw,
  DollarSign,
  Percent,
  CreditCard,
  Filter,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  type NegotiationRequest,
  type NegotiationRequestStatus,
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_LABELS,
  calculateInstallmentAmount,
} from "@/lib/constants/negotiation-request"

function RequestSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function SolicitacoesPage() {
  const [requests, setRequests] = useState<NegotiationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<NegotiationRequestStatus | "all">("all")
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<NegotiationRequest | null>(null)
  const [showResponseDialog, setShowResponseDialog] = useState(false)
  const [responseAction, setResponseAction] = useState<"approve" | "reject">("approve")
  const [adminResponse, setAdminResponse] = useState("")

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let url = "/api/negotiation-requests?"
      if (statusFilter !== "all") {
        url += `status=${statusFilter}&`
      }

      const response = await fetch(url)
      if (!response.ok) throw new Error("Erro ao carregar solicitações")

      const data = await response.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error("Error loading requests:", error)
      toast.error("Erro ao carregar solicitações")
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const handleApprove = (request: NegotiationRequest) => {
    setSelectedRequest(request)
    setResponseAction("approve")
    setAdminResponse("")
    setShowResponseDialog(true)
  }

  const handleReject = (request: NegotiationRequest) => {
    setSelectedRequest(request)
    setResponseAction("reject")
    setAdminResponse("")
    setShowResponseDialog(true)
  }

  const confirmResponse = async () => {
    if (!selectedRequest) return

    setProcessing(selectedRequest.id)
    try {
      const endpoint = `/api/negotiation-requests/${selectedRequest.id}/${responseAction}`
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_response: adminResponse }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Erro ao ${responseAction === "approve" ? "aprovar" : "rejeitar"} solicitação`)
      }

      toast.success(
        responseAction === "approve"
          ? "Solicitação aprovada com sucesso!"
          : "Solicitação rejeitada"
      )

      setShowResponseDialog(false)
      loadRequests()
    } catch (error: any) {
      console.error("Error responding to request:", error)
      toast.error(error.message || "Erro ao processar solicitação")
    } finally {
      setProcessing(null)
    }
  }

  const filteredRequests = requests.filter((request) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        request.customer_name?.toLowerCase().includes(search) ||
        request.customer_document?.includes(search)
      )
    }
    return true
  })

  const pendingCount = requests.filter((r) => r.status === "pending").length
  const approvedCount = requests.filter((r) => r.status === "approved").length
  const rejectedCount = requests.filter((r) => r.status === "rejected").length

  const getStatusBadge = (status: NegotiationRequestStatus) => {
    const variants: Record<NegotiationRequestStatus, string> = {
      pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
      approved: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
      cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    }
    return (
      <Badge className={variants[status]}>
        {REQUEST_STATUS_LABELS[status]}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Solicitações de Negociação</h1>
          <p className="text-muted-foreground">Gerencie as solicitações de desconto e parcelamento dos clientes</p>
        </div>
        <RequestSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Solicitações de Negociação</h1>
          <p className="text-muted-foreground">
            Gerencie as solicitações de desconto e parcelamento dos clientes
          </p>
        </div>
        <Button variant="outline" onClick={() => loadRequests()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aprovadas</p>
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejeitadas</p>
                <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou documento..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="approved">Aprovadas</SelectItem>
                <SelectItem value="rejected">Rejeitadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-900 dark:text-yellow-100">
                  {pendingCount} solicitação{pendingCount > 1 ? "ões" : ""} aguardando análise
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Revise e aprove ou rejeite as solicitações pendentes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Customer Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{request.customer_name || "Cliente"}</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{request.customer_document}</p>
                    {request.customer_email && (
                      <p className="text-xs text-muted-foreground">{request.customer_email}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Solicitado em {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>

                  {/* Request Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Valor Original</p>
                      <p className="font-semibold text-red-600">
                        R$ {request.original_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                      <Badge variant="outline" className="text-xs">
                        {REQUEST_TYPE_LABELS[request.request_type]}
                      </Badge>
                    </div>
                    {request.requested_discount_percentage !== null && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Desconto</p>
                        <p className="font-semibold text-blue-600">
                          {request.requested_discount_percentage}%
                        </p>
                      </div>
                    )}
                    {request.requested_installments !== null && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Parcelas</p>
                        <p className="font-semibold text-purple-600">
                          {request.requested_installments}x
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Justification */}
                {request.customer_justification && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Justificativa do cliente:</p>
                    <p className="text-sm">{request.customer_justification}</p>
                  </div>
                )}

                {/* Admin Response */}
                {request.admin_response && request.status !== "pending" && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Resposta do administrador:</p>
                    <p className="text-sm">{request.admin_response}</p>
                    {request.responded_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Respondido em {format(new Date(request.responded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                {request.status === "pending" && (
                  <div className="mt-4 flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => handleReject(request)}
                      disabled={processing === request.id}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeitar
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(request)}
                      disabled={processing === request.id}
                    >
                      {processing === request.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Aprovar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-1">
                Nenhuma solicitação encontrada
              </h3>
              <p className="text-sm text-muted-foreground">
                {statusFilter !== "all"
                  ? `Não há solicitações com status "${REQUEST_STATUS_LABELS[statusFilter as NegotiationRequestStatus]}"`
                  : "Não há solicitações de negociação no momento"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {responseAction === "approve" ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Aprovar Solicitação
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Rejeitar Solicitação
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {responseAction === "approve"
                ? "Ao aprovar, o pagamento atual será cancelado e um novo será criado com os termos solicitados."
                : "Informe o motivo da rejeição para o cliente."}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium">{selectedRequest.customer_name}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.customer_document}</p>
                <div className="flex gap-4 text-sm">
                  <span>
                    Original: R$ {selectedRequest.original_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  {selectedRequest.requested_discount_percentage && (
                    <span className="text-blue-600">
                      -{selectedRequest.requested_discount_percentage}%
                    </span>
                  )}
                  {selectedRequest.requested_installments && (
                    <span className="text-purple-600">
                      {selectedRequest.requested_installments}x
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {responseAction === "approve" ? "Mensagem de aprovação (opcional)" : "Motivo da rejeição"}
                </label>
                <Textarea
                  placeholder={
                    responseAction === "approve"
                      ? "Sua solicitação foi aprovada..."
                      : "Informe o motivo da rejeição..."
                  }
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponseDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmResponse}
              disabled={processing !== null}
              className={responseAction === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {responseAction === "approve" ? "Confirmar Aprovação" : "Confirmar Rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
