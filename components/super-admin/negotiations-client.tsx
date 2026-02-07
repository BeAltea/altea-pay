"use client"

import { useState, useMemo, useCallback } from "react"
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
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { sendBulkNegotiations } from "@/app/actions/send-bulk-negotiations"

type VmaxCustomer = {
  id: string
  name: string
  document: string
  city: string | null
  status: "active" | "overdue" | "negotiating" | "paid"
  totalDebt: number
  daysOverdue: number
  hasActiveNegotiation: boolean
  email: string | null
  phone: string | null
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
  const [negotiationFilter, setNegotiationFilter] = useState<"all" | "with" | "without">("all")
  const [displayLimit, setDisplayLimit] = useState<number>(50)
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [sending, setSending] = useState(false)
  const [sortField, setSortField] = useState<"name" | "debt" | "debtAge" | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [syncing, setSyncing] = useState(false)

  // Modal form state
  const [discountType, setDiscountType] = useState<"none" | "percentage" | "fixed">("none")
  const [discountValue, setDiscountValue] = useState<string>("")
  const [paymentMethods, setPaymentMethods] = useState<Set<string>>(new Set())
  const [notificationChannels, setNotificationChannels] = useState<Set<string>>(new Set())

  const loadCustomers = useCallback(async (companyId: string) => {
    setLoading(true)
    setSelectedCustomers(new Set())
    try {
      const res = await fetch(`/api/super-admin/negotiations/customers?companyId=${companyId}`)
      if (!res.ok) throw new Error("Erro ao buscar clientes")
      const data = await res.json()
      setCustomers(data.customers || [])
    } catch (error) {
      console.error("Error loading customers:", error)
      toast.error("Erro ao carregar clientes da empresa")
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId)
    setSearchTerm("")
    setNegotiationFilter("all")
    setSelectedCustomers(new Set())
    if (companyId) {
      loadCustomers(companyId)
    } else {
      setCustomers([])
    }
  }

  const filteredCustomers = useMemo(() => {
    let result = customers.filter((c) => {
      if (negotiationFilter === "with" && !c.hasActiveNegotiation) return false
      if (negotiationFilter === "without" && c.hasActiveNegotiation) return false
      if (!searchTerm) return true
      const s = searchTerm.toLowerCase()
      return c.name.toLowerCase().includes(s) || c.document.toLowerCase().includes(s)
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
        }
        return sortOrder === "asc" ? cmp : -cmp
      })
    }

    return result
  }, [customers, searchTerm, negotiationFilter, sortField, sortOrder])

  const toggleSort = (field: "name" | "debt" | "debtAge") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  const getDebtAgeColor = (days: number) => {
    if (days <= 0) return { text: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" }
    if (days <= 30) return { text: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/30" }
    if (days <= 90) return { text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" }
    return { text: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" }
  }

  const formatDebtAge = (days: number) => {
    if (days <= 0) return "Em dia"
    if (days < 30) return `${days} dias`
    if (days < 365) {
      const months = Math.floor(days / 30)
      return `${months} ${months === 1 ? "mês" : "meses"}`
    }
    const years = Math.floor(days / 365)
    const remainingMonths = Math.floor((days % 365) / 30)
    if (remainingMonths > 0) {
      return `${years}a ${remainingMonths}m`
    }
    return `${years} ${years === 1 ? "ano" : "anos"}`
  }

  const displayedCustomers = useMemo(() => {
    if (displayLimit === 0) return filteredCustomers
    return filteredCustomers.slice(0, displayLimit)
  }, [filteredCustomers, displayLimit])

  const toggleSelect = (id: string) => {
    setSelectedCustomers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedCustomers.size === displayedCustomers.length) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(displayedCustomers.map((c) => c.id)))
    }
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
    setDiscountType("none")
    setDiscountValue("")
    setPaymentMethods(new Set())
    setNotificationChannels(new Set())
    setShowModal(true)
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
      const result = await sendBulkNegotiations({
        companyId: selectedCompanyId,
        customerIds: Array.from(selectedCustomers),
        discountType,
        discountValue: discountValue ? Number(discountValue) : 0,
        paymentMethods: Array.from(paymentMethods),
        notificationChannels: Array.from(notificationChannels),
      })

      if (result.success) {
        const totalSelected = selectedCustomers.size
        if (result.sent === totalSelected) {
          toast.success(`Negociacao enviada com sucesso para todos os ${result.sent} cliente(s)!`)
        } else {
          toast.success(`Negociacao enviada para ${result.sent} de ${totalSelected} cliente(s).`)
          if (result.errors && result.errors.length > 0) {
            toast.warning(`${result.errors.length} erro(s): ${result.errors.slice(0, 3).join("; ")}`)
          }
        }
        setShowModal(false)
        setSelectedCustomers(new Set())
        // Reload customers to update status
        loadCustomers(selectedCompanyId)
      } else {
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

  const handleSyncWithAsaas = async () => {
    setSyncing(true)
    try {
      const body = selectedCompanyId ? { companyId: selectedCompanyId } : {}
      const res = await fetch("/api/asaas/sync-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast.success(data.message || `Sincronizado! ${data.results?.updated || 0} cobrancas atualizadas`)
        // Reload customers to reflect any status changes
        if (selectedCompanyId) {
          loadCustomers(selectedCompanyId)
        }
      } else {
        toast.error(data.error || "Erro ao sincronizar com ASAAS")
      }
    } catch (error) {
      console.error("Error syncing with ASAAS:", error)
      toast.error("Erro ao sincronizar com ASAAS")
    } finally {
      setSyncing(false)
    }
  }

  const totalDebtSelected = useMemo(() => {
    return customers
      .filter((c) => selectedCustomers.has(c.id))
      .reduce((sum, c) => sum + c.totalDebt, 0)
  }, [customers, selectedCustomers])

  const kpiStats = useMemo(() => {
    const total = customers.length
    const withNegotiation = customers.filter((c) => c.hasActiveNegotiation).length
    const withoutNegotiation = total - withNegotiation
    const totalDebt = customers.reduce((sum, c) => sum + c.totalDebt, 0)
    const negotiatedDebt = customers
      .filter((c) => c.hasActiveNegotiation)
      .reduce((sum, c) => sum + c.totalDebt, 0)
    const pendingDebt = totalDebt - negotiatedDebt
    return { total, withNegotiation, withoutNegotiation, totalDebt, negotiatedDebt, pendingDebt }
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
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

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Divida Pendente</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(kpiStats.pendingDebt)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    de {formatCurrency(kpiStats.totalDebt)} total
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />
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
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Label className="text-sm font-medium mb-2 block">Status de Negociacao</Label>
                <Select value={negotiationFilter} onValueChange={(v: any) => setNegotiationFilter(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="with">Com negociacao em andamento</SelectItem>
                    <SelectItem value="without">Sem negociacao</SelectItem>
                  </SelectContent>
                </Select>
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

            {/* Selection info */}
            {selectedCustomers.size > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {selectedCustomers.size} cliente(s) selecionado(s)
                </span>
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  Divida total: {formatCurrency(totalDebtSelected)}
                </span>
              </div>
            )}

            {/* Select all and column headers */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b">
              <Checkbox
                checked={selectedCustomers.size === displayedCustomers.length && displayedCustomers.length > 0}
                onCheckedChange={toggleSelectAll}
                className="border-foreground/70 flex-shrink-0"
              />
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 items-center">
                <button
                  onClick={() => toggleSort("name")}
                  className="lg:col-span-2 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  Cliente
                  <ArrowUpDown className={`h-3 w-3 ${sortField === "name" ? "text-primary" : "opacity-50"}`} />
                </button>
                <span className="text-sm font-medium text-muted-foreground hidden lg:block">Cidade</span>
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
                <span className="text-sm font-medium text-muted-foreground hidden lg:block">Status</span>
              </div>
            </div>

            {/* Customer list */}
            <div className="space-y-2">
              {displayedCustomers.map((customer) => {
                const debtAgeColors = getDebtAgeColor(customer.daysOverdue)
                return (
                  <div
                    key={customer.id}
                    className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedCustomers.has(customer.id)}
                      onCheckedChange={() => toggleSelect(customer.id)}
                      className="border-foreground/70 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 items-center">
                      {/* Name + Document */}
                      <div className="min-w-0 lg:col-span-2">
                        <p className="text-sm font-medium truncate">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.document}</p>
                      </div>
                      {/* City */}
                      <div className="text-sm text-muted-foreground truncate hidden lg:block">
                        {customer.city || "-"}
                      </div>
                      {/* Debt */}
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">
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
                      {/* Negotiation status */}
                      <div>
                        {customer.hasActiveNegotiation ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Negociacao enviada
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Sem negociacao
                          </Badge>
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
    </div>
  )
}
