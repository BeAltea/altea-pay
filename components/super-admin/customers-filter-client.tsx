"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Users, DollarSign, AlertTriangle, MapPin, Handshake, Trash2, Send, Loader2, Brain } from "lucide-react"
import { deleteCustomer } from "@/app/actions/delete-customer"
import { analyzeBatchCustomers } from "@/app/actions/analyze-customer-credit"
import { sendBulkNegotiations } from "@/app/actions/send-bulk-negotiations"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

type Customer = {
  id: string
  name: string
  document: string
  city: string | null
  status: "active" | "overdue" | "negotiating" | "paid"
  totalDebt: number
  overdueDebt: number
  daysOverdue: number
  negotiation_sent?: boolean
}

export function CustomersFilterClient({ customers, companyId }: { customers: Customer[]; companyId: string }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [daysSort, setDaysSort] = useState<"none" | "asc" | "desc">("none")
  const [amountSort, setAmountSort] = useState<"none" | "asc" | "desc">("none")
  const [sentFilter, setSentFilter] = useState<"all" | "sent" | "not_sent">("all")
  const [displayLimit, setDisplayLimit] = useState<number>(50)
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [analyzing, setAnalyzing] = useState(false)
  const [showNegotiationModal, setShowNegotiationModal] = useState(false)
  const [sendingNegotiation, setSendingNegotiation] = useState(false)
  const [discountType, setDiscountType] = useState<"none" | "percentage" | "fixed">("none")
  const [discountValue, setDiscountValue] = useState<string>("")
  const [paymentMethods, setPaymentMethods] = useState<Set<string>>(new Set())
  const [notificationChannels, setNotificationChannels] = useState<Set<string>>(new Set())
  const router = useRouter()

  const totalCustomers = customers.length
  const overdueCustomers = customers.filter((c) => c.status === "overdue").length
  const totalDebtAmount = customers.reduce((sum, c) => sum + c.totalDebt, 0)
  const totalOverdueAmount = customers.reduce((sum, c) => sum + c.overdueDebt, 0)
  const paidCustomers = customers.filter((c) => c.status === "paid").length

  const filteredAndSortedCustomers = useMemo(() => {
    let result = customers.filter((customer) => {
      if (sentFilter === "sent" && !customer.negotiation_sent) return false
      if (sentFilter === "not_sent" && customer.negotiation_sent) return false

      if (!searchTerm) return true
      const searchLower = searchTerm.toLowerCase()
      return customer.name.toLowerCase().includes(searchLower) || customer.document.toLowerCase().includes(searchLower)
    })

    if (daysSort !== "none") {
      result = [...result].sort((a, b) => {
        return daysSort === "asc" ? a.daysOverdue - b.daysOverdue : b.daysOverdue - a.daysOverdue
      })
    }

    if (amountSort !== "none") {
      result = [...result].sort((a, b) => {
        return amountSort === "asc" ? a.totalDebt - b.totalDebt : b.totalDebt - a.totalDebt
      })
    }

    return result
  }, [customers, searchTerm, daysSort, amountSort, sentFilter])

  const displayedCustomers = useMemo(() => {
    if (displayLimit === 0) return filteredAndSortedCustomers
    return filteredAndSortedCustomers.slice(0, displayLimit)
  }, [filteredAndSortedCustomers, displayLimit])

  const toggleSelectCustomer = (id: string) => {
    setSelectedCustomers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
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

  const handleBulkAnalysis = async () => {
    if (selectedCustomers.size === 0) {
      toast.error("Selecione pelo menos um cliente")
      return
    }
    setAnalyzing(true)
    try {
      const selectedData = customers
        .filter((c) => selectedCustomers.has(c.id))
        .map((c) => ({
          id: c.id,
          cpfCnpj: c.document.replace(/\D/g, ""),
          valorDivida: c.totalDebt,
        }))

      const results = await analyzeBatchCustomers(selectedData)
      const successCount = results.filter((r) => r.success).length
      const errorCount = results.filter((r) => !r.success).length

      if (successCount > 0) {
        toast.success(`Analise enviada para ${successCount} cliente(s) com sucesso!`)
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} analise(s) falharam. Verifique os dados dos clientes.`)
      }
      router.refresh()
    } catch (error) {
      toast.error("Erro ao enviar analises em lote")
    } finally {
      setAnalyzing(false)
    }
  }

  const openNegotiationModal = () => {
    if (selectedCustomers.size === 0) {
      toast.error("Selecione pelo menos um cliente")
      return
    }
    setDiscountType("none")
    setDiscountValue("")
    setPaymentMethods(new Set())
    setNotificationChannels(new Set())
    setShowNegotiationModal(true)
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
    setSendingNegotiation(true)
    try {
      const result = await sendBulkNegotiations({
        companyId: companyId,
        customerIds: Array.from(selectedCustomers),
        discountType,
        discountValue: discountValue ? Number(discountValue) : 0,
        paymentMethods: Array.from(paymentMethods),
        notificationChannels: Array.from(notificationChannels),
      })
      if (result.success) {
        toast.success(`Negociacao enviada para ${result.sent} cliente(s) com sucesso!`)
        setShowNegotiationModal(false)
        setSelectedCustomers(new Set())
        router.refresh()
      } else {
        toast.error(result.error || "Erro ao enviar negociacoes")
      }
    } catch (error) {
      toast.error("Erro ao enviar negociacoes")
    } finally {
      setSendingNegotiation(false)
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

  const getStatusLabel = (status: string) => {
    const statuses = {
      active: "Ativo",
      overdue: "Em Atraso",
      negotiating: "Negociando",
      paid: "Quitado",
    }
    return statuses[status as keyof typeof statuses] || status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "overdue":
        return "destructive"
      case "negotiating":
        return "secondary"
      case "paid":
        return "outline"
      default:
        return "default"
    }
  }

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    const confirmed = confirm(
      `Tem certeza que deseja excluir permanentemente o cliente ${customerName}?\n\nEsta ação não pode ser desfeita e removerá todos os dados associados (acordos, dívidas, pagamentos, etc.).`,
    )

    if (!confirmed) return

    const result = await deleteCustomer(customerId, companyId)

    if (result.success) {
      toast.success(result.message)
      router.refresh()
    } else {
      toast.error(result.message)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">{overdueCustomers} em atraso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalDebtAmount)}
            </div>
            <p className="text-xs text-muted-foreground">Em dívidas ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Atraso</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalOverdueAmount)}
            </div>
            <p className="text-xs text-muted-foreground">{overdueCustomers} clientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quitados</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidCustomers}</div>
            <p className="text-xs text-muted-foreground">Clientes sem débito</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Lista de Clientes ({filteredAndSortedCustomers.length})</span>
          </CardTitle>
          <CardDescription>Filtre e gerencie todos os clientes da empresa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Buscar Cliente</label>
                <Input
                  placeholder="Nome, CPF/CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Ordenar por Dias em Atraso</label>
                <Select value={daysSort} onValueChange={(value: any) => setDaysSort(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem ordenação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem ordenação</SelectItem>
                    <SelectItem value="asc">Menor para Maior</SelectItem>
                    <SelectItem value="desc">Maior para Menor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Ordenar por Valor da Dívida</label>
                <Select value={amountSort} onValueChange={(value: any) => setAmountSort(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem ordenação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem ordenação</SelectItem>
                    <SelectItem value="asc">Menor para Maior</SelectItem>
                    <SelectItem value="desc">Maior para Menor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Filtrar por Envio</label>
                <Select value={sentFilter} onValueChange={(value: any) => setSentFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="sent">Enviadas</SelectItem>
                    <SelectItem value="not_sent">Não Enviadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Exibir</label>
                <Select value={String(displayLimit)} onValueChange={(value) => setDisplayLimit(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="50" />
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
            {selectedCustomers.size > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {selectedCustomers.size} cliente(s) selecionado(s)
                </span>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={handleBulkAnalysis}
                    disabled={analyzing}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        Enviar Analises ({selectedCustomers.size})
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={openNegotiationModal}
                    className="bg-yellow-500 hover:bg-yellow-600 text-gray-900"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Negociacoes ({selectedCustomers.size})
                  </Button>
                </div>
              </div>
            )}
          </div>

          {displayedCustomers.length > 0 && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b">
              <Checkbox
                checked={selectedCustomers.size === displayedCustomers.length && displayedCustomers.length > 0}
                onCheckedChange={toggleSelectAll}
                className="border-foreground/70"
              />
              <span className="text-sm font-medium text-muted-foreground">
                Selecionar Todos ({displayedCustomers.length} de {filteredAndSortedCustomers.length})
              </span>
            </div>
          )}

          <div className="space-y-3">
            {displayedCustomers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">
                  {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {searchTerm ? "Tente buscar por outro termo" : "Importe uma base de clientes para começar"}
                </p>
              </div>
            ) : (
              displayedCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-start sm:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors gap-4"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <Checkbox
                      checked={selectedCustomers.has(customer.id)}
                      onCheckedChange={() => toggleSelectCustomer(customer.id)}
                      className="mt-1 sm:mt-0 border-foreground/70"
                    />
                    <Avatar className="flex-shrink-0">
                      <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        {customer.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-gray-900 dark:text-white">{customer.name}</p>
                        <Badge variant={getStatusColor(customer.status)}>{getStatusLabel(customer.status)}</Badge>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-mono text-xs">CPF/CNPJ: {customer.document}</span>
                        {customer.city && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {customer.city}
                            </span>
                          </>
                        )}
                      </div>

                      {customer.daysOverdue > 0 && (
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${
                              customer.daysOverdue <= 30
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : customer.daysOverdue <= 60
                                  ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                                  : customer.daysOverdue <= 90
                                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                    : "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100"
                            }`}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {customer.daysOverdue} dias em atraso
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(customer.totalDebt)}
                    </div>
                    {customer.overdueDebt > 0 && (
                      <div className="text-sm font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(customer.overdueDebt)}{" "}
                        atraso
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button asChild size="sm" className="flex-1 bg-yellow-500 hover:bg-yellow-600">
                        <Link href={`/super-admin/companies/${companyId}/customers/${customer.id}/negotiate`}>
                          <Handshake className="h-4 w-4 mr-2" />
                          Negociar
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 hover:bg-red-50 hover:border-red-300 text-red-600 hover:text-red-700 bg-transparent"
                        onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
  </CardContent>
  </Card>

      <Dialog open={showNegotiationModal} onOpenChange={setShowNegotiationModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar Negociacao</DialogTitle>
            <DialogDescription>
              Configure os parametros da negociacao para {selectedCustomers.size} cliente(s) selecionado(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
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
                      id={`cpm-${m.key}`}
                      checked={paymentMethods.has(m.key)}
                      onCheckedChange={() => togglePaymentMethod(m.key)}
                      className="border-foreground/70"
                    />
                    <Label htmlFor={`cpm-${m.key}`} className="text-sm cursor-pointer">{m.label}</Label>
                  </div>
                ))}
              </div>
            </div>
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
                      id={`cnc-${c.key}`}
                      checked={notificationChannels.has(c.key)}
                      onCheckedChange={() => toggleNotificationChannel(c.key)}
                      className="border-foreground/70"
                    />
                    <Label htmlFor={`cnc-${c.key}`} className="text-sm cursor-pointer">{c.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNegotiationModal(false)} disabled={sendingNegotiation}>
              Cancelar
            </Button>
            <Button
              onClick={handleSendNegotiations}
              disabled={sendingNegotiation || paymentMethods.size === 0 || notificationChannels.size === 0}
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900"
            >
              {sendingNegotiation ? (
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
    </>
  )
}
