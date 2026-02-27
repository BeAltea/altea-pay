"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CardDescription } from "@/components/ui/card"
import {
  Users,
  DollarSign,
  AlertTriangle,
  Search,
  Send,
  Loader2,
  Handshake,
  CheckCircle,
  Clock,
  BarChart3,
  ArrowUpDown,
  CalendarClock,
  Calendar,
  RefreshCw,
  XCircle,
  Eye,
  ChevronDown,
} from "lucide-react"
import { toast } from "sonner"

type VmaxCustomer = {
  id: string
  name: string
  document: string
  status: "active" | "overdue" | "negotiating" | "paid"
  totalDebt: number
  originalDebt?: number
  daysOverdue: number
  hasNegotiation: boolean // Any negotiation sent (for "Enviada" status)
  hasActiveNegotiation: boolean // Active (non-paid) negotiation
  isPaid?: boolean
  isCancelled?: boolean // Was cancelled (can send new negotiation)
  cancelledCount?: number // Number of cancelled negotiations for this customer
  email: string | null
  phone: string | null
  paymentStatus: string | null
  asaasStatus: string | null
  agreementStatus?: string | null // Agreement status (active, cancelled, completed, etc.)
  asaasPaymentId?: string | null // ASAAS payment ID for cancellation
  agreementId?: string | null // Agreement ID for cancellation
  dueDate?: string | null // Due date from agreement or VMAX
  notificationViewed?: boolean // Whether the notification/payment link was viewed
  notificationViewedAt?: string | null // When it was viewed
  notificationViewedChannel?: string | null // Which channel (whatsapp, email, payment_link)
}

type Company = {
  id: string
  name: string
}

export function NegotiationsClient({ companies }: { companies: Company[] }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("")
  const [customers, setCustomers] = useState<VmaxCustomer[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [negotiationFilter, setNegotiationFilter] = useState<"all" | "enviada" | "sem_negociacao">("all")
  const [debtStatusFilter, setDebtStatusFilter] = useState<"all" | "em_aberto" | "aguardando" | "paga" | "vencida">("all")
  const [dueDateFrom, setDueDateFrom] = useState<string>("")
  const [dueDateTo, setDueDateTo] = useState<string>("")
  const [displayLimit, setDisplayLimit] = useState<number>(50)
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [sending, setSending] = useState(false)
  const [sortField, setSortField] = useState<"name" | "debt" | "debtAge" | "dueDate" | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [syncing, setSyncing] = useState(false)

  // Modal form state
  const [discountType, setDiscountType] = useState<"none" | "percentage" | "fixed">("none")
  const [discountValue, setDiscountValue] = useState<string>("")
  const [paymentMethods, setPaymentMethods] = useState<Set<string>>(new Set())
  const [notificationChannels, setNotificationChannels] = useState<Set<string>>(new Set())

  // Duplicate warning dialog state
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const [duplicateCustomers, setDuplicateCustomers] = useState<VmaxCustomer[]>([])

  // Cancel negotiation dialog state
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancellingCustomer, setCancellingCustomer] = useState<VmaxCustomer | null>(null)
  const [cancelling, setCancelling] = useState(false)

  // Results modal state (for showing detailed send results)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [sendResults, setSendResults] = useState<{
    sent: number
    failed: number
    total: number
    results: Array<{
      vmaxId: string
      customerName: string
      cpfCnpj: string
      status: "success" | "failed" | "recovered"
      failedAtStep?: string
      error?: {
        message: string
        step: string
        httpStatus?: number
        asaasErrors?: any[]
        recoverable?: boolean
      }
      asaasCustomerCreated?: boolean
      asaasPaymentCreated?: boolean
      asaasCustomerId?: string
      asaasPaymentId?: string
      paymentUrl?: string
      recoveryNote?: string
      notificationChannel?: "whatsapp" | "email" | "none"
      phoneValidation?: {
        original: string
        isValid: boolean
        reason?: string
      }
    }>
    stepLabels?: Record<string, string>
  } | null>(null)

  // Sync results modal state
  const [showSyncResultsModal, setShowSyncResultsModal] = useState(false)
  const [syncResults, setSyncResults] = useState<{
    total: number
    synced: number
    updated: number
    skipped: number
    errors: string[]
    stuckFixed?: number
    stuckDetails?: Array<{ name: string; cpfCnpj: string; action: string; asaasPaymentId?: string }>
    incompleteAgreements?: Array<{ agreementId: string; customerName: string; cpfCnpj: string; asaasCustomerId: string; issue: string }>
    // FullSync-specific fields
    fullSync?: boolean
    asaasCustomerCount?: number
    matched?: number
    unmatched?: number
    chargesCreated?: number
  } | null>(null)

  // Sync error modal state
  const [showSyncErrorModal, setShowSyncErrorModal] = useState(false)
  const [syncError, setSyncError] = useState<{
    error: string
    details?: {
      message: string
      step?: string
      stepLabel?: string
      httpStatus?: number
      asaasResponse?: any
      stack?: string[]
    }
  } | null>(null)

  // Per-client sync state
  const [syncingClientId, setSyncingClientId] = useState<string | null>(null)

  // Notification check state
  const [checkingNotifications, setCheckingNotifications] = useState(false)

  // Selection dropdown state
  const [selectionDropdownOpen, setSelectionDropdownOpen] = useState(false)
  const selectionDropdownRef = useRef<HTMLDivElement>(null)

  // Close selection dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectionDropdownRef.current && !selectionDropdownRef.current.contains(event.target as Node)) {
        setSelectionDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Check notification viewed status from ASAAS API
  const checkNotificationStatus = useCallback(async (companyId: string) => {
    setCheckingNotifications(true)
    try {
      const res = await fetch("/api/asaas/check-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.updated > 0) {
          console.log(`[Notifications] Updated ${data.updated} notification status(es)`)
          // Reload customers to get updated notification status
          return true // Signal that we should reload
        }
      }
    } catch (error) {
      console.error("Error checking notification status:", error)
    } finally {
      setCheckingNotifications(false)
    }
    return false
  }, [])

  const loadCustomers = useCallback(async (companyId: string) => {
    setLoading(true)
    setSelectedCustomers(new Set())
    try {
      const res = await fetch(`/api/super-admin/negotiations/customers?companyId=${companyId}`)
      if (!res.ok) throw new Error("Erro ao buscar clientes")
      const data = await res.json()
      setCustomers(data.customers || [])

      // DEBUG: Log agreement mapping stats
      if (data._debug) {
        console.log("🔍 DEBUG - Agreement Mapping Stats:", data._debug)
        console.log("📊 Agreement Status Counts:", data._debug.agreementStatusCounts)
        console.log("⚠️ Unmapped Agreements:", data._debug.unmappedAgreementsCount, data._debug.unmappedAgreements)
      }

      // After loading customers, check notification status from ASAAS
      // This runs in background and will reload if any updates are found
      checkNotificationStatus(companyId).then((shouldReload) => {
        if (shouldReload) {
          // Reload customers to get updated notification viewed status
          fetch(`/api/super-admin/negotiations/customers?companyId=${companyId}`)
            .then((r) => r.json())
            .then((d) => setCustomers(d.customers || []))
            .catch(console.error)
        }
      })
    } catch (error) {
      console.error("Error loading customers:", error)
      toast.error("Erro ao carregar clientes da empresa")
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [checkNotificationStatus])

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId)
    setSearchTerm("")
    setNegotiationFilter("all")
    setDebtStatusFilter("all")
    setSelectedCustomers(new Set())
    if (companyId) {
      loadCustomers(companyId)
    } else {
      setCustomers([])
    }
  }

  const filteredCustomers = useMemo(() => {
    let result = customers.filter((c) => {
      // Status Negociação filter
      if (negotiationFilter === "enviada" && !c.hasNegotiation) return false
      if (negotiationFilter === "sem_negociacao" && c.hasNegotiation) return false

      // Status Dívida filter
      const isPaidStatus = c.isPaid || c.status === "paid" ||
        c.asaasStatus === "RECEIVED" || c.asaasStatus === "CONFIRMED" ||
        c.paymentStatus === "received" || c.paymentStatus === "confirmed"

      if (debtStatusFilter === "em_aberto") {
        // Em aberto: debt not paid, no ASAAS charge
        if (isPaidStatus || c.hasNegotiation) return false
      }
      if (debtStatusFilter === "aguardando") {
        // Aguardando pagamento: ASAAS charge PENDING
        if (c.asaasStatus !== "PENDING" && c.paymentStatus !== "pending") return false
      }
      if (debtStatusFilter === "paga") {
        // Paga: ASAAS status RECEIVED/CONFIRMED or debt status paid
        if (!isPaidStatus) return false
      }
      if (debtStatusFilter === "vencida") {
        // Vencida: ASAAS status OVERDUE
        if (c.asaasStatus !== "OVERDUE" && c.paymentStatus !== "overdue") return false
      }

      // Search filter
      if (searchTerm) {
        const s = searchTerm.toLowerCase()
        if (!c.name.toLowerCase().includes(s) && !c.document.toLowerCase().includes(s)) {
          return false
        }
      }

      // Due date range filter
      if (dueDateFrom && c.dueDate && c.dueDate < dueDateFrom) return false
      if (dueDateTo && c.dueDate && c.dueDate > dueDateTo) return false

      return true
    })

    // Apply sorting
    if (sortField) {
      result = [...result].sort((a, b) => {
        let cmp = 0
        if (sortField === "name") {
          cmp = a.name.localeCompare(b.name)
        } else if (sortField === "debt") {
          cmp = a.totalDebt - b.totalDebt
        } else if (sortField === "debtAge") {
          cmp = a.daysOverdue - b.daysOverdue
        } else if (sortField === "dueDate") {
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0
          cmp = dateA - dateB
        }
        return sortOrder === "asc" ? cmp : -cmp
      })
    }

    return result
  }, [customers, searchTerm, negotiationFilter, debtStatusFilter, dueDateFrom, dueDateTo, sortField, sortOrder])

  const toggleSort = (field: "name" | "debt" | "debtAge" | "dueDate") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  // Format due date with color coding
  const formatDueDate = (dateStr: string | null | undefined, isPaid: boolean, paymentStatus: string | null) => {
    if (!dateStr) return <span className="text-muted-foreground">-</span>

    const date = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)

    const formatted = date.toLocaleDateString("pt-BR")
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Color coding
    let colorClass = "text-muted-foreground" // default gray
    if (isPaid || paymentStatus === "received" || paymentStatus === "confirmed") {
      colorClass = "text-gray-400 dark:text-gray-500" // gray for paid
    } else if (diffDays < 0) {
      colorClass = "text-red-600 dark:text-red-400" // red for overdue
    } else if (diffDays <= 7) {
      colorClass = "text-orange-600 dark:text-orange-400" // orange for due soon
    } else {
      colorClass = "text-green-600 dark:text-green-400" // green for future
    }

    return <span className={colorClass}>{formatted}</span>
  }

  const getDebtAgeColor = (days: number) => {
    if (days <= 0) return { text: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" }
    if (days <= 30) return { text: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/30" }
    if (days <= 90) return { text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" }
    return { text: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" }
  }

  // Always show exact days - no conversion to months/years
  const formatDebtAge = (days: number) => {
    if (days <= 0) return "Em dia"
    return `${days} dias`
  }

  const displayedCustomers = useMemo(() => {
    if (displayLimit === 0) return filteredCustomers
    return filteredCustomers.slice(0, displayLimit)
  }, [filteredCustomers, displayLimit])

  const toggleSelect = (id: string) => {
    // Find the customer and check if paid
    const customer = customers.find((c) => c.id === id)
    if (customer && isCustomerPaid(customer)) {
      toast.error("Nao e possivel selecionar cliente com divida quitada")
      return
    }

    setSelectedCustomers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Helper to check if a customer is paid (cannot select for negotiation)
  const isCustomerPaid = (c: VmaxCustomer) => {
    return c.isPaid || c.status === "paid" ||
      c.asaasStatus === "RECEIVED" || c.asaasStatus === "CONFIRMED" ||
      c.paymentStatus === "received" || c.paymentStatus === "confirmed"
  }

  // Only selectable customers (not paid) from displayed list
  const selectableCustomers = useMemo(() => {
    return displayedCustomers.filter((c) => !isCustomerPaid(c))
  }, [displayedCustomers])

  // All selectable customers from filtered list (for "select all" count)
  const allSelectableFiltered = useMemo(() => {
    return filteredCustomers.filter((c) => !isCustomerPaid(c))
  }, [filteredCustomers])

  // Check if all displayed customers are selected
  const isAllDisplayedSelected = useMemo(() => {
    if (selectableCustomers.length === 0) return false
    return selectableCustomers.every((c) => selectedCustomers.has(c.id))
  }, [selectableCustomers, selectedCustomers])

  // Check if all filtered customers are selected
  const isAllFilteredSelected = useMemo(() => {
    if (allSelectableFiltered.length === 0) return false
    return allSelectableFiltered.every((c) => selectedCustomers.has(c.id))
  }, [allSelectableFiltered, selectedCustomers])

  const toggleSelectAll = () => {
    // Only select customers that are NOT paid
    if (selectedCustomers.size === selectableCustomers.length && selectableCustomers.length > 0) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(selectableCustomers.map((c) => c.id)))
    }
  }

  // Handle select a specific count from displayed customers
  const handleSelectCount = (count: number) => {
    const toSelect = selectableCustomers.slice(0, count)
    const newSelected = new Set(toSelect.map((c) => c.id))
    setSelectedCustomers(newSelected)
  }

  // Handle select all filtered customers (across all pages/limits)
  const handleSelectAllFiltered = () => {
    const allSelectableFiltered = filteredCustomers.filter((c) => !isCustomerPaid(c))
    setSelectedCustomers(new Set(allSelectableFiltered.map((c) => c.id)))
  }

  // Clear all selection
  const handleClearSelection = () => {
    setSelectedCustomers(new Set())
  }

  const togglePaymentMethod = (method: string) => {
    setPaymentMethods((prev) => {
      const next = new Set(prev)
      if (next.has(method)) next.delete(method)
      else next.add(method)
      return next
    })
  }

  const toggleNotificationChannel = (channel: string) => {
    setNotificationChannels((prev) => {
      const next = new Set(prev)
      if (next.has(channel)) next.delete(channel)
      else next.add(channel)
      return next
    })
  }

  const openSendModal = () => {
    if (selectedCustomers.size === 0) {
      toast.error("Selecione pelo menos um cliente")
      return
    }

    const selectedData = customers.filter((c) => selectedCustomers.has(c.id))

    // 1. BLOCK — clients with paid debts cannot receive new negotiations
    const paidClients = selectedData.filter(
      (c) => c.isPaid || c.status === "paid" ||
        c.asaasStatus === "RECEIVED" || c.asaasStatus === "CONFIRMED" ||
        c.paymentStatus === "received" || c.paymentStatus === "confirmed"
    )

    if (paidClients.length > 0) {
      const names = paidClients.slice(0, 3).map((c) => c.name).join(", ")
      const moreText = paidClients.length > 3 ? ` e mais ${paidClients.length - 3}` : ""
      toast.error(`Nao e possivel enviar negociacao para clientes com divida quitada: ${names}${moreText}`)
      return // STOP — do not proceed
    }

    // 2. WARN — clients with active (unpaid, non-cancelled) negotiation
    // Cancelled negotiations don't trigger duplicate warning
    const customersWithExisting = selectedData.filter(
      (c) => c.hasActiveNegotiation && !c.isPaid && c.status !== "paid" && !c.isCancelled
    )

    if (customersWithExisting.length > 0) {
      // Show duplicate warning dialog
      setDuplicateCustomers(customersWithExisting)
      setShowDuplicateWarning(true)
      return
    }

    // 3. No issues, open modal directly
    setDiscountType("none")
    setDiscountValue("")
    setPaymentMethods(new Set())
    setNotificationChannels(new Set())
    setShowModal(true)
  }

  const confirmSendWithDuplicates = () => {
    setShowDuplicateWarning(false)
    setDuplicateCustomers([])
    setDiscountType("none")
    setDiscountValue("")
    setPaymentMethods(new Set())
    setNotificationChannels(new Set())
    setShowModal(true)
  }

  const handleCancelNegotiation = (customer: VmaxCustomer) => {
    setCancellingCustomer(customer)
    setShowCancelDialog(true)
  }

  const confirmCancelNegotiation = async () => {
    if (!cancellingCustomer) return

    setCancelling(true)
    try {
      const response = await fetch("/api/asaas/cancel-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agreementId: cancellingCustomer.agreementId,
          asaasPaymentId: cancellingCustomer.asaasPaymentId,
          vmaxId: cancellingCustomer.id,
          companyId: selectedCompanyId,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success("Negociacao cancelada com sucesso")
        setShowCancelDialog(false)
        setCancellingCustomer(null)
        // Hard reload to ensure fresh data from server
        window.location.reload()
      } else {
        toast.error(data.error || "Erro ao cancelar negociacao")
      }
    } catch (error) {
      console.error("Error cancelling negotiation:", error)
      toast.error("Erro ao cancelar negociacao")
    } finally {
      setCancelling(false)
    }
  }

  const handleSendNegotiations = async () => {
    if (paymentMethods.size === 0) {
      toast.error("Selecione pelo menos um metodo de pagamento")
      return
    }
    if (notificationChannels.size === 0) {
      toast.error("Selecione pelo menos um canal de notificacao")
      return
    }

    setSending(true)
    try {
      // Use API route instead of server action (supports maxDuration = 120s for large batches)
      const response = await fetch("/api/super-admin/send-bulk-negotiations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          customerIds: Array.from(selectedCustomers),
          discountType,
          discountValue: discountValue ? Number(discountValue) : 0,
          paymentMethods: Array.from(paymentMethods),
          notificationChannels: Array.from(notificationChannels),
        }),
      })

      const result = await response.json()

      setShowModal(false) // Close send modal

      if (result.success) {
        const totalSelected = selectedCustomers.size

        // Always show results modal if there are any failures or partial success
        if (result.failed > 0 || result.sent < totalSelected) {
          setSendResults({
            sent: result.sent,
            failed: result.failed,
            total: result.total,
            results: result.results,
            stepLabels: result.stepLabels,
          })
          setShowResultsModal(true)
          toast.warning(`Concluído com ${result.failed} erro(s). Veja detalhes abaixo.`)
        } else {
          toast.success(`Negociacao enviada com sucesso para todos os ${result.sent} cliente(s)!`)
        }

        setSelectedCustomers(new Set())
        // Reload customers to update status
        loadCustomers(selectedCompanyId)
      } else {
        // Total failure - still show results if available
        if (result.results && result.results.length > 0) {
          setSendResults({
            sent: result.sent || 0,
            failed: result.failed || result.results.length,
            total: result.total || result.results.length,
            results: result.results,
            stepLabels: result.stepLabels,
          })
          setShowResultsModal(true)
        }
        toast.error(result.error || "Erro ao enviar negociacoes")
      }
    } catch (error) {
      toast.error("Erro ao enviar negociacoes")
    } finally {
      setSending(false)
    }
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  // Abbreviated currency for stat cards (k/M suffix)
  const formatCurrencyShort = (value: number): string => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1).replace(".", ",")}M`
    }
    if (value >= 10000) {
      return `R$ ${(value / 1000).toFixed(0)}k`
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1).replace(".", ",")}k`
    }
    return `R$ ${value.toFixed(2).replace(".", ",")}`
  }

  // Helper to format payment status for display
  const getPaymentStatusInfo = (paymentStatus: string | null, asaasStatus: string | null) => {
    // Map payment_status to display info
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: "Aguardando", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
      confirmed: { label: "Confirmado", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
      received: { label: "Pago", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
      overdue: { label: "Vencido", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
      refunded: { label: "Reembolsado", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
      refund_requested: { label: "Reembolso Solicitado", className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
    }

    if (paymentStatus && statusMap[paymentStatus]) {
      return statusMap[paymentStatus]
    }

    // Fallback to ASAAS status if available
    if (asaasStatus) {
      const asaasMap: Record<string, { label: string; className: string }> = {
        PENDING: { label: "Aguardando", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
        CONFIRMED: { label: "Confirmado", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
        RECEIVED: { label: "Pago", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
        OVERDUE: { label: "Vencido", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
        REFUNDED: { label: "Reembolsado", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
      }
      if (asaasMap[asaasStatus]) {
        return asaasMap[asaasStatus]
      }
    }

    return null
  }

  const handleSyncWithAsaas = async () => {
    setSyncing(true)
    try {
      // Use fullSync mode for comprehensive ASAAS → local sync
      const body = selectedCompanyId
        ? { companyId: selectedCompanyId, fullSync: true, createChargesForCustomerOnly: false }
        : {}
      const res = await fetch("/api/asaas/sync-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      // Safe JSON parsing - check content-type first to avoid "Unexpected token '<'" errors
      const contentType = res.headers.get("content-type") || ""
      let data: any

      if (contentType.includes("application/json")) {
        data = await res.json()
      } else {
        // Server returned HTML (error page, timeout) instead of JSON
        const text = await res.text()
        const preview = text.substring(0, 200)
        console.error("Sync API returned non-JSON:", res.status, preview)
        data = {
          success: false,
          error: `Servidor retornou resposta inesperada (${res.status})`,
          details: {
            message: "O servidor retornou HTML em vez de JSON. Isso geralmente indica timeout ou erro interno.",
            step: "api_response",
            stepLabel: "Resposta da API",
            httpStatus: res.status,
            asaasResponse: preview.includes("<") ? "HTML error page" : preview,
          },
        }
      }

      if (res.ok && data.success) {
        const results = data.results || {}

        // Check if fullSync mode
        const isFullSync = data.fullSync === true

        const hasDetails = isFullSync
          ? (results.synced > 0 || results.unmatched > 0 || results.errors?.length > 0 || results.syncedDetails?.length > 0 || results.unmatchedCustomers?.length > 0)
          : ((results.stuckFixed && results.stuckFixed > 0) ||
            (results.stuckDetails && results.stuckDetails.length > 0) ||
            (results.incompleteAgreements && results.incompleteAgreements.length > 0) ||
            results.updated > 0)

        if (hasDetails) {
          // Show detailed results in modal
          // For fullSync, convert results format to match existing modal
          if (isFullSync) {
            setSyncResults({
              ...results,
              stuckFixed: results.synced,
              stuckDetails: results.syncedDetails,
              incompleteAgreements: results.unmatchedCustomers?.map((c: any) => ({
                agreementId: "",
                customerName: c.name,
                cpfCnpj: c.cpfCnpj,
                asaasCustomerId: c.id,
                issue: "Cliente no ASAAS sem correspondência no VMAX",
              })),
              // Add fullSync specific data
              fullSync: true,
              asaasCustomerCount: results.asaasCustomerCount,
              matched: results.matched,
              unmatched: results.unmatched,
              chargesCreated: results.chargesCreated,
            })
          } else {
            setSyncResults(results)
          }
          setShowSyncResultsModal(true)
          toast.success(data.message)
        } else {
          toast.success(data.message || "Sincronização concluída - nenhuma alteração necessária")
        }

        // Reload customers to reflect any status changes
        if (selectedCompanyId) {
          loadCustomers(selectedCompanyId)
        }
      } else {
        // Show detailed error in modal instead of just a toast
        setSyncError({
          error: data.error || "Erro desconhecido",
          details: data.details,
        })
        setShowSyncErrorModal(true)
      }
    } catch (error: any) {
      console.error("Error syncing with ASAAS:", error)
      // Network/timeout error
      setSyncError({
        error: "Falha na conexão com o servidor",
        details: {
          message: error.message || "Verifique sua conexão com a internet",
          step: "network",
          stepLabel: "Conexão de rede",
        },
      })
      setShowSyncErrorModal(true)
    } finally {
      setSyncing(false)
    }
  }

  // Per-client sync handler
  const handleSyncSingleClient = async (customer: VmaxCustomer, createCharge = false) => {
    setSyncingClientId(customer.id)

    try {
      const response = await fetch("/api/asaas/sync-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vmaxId: customer.id,
          cpfCnpj: customer.document,
          companyId: selectedCompanyId,
          customerName: customer.name,
          createCharge,
          debtAmount: customer.totalDebt,
        }),
      })

      // Safe JSON parsing
      const contentType = response.headers.get("content-type") || ""
      let data: any

      if (contentType.includes("application/json")) {
        data = await response.json()
      } else {
        const text = await response.text()
        toast.error("Erro: resposta inesperada do servidor")
        console.error("Non-JSON response:", text.substring(0, 200))
        return
      }

      if (data.success) {
        if (data.status === "synced" || data.status === "charge_created") {
          toast.success(`${customer.name} sincronizado com ASAAS`)
          // Reload customers to update status
          loadCustomers(selectedCompanyId)
        } else if (data.status === "already_synced") {
          toast.info(`${customer.name} já estava sincronizado`)
        } else if (data.status === "customer_only") {
          // Customer exists but no charge - offer to create
          if (data.canCreateCharge) {
            const debtFormatted = data.debtAmount?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || ""
            const confirmCreate = window.confirm(
              `${customer.name} existe no ASAAS mas sem cobrança.\n\n` +
              `Valor da dívida: ${debtFormatted}\n\n` +
              `Deseja criar a cobrança agora?`
            )
            if (confirmCreate) {
              // Call again with createCharge=true
              await handleSyncSingleClient(customer, true)
              return
            }
          }
          toast.warning(`${customer.name} existe no ASAAS mas sem cobrança`)
        } else if (data.status === "not_found") {
          toast.info(`${customer.name} não encontrado no ASAAS`)
        }
      } else {
        if (data.partialSuccess) {
          toast.warning(`Cobrança criada mas houve erro ao atualizar AlteaPay: ${data.error}`)
          loadCustomers(selectedCompanyId)
        } else {
          toast.error(`Erro: ${data.error || "Falha ao sincronizar"}`)
        }
      }
    } catch (error: any) {
      console.error("Error syncing single client:", error)
      toast.error(`Falha na conexão: ${error.message}`)
    } finally {
      setSyncingClientId(null)
    }
  }

  const totalDebtSelected = useMemo(() => {
    return customers
      .filter((c) => selectedCustomers.has(c.id))
      .reduce((sum, c) => sum + c.totalDebt, 0)
  }, [customers, selectedCustomers])

  const kpiStats = useMemo(() => {
    const total = customers.length

    // Paid customers (completed negotiations)
    const paidCustomers = customers.filter((c) => c.isPaid || c.status === "paid")
    const paidCount = paidCustomers.length

    // Cancelled customers (can send new negotiation)
    const cancelledCustomersCount = customers.filter((c) => c.isCancelled).length

    // Total cancelled negotiations (sum of cancelledCount across all customers)
    const totalCancelledNegotiations = customers.reduce((sum, c) => sum + (c.cancelledCount || 0), 0)

    // Customers with ANY negotiation sent (including paid, NOT cancelled) - "Negociações Enviadas"
    // Cancelled negotiations don't count as "Enviada"
    const withNegotiation = customers.filter((c) => c.hasNegotiation && !c.isCancelled).length

    // Customers without any negotiation OR with cancelled - "Pendentes de Envio"
    // Cancelled customers can send new negotiation, so they count as pending
    const withoutNegotiation = customers.filter((c) => !c.hasNegotiation || c.isCancelled).length

    // Customers with viewed notifications (only counts active, non-cancelled negotiations)
    const viewedCount = customers.filter((c) => c.hasNegotiation && !c.isCancelled && c.notificationViewed).length

    // Total debt (all customers)
    const totalDebt = customers.reduce((sum, c) => sum + c.totalDebt, 0)

    // Recovered debt (paid customers)
    const recoveredDebt = paidCustomers.reduce((sum, c) => sum + c.totalDebt, 0)

    // Pending debt (non-paid customers)
    const pendingDebt = customers
      .filter((c) => !c.isPaid && c.status !== "paid")
      .reduce((sum, c) => sum + c.totalDebt, 0)

    return {
      total,
      withNegotiation,
      withoutNegotiation,
      totalDebt,
      recoveredDebt,
      pendingDebt,
      paidCount,
      cancelledCustomersCount,
      totalCancelledNegotiations,
      viewedCount
    }
  }, [customers])

  return (
    <div className="space-y-6">
      {/* Company selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Handshake className="h-5 w-5" />
            Selecionar Empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Selecione uma empresa..." />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {!loading && selectedCompanyId && customers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Clientes</p>
                  <p className="text-2xl font-bold">{kpiStats.total}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Negociacoes Enviadas</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{kpiStats.withNegotiation}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpiStats.total > 0 ? ((kpiStats.withNegotiation / kpiStats.total) * 100).toFixed(1) : 0}% do total
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                  <Send className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pendentes de Envio</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{kpiStats.withoutNegotiation}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpiStats.total > 0 ? ((kpiStats.withoutNegotiation / kpiStats.total) * 100).toFixed(1) : 0}% do total
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Negociacoes Pagas</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{kpiStats.paidCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpiStats.withNegotiation > 0 ? ((kpiStats.paidCount / kpiStats.withNegotiation) * 100).toFixed(1) : 0}% das enviadas
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cobranças Visualizadas</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {checkingNotifications ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      kpiStats.viewedCount
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpiStats.withNegotiation > 0 ? ((kpiStats.viewedCount / kpiStats.withNegotiation) * 100).toFixed(1) : 0}% das enviadas
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-gray-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Negociacoes Canceladas</p>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{kpiStats.totalCancelledNegotiations}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpiStats.cancelledCustomersCount} cliente(s)
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Divida Pendente</p>
                  <p
                    className="text-2xl font-bold text-red-600 dark:text-red-400"
                    title={formatCurrency(kpiStats.pendingDebt)}
                  >
                    {formatCurrencyShort(kpiStats.pendingDebt)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-teal-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Divida Recuperada</p>
                  <p
                    className="text-2xl font-bold text-teal-600 dark:text-teal-400"
                    title={formatCurrency(kpiStats.recoveredDebt)}
                  >
                    {formatCurrencyShort(kpiStats.recoveredDebt)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-950 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Carregando clientes...</span>
        </div>
      )}

      {/* Customers table */}
      {!loading && selectedCompanyId && customers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg">
                Clientes ({filteredCustomers.length} de {customers.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSyncWithAsaas}
                  disabled={syncing}
                >
                  {syncing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Sincronizar ASAAS
                </Button>
                <Button
                  onClick={openSendModal}
                  disabled={selectedCustomers.size === 0}
                  className="bg-altea-gold text-altea-navy hover:bg-altea-gold/90"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Negociacao ({selectedCustomers.size})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome, CPF/CNPJ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Status Negociação</Label>
                <Select value={negotiationFilter} onValueChange={(v: any) => setNegotiationFilter(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="enviada">Enviada</SelectItem>
                    <SelectItem value="sem_negociacao">Sem negociação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Status Dívida</Label>
                <Select value={debtStatusFilter} onValueChange={(v: any) => setDebtStatusFilter(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="em_aberto">Em aberto</SelectItem>
                    <SelectItem value="aguardando">Aguardando pagamento</SelectItem>
                    <SelectItem value="paga">Paga</SelectItem>
                    <SelectItem value="vencida">Vencida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Vencimento De</Label>
                <Input
                  type="date"
                  value={dueDateFrom}
                  onChange={(e) => setDueDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Vencimento Até</Label>
                <Input
                  type="date"
                  value={dueDateTo}
                  onChange={(e) => setDueDateTo(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Exibir</Label>
                <Select value={String(displayLimit)} onValueChange={(v) => setDisplayLimit(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="250">250</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                    <SelectItem value="1000">1000</SelectItem>
                    <SelectItem value="0">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selection banner - Gmail style */}
            {selectedCustomers.size > 0 && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    {selectedCustomers.size} cliente(s) selecionado(s)
                  </span>
                  <span className="text-yellow-500 dark:text-yellow-600">|</span>
                  <span className="text-sm text-yellow-700 dark:text-yellow-400">
                    Dívida total: {formatCurrency(totalDebtSelected)}
                  </span>
                  {!isAllFilteredSelected && allSelectableFiltered.length > selectedCustomers.size && (
                    <>
                      <span className="text-yellow-500 dark:text-yellow-600">|</span>
                      <button
                        onClick={handleSelectAllFiltered}
                        className="text-sm text-yellow-700 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-200 underline"
                      >
                        Selecionar todos os {allSelectableFiltered.length.toLocaleString("pt-BR")}
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={handleClearSelection}
                  className="text-sm text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
                >
                  Limpar
                </button>
              </div>
            )}

            {/* All filtered selected banner */}
            {isAllFilteredSelected && allSelectableFiltered.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-300">
                    Todos os {allSelectableFiltered.length.toLocaleString("pt-BR")} cliente(s) filtrado(s) estão selecionados
                  </span>
                </div>
                <button
                  onClick={handleClearSelection}
                  className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                >
                  Limpar seleção
                </button>
              </div>
            )}

            {/* Selection dropdown and column headers */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b">
              {/* Selection dropdown */}
              <div ref={selectionDropdownRef} className="relative flex-shrink-0">
                <button
                  onClick={() => setSelectionDropdownOpen(!selectionDropdownOpen)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted transition-colors"
                  disabled={selectableCustomers.length === 0}
                >
                  <Checkbox
                    checked={selectedCustomers.size > 0}
                    className="pointer-events-none border-foreground/70"
                  />
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${selectionDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {selectionDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[260px] py-1">
                    {[10, 20, 30, 40, 50].map((count) => {
                      const available = selectableCustomers.length
                      const actualCount = Math.min(count, available)
                      return (
                        <button
                          key={count}
                          onClick={() => {
                            handleSelectCount(actualCount)
                            setSelectionDropdownOpen(false)
                          }}
                          disabled={available === 0}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            available === 0
                              ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                              : "hover:bg-yellow-50 dark:hover:bg-yellow-950/30 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {count === 50 ? (
                            <>Selecionar {available} (página)</>
                          ) : (
                            <>
                              Selecionar {count} primeiros
                              {available < count && available > 0 && (
                                <span className="text-gray-400 dark:text-gray-500 ml-1 text-xs">
                                  (apenas {available})
                                </span>
                              )}
                            </>
                          )}
                        </button>
                      )
                    })}

                    <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

                    <button
                      onClick={() => {
                        handleSelectAllFiltered()
                        setSelectionDropdownOpen(false)
                      }}
                      disabled={allSelectableFiltered.length === 0}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                        allSelectableFiltered.length === 0
                          ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                          : "hover:bg-yellow-50 dark:hover:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400"
                      }`}
                    >
                      Selecionar todos ({allSelectableFiltered.length.toLocaleString("pt-BR")})
                    </button>

                    <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

                    <button
                      onClick={() => {
                        handleClearSelection()
                        setSelectionDropdownOpen(false)
                      }}
                      disabled={selectedCustomers.size === 0}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedCustomers.size === 0
                          ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                          : "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                      }`}
                    >
                      Limpar seleção
                    </button>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-10 gap-2 items-center">
                <button
                  onClick={() => toggleSort("name")}
                  className="lg:col-span-2 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  Cliente
                  <ArrowUpDown className={`h-3 w-3 ${sortField === "name" ? "text-primary" : "opacity-50"}`} />
                </button>
                <button
                  onClick={() => toggleSort("debt")}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dívida
                  <ArrowUpDown className={`h-3 w-3 ${sortField === "debt" ? "text-primary" : "opacity-50"}`} />
                </button>
                <button
                  onClick={() => toggleSort("debtAge")}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CalendarClock className="h-3 w-3" />
                  Tempo Dívida
                  <ArrowUpDown className={`h-3 w-3 ${sortField === "debtAge" ? "text-primary" : "opacity-50"}`} />
                </button>
                <span className="text-sm font-medium text-muted-foreground hidden lg:block">Status Negociação</span>
                <span className="text-sm font-medium text-muted-foreground hidden lg:block">Status Dívida</span>
                <button
                  onClick={() => toggleSort("dueDate")}
                  className="hidden lg:flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Calendar className="h-3 w-3" />
                  Vencimento
                  <ArrowUpDown className={`h-3 w-3 ${sortField === "dueDate" ? "text-primary" : "opacity-50"}`} />
                </button>
                <span className="text-sm font-medium text-muted-foreground hidden lg:block text-center" title="Cobrança Visualizada">Visualizada</span>
                <span className="text-sm font-medium text-muted-foreground hidden lg:block text-center">Canceladas</span>
                <span className="text-sm font-medium text-muted-foreground hidden lg:block text-center">Ações</span>
              </div>
            </div>

            {/* Customer list */}
            <div className="space-y-2">
              {displayedCustomers.map((customer) => {
                const debtAgeColors = getDebtAgeColor(customer.daysOverdue)
                const isPaid = isCustomerPaid(customer)
                return (
                  <div
                    key={customer.id}
                    className={`flex items-center gap-3 p-3 border border-border rounded-lg transition-colors ${
                      isPaid
                        ? "opacity-50 cursor-not-allowed bg-muted/30"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedCustomers.has(customer.id)}
                      onCheckedChange={() => toggleSelect(customer.id)}
                      disabled={isPaid}
                      className="border-foreground/70 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-10 gap-2 items-center">
                      {/* Name + Document */}
                      <div className="min-w-0 lg:col-span-2">
                        <p className="text-sm font-medium truncate">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.document}</p>
                      </div>
                      {/* Debt - always show original value */}
                      <div className="flex items-center gap-1">
                        <DollarSign className={`h-3.5 w-3.5 flex-shrink-0 ${customer.isPaid ? "text-green-500" : "text-red-500"}`} />
                        <span className={`text-sm font-semibold ${customer.isPaid ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {formatCurrency(customer.totalDebt)}
                        </span>
                      </div>
                      {/* Tempo da Dívida */}
                      <div>
                        <Badge className={`${debtAgeColors.bg} ${debtAgeColors.text} border-0 text-xs font-medium`}>
                          <CalendarClock className="mr-1 h-3 w-3" />
                          {formatDebtAge(customer.daysOverdue)}
                        </Badge>
                      </div>
                      {/* Status Negociação - Enviada / Cancelada / Sem negociação */}
                      <div>
                        {customer.isCancelled ? (
                          <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-xs">
                            <XCircle className="mr-1 h-3 w-3" />
                            Cancelada
                          </Badge>
                        ) : customer.hasNegotiation ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                            <Send className="mr-1 h-3 w-3" />
                            Enviada
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            <Clock className="mr-1 h-3 w-3" />
                            Sem negociação
                          </Badge>
                        )}
                      </div>
                      {/* Status Dívida - Paga / Em aberto / Aguardando / Vencida */}
                      <div>
                        {customer.isPaid || customer.status === "paid" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-xs">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Paga
                          </Badge>
                        ) : customer.isCancelled ? (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Em aberto
                          </Badge>
                        ) : customer.hasNegotiation ? (
                          (() => {
                            const statusInfo = getPaymentStatusInfo(customer.paymentStatus, customer.asaasStatus)
                            if (statusInfo) {
                              return (
                                <Badge className={`${statusInfo.className} text-xs`}>
                                  {statusInfo.label}
                                </Badge>
                              )
                            }
                            return (
                              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs">
                                Aguardando
                              </Badge>
                            )
                          })()
                        ) : (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Em aberto
                          </Badge>
                        )}
                      </div>
                      {/* Vencimento - Due Date */}
                      <div className="text-sm hidden lg:block">
                        {formatDueDate(customer.dueDate, isPaid, customer.paymentStatus)}
                      </div>
                      {/* Cobrança Visualizada - Green dot if viewed, grey if not */}
                      <div className="hidden lg:flex justify-center">
                        {customer.hasNegotiation && !customer.isCancelled ? (
                          customer.notificationViewed ? (
                            <div
                              className="flex items-center gap-1"
                              title={customer.notificationViewedAt
                                ? `Visualizada em ${new Date(customer.notificationViewedAt).toLocaleString("pt-BR")}${customer.notificationViewedChannel ? ` via ${customer.notificationViewedChannel}` : ""}`
                                : "Cobrança visualizada"
                              }
                            >
                              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                              <Eye className="h-3 w-3 text-green-600 dark:text-green-400" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1" title="Ainda não visualizada">
                              <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                              <Eye className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                            </div>
                          )
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </div>
                      {/* Canceladas column - count of cancelled negotiations */}
                      <div className="hidden lg:flex justify-center">
                        {customer.cancelledCount && customer.cancelledCount > 0 ? (
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {customer.cancelledCount}x
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </div>
                      {/* Actions column - Cancel or Sync button */}
                      <div className="hidden lg:flex justify-center gap-1">
                        {/* Show Cancel if has ASAAS payment and status is PENDING or OVERDUE */}
                        {customer.asaasPaymentId &&
                         customer.asaasStatus !== "RECEIVED" &&
                         customer.asaasStatus !== "CONFIRMED" &&
                         customer.asaasStatus !== "DELETED" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={() => handleCancelNegotiation(customer)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Cancelar
                          </Button>
                        ) : customer.asaasStatus === "DELETED" ? (
                          <span className="text-xs text-muted-foreground">Cancelada</span>
                        ) : !customer.hasNegotiation || customer.isCancelled ? (
                          // Show sync button for clients without negotiation
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                            onClick={() => handleSyncSingleClient(customer)}
                            disabled={syncingClientId === customer.id}
                            title="Verificar se este cliente existe no ASAAS"
                          >
                            {syncingClientId === customer.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {displayedCustomers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhum cliente encontrado com os filtros atuais.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No company selected */}
      {!loading && !selectedCompanyId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Handshake className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-1">
              Selecione uma empresa
            </h3>
            <p className="text-sm text-muted-foreground/70 max-w-sm">
              Escolha uma empresa acima para visualizar seus clientes e gerenciar negociacoes.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No customers found */}
      {!loading && selectedCompanyId && customers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-1">
              Nenhum cliente encontrado
            </h3>
            <p className="text-sm text-muted-foreground/70">
              Esta empresa nao possui clientes cadastrados na base VMAX.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Send Negotiation Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar Negociacao</DialogTitle>
            <DialogDescription>
              Configure os parametros da negociacao para {selectedCustomers.size} cliente(s) selecionado(s).
              Divida total: {formatCurrency(totalDebtSelected)}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Discount */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Desconto (opcional)</Label>
              <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem desconto (valor integral)</SelectItem>
                  <SelectItem value="percentage">Percentual (%)</SelectItem>
                  <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
              {discountType !== "none" && (
                <Input
                  type="number"
                  min="0"
                  step={discountType === "percentage" ? "1" : "0.01"}
                  max={discountType === "percentage" ? "100" : undefined}
                  placeholder={discountType === "percentage" ? "Ex: 15" : "Ex: 500.00"}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              )}
            </div>

            {/* Payment Methods */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                Metodo de Pagamento <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-col gap-3">
                {[
                  { key: "boleto", label: "Boleto" },
                  { key: "pix", label: "PIX" },
                  { key: "credit_card", label: "Cartao de Credito" },
                ].map((m) => (
                  <div key={m.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`pm-${m.key}`}
                      checked={paymentMethods.has(m.key)}
                      onCheckedChange={() => togglePaymentMethod(m.key)}
                      className="border-foreground/70"
                    />
                    <Label htmlFor={`pm-${m.key}`} className="text-sm cursor-pointer">
                      {m.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Notification Channels */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                Canal de Notificacao <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-col gap-3">
                {[
                  { key: "email", label: "E-mail" },
                  { key: "sms", label: "SMS" },
                  { key: "whatsapp", label: "WhatsApp" },
                ].map((c) => (
                  <div key={c.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`nc-${c.key}`}
                      checked={notificationChannels.has(c.key)}
                      onCheckedChange={() => toggleNotificationChannel(c.key)}
                      className="border-foreground/70"
                    />
                    <Label htmlFor={`nc-${c.key}`} className="text-sm cursor-pointer">
                      {c.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={sending}>
              Cancelar
            </Button>
            <Button
              onClick={handleSendNegotiations}
              disabled={sending || paymentMethods.size === 0 || notificationChannels.size === 0}
              className="bg-altea-gold text-altea-navy hover:bg-altea-gold/90"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Confirmar Envio
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Warning Dialog */}
      <Dialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Negociação já enviada
            </DialogTitle>
            <DialogDescription>
              Os seguintes clientes já possuem uma negociação ativa:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 max-h-48 overflow-y-auto">
              {duplicateCustomers.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-yellow-100 dark:border-yellow-900 last:border-0">
                  <span className="text-sm font-medium">{c.name}</span>
                  <Badge className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                    {c.asaasStatus || c.paymentStatus || "Pendente"}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Enviar uma nova negociação criará uma nova cobrança no ASAAS. A cobrança anterior continuará ativa.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateWarning(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmSendWithDuplicates}
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900"
            >
              Sim, enviar nova negociação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Negotiation Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Cancelar Negociação
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar a negociação de{" "}
              <span className="font-semibold">{cancellingCustomer?.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              A cobrança será removida do ASAAS e o cliente não receberá mais notificações sobre este pagamento.
              O status da dívida voltará para "Em aberto".
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false)
                setCancellingCustomer(null)
              }}
              disabled={cancelling}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancelNegotiation}
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Sim, cancelar negociação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Results Modal - Shows detailed errors per negotiation */}
      <Dialog open={showResultsModal} onOpenChange={setShowResultsModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {sendResults?.failed === 0 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Envio Concluído com Sucesso
                </>
              ) : sendResults?.sent === 0 ? (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  Falha no Envio
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Envio Concluído com Erros
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {sendResults && (
                <div className="flex gap-4 mt-2">
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {sendResults.sent} enviado(s)
                  </Badge>
                  {sendResults.failed > 0 && (
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                      <XCircle className="mr-1 h-3 w-3" />
                      {sendResults.failed} erro(s)
                    </Badge>
                  )}
                  <span className="text-muted-foreground">
                    Total: {sendResults.total}
                  </span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Results list with scroll */}
          <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-2">
            {sendResults?.results.map((result, idx) => (
              <div
                key={result.vmaxId || idx}
                className={`p-3 rounded-lg border ${
                  result.status === "success"
                    ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                    : result.status === "recovered"
                    ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
                    : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {result.status === "success" ? (
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : result.status === "recovered" ? (
                        <RefreshCw className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      )}
                      <span className="font-medium truncate" title={result.customerName}>
                        {result.customerName}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {result.cpfCnpj ? result.cpfCnpj.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4").replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") : "Sem CPF/CNPJ"}
                    </p>
                  </div>

                  {result.status === "success" && result.paymentUrl && (
                    <a
                      href={result.paymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex-shrink-0"
                    >
                      Ver cobrança
                    </a>
                  )}
                </div>

                {/* Notification channel indicator for success */}
                {result.status === "success" && result.notificationChannel && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Notificação:</span>
                    {result.notificationChannel === "whatsapp" ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-xs">
                        WhatsApp
                      </Badge>
                    ) : result.notificationChannel === "email" ? (
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-xs">
                        Email (fallback)
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300 text-xs">
                        Nenhuma
                      </Badge>
                    )}
                    {result.phoneValidation && !result.phoneValidation.isValid && result.phoneValidation.reason && (
                      <span className="text-xs text-muted-foreground" title={result.phoneValidation.reason}>
                        ({result.phoneValidation.reason})
                      </span>
                    )}
                  </div>
                )}

                {/* Error details for failed */}
                {result.status === "failed" && result.error && (
                  <div className="mt-2 text-sm">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                      <span className="font-medium">Falhou em:</span>
                      <span>
                        {sendResults?.stepLabels?.[result.error.step] || result.error.step}
                      </span>
                    </div>
                    <div className="mt-1 text-red-600 dark:text-red-400">
                      {result.error.httpStatus && (
                        <span className="font-mono mr-1">[{result.error.httpStatus}]</span>
                      )}
                      {result.error.message}
                    </div>

                    {/* Show ASAAS specific errors */}
                    {result.error.asaasErrors && result.error.asaasErrors.length > 0 && (
                      <div className="mt-1 text-xs text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/50 p-2 rounded">
                        {result.error.asaasErrors.map((e: any, i: number) => (
                          <div key={i}>
                            {e.code && <span className="font-mono mr-1">[{e.code}]</span>}
                            {e.description || e.message || JSON.stringify(e)}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Warning if ASAAS customer was created but payment failed */}
                    {result.asaasCustomerCreated && !result.asaasPaymentCreated && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/50 p-2 rounded">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                        Cliente criado no ASAAS mas cobrança não foi criada
                        {result.asaasCustomerId && (
                          <span className="font-mono ml-1">({result.asaasCustomerId})</span>
                        )}
                      </div>
                    )}

                    {/* Warning if ASAAS succeeded but DB update failed */}
                    {result.asaasPaymentCreated && result.error.recoverable && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/50 p-2 rounded">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                        Cobrança criada no ASAAS mas status não atualizado no AlteaPay. Use "Sincronizar ASAAS" para corrigir.
                      </div>
                    )}

                    {/* Phone validation and notification channel info */}
                    {result.notificationChannel && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Canal:</span>
                        <Badge variant="outline" className="text-xs">
                          {result.notificationChannel === "whatsapp" ? "WhatsApp" :
                           result.notificationChannel === "email" ? "Email" : "Nenhum"}
                        </Badge>
                        {result.phoneValidation && !result.phoneValidation.isValid && (
                          <span className="text-muted-foreground">
                            (Tel: {result.phoneValidation.reason})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Recovery note */}
                {result.status === "recovered" && result.recoveryNote && (
                  <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                    <RefreshCw className="inline h-3 w-3 mr-1" />
                    {result.recoveryNote}
                  </div>
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowResultsModal(false)}>
              Fechar
            </Button>
            {sendResults && sendResults.failed > 0 && (
              <Button
                onClick={() => {
                  setShowResultsModal(false)
                  handleSyncWithAsaas()
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Sincronizar ASAAS
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Results Modal */}
      <Dialog open={showSyncResultsModal} onOpenChange={setShowSyncResultsModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-500" />
              Sincronização com ASAAS Concluída
            </DialogTitle>
            <DialogDescription>
              {syncResults && (
                <div className="space-y-2 mt-2">
                  {/* Full Sync Stats */}
                  {syncResults.fullSync && syncResults.asaasCustomerCount !== undefined && (
                    <div className="p-2 rounded bg-blue-50 dark:bg-blue-950 text-sm">
                      <span className="font-medium">Clientes ASAAS:</span> {syncResults.asaasCustomerCount} |{" "}
                      <span className="font-medium">Já sincronizados:</span> {syncResults.matched} |{" "}
                      <span className="font-medium">Novos:</span> {syncResults.stuckFixed || 0}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {syncResults.updated > 0 && (
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        {syncResults.updated} cobrança(s) atualizada(s)
                      </Badge>
                    )}
                    {syncResults.stuckFixed && syncResults.stuckFixed > 0 && (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        {syncResults.stuckFixed} cliente(s) sincronizado(s)
                      </Badge>
                    )}
                    {syncResults.chargesCreated && syncResults.chargesCreated > 0 && (
                      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                        {syncResults.chargesCreated} cobrança(s) criada(s)
                      </Badge>
                    )}
                    {syncResults.incompleteAgreements && syncResults.incompleteAgreements.length > 0 && (
                      <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        {syncResults.incompleteAgreements.length} sem correspondência
                      </Badge>
                    )}
                    {syncResults.errors && syncResults.errors.length > 0 && (
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                        <XCircle className="mr-1 h-3 w-3" />
                        {syncResults.errors.length} erro(s)
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-2">
            {/* Fixed/Synced Clients */}
            {syncResults?.stuckDetails && syncResults.stuckDetails.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Clientes Sincronizados
                </h4>
                <div className="space-y-2">
                  {syncResults.stuckDetails.map((detail, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{detail.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {detail.cpfCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                          </p>
                        </div>
                        {detail.asaasPaymentId && (
                          <span className="text-xs font-mono text-muted-foreground">
                            {detail.asaasPaymentId}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {detail.action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Incomplete Agreements / Unmatched Customers (need manual action) */}
            {syncResults?.incompleteAgreements && syncResults.incompleteAgreements.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {syncResults.fullSync ? "Clientes ASAAS sem correspondência no VMAX" : "Clientes com Pendências"}
                </h4>
                <div className="space-y-2">
                  {syncResults.incompleteAgreements.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{item.customerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.cpfCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                          </p>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          ASAAS: {item.asaasCustomerId}
                        </span>
                      </div>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        {item.issue}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {syncResults?.errors && syncResults.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  Erros
                </h4>
                <div className="space-y-1">
                  {syncResults.errors.map((error, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded text-xs bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                    >
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No changes */}
            {syncResults &&
              !syncResults.stuckDetails?.length &&
              !syncResults.incompleteAgreements?.length &&
              !syncResults.errors?.length &&
              syncResults.updated === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500/50" />
                  <p>
                    {syncResults.fullSync
                      ? `Todos os ${syncResults.asaasCustomerCount || 0} clientes ASAAS já estão sincronizados!`
                      : "Todos os clientes já estão sincronizados!"}
                  </p>
                </div>
              )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowSyncResultsModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Error Modal - Shows detailed error when sync fails */}
      <Dialog open={showSyncErrorModal} onOpenChange={setShowSyncErrorModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="h-5 w-5" />
              Erro ao Sincronizar com ASAAS
            </DialogTitle>
            <DialogDescription>
              A sincronização falhou. Veja os detalhes abaixo para diagnosticar o problema.
            </DialogDescription>
          </DialogHeader>

          {syncError && (
            <div className="py-4 space-y-4">
              {/* Step that failed */}
              {syncError.details?.stepLabel && (
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Etapa que falhou</p>
                    <p className="font-medium text-red-700 dark:text-red-300">
                      {syncError.details.stepLabel}
                    </p>
                  </div>
                </div>
              )}

              {/* HTTP Status */}
              {syncError.details?.httpStatus && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status HTTP:</span>
                  <Badge
                    className={
                      syncError.details.httpStatus >= 500
                        ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        : syncError.details.httpStatus >= 400
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }
                  >
                    {syncError.details.httpStatus}
                    {syncError.details.httpStatus === 401 && " — Unauthorized"}
                    {syncError.details.httpStatus === 403 && " — Forbidden"}
                    {syncError.details.httpStatus === 404 && " — Not Found"}
                    {syncError.details.httpStatus === 500 && " — Internal Server Error"}
                    {syncError.details.httpStatus === 502 && " — Bad Gateway"}
                    {syncError.details.httpStatus === 503 && " — Service Unavailable"}
                  </Badge>
                </div>
              )}

              {/* Error message */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Mensagem de erro</p>
                <p className="text-sm font-medium">{syncError.details?.message || syncError.error}</p>
              </div>

              {/* ASAAS Response details */}
              {syncError.details?.asaasResponse && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Resposta do ASAAS</p>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                      {typeof syncError.details.asaasResponse === "string"
                        ? syncError.details.asaasResponse
                        : JSON.stringify(syncError.details.asaasResponse, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Possible causes based on error type */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  Possíveis causas
                </p>
                <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-disc list-inside">
                  {syncError.details?.httpStatus === 401 && (
                    <>
                      <li>Chave da API do ASAAS inválida ou expirada</li>
                      <li>Token de acesso não configurado corretamente</li>
                    </>
                  )}
                  {syncError.details?.httpStatus === 403 && (
                    <>
                      <li>Permissões insuficientes na conta ASAAS</li>
                      <li>Conta ASAAS bloqueada ou suspensa</li>
                    </>
                  )}
                  {syncError.details?.httpStatus === 404 && (
                    <>
                      <li>Recurso não encontrado no ASAAS</li>
                      <li>Cliente ou cobrança não existe mais</li>
                    </>
                  )}
                  {syncError.details?.httpStatus && syncError.details.httpStatus >= 500 && (
                    <>
                      <li>Serviço do ASAAS temporariamente indisponível</li>
                      <li>Tente novamente em alguns minutos</li>
                    </>
                  )}
                  {syncError.details?.step === "config_check" && (
                    <>
                      <li>Variável de ambiente ASAAS_API_KEY não configurada</li>
                      <li>Verifique as configurações do servidor</li>
                    </>
                  )}
                  {syncError.details?.step === "network" && (
                    <>
                      <li>Falha na conexão com a internet</li>
                      <li>Servidor pode estar offline</li>
                      <li>Timeout na requisição</li>
                    </>
                  )}
                  {!syncError.details?.httpStatus && syncError.details?.step !== "config_check" && syncError.details?.step !== "network" && (
                    <>
                      <li>Erro interno no processamento</li>
                      <li>Verifique os logs do servidor para mais detalhes</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSyncErrorModal(false)
                setSyncError(null)
              }}
            >
              Fechar
            </Button>
            <Button
              onClick={() => {
                setShowSyncErrorModal(false)
                setSyncError(null)
                handleSyncWithAsaas()
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar Novamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
