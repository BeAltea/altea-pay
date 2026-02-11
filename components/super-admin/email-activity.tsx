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
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Calendar,
  AlertCircle,
  Inbox,
  Eye,
  ShieldX,
  Ban,
  Info,
  ChevronDown,
  ChevronUp,
  Building2,
  FileText,
  Users,
  Copy,
} from "lucide-react"

interface Company {
  id: string
  name: string
}

interface EnrichedFailure {
  email: string
  reason: string
  type: "bounce" | "block" | "invalid" | "spam"
  createdAt: string
  clientName?: string
}

interface DuplicateInfo {
  email: string
  clientName: string
  timesSent: number
  previousSends: Array<{
    date: string
    subject: string
  }>
}

interface BatchSummary {
  id: string
  subject: string
  companyId: string
  companyName: string
  sentAt: string
  date: string
  localAttempts?: number // How many we tried to send (local DB)
  totalSent: number // How many SendGrid actually received
  uniqueInBatch: number
  duplicatesInBatch: number
  delivered: number
  deliveryRate: string
  bounces: EnrichedFailure[]
  blocks: EnrichedFailure[]
  invalid: EnrichedFailure[]
  spam: EnrichedFailure[]
  duplicates: DuplicateInfo[]
}

interface AnalyticsSummary {
  totalSent: number // From SendGrid Stats API (source of truth)
  uniqueEmails: number // From local DB
  duplicates: number // From local DB
  delivered: number // From SendGrid Stats API
  bounces: number // From SendGrid Stats API
  blocks: number // From SendGrid Stats API
  invalid: number // From SendGrid Stats API
  spam: number // From SendGrid Stats API
  localAttempts?: number // From local DB (how many we tried to send)
}

interface AnalyticsData {
  summary: AnalyticsSummary
  batches: BatchSummary[]
  companies: Company[]
  subjects: string[]
  period: {
    start: string
    end: string
    days: number
  }
}

function formatDateBrazilian(dateStr: string, includeTime = false): string {
  // Parse date-only strings without timezone conversion
  // "2026-02-10" should display as "10/02/2026"
  if (dateStr.includes("T")) {
    const [datePart, timePart] = dateStr.split("T")
    const [year, month, day] = datePart.split("-")
    if (includeTime && timePart) {
      const [hours, minutes] = timePart.split(":")
      return `${day}/${month} ${hours}:${minutes}`
    }
    return `${day}/${month}/${year}`
  }
  const [year, month, day] = dateStr.split("-")
  return `${day}/${month}/${year}`
}

function formatDuplicateDates(sends: Array<{ date: string; subject: string }>): string {
  // Group by date (DD/MM) and show time if multiple sends on same day
  const dateGroups = new Map<string, string[]>()

  for (const send of sends) {
    const [datePart, timePart] = send.date.includes("T")
      ? send.date.split("T")
      : [send.date, ""]
    const [year, month, day] = datePart.split("-")
    const dateKey = `${day}/${month}`

    if (!dateGroups.has(dateKey)) {
      dateGroups.set(dateKey, [])
    }
    if (timePart) {
      const [hours, minutes] = timePart.split(":")
      dateGroups.get(dateKey)!.push(`${hours}:${minutes}`)
    }
  }

  const formatted: string[] = []
  for (const [date, times] of dateGroups) {
    if (times.length > 1) {
      // Multiple sends on same day - show each time
      formatted.push(...times.map(t => `${date} ${t}`))
    } else if (times.length === 1) {
      formatted.push(`${date} ${times[0]}`)
    } else {
      formatted.push(date)
    }
  }

  return formatted.join(", ")
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
  color: "blue" | "green" | "red" | "yellow" | "orange" | "purple" | "amber" | "teal"
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
    amber: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30",
    teal: "text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30",
  }

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="p-4 h-full">
          <div className="flex items-center gap-3 h-full">
            <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardContent className="p-4 h-full">
        <div className="flex items-center gap-3 h-full">
          <div className={`p-2.5 rounded-lg flex-shrink-0 ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm text-muted-foreground truncate">{title}</p>
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-2xl font-bold truncate">
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
}

export function EmailActivity({ companies: initialCompanies }: { companies: Company[] }) {
  const [period, setPeriod] = useState("30")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [companyFilter, setCompanyFilter] = useState<string>("all")
  const [subjectFilter, setSubjectFilter] = useState<string>("all")
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ period })
      if (companyFilter !== "all") {
        params.set("companyId", companyFilter)
      }
      if (subjectFilter !== "all") {
        params.set("subject", subjectFilter)
      }

      const response = await fetch(`/api/super-admin/email-analytics?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao carregar dados")
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchData()
  }, [period, companyFilter, subjectFilter])

  // Reset subject filter when company changes
  useEffect(() => {
    setSubjectFilter("all")
  }, [companyFilter])

  const summary = data?.summary || {
    totalSent: 0,
    uniqueEmails: 0,
    duplicates: 0,
    delivered: 0,
    bounces: 0,
    blocks: 0,
    invalid: 0,
    spam: 0,
  }

  const deliveredRate = summary.totalSent > 0
    ? (summary.delivered / summary.totalSent) * 100
    : 0

  const bouncesRate = summary.totalSent > 0
    ? (summary.bounces / summary.totalSent) * 100
    : 0

  const blocksRate = summary.totalSent > 0
    ? (summary.blocks / summary.totalSent) * 100
    : 0

  const spamRate = summary.totalSent > 0
    ? (summary.spam / summary.totalSent) * 100
    : 0

  // Use companies from API response if available, otherwise from props
  const availableCompanies = data?.companies || initialCompanies
  const availableSubjects = data?.subjects || []

  const handleBatchClick = (batchId: string, hasFailures: boolean) => {
    if (!hasFailures) return

    if (expandedBatch === batchId) {
      setExpandedBatch(null)
    } else {
      setExpandedBatch(batchId)
    }
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Atividade de Emails
              </CardTitle>
              <CardDescription>
                Dados de envio cruzados com o SendGrid
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Ultimos 7 dias</SelectItem>
                  <SelectItem value="30">Ultimos 30 dias</SelectItem>
                  <SelectItem value="90">Ultimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Empresa
              </label>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {availableCompanies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Assunto
              </label>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os assuntos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os assuntos</SelectItem>
                  {availableSubjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject.length > 50 ? `${subject.substring(0, 50)}...` : subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(companyFilter !== "all" || subjectFilter !== "all") && (
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                Filtros ativos
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCompanyFilter("all")
                  setSubjectFilter("all")
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Nao foi possivel carregar os dados</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchData}>
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <StatCard
          title="Enviados"
          value={summary.totalSent}
          icon={Mail}
          color="blue"
          isLoading={isLoading}
          tooltip="Total de emails que o SendGrid recebeu e processou (fonte: SendGrid Stats API)"
        />
        <StatCard
          title="Unicos"
          value={summary.uniqueEmails}
          icon={Users}
          color="teal"
          isLoading={isLoading}
          tooltip="Destinatarios unicos que receberam pelo menos 1 email"
        />
        <StatCard
          title="Duplicados"
          value={summary.duplicates}
          icon={Copy}
          color="amber"
          isLoading={isLoading}
          tooltip="Emails enviados mais de uma vez para o mesmo destinatario em lotes diferentes"
        />
        <StatCard
          title="Entregues"
          value={summary.delivered}
          percentage={deliveredRate}
          icon={CheckCircle2}
          color="green"
          isLoading={isLoading}
        />
        <StatCard
          title="Bounces"
          value={summary.bounces}
          percentage={bouncesRate}
          icon={XCircle}
          color="red"
          isLoading={isLoading}
        />
        <StatCard
          title="Bloqueados"
          value={summary.blocks}
          percentage={blocksRate}
          icon={Ban}
          color="orange"
          isLoading={isLoading}
        />
        <StatCard
          title="Spam"
          value={summary.spam}
          percentage={spamRate}
          icon={ShieldX}
          color="yellow"
          isLoading={isLoading}
        />
      </div>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historico de Envios
          </CardTitle>
          <CardDescription>
            Clique em uma linha com falhas para ver detalhes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : !data?.batches || data.batches.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Nenhum email enviado
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {companyFilter !== "all" || subjectFilter !== "all"
                  ? "Nenhum email encontrado com os filtros selecionados."
                  : "Nenhum email encontrado no periodo selecionado."}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {/* Table Header */}
                <div className="grid grid-cols-8 gap-3 p-3 bg-muted/50 rounded-lg text-sm font-medium sticky top-0">
                  <div className="col-span-2">Assunto</div>
                  <div>Empresa</div>
                  <div>Data</div>
                  <div className="text-center" title="Tentativas de envio (local)">Tent.</div>
                  <div className="text-center" title="Enviados pelo SendGrid">Env.</div>
                  <div className="text-center">Falhas</div>
                  <div className="text-center">Taxa</div>
                </div>

                {/* Table Rows */}
                {data.batches.map((batch) => {
                  const totalFailures = batch.bounces.length + batch.blocks.length + batch.invalid.length
                  const hasDuplicates = batch.duplicates && batch.duplicates.length > 0
                  const hasFailures = totalFailures > 0 || batch.spam.length > 0
                  const hasDetails = hasFailures || hasDuplicates
                  const isExpanded = expandedBatch === batch.id

                  return (
                    <div key={batch.id} className="border rounded-lg overflow-hidden">
                      <div
                        onClick={() => hasDetails && (expandedBatch === batch.id ? setExpandedBatch(null) : setExpandedBatch(batch.id))}
                        className={`grid grid-cols-8 gap-3 p-3 transition-colors items-center ${
                          hasDetails ? "cursor-pointer hover:bg-muted/30" : ""
                        } ${isExpanded ? "bg-muted/30" : ""}`}
                      >
                        <div className="col-span-2 flex items-center gap-2 min-w-0">
                          {hasDetails && (
                            isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )
                          )}
                          <span className="font-medium text-sm truncate" title={batch.subject}>
                            {batch.subject}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground truncate" title={batch.companyName}>
                          {batch.companyName}
                        </div>
                        <div className="text-sm">
                          {formatDateBrazilian(batch.date)}
                        </div>
                        <div className="text-center">
                          <span className="text-sm text-muted-foreground" title="Tentativas locais">
                            {batch.localAttempts || batch.totalSent}
                          </span>
                        </div>
                        <div className="text-center">
                          <Badge variant="secondary" title="Enviados pelo SendGrid">{batch.totalSent}</Badge>
                          {hasDuplicates && (
                            <div className="mt-0.5">
                              <span className="text-[10px] text-amber-600 dark:text-amber-400" title="Destinatarios duplicados">
                                ({batch.duplicates.length} dup)
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-center">
                          {totalFailures > 0 ? (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              {totalFailures}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </div>
                        <div className="text-center">
                          <span
                            className={`text-sm font-medium ${
                              parseFloat(batch.deliveryRate) >= 90
                                ? "text-green-600 dark:text-green-400"
                                : parseFloat(batch.deliveryRate) >= 70
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {batch.deliveryRate}%
                          </span>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t bg-muted/10 p-4 space-y-4">
                          {/* Duplicates */}
                          {batch.duplicates && batch.duplicates.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                                <Copy className="h-4 w-4" />
                                Duplicados ({batch.duplicates.length})
                              </h4>
                              <p className="text-xs text-muted-foreground mb-2">
                                Estes destinatarios ja receberam email anteriormente.
                              </p>
                              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                {batch.duplicates.map((dup, i) => (
                                  <div
                                    key={`dup-${i}`}
                                    className="grid grid-cols-4 gap-3 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-sm"
                                  >
                                    <span className="font-mono text-xs truncate" title={dup.email}>
                                      {dup.email}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">
                                      {dup.clientName}
                                    </span>
                                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                      {dup.timesSent}x
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate" title={dup.previousSends.map(s => `${s.date}: ${s.subject}`).join("\n")}>
                                      {formatDuplicateDates(dup.previousSends)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Bounces */}
                          {batch.bounces.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                                <XCircle className="h-4 w-4" />
                                Bounces ({batch.bounces.length})
                              </h4>
                              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                                {batch.bounces.map((failure, i) => (
                                  <div
                                    key={`bounce-${i}`}
                                    className="grid grid-cols-3 gap-4 p-2 bg-red-50 dark:bg-red-950/20 rounded text-sm"
                                  >
                                    <span className="font-mono text-xs truncate" title={failure.email}>
                                      {failure.email}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">
                                      {failure.clientName}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate" title={failure.reason}>
                                      {failure.reason}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Blocks */}
                          {batch.blocks.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-2">
                                <Ban className="h-4 w-4" />
                                Bloqueados ({batch.blocks.length})
                              </h4>
                              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                                {batch.blocks.map((failure, i) => (
                                  <div
                                    key={`block-${i}`}
                                    className="grid grid-cols-3 gap-4 p-2 bg-orange-50 dark:bg-orange-950/20 rounded text-sm"
                                  >
                                    <span className="font-mono text-xs truncate" title={failure.email}>
                                      {failure.email}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">
                                      {failure.clientName}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate" title={failure.reason}>
                                      {failure.reason}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Invalid Emails */}
                          {batch.invalid.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Emails Invalidos ({batch.invalid.length})
                              </h4>
                              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                                {batch.invalid.map((failure, i) => (
                                  <div
                                    key={`invalid-${i}`}
                                    className="grid grid-cols-3 gap-4 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded text-sm"
                                  >
                                    <span className="font-mono text-xs truncate" title={failure.email}>
                                      {failure.email}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">
                                      {failure.clientName}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate" title={failure.reason}>
                                      {failure.reason}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Spam Reports */}
                          {batch.spam.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
                                <ShieldX className="h-4 w-4" />
                                Denuncias de Spam ({batch.spam.length})
                              </h4>
                              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                                {batch.spam.map((failure, i) => (
                                  <div
                                    key={`spam-${i}`}
                                    className="grid grid-cols-3 gap-4 p-2 bg-purple-50 dark:bg-purple-950/20 rounded text-sm"
                                  >
                                    <span className="font-mono text-xs truncate" title={failure.email}>
                                      {failure.email}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">
                                      {failure.clientName}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      Marcado como spam
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {totalFailures === 0 && batch.spam.length === 0 && (!batch.duplicates || batch.duplicates.length === 0) && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              Nenhum detalhe disponivel.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
