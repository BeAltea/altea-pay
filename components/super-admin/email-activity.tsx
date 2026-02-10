"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Calendar,
  AlertCircle,
  Inbox,
  Eye,
  MousePointer,
  ShieldX,
  Ban,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface Company {
  id: string
  name: string
}

interface SendGridSummary {
  requests: number
  delivered: number
  deliveredRate: number
  opens: number
  opensRate: number
  uniqueOpens: number
  clicks: number
  clicksRate: number
  bounces: number
  bouncesRate: number
  blocks: number
  blocksRate: number
  spamReports: number
  spamRate: number
  invalidEmails: number
  deferred: number
}

interface DailyStats {
  date: string
  requests: number
  delivered: number
  opens: number
  bounces: number
  blocks: number
}

interface FailureRecord {
  email: string
  reason: string
  status?: string
  type: string
  createdAt: string
}

interface FailuresData {
  bounces: FailureRecord[]
  blocks: FailureRecord[]
  invalidEmails: FailureRecord[]
  spamReports: FailureRecord[]
  totals: {
    bounces: number
    blocks: number
    invalidEmails: number
    spamReports: number
    total: number
  }
}

function formatDateBrazilian(isoDate: string): string {
  const date = new Date(isoDate)
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }
  return new Intl.DateTimeFormat("pt-BR", options).format(date)
}

function StatCard({
  title,
  value,
  percentage,
  icon: Icon,
  color,
  isLoading,
  tooltip,
}: {
  title: string
  value: number
  percentage?: number
  icon: React.ElementType
  color: "blue" | "green" | "red" | "yellow" | "orange" | "purple"
  isLoading?: boolean
  tooltip?: string
}) {
  const colorClasses = {
    blue: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
    green: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30",
    red: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30",
    yellow: "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30",
    orange: "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30",
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const content = (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-2xl font-bold">
              {value.toLocaleString("pt-BR")}
              {percentage !== undefined && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  ({percentage.toFixed(1)}%)
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return content
}

export function EmailActivity({ companies }: { companies: Company[] }) {
  const [period, setPeriod] = useState("30")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<SendGridSummary | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [failures, setFailures] = useState<FailuresData | null>(null)
  const [isFailuresOpen, setIsFailuresOpen] = useState(false)
  const [isLoadingFailures, setIsLoadingFailures] = useState(false)

  const fetchStats = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/super-admin/sendgrid-stats?period=${period}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao carregar estatísticas")
      }

      const data = await response.json()
      setSummary(data.summary)
      setDailyStats(data.dailyStats || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFailures = async () => {
    if (failures) return // Already loaded

    setIsLoadingFailures(true)
    try {
      const response = await fetch(`/api/super-admin/sendgrid-stats/failures?period=${period}`)
      if (response.ok) {
        const data = await response.json()
        setFailures(data)
      }
    } catch (err) {
      console.error("Failed to fetch failures:", err)
    } finally {
      setIsLoadingFailures(false)
    }
  }

  // Fetch stats on mount and when period changes
  useEffect(() => {
    fetchStats()
    setFailures(null) // Reset failures when period changes
  }, [period])

  // Fetch failures when expanded
  useEffect(() => {
    if (isFailuresOpen && !failures) {
      fetchFailures()
    }
  }, [isFailuresOpen])

  const totalFailures = summary
    ? summary.bounces + summary.blocks + summary.invalidEmails
    : 0

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Estatísticas do SendGrid
              </CardTitle>
              <CardDescription>
                Dados reais de entrega de emails do SendGrid
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchStats}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Não foi possível carregar as estatísticas</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStats}
              >
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Enviados"
          value={summary?.requests || 0}
          icon={Mail}
          color="blue"
          isLoading={isLoading}
        />
        <StatCard
          title="Entregues"
          value={summary?.delivered || 0}
          percentage={summary?.deliveredRate}
          icon={CheckCircle2}
          color="green"
          isLoading={isLoading}
        />
        <StatCard
          title="Abertos"
          value={summary?.opens || 0}
          percentage={summary?.opensRate}
          icon={Eye}
          color="purple"
          isLoading={isLoading}
          tooltip={
            summary?.opens === 0
              ? "O rastreamento de abertura pode estar desativado no SendGrid ou os destinatários ainda não abriram os emails."
              : undefined
          }
        />
        <StatCard
          title="Bounces"
          value={summary?.bounces || 0}
          percentage={summary?.bouncesRate}
          icon={XCircle}
          color="red"
          isLoading={isLoading}
        />
        <StatCard
          title="Bloqueados"
          value={summary?.blocks || 0}
          percentage={summary?.blocksRate}
          icon={Ban}
          color="orange"
          isLoading={isLoading}
        />
        <StatCard
          title="Spam"
          value={summary?.spamReports || 0}
          percentage={summary?.spamRate}
          icon={ShieldX}
          color="yellow"
          isLoading={isLoading}
        />
      </div>

      {/* Daily Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico Diário
          </CardTitle>
          <CardDescription>
            Estatísticas de entrega por dia
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : dailyStats.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Nenhum email enviado
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Nenhum email encontrado no período selecionado.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {/* Table Header */}
                <div className="grid grid-cols-6 gap-4 p-3 bg-muted/50 rounded-lg text-sm font-medium sticky top-0">
                  <div>Data</div>
                  <div className="text-center">Enviados</div>
                  <div className="text-center">Entregues</div>
                  <div className="text-center">Abertos</div>
                  <div className="text-center">Bounces</div>
                  <div className="text-center">Taxa</div>
                </div>

                {/* Table Rows */}
                {dailyStats
                  .filter((day) => day.requests > 0)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((day) => {
                    const deliveryRate = day.requests > 0
                      ? (day.delivered / day.requests) * 100
                      : 0

                    return (
                      <div
                        key={day.date}
                        className="grid grid-cols-6 gap-4 p-3 border rounded-lg hover:bg-muted/30 transition-colors items-center"
                      >
                        <div className="font-medium text-sm">
                          {formatDateBrazilian(day.date)}
                        </div>
                        <div className="text-center">
                          <Badge variant="secondary">{day.requests}</Badge>
                        </div>
                        <div className="text-center">
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            {day.delivered}
                          </Badge>
                        </div>
                        <div className="text-center">
                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            {day.opens}
                          </Badge>
                        </div>
                        <div className="text-center">
                          {day.bounces > 0 ? (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              {day.bounces}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>
                        <div className="text-center">
                          <span
                            className={`text-sm font-medium ${
                              deliveryRate >= 90
                                ? "text-green-600 dark:text-green-400"
                                : deliveryRate >= 70
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {deliveryRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Failure Details */}
      {totalFailures > 0 && (
        <Collapsible open={isFailuresOpen} onOpenChange={setIsFailuresOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <XCircle className="h-5 w-5" />
                      Detalhes de Falhas ({totalFailures} emails)
                    </CardTitle>
                    <CardDescription>
                      Clique para ver os emails que falharam e os motivos
                    </CardDescription>
                  </div>
                  {isFailuresOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {isLoadingFailures ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                    ))}
                  </div>
                ) : failures ? (
                  <div className="space-y-6">
                    {/* Bounces */}
                    {failures.bounces.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Bounces ({failures.bounces.length})
                        </h4>
                        <div className="space-y-1">
                          {failures.bounces.map((record, i) => (
                            <div
                              key={`bounce-${i}`}
                              className="grid grid-cols-2 gap-4 p-2 bg-red-50 dark:bg-red-950/20 rounded text-sm"
                            >
                              <span className="font-mono text-xs truncate">{record.email}</span>
                              <span className="text-muted-foreground text-xs truncate" title={record.reason}>
                                {record.reason}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Blocks */}
                    {failures.blocks.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-2">
                          <Ban className="h-4 w-4" />
                          Bloqueados ({failures.blocks.length})
                        </h4>
                        <div className="space-y-1">
                          {failures.blocks.map((record, i) => (
                            <div
                              key={`block-${i}`}
                              className="grid grid-cols-2 gap-4 p-2 bg-orange-50 dark:bg-orange-950/20 rounded text-sm"
                            >
                              <span className="font-mono text-xs truncate">{record.email}</span>
                              <span className="text-muted-foreground text-xs truncate" title={record.reason}>
                                {record.reason}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Invalid Emails */}
                    {failures.invalidEmails.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Emails Inválidos ({failures.invalidEmails.length})
                        </h4>
                        <div className="space-y-1">
                          {failures.invalidEmails.map((record, i) => (
                            <div
                              key={`invalid-${i}`}
                              className="grid grid-cols-2 gap-4 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded text-sm"
                            >
                              <span className="font-mono text-xs truncate">{record.email}</span>
                              <span className="text-muted-foreground text-xs truncate" title={record.reason}>
                                {record.reason}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Spam Reports */}
                    {failures.spamReports.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
                          <ShieldX className="h-4 w-4" />
                          Denúncias de Spam ({failures.spamReports.length})
                        </h4>
                        <div className="space-y-1">
                          {failures.spamReports.map((record, i) => (
                            <div
                              key={`spam-${i}`}
                              className="grid grid-cols-2 gap-4 p-2 bg-purple-50 dark:bg-purple-950/20 rounded text-sm"
                            >
                              <span className="font-mono text-xs truncate">{record.email}</span>
                              <span className="text-muted-foreground text-xs truncate">
                                {formatDateBrazilian(record.createdAt)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {failures.totals.total === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum detalhe de falha disponível no SendGrid para este período.
                      </p>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  )
}
