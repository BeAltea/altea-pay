"use client"

import { useState, useMemo, useRef, useEffect } from "react"
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
  AlertTriangle,
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
  XCircle,
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

interface RecipientSendResult {
  id: string
  name: string
  email: string
  success: boolean
  error?: string
}

interface SendModalData {
  isOpen: boolean
  sentAt: string
  totalAttempted: number
  totalSent: number
  totalFailed: number
  recipients: RecipientSendResult[]
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

  // Selection mode: "page" means only current page selected, "all" means all filtered selected
  const [selectionMode, setSelectionMode] = useState<"none" | "page" | "all">("none")

  // Expanded row state
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Selection dropdown state
  const [selectionDropdownOpen, setSelectionDropdownOpen] = useState(false)
  const selectionDropdownRef = useRef<HTMLDivElement>(null)

  // Send result modal state
  const [sendModal, setSendModal] = useState<SendModalData>({
    isOpen: false,
    sentAt: "",
    totalAttempted: 0,
    totalSent: 0,
    totalFailed: 0,
    recipients: [],
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectionDropdownRef.current && !selectionDropdownRef.current.contains(event.target as Node)) {
        setSelectionDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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

  // Check if current page is fully selected
  const currentPageIds = useMemo(() => new Set(paginatedRecipients.map((r) => r.id)), [paginatedRecipients])
  const isCurrentPageFullySelected = useMemo(() => {
    if (paginatedRecipients.length === 0) return false
    return paginatedRecipients.every((r) => selectedRecipientIds.has(r.id))
  }, [paginatedRecipients, selectedRecipientIds])

  // Check if all filtered recipients are selected
  const isAllFilteredSelected = useMemo(() => {
    if (sortedRecipients.length === 0) return false
    return sortedRecipients.every((r) => selectedRecipientIds.has(r.id))
  }, [sortedRecipients, selectedRecipientIds])

  // Calculate total debt for selected recipients
  const totalDebtSelected = useMemo(() => {
    return companyRecipients
      .filter((r) => selectedRecipientIds.has(r.id))
      .reduce((sum, r) => sum + (r.daysOverdue || 0), 0)
  }, [companyRecipients, selectedRecipientIds])

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
    setSelectionMode("none")
  }

  // Handle test mode toggle
  const handleTestModeToggle = (checked: boolean) => {
    setIsTestMode(checked)
    if (checked) {
      // Clear company selection when entering test mode
      setSelectedCompanyId("")
      setSelectedRecipientIds(new Set())
      setSelectionMode("none")
    } else {
      // Clear test emails when exiting test mode
      setTestEmailsInput("")
    }
    setResult(null)
  }

  // Handle select current page only
  const handleSelectCurrentPage = () => {
    const newSelected = new Set(selectedRecipientIds)
    paginatedRecipients.forEach((r) => newSelected.add(r.id))
    setSelectedRecipientIds(newSelected)
    setSelectionMode("page")
  }

  // Handle select a specific count from current page
  const handleSelectCount = (count: number) => {
    const toSelect = paginatedRecipients.slice(0, count)
    const newSelected = new Set(toSelect.map((r) => r.id))
    setSelectedRecipientIds(newSelected)
    setSelectionMode(count >= paginatedRecipients.length ? "page" : "page")
  }

  // Handle select all - selects ALL filtered recipients (across all pages)
  const handleSelectAll = () => {
    const allFilteredIds = new Set(sortedRecipients.map((r) => r.id))
    setSelectedRecipientIds(allFilteredIds)
    setSelectionMode("all")
  }

  // Handle deselect all
  const handleDeselectAll = () => {
    setSelectedRecipientIds(new Set())
    setSelectionMode("none")
  }

  // Handle header checkbox toggle (selects/deselects current page)
  const handleHeaderCheckboxToggle = () => {
    if (isCurrentPageFullySelected) {
      // Deselect current page
      const newSelected = new Set(selectedRecipientIds)
      paginatedRecipients.forEach((r) => newSelected.delete(r.id))
      setSelectedRecipientIds(newSelected)
      if (newSelected.size === 0) {
        setSelectionMode("none")
      }
    } else {
      // Select current page
      handleSelectCurrentPage()
    }
  }

  // Handle individual recipient toggle
  const handleRecipientToggle = (recipientId: string) => {
    const newSelected = new Set(selectedRecipientIds)
    if (newSelected.has(recipientId)) {
      newSelected.delete(recipientId)
      // If we were in "all" mode and deselected one, we're no longer in "all" mode
      if (selectionMode === "all") {
        setSelectionMode("page")
      }
    } else {
      newSelected.add(recipientId)
    }
    setSelectedRecipientIds(newSelected)

    // Update selection mode based on new state
    if (newSelected.size === 0) {
      setSelectionMode("none")
    }
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
      // Build recipient list with names for the modal
      const recipientsWithNames: { id: string; name: string; email: string }[] = isTestMode
        ? testEmails.map((email) => ({ id: `test-${email}`, name: email.split("@")[0], email }))
        : companyRecipients
            .filter((r) => selectedRecipientIds.has(r.id))
            .map((r) => ({ id: r.id, name: r.name, email: r.email }))

      const recipientsList = recipientsWithNames.map((r) => ({ id: r.id, email: r.email }))

      // Build email -> name map for result matching
      const emailToRecipient = new Map<string, { id: string; name: string; email: string }>()
      recipientsWithNames.forEach((r) => emailToRecipient.set(r.email, r))

      // Send in batches of 10 to avoid timeouts
      const BATCH_SIZE = 10
      const batches = []
      for (let i = 0; i < recipientsList.length; i += BATCH_SIZE) {
        batches.push(recipientsList.slice(i, i + BATCH_SIZE))
      }

      let totalSent = 0
      let totalFailed = 0
      const allRecipientResults: RecipientSendResult[] = []

      for (const batch of batches) {
        const response = await fetch("/api/super-admin/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: isTestMode ? null : selectedCompanyId,
            recipients: batch,
            subject,
            htmlBody,
            isTestMode,
          }),
        })

        // Check content-type before parsing as JSON
        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text()
          throw new Error(`Servidor retornou resposta inválida: ${text.substring(0, 100)}...`)
        }

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Erro ao enviar email")
        }

        totalSent += data.totalSent || 0
        totalFailed += data.totalFailed || 0

        // Process results from API
        if (data.results) {
          for (const result of data.results) {
            const recipient = emailToRecipient.get(result.email)
            if (recipient) {
              allRecipientResults.push({
                id: recipient.id,
                name: recipient.name,
                email: result.email,
                success: result.success,
                error: result.error,
              })
            }
          }
        }
      }

      // Show success modal
      setSendModal({
        isOpen: true,
        sentAt: new Date().toISOString(),
        totalAttempted: recipientsWithNames.length,
        totalSent,
        totalFailed,
        recipients: allRecipientResults,
      })

      // Only reset form on complete success
      if (totalFailed === 0) {
        if (isTestMode) {
          setTestEmailsInput("")
        } else {
          setSelectedRecipientIds(new Set())
          setSelectionMode("none")
        }
        setSubject("")
        setHtmlBody("")
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

  // Handle closing the send result modal
  const handleCloseSendModal = () => {
    setSendModal((prev) => ({ ...prev, isOpen: false }))
    // Refresh the page data to update email tracking status
    router.refresh()
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
                  {selectedRecipientIds.size} selecionado(s)
                  {isAllFilteredSelected && totalFiltered > 0
                    ? " (todos)"
                    : selectedRecipientIds.size > 0 && selectedRecipientIds.size < totalFiltered
                      ? ` de ${totalFiltered}`
                      : ""}
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

                {/* Quick Actions - Selection Dropdown */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Selection Dropdown */}
                  <div ref={selectionDropdownRef} className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectionDropdownOpen(!selectionDropdownOpen)}
                      className="gap-2"
                    >
                      <Checkbox
                        checked={selectedRecipientIds.size > 0}
                        className="pointer-events-none"
                      />
                      Selecionar
                      <ChevronDown className={`h-4 w-4 transition-transform ${selectionDropdownOpen ? "rotate-180" : ""}`} />
                    </Button>

                    {selectionDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[220px]">
                        {[10, 20, 30, 40, 50].map((count) => {
                          const isDisabled = paginatedRecipients.length < count && count !== 50
                          const actualCount = Math.min(count, paginatedRecipients.length)
                          return (
                            <button
                              key={count}
                              onClick={() => {
                                handleSelectCount(actualCount)
                                setSelectionDropdownOpen(false)
                              }}
                              disabled={paginatedRecipients.length === 0}
                              className={`w-full text-left px-4 py-2.5 text-sm transition-colors first:rounded-t-lg ${
                                paginatedRecipients.length === 0
                                  ? "text-gray-400 cursor-not-allowed"
                                  : "hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
                              }`}
                            >
                              {count === 50 ? (
                                <>Selecionar {paginatedRecipients.length} (página)</>
                              ) : (
                                <>
                                  Selecionar {count} primeiros
                                  {paginatedRecipients.length < count && paginatedRecipients.length > 0 && (
                                    <span className="text-gray-400 dark:text-gray-500 ml-1 text-xs">
                                      (apenas {paginatedRecipients.length})
                                    </span>
                                  )}
                                </>
                              )}
                            </button>
                          )
                        })}

                        <div className="border-t border-gray-200 dark:border-gray-700" />

                        <button
                          onClick={() => {
                            handleDeselectAll()
                            setSelectionDropdownOpen(false)
                          }}
                          disabled={selectedRecipientIds.size === 0}
                          className={`w-full text-left px-4 py-2.5 text-sm rounded-b-lg transition-colors ${
                            selectedRecipientIds.size === 0
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                          }`}
                        >
                          Limpar seleção
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Select All Button */}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={isAllFilteredSelected || totalFiltered === 0}
                    className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Selecionar Todos ({totalFiltered.toLocaleString("pt-BR")})
                  </Button>
                </div>

                {/* Selection Banner - Gmail-style */}
                {selectedRecipientIds.size > 0 && !isAllFilteredSelected && (
                  <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span>
                          <strong>{selectedRecipientIds.size}</strong> cliente(s) selecionado(s)
                        </span>
                        {totalFiltered > selectedRecipientIds.size && (
                          <>
                            <span className="text-blue-400 dark:text-blue-500">|</span>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={handleSelectAll}
                              className="h-auto p-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                            >
                              Selecionar todos os {totalFiltered.toLocaleString("pt-BR")}
                            </Button>
                          </>
                        )}
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleDeselectAll}
                        className="h-auto p-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        Limpar seleção
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* All Selected Banner */}
                {isAllFilteredSelected && totalFiltered > 0 && (
                  <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className="text-sm">
                        <strong>Todos os {totalFiltered.toLocaleString("pt-BR")}</strong> cliente(s) filtrado(s) estão selecionados.
                      </span>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleDeselectAll}
                        className="h-auto p-0 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                      >
                        Limpar seleção
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Recipient List */}
                <ScrollArea className="h-[400px] rounded-md border">
                  <div className="p-4">
                    {/* Table Header */}
                    <div className="flex items-center gap-3 p-3 border-b bg-muted/50 rounded-t-lg font-medium text-sm">
                      <div className="w-6" data-checkbox>
                        <Checkbox
                          checked={isCurrentPageFullySelected && paginatedRecipients.length > 0}
                          onCheckedChange={handleHeaderCheckboxToggle}
                          aria-label="Selecionar página atual"
                        />
                      </div>
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

      {/* Send Result Modal */}
      <Dialog open={sendModal.isOpen} onOpenChange={(open) => { if (!open) handleCloseSendModal() }}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {sendModal.totalFailed === 0 ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <span className="text-green-600">Emails Enviados com Sucesso!</span>
                </>
              ) : sendModal.totalSent > 0 ? (
                <>
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  <span className="text-yellow-600">Emails Parcialmente Enviados</span>
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-red-600" />
                  <span className="text-red-600">Erro ao Enviar Emails</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span>
                    <strong>Total enviados:</strong> {sendModal.totalSent} de {sendModal.totalAttempted}
                  </span>
                  <span>
                    <strong>Data/Hora:</strong> {sendModal.sentAt ? formatDateBrazilian(sendModal.sentAt) : "—"}
                  </span>
                </div>

                {/* Error Summary */}
                {sendModal.totalFailed > 0 && (() => {
                  const errorCounts = sendModal.recipients
                    .filter(r => !r.success && r.error)
                    .reduce((acc, r) => {
                      const error = r.error || "Erro desconhecido"
                      acc[error] = (acc[error] || 0) + 1
                      return acc
                    }, {} as Record<string, number>)

                  const sortedErrors = Object.entries(errorCounts).sort((a, b) => b[1] - a[1])

                  return (
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                        Resumo de falhas:
                      </p>
                      <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                        {sortedErrors.map(([error, count]) => (
                          <li key={error}>• {error}: <strong>{count}</strong> email(s)</li>
                        ))}
                      </ul>
                    </div>
                  )
                })()}
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-hidden rounded-md border my-4">
            <div className="h-full overflow-y-auto">
              {/* Table Header */}
              <div className="flex items-center gap-3 p-3 border-b bg-muted/50 font-medium text-sm sticky top-0 z-10">
                <div className="w-8 text-center">#</div>
                <div className="flex-1 min-w-0">Nome</div>
                <div className="w-48 hidden sm:block">Email</div>
                <div className="w-24 text-center">Status</div>
              </div>

              {/* Recipient Rows */}
              <div className="divide-y">
                {sendModal.recipients.map((recipient, index) => (
                  <div
                    key={recipient.id}
                    className={`flex items-start gap-3 p-3 ${!recipient.success ? 'bg-red-50/50 dark:bg-red-950/20' : 'hover:bg-muted/30'}`}
                  >
                    <div className="w-8 text-center text-sm text-muted-foreground pt-0.5">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{recipient.name}</p>
                      <p className="text-xs text-muted-foreground truncate sm:hidden">
                        {recipient.email}
                      </p>
                      {recipient.error && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 break-words">
                          {recipient.error}
                        </p>
                      )}
                    </div>
                    <div className="w-48 hidden sm:block">
                      <p className="text-xs text-muted-foreground truncate">{recipient.email}</p>
                    </div>
                    <div className="w-24 text-center flex-shrink-0">
                      {recipient.success ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Enviado
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Falhou
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button onClick={handleCloseSendModal} className="w-full sm:w-auto">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
