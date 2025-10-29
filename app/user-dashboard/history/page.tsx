"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"
import {
  Calendar,
  Search,
  Download,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  RefreshCw,
  Eye,
  ArrowUpDown,
  CreditCard,
  FileText,
  MapPin,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface PaymentHistory {
  id: string
  debt_id: string
  amount: number
  payment_date: string
  payment_method: string
  status: "completed" | "pending" | "failed"
  reference_number: string
  debt: {
    description: string
    customer: {
      name: string
    }
  }
}

function PaymentSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-4 w-4 rounded-full" />
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-48 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="text-right space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function HistoryPage() {
  const [payments, setPayments] = useState<PaymentHistory[]>([])
  const [filteredPayments, setFilteredPayments] = useState<PaymentHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistory | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchPaymentHistory()
  }, [])

  useEffect(() => {
    filterAndSortPayments()
  }, [payments, searchTerm, statusFilter, dateFilter, sortBy, sortOrder])

  const fetchPaymentHistory = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: realPayments, error } = await supabase
        .from("payments")
        .select(`
          *,
          debt:debts(
            description,
            customer:customers(name)
          )
        `)
        .eq("user_id", user.id)
        .order("payment_date", { ascending: false })

      if (error) {
        console.error("Error fetching payment history:", error)
        setPayments([])
      } else {
        const formattedPayments = (realPayments || []).map((payment) => ({
          id: payment.id,
          debt_id: payment.debt_id,
          amount: Number(payment.amount),
          payment_date: payment.payment_date,
          payment_method: payment.payment_method,
          status: payment.status,
          reference_number: payment.transaction_id || `REF-${payment.id.slice(0, 8)}`,
          debt: {
            description: payment.debt?.description || "",
            customer: {
              name: payment.debt?.customer?.name || "",
            },
          },
        }))

        setPayments(formattedPayments)
      }
    } catch (error) {
      console.error("Error fetching payment history:", error)
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico de pagamentos.",
        variant: "destructive",
      })
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortPayments = () => {
    let filtered = payments

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (payment) =>
          payment.debt.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.debt.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.reference_number.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((payment) => payment.status === statusFilter)
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date()
      const filterDate = new Date()

      switch (dateFilter) {
        case "7days":
          filterDate.setDate(now.getDate() - 7)
          break
        case "30days":
          filterDate.setDate(now.getDate() - 30)
          break
        case "90days":
          filterDate.setDate(now.getDate() - 90)
          break
      }

      if (dateFilter !== "all") {
        filtered = filtered.filter((payment) => new Date(payment.payment_date) >= filterDate)
      }
    }

    // Sort payments
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case "date":
          aValue = new Date(a.payment_date)
          bValue = new Date(b.payment_date)
          break
        case "amount":
          aValue = a.amount
          bValue = b.amount
          break
        case "customer":
          aValue = a.debt.customer.name
          bValue = b.debt.customer.name
          break
        case "status":
          aValue = a.status
          bValue = b.status
          break
        default:
          aValue = new Date(a.payment_date)
          bValue = new Date(b.payment_date)
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredPayments(filtered)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "bg-green-100 text-green-800 border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      failed: "bg-red-100 text-red-800 border-red-200",
    }

    const labels = {
      completed: "Concluído",
      pending: "Pendente",
      failed: "Falhou",
    }

    return <Badge className={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      pix: "PIX",
      credit_card: "Cartão de Crédito",
      bank_transfer: "Transferência",
      boleto: "Boleto",
    }
    return labels[method as keyof typeof labels] || method
  }

  const handleExport = () => {
    const csvContent = [
      ["Data", "Cliente", "Descrição", "Valor", "Método", "Status", "Referência"],
      ...filteredPayments.map((payment) => [
        format(new Date(payment.payment_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        payment.debt.customer.name,
        payment.debt.description,
        payment.amount.toFixed(2),
        getPaymentMethodLabel(payment.payment_method),
        payment.status,
        payment.reference_number,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `historico-pagamentos-${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Exportação concluída",
      description: "Histórico de pagamentos exportado com sucesso!",
    })
  }

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      fetchPaymentHistory()
      toast({
        title: "Dados atualizados",
        description: "Histórico de pagamentos atualizado com sucesso!",
      })
    }, 1000)
  }

  const handleViewDetails = (paymentId: string) => {
    console.log("[v0] HistoryPage - Opening details for payment:", paymentId)
    const payment = filteredPayments.find((p) => p.id === paymentId)
    if (payment) {
      setSelectedPayment(payment)
      setIsDetailsModalOpen(true)
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível encontrar os detalhes do pagamento.",
        variant: "destructive",
      })
    }
  }

  const totalPaid = filteredPayments.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0)
  const totalPending = filteredPayments.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0)
  const totalFailed = filteredPayments.filter((p) => p.status === "failed").reduce((sum, p) => sum + p.amount, 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <PaymentSkeleton />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Histórico de Pagamentos</h1>
          <p className="text-muted-foreground mt-1">Acompanhe todos os seus pagamentos realizados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} className="bg-transparent">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pago</p>
                <p className="text-2xl font-bold text-green-600">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(totalPaid)}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(totalPending)}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Falharam</p>
                <p className="text-2xl font-bold text-red-600">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(totalFailed)}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Transações</p>
                <p className="text-2xl font-bold text-foreground">{filteredPayments.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Ordenação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, descrição ou referência..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Períodos</SelectItem>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="30days">Últimos 30 dias</SelectItem>
                <SelectItem value="90days">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Data</SelectItem>
                <SelectItem value="amount">Valor</SelectItem>
                <SelectItem value="customer">Cliente</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="bg-transparent"
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {sortOrder === "asc" ? "Crescente" : "Decrescente"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment History List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
          <CardDescription>{filteredPayments.length} transação(ões) encontrada(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  {getStatusIcon(payment.status)}
                  <div>
                    <p className="font-medium text-foreground">{payment.debt.customer.name}</p>
                    <p className="text-sm text-muted-foreground">{payment.debt.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payment.payment_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-semibold text-foreground">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(payment.amount)}
                  </p>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(payment.status)}
                    <span className="text-xs text-muted-foreground">
                      {getPaymentMethodLabel(payment.payment_method)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-muted-foreground">{payment.reference_number}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleViewDetails(payment.id)}
                      className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                      title="Ver detalhes do pagamento"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {filteredPayments.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma transação encontrada</p>
                <p className="text-sm text-muted-foreground">Tente ajustar os filtros para ver mais resultados</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Pagamento</DialogTitle>
            <DialogDescription>
              {selectedPayment && `Informações completas sobre o pagamento ${selectedPayment.reference_number}`}
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-6">
              {/* Payment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Resumo do Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Pago</p>
                      <p className="text-2xl font-bold text-green-600">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(selectedPayment.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Data do Pagamento</p>
                      <p className="font-medium">
                        {format(new Date(selectedPayment.payment_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Método de Pagamento</p>
                      <p className="font-medium flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {getPaymentMethodLabel(selectedPayment.payment_method)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Número de Referência</p>
                    <p className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                      {selectedPayment.reference_number}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Debt Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Informações da Dívida
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{selectedPayment.debt.customer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Descrição</p>
                    <p className="font-medium">{selectedPayment.debt.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID da Dívida</p>
                    <p className="font-mono text-sm">{selectedPayment.debt_id}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Detalhes da Transação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200">Informações Adicionais</h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>ID do Pagamento:</strong> {selectedPayment.id}
                      </p>
                      <p>
                        <strong>Processado em:</strong>{" "}
                        {format(new Date(selectedPayment.payment_date), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </p>
                      {selectedPayment.status === "completed" && (
                        <p className="text-green-700 dark:text-green-300">
                          <CheckCircle className="h-4 w-4 inline mr-1" />
                          Pagamento confirmado e processado com sucesso
                        </p>
                      )}
                      {selectedPayment.status === "pending" && (
                        <p className="text-yellow-700 dark:text-yellow-300">
                          <Clock className="h-4 w-4 inline mr-1" />
                          Aguardando confirmação do pagamento
                        </p>
                      )}
                      {selectedPayment.status === "failed" && (
                        <p className="text-red-700 dark:text-red-300">
                          <XCircle className="h-4 w-4 inline mr-1" />
                          Pagamento não foi processado com sucesso
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedPayment.reference_number)
                    toast({
                      title: "Copiado!",
                      description: "Número de referência copiado para a área de transferência",
                    })
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Copiar Referência
                </Button>
                <Button onClick={() => setIsDetailsModalOpen(false)} className="flex-1">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
