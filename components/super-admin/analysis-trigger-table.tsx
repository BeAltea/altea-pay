"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { PlayCircle, CheckCircle, XCircle, Clock } from "lucide-react"

interface AnalysisTrigger {
  id: string
  company_id: string
  scope: "all" | "group" | "single"
  analysis_type: "free" | "assertiva"
  status: "pending" | "running" | "completed" | "failed"
  total_customers: number
  processed_customers: number
  successful_analyses: number
  failed_analyses: number
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export function AnalysisTriggerTable({ companyId }: { companyId: string }) {
  const [triggers, setTriggers] = useState<AnalysisTrigger[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTriggers()

    // Poll for updates every 10 seconds (replaces Supabase real-time)
    const interval = setInterval(loadTriggers, 10000)

    return () => {
      clearInterval(interval)
    }
  }, [companyId])

  async function loadTriggers() {
    try {
      // TODO: Replace with server action or API route for fetching analysis triggers
      const response = await fetch(`/api/analysis-triggers?companyId=${companyId}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setTriggers(data || [])
      } else {
        console.error("Error loading triggers:", response.statusText)
        setTriggers([])
      }
    } catch (error) {
      console.error("Error loading triggers:", error)
      setTriggers([])
    } finally {
      setLoading(false)
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "running":
        return <PlayCircle className="h-4 w-4" />
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "failed":
        return <XCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "pending":
        return "bg-yellow-500"
      case "running":
        return "bg-blue-500"
      case "completed":
        return "bg-green-500"
      case "failed":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  if (loading) {
    return <div>Carregando triggers...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Triggers de Análise em Lote</CardTitle>
        <CardDescription>Acompanhe o progresso das análises em execução</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {triggers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum trigger encontrado</p>
          ) : (
            triggers.map((trigger) => {
              const progress =
                trigger.total_customers > 0 ? (trigger.processed_customers / trigger.total_customers) * 100 : 0

              return (
                <div key={trigger.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(trigger.status)}
                      <span className="font-medium">
                        {trigger.scope === "all"
                          ? "Todos os clientes"
                          : trigger.scope === "group"
                            ? "Grupo de clientes"
                            : "Cliente único"}
                      </span>
                      <Badge variant="outline">{trigger.analysis_type === "free" ? "Gratuita" : "Assertiva"}</Badge>
                    </div>
                    <Badge className={getStatusColor(trigger.status)}>{trigger.status}</Badge>
                  </div>

                  {trigger.status === "running" && (
                    <div className="space-y-2">
                      <Progress value={progress} />
                      <p className="text-sm text-muted-foreground">
                        {trigger.processed_customers} de {trigger.total_customers} clientes processados
                      </p>
                    </div>
                  )}

                  {trigger.status === "completed" && (
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-600">✓ {trigger.successful_analyses} sucesso</span>
                      {trigger.failed_analyses > 0 && (
                        <span className="text-red-600">✗ {trigger.failed_analyses} falhas</span>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Criado em {new Date(trigger.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
