"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react"

interface BatchStatus {
  id: string
  type: string
  status: string
  totalJobs: number
  completedJobs: number
  failedJobs: number
  progress: number
  metadata: Record<string, any>
  results: any[]
  errors: any[]
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

interface BatchProgressModalProps {
  batchId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: (batch: BatchStatus) => void
  title?: string
  description?: string
}

const batchTypeLabels: Record<string, string> = {
  charge_create: "Criação de Cobranças",
  charge_update: "Atualização de Cobranças",
  charge_cancel: "Cancelamento de Cobranças",
  notification: "Envio de Notificações",
  sync: "Sincronização de Status",
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Aguardando", color: "text-yellow-500" },
  processing: { label: "Processando", color: "text-blue-500" },
  completed: { label: "Concluído", color: "text-green-500" },
  completed_with_errors: { label: "Concluído com Erros", color: "text-orange-500" },
  failed: { label: "Falhou", color: "text-red-500" },
}

export function BatchProgressModal({
  batchId,
  open,
  onOpenChange,
  onComplete,
  title,
  description,
}: BatchProgressModalProps) {
  const [batch, setBatch] = useState<BatchStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)

  const fetchBatchStatus = useCallback(async () => {
    if (!batchId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/asaas/batch/${batchId}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to fetch batch status")
      }

      const data: BatchStatus = await response.json()
      setBatch(data)

      // Check if batch is complete
      if (
        data.status === "completed" ||
        data.status === "completed_with_errors" ||
        data.status === "failed"
      ) {
        onComplete?.(data)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [batchId, onComplete])

  // Poll for updates while processing
  useEffect(() => {
    if (!open || !batchId) return

    // Initial fetch
    fetchBatchStatus()

    // Poll every 2 seconds while processing
    const interval = setInterval(() => {
      if (
        batch?.status === "pending" ||
        batch?.status === "processing" ||
        !batch
      ) {
        fetchBatchStatus()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [open, batchId, batch?.status, fetchBatchStatus])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setBatch(null)
      setError(null)
      setShowErrors(false)
    }
  }, [open])

  const isComplete =
    batch?.status === "completed" ||
    batch?.status === "completed_with_errors" ||
    batch?.status === "failed"

  const statusInfo = batch ? statusLabels[batch.status] : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {title || (batch ? batchTypeLabels[batch.type] || "Processamento em Lote" : "Carregando...")}
          </DialogTitle>
          <DialogDescription>
            {description || "Acompanhe o progresso do processamento em lote."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading && !batch && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchBatchStatus}
                className="ml-auto"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}

          {batch && (
            <>
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <div className="flex items-center gap-2">
                  {batch.status === "processing" && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  )}
                  {batch.status === "completed" && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {batch.status === "completed_with_errors" && (
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  )}
                  {batch.status === "failed" && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${statusInfo?.color}`}>
                    {statusInfo?.label}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{batch.progress}%</span>
                </div>
                <Progress value={batch.progress} className="h-3" />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 rounded-lg border p-3">
                <div className="text-center">
                  <div className="text-2xl font-bold">{batch.totalJobs}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {batch.completedJobs}
                  </div>
                  <div className="text-xs text-muted-foreground">Sucesso</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {batch.failedJobs}
                  </div>
                  <div className="text-xs text-muted-foreground">Erros</div>
                </div>
              </div>

              {/* Timing */}
              {batch.startedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Iniciado em</span>
                  <span>
                    {new Date(batch.startedAt).toLocaleString("pt-BR")}
                  </span>
                </div>
              )}
              {batch.completedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Finalizado em</span>
                  <span>
                    {new Date(batch.completedAt).toLocaleString("pt-BR")}
                  </span>
                </div>
              )}

              {/* Error Details */}
              {batch.failedJobs > 0 && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowErrors(!showErrors)}
                    className="w-full"
                  >
                    {showErrors ? "Ocultar Erros" : `Ver ${batch.failedJobs} Erro(s)`}
                  </Button>

                  {showErrors && batch.errors.length > 0 && (
                    <ScrollArea className="h-40 rounded-md border p-3">
                      <div className="space-y-2">
                        {batch.errors.map((err, index) => (
                          <div
                            key={index}
                            className="rounded border border-red-200 bg-red-50 p-2 text-xs"
                          >
                            <div className="font-medium text-red-700">
                              Job {err.jobIndex + 1}
                              {err.customerCpfCnpj && ` - ${err.customerCpfCnpj}`}
                            </div>
                            <div className="text-red-600">{err.error}</div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant={isComplete ? "default" : "outline"}
            onClick={() => onOpenChange(false)}
          >
            {isComplete ? "Fechar" : "Processar em Segundo Plano"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook for easy batch progress tracking
export function useBatchProgress() {
  const [batchId, setBatchId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const startBatch = (id: string) => {
    setBatchId(id)
    setIsOpen(true)
  }

  const closeBatch = () => {
    setIsOpen(false)
    setBatchId(null)
  }

  return {
    batchId,
    isOpen,
    startBatch,
    closeBatch,
    setIsOpen,
  }
}
