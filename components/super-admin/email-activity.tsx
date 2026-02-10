"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Mail,
  Send,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Calendar,
  Building2,
  AlertCircle,
  Inbox,
} from "lucide-react"

interface Company {
  id: string
  name: string
}

interface EmailBatch {
  subject: string
  companyId: string
  companyName: string
  sentAt: string
  totalSent: number
  totalFailed: number
}

interface Summary {
  total: number
  sent: number
  failed: number
  sentRate: number
  failedRate: number
}

interface EmailStatsData {
  companies: Company[]
  summary: Summary
  batches: EmailBatch[]
  period: {
    start: string
    end: string
    days: number
  }
}

function formatDateBrazilian(isoDate: string): string {
  const date = new Date(isoDate)
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }
  return new Intl.DateTimeFormat("pt-BR", options).format(date).replace(",", "")
}

function StatCard({
  title,
  value,
  percentage,
  icon: Icon,
  color,
  isLoading,
}: {
  title: string
  value: number
  percentage?: number
  icon: React.ElementType
  color: "blue" | "green" | "red" | "yellow"
  isLoading?: boolean
}) {
  const colorClasses = {
    blue: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
    green: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30",
    red: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30",
    yellow: "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30",
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

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
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
}

export function EmailActivity({ companies }: { companies: Company[] }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all")
  const [subjectSearch, setSubjectSearch] = useState("")
  const [period, setPeriod] = useState("7")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<EmailStatsData | null>(null)

  const fetchStats = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (selectedCompanyId !== "all") {
        params.set("companyId", selectedCompanyId)
      }
      if (subjectSearch) {
        params.set("subject", subjectSearch)
      }
      params.set("period", period)

      const response = await fetch(`/api/super-admin/email-stats?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao carregar estatísticas")
      }

      const statsData = await response.json()
      setData(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchStats()
  }, [selectedCompanyId, period])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (data) { // Only search if we already have data
        fetchStats()
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [subjectSearch])

  const summary = data?.summary || { total: 0, sent: 0, failed: 0, sentRate: 0, failedRate: 0 }
  const batches = data?.batches || []

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Company filter */}
            <div className="space-y-2">
              <Label htmlFor="company-filter">Empresa</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger id="company-filter">
                  <SelectValue placeholder="Todas as empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject search */}
            <div className="space-y-2">
              <Label htmlFor="subject-search">Assunto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="subject-search"
                  placeholder="Pesquisar assunto..."
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Period filter */}
            <div className="space-y-2">
              <Label htmlFor="period-filter">Período</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger id="period-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Não foi possível carregar as estatísticas</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStats}
                className="ml-auto"
              >
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Enviados"
          value={summary.total}
          icon={Mail}
          color="blue"
          isLoading={isLoading}
        />
        <StatCard
          title="Entregues"
          value={summary.sent}
          percentage={summary.sentRate}
          icon={CheckCircle2}
          color="green"
          isLoading={isLoading}
        />
        <StatCard
          title="Falhas"
          value={summary.failed}
          percentage={summary.failedRate}
          icon={XCircle}
          color="red"
          isLoading={isLoading}
        />
        <StatCard
          title="Lotes Enviados"
          value={batches.length}
          icon={Send}
          color="yellow"
          isLoading={isLoading}
        />
      </div>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Envios
          </CardTitle>
          <CardDescription>
            Emails enviados agrupados por assunto e data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Nenhum email enviado
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedCompanyId !== "all"
                  ? "Nenhum email encontrado para esta empresa no período selecionado."
                  : "Nenhum email encontrado no período selecionado."}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 rounded-lg text-sm font-medium sticky top-0">
                  <div className="col-span-5">Assunto</div>
                  <div className="col-span-2">Empresa</div>
                  <div className="col-span-2">Data de Envio</div>
                  <div className="col-span-1 text-center">Enviados</div>
                  <div className="col-span-1 text-center">Falhas</div>
                  <div className="col-span-1 text-center">Taxa</div>
                </div>

                {/* Table Rows */}
                {batches.map((batch, index) => {
                  const total = batch.totalSent + batch.totalFailed
                  const successRate = total > 0 ? (batch.totalSent / total) * 100 : 0

                  return (
                    <div
                      key={`${batch.companyId}-${batch.subject}-${batch.sentAt}-${index}`}
                      className="grid grid-cols-12 gap-4 p-3 border rounded-lg hover:bg-muted/30 transition-colors items-center"
                    >
                      <div className="col-span-5">
                        <p className="font-medium text-sm truncate" title={batch.subject}>
                          {batch.subject}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground truncate">
                            {batch.companyName}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm text-muted-foreground">
                          {formatDateBrazilian(batch.sentAt)}
                        </span>
                      </div>
                      <div className="col-span-1 text-center">
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                          {batch.totalSent}
                        </Badge>
                      </div>
                      <div className="col-span-1 text-center">
                        {batch.totalFailed > 0 ? (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">
                            {batch.totalFailed}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="col-span-1 text-center">
                        <span
                          className={`text-sm font-medium ${
                            successRate >= 90
                              ? "text-green-600 dark:text-green-400"
                              : successRate >= 70
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {successRate.toFixed(0)}%
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
    </div>
  )
}
