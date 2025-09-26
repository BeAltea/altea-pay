"use client"

import { useState } from "react"
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
  timestamp: string
  event_type: string
  description: string
  user_id?: string
  user_name?: string
  ip_address: string
  severity: "low" | "medium" | "high" | "critical"
  status: "resolved" | "investigating" | "open"
}

const mockAuditLogs: AuditLog[] = [
  {
    id: "1",
    timestamp: "2024-03-15T14:30:00Z",
    user_id: "1",
    user_name: "Super Administrador",
    user_email: "super@alteapay.com",
    action: "CREATE_COMPANY",
    resource: "companies",
    resource_id: "33333333-3333-3333-3333-333333333333",
    details: "Nova empresa CPFL Energia criada no sistema",
    ip_address: "192.168.1.100",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    severity: "medium",
    status: "success",
  },
  {
    id: "2",
    timestamp: "2024-03-15T13:45:00Z",
    user_id: "2",
    user_name: "Maria Santos",
    user_email: "admin@enel.com.br",
    company_name: "Enel Distribuição São Paulo",
    action: "UPDATE_DEBT",
    resource: "debts",
    resource_id: "debt-12345",
    details: "Dívida atualizada - valor alterado de R$ 1.500,00 para R$ 1.200,00",
    ip_address: "10.0.0.45",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    severity: "low",
    status: "success",
  },
  {
    id: "3",
    timestamp: "2024-03-15T12:20:00Z",
    user_id: "4",
    user_name: "Carlos Oliveira",
    user_email: "admin@sabesp.com.br",
    company_name: "Sabesp - Companhia de Saneamento",
    action: "DELETE_USER",
    resource: "users",
    resource_id: "user-789",
    details: "Usuário João Silva removido do sistema",
    ip_address: "172.16.0.23",
    user_agent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    severity: "high",
    status: "success",
  },
  {
    id: "4",
    timestamp: "2024-03-15T11:15:00Z",
    user_id: "6",
    user_name: "Roberto Lima",
    user_email: "admin@cpfl.com.br",
    company_name: "CPFL Energia",
    action: "LOGIN_FAILED",
    resource: "auth",
    details: "Tentativa de login falhada - senha incorreta",
    ip_address: "203.0.113.45",
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    severity: "medium",
    status: "failed",
  },
  {
    id: "5",
    timestamp: "2024-03-15T10:30:00Z",
    user_id: "1",
    user_name: "Super Administrador",
    user_email: "super@alteapay.com",
    action: "EXPORT_DATA",
    resource: "reports",
    details: "Relatório global exportado - dados de todas as empresas",
    ip_address: "192.168.1.100",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    severity: "medium",
    status: "success",
  },
]

const mockSecurityEvents: SecurityEvent[] = [
  {
    id: "1",
    timestamp: "2024-03-15T15:45:00Z",
    event_type: "SUSPICIOUS_LOGIN",
    description: "Múltiplas tentativas de login de IP suspeito",
    user_id: "unknown",
    ip_address: "198.51.100.42",
    severity: "high",
    status: "investigating",
  },
  {
    id: "2",
    timestamp: "2024-03-15T14:20:00Z",
    event_type: "RATE_LIMIT_EXCEEDED",
    description: "API rate limit excedido - possível ataque DDoS",
    ip_address: "203.0.113.89",
    severity: "medium",
    status: "resolved",
  },
  {
    id: "3",
    timestamp: "2024-03-15T13:10:00Z",
    event_type: "PRIVILEGE_ESCALATION",
    description: "Tentativa de acesso a recursos não autorizados",
    user_id: "5",
    user_name: "Ana Costa",
    ip_address: "10.0.0.67",
    severity: "critical",
    status: "resolved",
  },
]

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(mockAuditLogs)
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>(mockSecurityEvents)
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all-actions")
  const [severityFilter, setSeverityFilter] = useState("all-severity")
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAction = actionFilter === "all-actions" || log.action.toLowerCase().includes(actionFilter)

    const matchesSeverity = severityFilter === "all-severity" || log.severity === severityFilter

    return matchesSearch && matchesAction && matchesSeverity
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
        data = securityEvents
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
              <CardTitle className="flex items-center space-x-2 text-red-700 dark:text-red-400">
                <Shield className="h-5 w-5" />
                <span>Eventos de Segurança</span>
              </CardTitle>
              <CardDescription>Monitoramento de ameaças e atividades suspeitas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
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
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                              {event.event_type.replace(/_/g, " ")}
                            </h3>
                            <Badge className={getSeverityColor(event.severity)}>{event.severity.toUpperCase()}</Badge>
                            <Badge className={getStatusColor(event.status)}>{event.status.toUpperCase()}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{event.description}</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            {event.user_name && (
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>{event.user_name}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(event.timestamp).toLocaleString("pt-BR")}</span>
                            </div>
                            <span>IP: {event.ip_address}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 lg:mt-0 lg:ml-6 flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => handleInvestigate(event)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Investigar
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Investigação de Evento de Segurança</DialogTitle>
                            <DialogDescription>Análise detalhada do evento de segurança</DialogDescription>
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
                                  <h4 className="font-medium mb-1">Severidade</h4>
                                  <Badge className={getSeverityColor(selectedEvent.severity)}>
                                    {selectedEvent.severity.toUpperCase()}
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-1">Descrição</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedEvent.description}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium mb-1">Endereço IP</h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedEvent.ip_address}</p>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-1">Status</h4>
                                  <Badge className={getStatusColor(selectedEvent.status)}>
                                    {selectedEvent.status.toUpperCase()}
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-1">Ações Recomendadas</h4>
                                <div className="space-y-2">
                                  {selectedEvent.severity === "critical" && (
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                      • Bloqueio imediato do IP suspeito
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    • Monitoramento contínuo da atividade
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    • Análise de logs relacionados
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    • Notificação da equipe de segurança
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      {event.status === "open" && (
                        <Button size="sm" onClick={() => handleResolveEvent(event.id)}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolver
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
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
