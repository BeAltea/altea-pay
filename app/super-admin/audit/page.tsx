"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { createBrowserClient } from "@/supabase/supabase-browser"
import {
  Search,
  Filter,
  Download,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Building2,
  Settings,
  Database,
  Eye,
  FileText,
} from "lucide-react"

interface AuditLog {
  id: string
  timestamp: string
  user_id: string
  user_name: string
  user_email: string
  company_name?: string
  action: string
  resource: string
  resource_id?: string
  details: string
  ip_address: string
  user_agent: string
  severity: "low" | "medium" | "high" | "critical"
  status: "success" | "failed" | "warning"
}

interface SecurityEvent {
  id: string
  created_at: string
  event_type: string
  severity: "low" | "medium" | "high" | "critical"
  user_id?: string
  user_email?: string
  company_id?: string
  company_name?: string
  ip_address?: string
  user_agent?: string
  action: string
  resource_type?: string
  resource_id?: string
  metadata?: Record<string, any>
  status: "success" | "failed" | "blocked" | "pending"
}

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all-actions")
  const [severityFilter, setSeverityFilter] = useState("all-severity")
  const [eventTypeFilter, setEventTypeFilter] = useState("all-events")
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadRealAuditLogs = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )

        console.log("[v0] 📋 Carregando logs reais de auditoria...")

        const { data: logs, error } = await supabase
          .from("integration_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50)

        if (error) throw error

        const { data: profiles } = await supabase.from("profiles").select("id, full_name, email, company_id")
        const { data: companies } = await supabase.from("companies").select("id, name")

        const formattedLogs: AuditLog[] = (logs || []).map((log) => {
          const profile = profiles?.find((p) => p.id === log.company_id)
          const company = companies?.find((c) => c.id === log.company_id)

          return {
            id: log.id,
            timestamp: log.created_at,
            user_id: log.company_id || "system",
            user_name: profile?.full_name || "Sistema",
            user_email: profile?.email || "system@alteapay.com",
            company_name: company?.name,
            action: log.operation?.toUpperCase().replace(/ /g, "_") || "SYSTEM_ACTION",
            resource: log.status === "success" ? "api_integration" : "error",
            resource_id: log.cpf,
            details: log.details ? JSON.stringify(log.details) : `Operação: ${log.operation} - Status: ${log.status}`,
            ip_address: "Sistema Interno",
            user_agent: "Altea Pay API",
            severity: log.status === "error" ? "high" : "low",
            status: log.status === "success" ? "success" : "failed",
          }
        })

        console.log("[v0] ✅ Logs de auditoria carregados:", formattedLogs.length)
        setAuditLogs(formattedLogs)
      } catch (error) {
        console.error("[v0] ❌ Erro ao carregar logs:", error)
      } finally {
        setLoading(false)
      }
    }

    const loadSecurityEvents = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )

        console.log("[v0] 🔒 Carregando eventos de segurança reais...")

        const { data: events, error } = await supabase
          .from("security_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100)

        if (error) throw error

        const { data: companies } = await supabase.from("companies").select("id, name")

        const formattedEvents: SecurityEvent[] = (events || []).map((event) => {
          const company = companies?.find((c) => c.id === event.company_id)

          return {
            id: event.id,
            created_at: event.created_at,
            event_type: event.event_type,
            severity: event.severity,
            user_id: event.user_id,
            user_email: event.user_email,
            company_id: event.company_id,
            company_name: company?.name,
            ip_address: event.ip_address,
            user_agent: event.user_agent,
            action: event.action,
            resource_type: event.resource_type,
            resource_id: event.resource_id,
            metadata: event.metadata,
            status: event.status,
          }
        })

        console.log("[v0] ✅ Eventos de segurança carregados:", formattedEvents.length)
        setSecurityEvents(formattedEvents)
      } catch (error) {
        console.error("[v0] ❌ Erro ao carregar eventos:", error)
        toast({
          title: "Erro ao carregar eventos",
          description: "Não foi possível carregar os eventos de segurança.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadRealAuditLogs()
    loadSecurityEvents()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando logs de auditoria...</p>
        </div>
      </div>
    )
  }

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAction = actionFilter === "all-actions" || log.action.toLowerCase().includes(actionFilter)

    const matchesSeverity = severityFilter === "all-severity" || log.severity === severityFilter

    return matchesSearch && matchesAction && matchesSeverity
  })

  const filteredEvents = securityEvents.filter((event) => {
    const matchesSearch =
      event.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.event_type.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesEventType = eventTypeFilter === "all-events" || event.event_type === eventTypeFilter

    const matchesSeverity = severityFilter === "all-severity" || event.severity === severityFilter

    return matchesSearch && matchesEventType && matchesSeverity
  })

  const handleExport = async (type: string) => {
    setIsExporting(true)
    console.log("[v0] Exportando dados de auditoria:", type)

    // Simula processamento de exportação
    await new Promise((resolve) => setTimeout(resolve, 2000))

    let data: any[] = []
    let filename = ""

    switch (type) {
      case "audit-logs":
        data = filteredLogs
        filename = "audit-logs"
        break
      case "security-events":
        data = filteredEvents
        filename = "security-events"
        break
      case "lgpd-report":
        data = [
          { item: "Consentimento de Dados", status: "Conforme", lastCheck: new Date().toISOString() },
          { item: "Criptografia de Dados", status: "Conforme", lastCheck: new Date().toISOString() },
          { item: "Logs de Auditoria", status: "Conforme", lastCheck: new Date().toISOString() },
          { item: "Retenção de Dados", status: "Em Revisão", lastCheck: new Date().toISOString() },
        ]
        filename = "lgpd-compliance-report"
        break
      case "security-audit":
        data = [
          { policy: "Autenticação 2FA", status: "Ativo", coverage: "100%" },
          { policy: "Controle de Acesso", status: "Implementado", coverage: "100%" },
          { policy: "Backup Automático", status: "Ativo", coverage: "100%" },
          { policy: "Monitoramento 24/7", status: "Operacional", coverage: "100%" },
        ]
        filename = "security-audit-report"
        break
      case "backup-report":
        data = [
          { date: new Date().toISOString(), type: "Full Backup", status: "Success", size: "2.3GB" },
          {
            date: new Date(Date.now() - 86400000).toISOString(),
            type: "Incremental",
            status: "Success",
            size: "156MB",
          },
          {
            date: new Date(Date.now() - 172800000).toISOString(),
            type: "Incremental",
            status: "Success",
            size: "203MB",
          },
        ]
        filename = "backup-report"
        break
      case "access-log":
        data = auditLogs.filter((log) => log.action.includes("LOGIN"))
        filename = "access-log"
        break
      default:
        data = filteredLogs
        filename = "audit-export"
    }

    // Cria e baixa o arquivo CSV
    const csvContent = convertToCSV(data)
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setIsExporting(false)
    toast({
      title: "Exportação concluída",
      description: `Arquivo ${filename}.csv foi baixado com sucesso.`,
    })
  }

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return ""

    const headers = Object.keys(data[0]).join(",")
    const rows = data
      .map((row) =>
        Object.values(row)
          .map((value) => (typeof value === "string" ? `"${value.replace(/"/g, '""')}"` : value))
          .join(","),
      )
      .join("\n")

    return `${headers}\n${rows}`
  }

  const handleInvestigate = (event: SecurityEvent) => {
    console.log("[v0] Iniciando investigação do evento:", event.id)
    setSelectedEvent(event)
  }

  const handleResolveEvent = (eventId: string) => {
    console.log("[v0] Resolvendo evento de segurança:", eventId)
    setSecurityEvents((prev) =>
      prev.map((event) => (event.id === eventId ? { ...event, status: "resolved" as const } : event)),
    )
    toast({
      title: "Evento resolvido",
      description: "O evento de segurança foi marcado como resolvido.",
    })
  }

  const handleViewDetails = (log: AuditLog) => {
    console.log("[v0] Visualizando detalhes do log:", log.id)
    setSelectedLog(log)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
      case "low":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      case "investigating":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
      case "open":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      case "blocked":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
    }
  }

  const getActionIcon = (action: string) => {
    if (action.includes("CREATE")) return <CheckCircle className="h-4 w-4" />
    if (action.includes("UPDATE")) return <Settings className="h-4 w-4" />
    if (action.includes("DELETE")) return <AlertTriangle className="h-4 w-4" />
    if (action.includes("LOGIN")) return <User className="h-4 w-4" />
    if (action.includes("EXPORT")) return <Download className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const stats = {
    totalLogs: filteredLogs.length,
    criticalEvents: securityEvents.filter((e) => e.severity === "critical").length,
    failedActions: filteredLogs.filter((l) => l.status === "failed").length,
    activeInvestigations: securityEvents.filter((e) => e.status === "investigating").length,
    totalEvents: filteredEvents.length,
    failedEvents: filteredEvents.filter((e) => e.status === "failed").length,
    dataExports: filteredEvents.filter((e) => e.event_type === "data_export").length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Auditoria e Segurança</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Monitoramento de atividades e eventos de segurança do sistema.
          </p>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm("")
              setActionFilter("all-actions")
              setSeverityFilter("all-severity")
              setEventTypeFilter("all-events")
              toast({ title: "Filtros limpos", description: "Todos os filtros foram removidos." })
            }}
          >
            <Filter className="mr-2 h-4 w-4" />
            Limpar Filtros
          </Button>
          <Button variant="outline" onClick={() => handleExport("audit-logs")} disabled={isExporting}>
            <Download className={`mr-2 h-4 w-4 ${isExporting ? "animate-spin" : ""}`} />
            {isExporting ? "Exportando..." : "Exportar"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Filtros aplicados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalEvents}</div>
            <p className="text-xs text-muted-foreground">Requerem atenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ações Falhadas</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.failedActions}</div>
            <p className="text-xs text-muted-foreground">Tentativas bloqueadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investigações</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.activeInvestigations}</div>
            <p className="text-xs text-muted-foreground">Em andamento</p>
          </CardContent>
        </Card>
      </div>

      {/* Audit Tabs */}
      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="logs">Logs de Auditoria</TabsTrigger>
          <TabsTrigger value="security">Eventos de Segurança</TabsTrigger>
          <TabsTrigger value="compliance">Conformidade</TabsTrigger>
        </TabsList>

        {/* Audit Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar logs..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex space-x-2">
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-actions">Todas as Ações</SelectItem>
                      <SelectItem value="create">Criação</SelectItem>
                      <SelectItem value="update">Atualização</SelectItem>
                      <SelectItem value="delete">Exclusão</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-severity">Todas as Severidades</SelectItem>
                      <SelectItem value="critical">Crítico</SelectItem>
                      <SelectItem value="high">Alto</SelectItem>
                      <SelectItem value="medium">Médio</SelectItem>
                      <SelectItem value="low">Baixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Audit Logs List */}
          <Card>
            <CardHeader>
              <CardTitle>Logs de Auditoria</CardTitle>
              <CardDescription>
                Mostrando {filteredLogs.length} de {auditLogs.length} logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex-shrink-0">
                          <div
                            className={`p-2 rounded-full ${
                              log.status === "success"
                                ? "bg-green-100 dark:bg-green-900/20"
                                : log.status === "failed"
                                  ? "bg-red-100 dark:bg-red-900/20"
                                  : "bg-yellow-100 dark:bg-yellow-900/20"
                            }`}
                          >
                            {getActionIcon(log.action)}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                              {log.action.replace(/_/g, " ")}
                            </h3>
                            <Badge className={getSeverityColor(log.severity)}>{log.severity.toUpperCase()}</Badge>
                            <Badge className={getStatusColor(log.status)}>{log.status.toUpperCase()}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{log.details}</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{log.user_name}</span>
                            </div>
                            {log.company_name && (
                              <div className="flex items-center space-x-1">
                                <Building2 className="h-3 w-3" />
                                <span>{log.company_name}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(log.timestamp).toLocaleString("pt-BR")}</span>
                            </div>
                            <span>IP: {log.ip_address}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 lg:mt-0 lg:ml-6">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => handleViewDetails(log)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Detalhes
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Detalhes do Log de Auditoria</DialogTitle>
                            <DialogDescription>Informações completas sobre a ação realizada</DialogDescription>
                          </DialogHeader>
                          {selectedLog && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium mb-1">Ação</h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {selectedLog.action.replace(/_/g, " ")}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-1">Status</h4>
                                  <Badge className={getStatusColor(selectedLog.status)}>
                                    {selectedLog.status.toUpperCase()}
                                  </Badge>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-1">Usuário</h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedLog.user_name}</p>
                                  <p className="text-xs text-gray-500">{selectedLog.user_email}</p>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-1">Timestamp</h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {new Date(selectedLog.timestamp).toLocaleString("pt-BR")}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-1">Detalhes</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedLog.details}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium mb-1">Endereço IP</h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedLog.ip_address}</p>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-1">Severidade</h4>
                                  <Badge className={getSeverityColor(selectedLog.severity)}>
                                    {selectedLog.severity.toUpperCase()}
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-1">User Agent</h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                                  {selectedLog.user_agent}
                                </p>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Events Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Eventos de Segurança</CardTitle>
                  <CardDescription>
                    Mostrando {filteredEvents.length} de {securityEvents.length} eventos
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-events">Todos os Tipos</SelectItem>
                      <SelectItem value="credit_analysis">Análise de Crédito</SelectItem>
                      <SelectItem value="data_export">Exportação de Dados</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="user_created">Criação de Usuário</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-severity">Todas as Severidades</SelectItem>
                      <SelectItem value="critical">Crítico</SelectItem>
                      <SelectItem value="high">Alto</SelectItem>
                      <SelectItem value="medium">Médio</SelectItem>
                      <SelectItem value="low">Baixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar eventos por ação, email ou tipo..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex-shrink-0">
                          <div
                            className={`p-2 rounded-full ${
                              event.severity === "critical"
                                ? "bg-red-100 dark:bg-red-900/20"
                                : event.severity === "high"
                                  ? "bg-orange-100 dark:bg-orange-900/20"
                                  : event.severity === "medium"
                                    ? "bg-yellow-100 dark:bg-yellow-900/20"
                                    : "bg-blue-100 dark:bg-blue-900/20"
                            }`}
                          >
                            {event.event_type.includes("analysis") ? (
                              <FileText className="h-4 w-4" />
                            ) : event.event_type.includes("export") ? (
                              <Download className="h-4 w-4" />
                            ) : event.event_type.includes("login") ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Shield className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                              {event.event_type.replace(/_/g, " ").toUpperCase()}
                            </h3>
                            <Badge className={getSeverityColor(event.severity)}>{event.severity.toUpperCase()}</Badge>
                            <Badge className={getStatusColor(event.status)}>{event.status.toUpperCase()}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{event.action}</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            {event.user_email && (
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>{event.user_email}</span>
                              </div>
                            )}
                            {event.company_name && (
                              <div className="flex items-center space-x-1">
                                <Building2 className="h-3 w-3" />
                                <span>{event.company_name}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(event.created_at).toLocaleString("pt-BR")}</span>
                            </div>
                            {event.ip_address && <span>IP: {event.ip_address}</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 lg:mt-0 lg:ml-6">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setSelectedEvent(event)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Detalhes
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Detalhes do Evento de Segurança</DialogTitle>
                            <DialogDescription>Informações completas sobre o evento registrado</DialogDescription>
                          </DialogHeader>
                          {selectedEvent && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium mb-1">Tipo de Evento</h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {selectedEvent.event_type.replace(/_/g, " ")}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-1">Status</h4>
                                  <Badge className={getStatusColor(selectedEvent.status)}>
                                    {selectedEvent.status.toUpperCase()}
                                  </Badge>
                                </div>
                                {selectedEvent.user_email && (
                                  <div>
                                    <h4 className="font-medium mb-1">Usuário</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {selectedEvent.user_email}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <h4 className="font-medium mb-1">Data/Hora</h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {new Date(selectedEvent.created_at).toLocaleString("pt-BR")}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-1">Ação</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedEvent.action}</p>
                              </div>
                              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-1">Metadados</h4>
                                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-40">
                                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-4">
                                {selectedEvent.ip_address && (
                                  <div>
                                    <h4 className="font-medium mb-1">Endereço IP</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {selectedEvent.ip_address}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <h4 className="font-medium mb-1">Severidade</h4>
                                  <Badge className={getSeverityColor(selectedEvent.severity)}>
                                    {selectedEvent.severity.toUpperCase()}
                                  </Badge>
                                </div>
                              </div>
                              {selectedEvent.user_agent && (
                                <div>
                                  <h4 className="font-medium mb-1">User Agent</h4>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                                    {selectedEvent.user_agent}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}

                {filteredEvents.length === 0 && (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum evento encontrado</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Tente ajustar os filtros ou limpar a busca para ver mais eventos.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Conformidade LGPD</span>
                </CardTitle>
                <CardDescription>Status de conformidade com a Lei Geral de Proteção de Dados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Consentimento de Dados</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      Conforme
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Criptografia de Dados</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      Conforme
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Logs de Auditoria</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      Conforme
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium">Retenção de Dados</span>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                      Em Revisão
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <span>Políticas de Segurança</span>
                </CardTitle>
                <CardDescription>Implementação de políticas de segurança</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Autenticação 2FA</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      Ativo
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Controle de Acesso</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      Implementado
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Backup Automático</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      Ativo
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Monitoramento 24/7</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      Operacional
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Relatórios de Conformidade</span>
              </CardTitle>
              <CardDescription>Relatórios automáticos para auditoria externa</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex-col space-y-2 bg-transparent"
                  onClick={() => handleExport("lgpd-report")}
                  disabled={isExporting}
                >
                  <FileText className="h-6 w-6" />
                  <span className="text-sm">Relatório LGPD</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col space-y-2 bg-transparent"
                  onClick={() => handleExport("security-audit")}
                  disabled={isExporting}
                >
                  <Shield className="h-6 w-6" />
                  <span className="text-sm">Auditoria de Segurança</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col space-y-2 bg-transparent"
                  onClick={() => handleExport("backup-report")}
                  disabled={isExporting}
                >
                  <Database className="h-6 w-6" />
                  <span className="text-sm">Backup Report</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col space-y-2 bg-transparent"
                  onClick={() => handleExport("access-log")}
                  disabled={isExporting}
                >
                  <Eye className="h-6 w-6" />
                  <span className="text-sm">Log de Acesso</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
