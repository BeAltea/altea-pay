"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  CreditCard,
  Bell,
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface QueueLog {
  id: string
  queue_name: string
  job_id: string
  job_name: string
  status: "completed" | "failed"
  data: Record<string, any>
  result: Record<string, any>
  attempts: number
  processed_at: string
  created_at: string
}

interface QueueStats {
  name: string
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: boolean
}

interface LogSummary {
  total: number
  byQueue: Record<string, { completed: number; failed: number }>
  byStatus: { completed: number; failed: number }
}

export default function LogsPage() {
  const [logs, setLogs] = useState<QueueLog[]>([])
  const [queueStats, setQueueStats] = useState<QueueStats[]>([])
  const [summary, setSummary] = useState<LogSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [redisConnected, setRedisConnected] = useState(false)

  // Filters
  const [queueFilter, setQueueFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")

  // Pagination
  const [page, setPage] = useState(0)
  const [totalLogs, setTotalLogs] = useState(0)
  const pageSize = 25

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (queueFilter !== "all") params.set("queue", queueFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (searchTerm) params.set("search", searchTerm)
      params.set("limit", String(pageSize))
      params.set("offset", String(page * pageSize))

      const response = await fetch(`/api/logs?${params}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.logs || [])
        setTotalLogs(data.pagination?.total || 0)
        setSummary(data.summary)
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error)
    }
  }, [queueFilter, statusFilter, searchTerm, page])

  const fetchQueueStats = useCallback(async () => {
    try {
      const response = await fetch("/api/queue/status")
      const data = await response.json()

      if (data.success) {
        setQueueStats(data.queues || [])
        setRedisConnected(data.redis?.connected || false)
      }
    } catch (error) {
      console.error("Failed to fetch queue stats:", error)
      setRedisConnected(false)
    }
  }, [])

  const refresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchLogs(), fetchQueueStats()])
    setRefreshing(false)
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchLogs(), fetchQueueStats()]).then(() => {
      setLoading(false)
    })
  }, [fetchLogs, fetchQueueStats])

  // Reset page when filters change
  useEffect(() => {
    setPage(0)
  }, [queueFilter, statusFilter, searchTerm])

  const getQueueIcon = (queueName: string) => {
    switch (queueName) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "charge":
        return <CreditCard className="h-4 w-4" />
      case "notification":
        return <Bell className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === "completed") {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Sucesso
        </Badge>
      )
    }
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        <XCircle className="h-3 w-3 mr-1" />
        Falha
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const totalPages = Math.ceil(totalLogs / pageSize)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Logs do Sistema</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monitoramento de filas e processamento de jobs
          </p>
        </div>
        <Button onClick={refresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Redis Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            {redisConnected ? (
              <>
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-green-600 dark:text-green-400">Redis Conectado</span>
              </>
            ) : (
              <>
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm text-red-600 dark:text-red-400">Redis Desconectado</span>
                <AlertCircle className="h-4 w-4 text-red-500 ml-2" />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Queue Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {queueStats.map((queue) => (
          <Card key={queue.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {getQueueIcon(queue.name)}
                Fila: {queue.name.toUpperCase()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-yellow-500" />
                  <span className="text-gray-600 dark:text-gray-400">Aguardando:</span>
                  <span className="font-medium">{queue.waiting}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-3 w-3 text-blue-500" />
                  <span className="text-gray-600 dark:text-gray-400">Ativos:</span>
                  <span className="font-medium">{queue.active}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span className="text-gray-600 dark:text-gray-400">Completos:</span>
                  <span className="font-medium">{queue.completed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-3 w-3 text-red-500" />
                  <span className="text-gray-600 dark:text-gray-400">Falhas:</span>
                  <span className="font-medium">{queue.failed}</span>
                </div>
              </div>
              {queue.paused && (
                <Badge variant="secondary" className="mt-2">
                  Pausada
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-sm text-gray-500">Total de Logs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{summary.byStatus.completed}</div>
              <div className="text-sm text-gray-500">Processados com Sucesso</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{summary.byStatus.failed}</div>
              <div className="text-sm text-gray-500">Falhas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {summary.byStatus.completed + summary.byStatus.failed > 0
                  ? ((summary.byStatus.completed / (summary.byStatus.completed + summary.byStatus.failed)) * 100).toFixed(1)
                  : 0}%
              </div>
              <div className="text-sm text-gray-500">Taxa de Sucesso</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Logs de Processamento</CardTitle>
          <CardDescription>Histórico de jobs processados pelas filas</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por Job ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <Select value={queueFilter} onValueChange={setQueueFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Fila" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Filas</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="charge">Cobrança</SelectItem>
                <SelectItem value="notification">Notificação</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="completed">Sucesso</SelectItem>
                <SelectItem value="failed">Falha</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Fila</TableHead>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tentativas</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead className="w-40">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Nenhum log encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getQueueIcon(log.queue_name)}
                          <span className="capitalize">{log.queue_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.job_id?.slice(0, 20)}...</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{log.attempts}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.status === "failed" && log.result?.error ? (
                          <span className="text-red-600 dark:text-red-400 text-sm">{log.result.error}</span>
                        ) : log.queue_name === "email" ? (
                          <span className="text-sm">{log.data?.to}</span>
                        ) : log.queue_name === "charge" ? (
                          <span className="text-sm">R$ {log.data?.value?.toFixed(2)}</span>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(log.processed_at || log.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalLogs)} de {totalLogs}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Página {page + 1} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
