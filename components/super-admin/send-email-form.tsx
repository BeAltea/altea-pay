"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Building2,
  Users,
  Mail,
  Eye,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  CheckSquare,
  Square,
  Filter,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

interface Company {
  id: string
  name: string
}

interface Recipient {
  id: string
  name: string
  email: string
  daysOverdue: number
}

interface EmailTrackingData {
  sentAt: string
  subject: string
  status: string
  history: Array<{ sentAt: string; subject: string; status: string }>
}

type SortField = "name" | "dias" | null
type SortDirection = "asc" | "desc"

interface SendEmailFormProps {
  companies: Company[]
  recipientsMap: Record<string, Recipient[]>
  emailTrackingMap: Record<string, EmailTrackingData>
}

type EmailStatusFilter = "all" | "sent" | "not_sent"

interface FailedDetail {
  email: string
  error: string
}

interface SendResult {
  success: boolean
  message: string
  totalSent?: number
  totalFailed?: number
  failedDetails?: FailedDetail[]
}

function formatDateBrazilian(isoDate: string): string {
  const date = new Date(isoDate)
  // Convert to Brazilian timezone
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }
  const formatted = new Intl.DateTimeFormat("pt-BR", options).format(date)
  // Format is "DD/MM/YYYY, HH:MM" - remove the comma
  return formatted.replace(",", "")
}

function parseTestEmails(input: string): string[] {
  return input
    .split(/[;,\n]/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0 && email.includes("@"))
}

export function SendEmailForm({ companies, recipientsMap, emailTrackingMap }: SendEmailFormProps) {
  const router = useRouter()
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("")
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set())
  const [subject, setSubject] = useState("")
  const [htmlBody, setHtmlBody] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [emailStatusFilter, setEmailStatusFilter] = useState<EmailStatusFilter>("all")
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<SendResult | null>(null)
  const [isErrorDetailsOpen, setIsErrorDetailsOpen] = useState(false)

  // Test mode state
  const [isTestMode, setIsTestMode] = useState(false)
  const [testEmailsInput, setTestEmailsInput] = useState("")

  // Sort state
  const [sortField, setSortField] = useState<SortField>("dias")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 50

  // Expanded row state
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Parse test emails
  const testEmails = useMemo(() => parseTestEmails(testEmailsInput), [testEmailsInput])

  // Get recipients for selected company
  const companyRecipients = useMemo(() => {
    if (!selectedCompanyId) return []
    return recipientsMap[selectedCompanyId] || []
  }, [selectedCompanyId, recipientsMap])

  // Filter recipients based on search and email status
  const filteredRecipients = useMemo(() => {
    let filtered = companyRecipients

    // Filter by search term (name)
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(lowerSearch) ||
          r.email.toLowerCase().includes(lowerSearch),
      )
    }

    // Filter by email status
    if (emailStatusFilter === "sent") {
      filtered = filtered.filter((r) => emailTrackingMap[r.id])
    } else if (emailStatusFilter === "not_sent") {
      filtered = filtered.filter((r) => !emailTrackingMap[r.id])
    }

    return filtered
  }, [companyRecipients, searchTerm, emailStatusFilter, emailTrackingMap])

  // Apply sorting to filtered recipients
  const sortedRecipients = useMemo(() => {
    const list = [...filteredRecipients]

    if (sortField === "dias") {
      list.sort((a, b) => {
        const daysA = a.daysOverdue || 0
        const daysB = b.daysOverdue || 0
        return sortDirection === "desc" ? daysB - daysA : daysA - daysB
      })
    } else if (sortField === "name") {
      list.sort((a, b) => {
        const nameA = (a.name || "").toLowerCase()
        const nameB = (b.name || "").toLowerCase()
        return sortDirection === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
      })
    }

    return list
  }, [filteredRecipients, sortField, sortDirection])

  // Pagination calculations
  const totalFiltered = sortedRecipients.length
  const totalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE)
  const paginatedRecipients = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return sortedRecipients.slice(start, end)
  }, [sortedRecipients, currentPage, ITEMS_PER_PAGE])

  // Handle column sort click
  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection(field === "dias" ? "desc" : "asc") // Default: most overdue first for dias
    }
    setCurrentPage(1) // Reset to first page on sort change
  }

  // Get selected recipients' data (id and email)
  const selectedRecipientsData = useMemo(() => {
    return companyRecipients
      .filter((r) => selectedRecipientIds.has(r.id))
      .map((r) => ({ id: r.id, email: r.email }))
  }, [companyRecipients, selectedRecipientIds])

  // Handle company change
  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId)
    setSelectedRecipientIds(new Set())
    setSearchTerm("")
    setEmailStatusFilter("all")
    setCurrentPage(1)
  }

  // Handle test mode toggle
  const handleTestModeToggle = (checked: boolean) => {
    setIsTestMode(checked)
    if (checked) {
      // Clear company selection when entering test mode
      setSelectedCompanyId("")
      setSelectedRecipientIds(new Set())
    } else {
      // Clear test emails when exiting test mode
      setTestEmailsInput("")
    }
    setResult(null)
  }

  // Handle select all - selects ALL filtered recipients (not just current page)
  const handleSelectAll = () => {
    const allFilteredIds = new Set(sortedRecipients.map((r) => r.id))
    setSelectedRecipientIds(allFilteredIds)
  }

  // Handle deselect all
  const handleDeselectAll = () => {
    setSelectedRecipientIds(new Set())
  }

  // Handle individual recipient toggle
  const handleRecipientToggle = (recipientId: string) => {
    const newSelected = new Set(selectedRecipientIds)
    if (newSelected.has(recipientId)) {
      newSelected.delete(recipientId)
    } else {
      newSelected.add(recipientId)
    }
    setSelectedRecipientIds(newSelected)
  }

  // Validate form - different validation for test mode
  const isFormValid = isTestMode
    ? testEmails.length > 0 && subject.trim() && htmlBody.trim()
    : selectedCompanyId && selectedRecipientIds.size > 0 && subject.trim() && htmlBody.trim()

  // Get recipient count for display
  const recipientCount = isTestMode ? testEmails.length : selectedRecipientIds.size

  // Handle send
  const handleSend = async () => {
    if (!isFormValid) return

    setIsSending(true)
    setResult(null)
    setIsErrorDetailsOpen(false)

    try {
      const response = await fetch("/api/super-admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: isTestMode ? null : selectedCompanyId,
          recipients: isTestMode
            ? testEmails.map((email) => ({ id: `test-${email}`, email }))
            : selectedRecipientsData,
          subject,
          htmlBody,
          isTestMode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setResult({
          success: false,
          message: data.error || "Erro ao enviar email",
        })
      } else {
        setResult({
          success: data.totalFailed === 0,
          message: data.message,
          totalSent: data.totalSent,
          totalFailed: data.totalFailed,
          failedDetails: data.failedDetails,
        })

        // Only reset form on complete success
        if (data.totalFailed === 0) {
          if (isTestMode) {
            setTestEmailsInput("")
          } else {
            setSelectedRecipientIds(new Set())
          }
          setSubject("")
          setHtmlBody("")
        }

        // Refresh the page data to update email tracking status
        // This refreshes server components without a full page reload
        router.refresh()
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Erro de conexão",
      })
    } finally {
      setIsSending(false)
    }
  }

  // Get email status for a recipient
  const getEmailStatus = (recipientId: string): {
    sent: boolean
    date: string | null
    subject: string | null
    history: Array<{ sentAt: string; subject: string; status: string }>
  } => {
    const tracking = emailTrackingMap[recipientId]
    if (tracking) {
      return {
        sent: true,
        date: formatDateBrazilian(tracking.sentAt),
        subject: tracking.subject,
        history: tracking.history,
      }
    }
    return { sent: false, date: null, subject: null, history: [] }
  }

  // Toggle expanded row
  const handleRowExpand = (recipientId: string, e: React.MouseEvent) => {
    // Don't expand if clicking on checkbox
    if ((e.target as HTMLElement).closest('[data-checkbox]')) return
    setExpandedId(expandedId === recipientId ? null : recipientId)
  }

  // Check if should show email composition
  const showEmailComposition = isTestMode ? testEmails.length > 0 : selectedRecipientIds.size > 0

  return (
    <div className="space-y-6">
      {/* Result Alert */}
      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          {result.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription className="flex flex-col gap-2">
            <span>{result.message}</span>
            {result.failedDetails && result.failedDetails.length > 0 && (
              <Collapsible open={isErrorDetailsOpen} onOpenChange={setIsErrorDetailsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 p-0 h-auto text-destructive hover:text-destructive">
                    {isErrorDetailsOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    Ver detalhes dos erros ({result.failedDetails.length})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="rounded-md bg-destructive/10 p-3 space-y-1 text-sm">
                    {result.failedDetails.map((detail, index) => (
                      <div key={index} className="flex flex-col">
                        <span className="font-medium">{detail.email}</span>
                        <span className="text-muted-foreground text-xs">{detail.error}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Company Selection / Test Mode */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {isTestMode ? "Modo de Teste" : "Selecionar Empresa"}
              </CardTitle>
              <CardDescription>
                {isTestMode
                  ? "Digite os emails de teste separados por ponto e vírgula (;)"
                  : "Escolha a empresa cujos clientes receberão o email"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="test-mode" className="text-sm font-medium cursor-pointer">
                  Modo de Teste
                </Label>
              </div>
              <Switch
                id="test-mode"
                checked={isTestMode}
                onCheckedChange={handleTestModeToggle}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isTestMode ? (
            // Test Mode - Manual email input
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-emails">Emails de Teste</Label>
                <Textarea
                  id="test-emails"
                  placeholder="email1@exemplo.com; email2@exemplo.com; email3@exemplo.com"
                  value={testEmailsInput}
                  onChange={(e) => setTestEmailsInput(e.target.value)}
                  className="min-h-[100px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Separe os emails com ponto e vírgula (;), vírgula (,) ou quebra de linha
                </p>
              </div>

              {testEmails.length > 0 && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Emails válidos detectados:</span>
                    <Badge variant="secondary">{testEmails.length} email(s)</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {testEmails.map((email, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {email}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Alert>
                <FlaskConical className="h-4 w-4" />
                <AlertDescription>
                  <strong>Modo de Teste:</strong> Os emails enviados neste modo não serão registrados
                  no histórico de envios.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            // Normal Mode - Company selection
            <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="Selecione uma empresa..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Recipient Selection - Only show when not in test mode and company is selected */}
      {!isTestMode && selectedCompanyId && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Selecionar Destinatários
                </CardTitle>
                <CardDescription>
                  {companyRecipients.length} destinatário(s) cadastrado(s)
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {selectedRecipientIds.size} selecionado(s) de {totalFiltered} filtrado(s)
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {companyRecipients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Nenhum destinatário cadastrado para esta empresa.</p>
                <p className="text-sm mt-2">Importe destinatários na tabela company_email_recipients.</p>
              </div>
            ) : (
              <>
                {/* Filters Section */}
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Filter className="h-4 w-4" />
                    Filtros
                  </div>

                  {/* Search by name */}
                  <div className="space-y-2">
                    <Label htmlFor="search-name" className="text-sm text-muted-foreground">
                      Buscar por nome
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="search-name"
                        placeholder="Digite o nome para filtrar..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value)
                          setCurrentPage(1)
                        }}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Filter by email status */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Status do email
                    </Label>
                    <RadioGroup
                      value={emailStatusFilter}
                      onValueChange={(value) => {
                        setEmailStatusFilter(value as EmailStatusFilter)
                        setCurrentPage(1)
                      }}
                      className="flex flex-wrap gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="status-all" />
                        <Label htmlFor="status-all" className="cursor-pointer font-normal">
                          Todos ({companyRecipients.length})
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sent" id="status-sent" />
                        <Label htmlFor="status-sent" className="cursor-pointer font-normal">
                          Enviado ({companyRecipients.filter(r => emailTrackingMap[r.id]).length})
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="not_sent" id="status-not-sent" />
                        <Label htmlFor="status-not-sent" className="cursor-pointer font-normal">
                          Não enviado ({companyRecipients.filter(r => !emailTrackingMap[r.id]).length})
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Sort by Tempo Dívida */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Ordenar por Tempo Dívida
                    </Label>
                    <Select
                      value={sortField === "dias" ? sortDirection : "none"}
                      onValueChange={(value) => {
                        if (value === "none") {
                          setSortField(null)
                        } else {
                          setSortField("dias")
                          setSortDirection(value as SortDirection)
                        }
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="w-full md:w-[250px]">
                        <SelectValue placeholder="Sem ordenação" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem ordenação</SelectItem>
                        <SelectItem value="desc">Maior tempo primeiro</SelectItem>
                        <SelectItem value="asc">Menor tempo primeiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="gap-2"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Selecionar Todos ({totalFiltered})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAll}
                    disabled={selectedRecipientIds.size === 0}
                    className="gap-2"
                  >
                    <Square className="h-4 w-4" />
                    Desmarcar Todos
                  </Button>
                </div>

                {/* Recipient List */}
                <ScrollArea className="h-[400px] rounded-md border">
                  <div className="p-4">
                    {/* Table Header */}
                    <div className="flex items-center gap-3 p-3 border-b bg-muted/50 rounded-t-lg font-medium text-sm">
                      <div className="w-6"></div>
                      <div
                        className="flex-1 min-w-0 cursor-pointer hover:text-primary transition-colors flex items-center gap-1"
                        onClick={() => handleSortClick("name")}
                      >
                        Nome {sortField === "name" ? (sortDirection === "desc" ? "↓" : "↑") : "↕"}
                      </div>
                      <div
                        className="w-24 text-center hidden sm:flex items-center justify-center gap-1 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleSortClick("dias")}
                      >
                        Tempo Dívida {sortField === "dias" ? (sortDirection === "desc" ? "↓" : "↑") : "↕"}
                      </div>
                      <div className="w-48 text-center hidden sm:block">Email</div>
                      <div className="w-44 text-center hidden md:block">Status do Envio</div>
                    </div>

                    {/* Recipient Rows */}
                    <div className="space-y-1 mt-1">
                      {paginatedRecipients.map((recipient) => {
                        const status = getEmailStatus(recipient.id)
                        const days = recipient.daysOverdue || 0
                        const isExpanded = expandedId === recipient.id
                        const daysColor =
                          days === 0
                            ? "text-gray-400"
                            : days > 365
                              ? "text-red-600 dark:text-red-400"
                              : days > 180
                                ? "text-orange-500 dark:text-orange-400"
                                : days > 90
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : "text-green-600 dark:text-green-400"
                        return (
                          <div key={recipient.id}>
                            <div
                              className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${isExpanded ? "bg-muted/30" : ""}`}
                              onClick={(e) => handleRowExpand(recipient.id, e)}
                            >
                              <div data-checkbox onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedRecipientIds.has(recipient.id)}
                                  onCheckedChange={() => handleRecipientToggle(recipient.id)}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground text-xs">
                                    {isExpanded ? "▼" : "▶"}
                                  </span>
                                  <p className="font-medium text-sm truncate">{recipient.name}</p>
                                </div>
                                <p className="text-xs text-muted-foreground truncate sm:hidden ml-4">
                                  {recipient.email}
                                </p>
                                <p className="text-xs text-muted-foreground truncate md:hidden mt-1 ml-4">
                                  {status.sent ? (
                                    <span className="text-green-600 dark:text-green-400">
                                      Enviado em {status.date}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">Não enviado</span>
                                  )}
                                </p>
                                <p className={`text-xs sm:hidden mt-1 ml-4 ${daysColor}`}>
                                  {days > 0 ? `${days} dias` : "—"}
                                </p>
                              </div>
                              <div className="w-24 text-center hidden sm:block">
                                <span className={`text-sm font-medium ${daysColor}`}>
                                  {days > 0 ? `${days} dias` : "—"}
                                </span>
                              </div>
                              <div className="w-48 text-center hidden sm:block">
                                <p className="text-xs text-muted-foreground truncate">
                                  {recipient.email}
                                </p>
                              </div>
                              <div className="w-44 text-center hidden md:block">
                                {status.sent ? (
                                  <Badge variant="outline" className="text-green-600 border-green-600/50 dark:text-green-400 dark:border-green-400/50">
                                    Enviado em {status.date}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    Não enviado
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Expanded Detail Row */}
                            {isExpanded && (
                              <div className="ml-6 mr-3 mb-2 p-4 bg-muted/50 rounded-lg border">
                                {status.sent ? (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                      <div>
                                        <span className="text-xs font-medium text-muted-foreground uppercase">
                                          Assunto
                                        </span>
                                        <p className="text-sm font-medium mt-1">{status.subject}</p>
                                      </div>
                                      <div>
                                        <span className="text-xs font-medium text-muted-foreground uppercase">
                                          Enviado em
                                        </span>
                                        <p className="text-sm mt-1">{status.date}</p>
                                      </div>
                                      <div>
                                        <span className="text-xs font-medium text-muted-foreground uppercase">
                                          Total de envios
                                        </span>
                                        <p className="text-sm mt-1">{status.history.length} email(s)</p>
                                      </div>
                                    </div>

                                    {/* Show history if multiple emails sent */}
                                    {status.history.length > 1 && (
                                      <div className="border-t pt-3">
                                        <span className="text-xs font-medium text-muted-foreground uppercase">
                                          Histórico de envios
                                        </span>
                                        <div className="mt-2 space-y-2">
                                          {status.history.map((log, i) => (
                                            <div
                                              key={i}
                                              className="text-xs flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-2 bg-background rounded"
                                            >
                                              <span className="text-muted-foreground whitespace-nowrap">
                                                {formatDateBrazilian(log.sentAt)}
                                              </span>
                                              <span className="hidden sm:inline text-muted-foreground">—</span>
                                              <span className="font-medium truncate">{log.subject}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">
                                    Nenhum email enviado para este destinatário.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {paginatedRecipients.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          {searchTerm || emailStatusFilter !== "all"
                            ? "Nenhum destinatário encontrado com os filtros aplicados"
                            : "Nenhum destinatário cadastrado"}
                        </p>
                      )}
                    </div>
                  </div>
                </ScrollArea>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, totalFiltered)} de {totalFiltered} destinatários
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="h-8 px-2 gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Anterior</span>
                      </Button>
                      <span className="px-3 py-1 text-sm font-medium">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 px-2 gap-1"
                      >
                        <span className="hidden sm:inline">Próxima</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Email Composition */}
      {showEmailComposition && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Compor Email
            </CardTitle>
            <CardDescription>
              Escreva o conteúdo do email que será enviado para {recipientCount}{" "}
              destinatário(s)
              {isTestMode && <span className="text-yellow-600 dark:text-yellow-400"> (modo de teste)</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                placeholder="Digite o assunto do email..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Corpo do Email (HTML)</Label>
              <Textarea
                id="body"
                placeholder="<p>Digite o conteúdo do email em HTML...</p>"
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use tags HTML para formatar o email. Ex: &lt;p&gt;, &lt;strong&gt;, &lt;a
                href=&quot;...&quot;&gt;
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsPreviewOpen(true)}
                disabled={!htmlBody.trim()}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Visualizar
              </Button>
              <Button
                onClick={handleSend}
                disabled={!isFormValid || isSending}
                className="gap-2"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isSending ? "Enviando..." : `Enviar para ${recipientCount} destinatário(s)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Pré-visualização do Email</DialogTitle>
            <DialogDescription>
              Veja como o email será exibido para os destinatários
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Assunto:</p>
                <p className="font-medium">{subject || "(sem assunto)"}</p>
              </div>
              <div className="p-4 border rounded-lg bg-white dark:bg-gray-900">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: htmlBody || "<p>(sem conteúdo)</p>" }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
