"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
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
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function UserSolicitacoesPage() {
  const [requests, setRequests] = useState<NegotiationRequest[]>([])
  const [loading, setLoading] = useState(true)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/negotiation-requests")
      if (!response.ok) throw new Error("Erro ao carregar solicitações")

      const data = await response.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error("Error loading requests:", error)
      toast.error("Erro ao carregar solicitações")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const handleCancel = async (requestId: string) => {
    try {
      const response = await fetch(`/api/negotiation-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      })

      if (!response.ok) throw new Error("Erro ao cancelar solicitação")

      toast.success("Solicitação cancelada")
      loadRequests()
    } catch (error: any) {
      toast.error(error.message || "Erro ao cancelar solicitação")
    }
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length
  const approvedCount = requests.filter((r) => r.status === "approved").length
  const rejectedCount = requests.filter((r) => r.status === "rejected").length

  const getStatusBadge = (status: NegotiationRequestStatus) => {
    const variants: Record<NegotiationRequestStatus, { icon: React.ReactNode; className: string }> = {
      pending: {
        icon: <Clock className="h-3 w-3" />,
        className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
      },
      approved: {
        icon: <CheckCircle className="h-3 w-3" />,
        className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      },
      rejected: {
        icon: <XCircle className="h-3 w-3" />,
        className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
      },
      cancelled: {
        icon: <XCircle className="h-3 w-3" />,
        className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      },
    }
    const variant = variants[status]
    return (
      <Badge className={`${variant.className} flex items-center gap-1`}>
        {variant.icon}
        {REQUEST_STATUS_LABELS[status]}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Minhas Solicitações</h1>
          <p className="text-muted-foreground">Acompanhe suas solicitações de desconto e parcelamento</p>
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
          <h1 className="text-2xl font-bold">Minhas Solicitações</h1>
          <p className="text-muted-foreground">
            Acompanhe suas solicitações de desconto e parcelamento
          </p>
        </div>
        <Button variant="outline" onClick={() => loadRequests()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            <p className="text-xs text-muted-foreground">Aprovadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            <p className="text-xs text-muted-foreground">Rejeitadas</p>
          </CardContent>
        </Card>
      </div>

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
                  O credor irá analisar e responder em breve.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length > 0 ? (
          requests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    {getStatusBadge(request.status)}
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Valor Original</p>
                      <p className="font-semibold text-red-600">
                        R$ {request.original_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                      <Badge variant="outline" className="text-xs">
                        {REQUEST_TYPE_LABELS[request.request_type]}
                      </Badge>
                    </div>
                    {request.requested_discount_percentage !== null && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Desconto</p>
                        <p className="font-semibold text-blue-600">
                          {request.requested_discount_percentage}%
                        </p>
                      </div>
                    )}
                    {request.requested_installments !== null && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Parcelas</p>
                        <p className="font-semibold text-purple-600">
                          {request.requested_installments}x
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Justification */}
                  {request.customer_justification && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Minha justificativa:</p>
                      <p className="text-sm">{request.customer_justification}</p>
                    </div>
                  )}

                  {/* Admin Response */}
                  {request.admin_response && request.status !== "pending" && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Resposta do credor:</p>
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
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleCancel(request.id)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancelar Solicitação
                      </Button>
                    </div>
                  )}
                </div>
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
              <p className="text-sm text-muted-foreground text-center">
                Você ainda não fez nenhuma solicitação de desconto ou parcelamento.
                <br />
                Acesse suas dívidas para solicitar.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
