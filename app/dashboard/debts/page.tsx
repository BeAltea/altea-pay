"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ResponsiveTable } from "@/components/ui/responsive-table"
import { ResponsiveTabs } from "@/components/ui/responsive-tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  CheckCircle,
  RefreshCw,
  Eye,
  Mail,
  Phone,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { sendCollectionNotification } from "@/app/actions/send-notification"

interface Debt {
  id: string
  customerName: string
  customerEmail: string
  customerDocument: string
  originalAmount: number
  currentAmount: number
  dueDate: string
  daysOverdue: number
  contractNumber?: string
  description?: string
  status: "pending" | "in_collection" | "paid" | "written_off" | "in_agreement"
  classification: "low" | "medium" | "high" | "critical"
  lastAction?: string
  nextAction?: string
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [filteredDebts, setFilteredDebts] = useState<Debt[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [classificationFilter, setClassificationFilter] = useState<string>("all")
  const [isClassifying, setIsClassifying] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const { user, companyId } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    fetchDebts()
  }, [companyId])

  const fetchDebts = async () => {
    if (!companyId) {
      setLoading(false)
      return
    }

    try {
      const { data: debtsData, error } = await supabase
        .from("debts")
        .select(`
          id,
          amount,
          due_date,
          status,
          classification,
          description,
          customer_id,
          customers (
            name,
            email,
            document
          )
        `)
        .eq("company_id", companyId)
        .order("due_date", { ascending: false })

      if (error) throw error

      const formattedDebts: Debt[] =
        debtsData?.map((debt) => {
          const dueDate = new Date(debt.due_date)
          const today = new Date()
          const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

          return {
            id: debt.id,
            customerName: debt.customers?.name || "Cliente",
            customerEmail: debt.customers?.email || "",
            customerDocument: debt.customers?.document || "",
            originalAmount: Number(debt.amount),
            currentAmount: Number(debt.amount),
            dueDate: debt.due_date,
            daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
            description: debt.description || "",
            status: debt.status as Debt["status"],
            classification: debt.classification as Debt["classification"],
          }
        }) || []

      setDebts(formattedDebts)
      setFilteredDebts(formattedDebts)
    } catch (error) {
      console.error("Error fetching debts:", error)
      toast({
        title: "Erro ao carregar dívidas",
        description: "Não foi possível carregar as dívidas.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = debts

    if (searchTerm) {
      filtered = filtered.filter(
        (debt) =>
          debt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          debt.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          debt.customerDocument.includes(searchTerm) ||
          debt.contractNumber?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((debt) => debt.status === statusFilter)
    }

    if (classificationFilter !== "all") {
      filtered = filtered.filter((debt) => debt.classification === classificationFilter)
    }

    if (activeTab !== "all") {
      filtered = filtered.filter((debt) => debt.classification === activeTab)
    }

    setFilteredDebts(filtered)
  }, [debts, searchTerm, statusFilter, classificationFilter, activeTab])

  const getStatusBadge = (status: Debt["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">Pendente</Badge>
        )
      case "in_collection":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">Em Cobrança</Badge>
      case "paid":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Pago</Badge>
      case "written_off":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">Baixado</Badge>
      case "in_agreement":
        return (
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">Acordo</Badge>
        )
    }
  }

  const getClassificationBadge = (classification: Debt["classification"]) => {
    switch (classification) {
      case "low":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Baixo</Badge>
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">Médio</Badge>
      case "high":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">Alto</Badge>
      case "critical":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Crítico</Badge>
    }
  }

  const handleClassifyAll = async () => {
    setIsClassifying(true)
    setTimeout(() => {
      setIsClassifying(false)
    }, 3000)
  }

  const handleDeleteDebt = async (debtId: string) => {
    if (!companyId) return

    if (!confirm("Tem certeza que deseja excluir esta dívida?")) return

    try {
      const { error } = await supabase.from("debts").delete().eq("id", debtId).eq("company_id", companyId)

      if (error) throw error

      toast({
        title: "Dívida excluída",
        description: "A dívida foi excluída com sucesso.",
      })

      // Refresh debts list
      fetchDebts()
    } catch (error) {
      console.error("[v0] Error deleting debt:", error)
      toast({
        title: "Erro ao excluir dívida",
        description: "Não foi possível excluir a dívida.",
        variant: "destructive",
      })
    }
  }

  const handleEditDebt = (debtId: string) => {
    const debt = debts.find((d) => d.id === debtId)
    if (!debt) return

    toast({
      title: "Editar dívida",
      description: `Abrindo formulário de edição para ${debt.customerName}`,
    })
    // TODO: Implementar modal de edição
  }

  const handleAction = async (action: string, debtId: string) => {
    const debt = debts.find((d) => d.id === debtId)
    if (!debt) return

    if (action === "edit") {
      handleEditDebt(debtId)
      return
    }

    if (action === "delete") {
      handleDeleteDebt(debtId)
      return
    }

    if (action === "email" || action === "sms" || action === "whatsapp") {
      try {
        const result = await sendCollectionNotification({
          debtId,
          type: action as "email" | "sms" | "whatsapp",
        })

        if (result.success) {
          toast({
            title: "Cobrança enviada",
            description: result.message,
          })

          // Update local state to reflect the action
          setDebts((prev) =>
            prev.map((d) =>
              d.id === debtId
                ? {
                    ...d,
                    lastAction: `Cobrança enviada via ${action}`,
                    nextAction: "Aguardar resposta do cliente",
                  }
                : d,
            ),
          )
        } else {
          toast({
            title: "Erro ao enviar cobrança",
            description: result.message,
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("[v0] Error sending notification:", error)
        toast({
          title: "Erro",
          description: "Erro ao enviar cobrança. Tente novamente.",
          variant: "destructive",
        })
      }
      return
    }

    // Handle other actions
    switch (action) {
      case "view":
        toast({
          title: "Visualizar dívida",
          description: `Abrindo detalhes da dívida de ${debt.customerName}`,
        })
        break
      case "call":
        toast({
          title: "Ligação registrada",
          description: `Ligação para ${debt.customerName} registrada no sistema`,
        })
        setDebts((prev) =>
          prev.map((d) =>
            d.id === debtId ? { ...d, lastAction: "Ligação realizada", nextAction: "Email de follow-up" } : d,
          ),
        )
        break
    }
  }

  const handleAddDebt = (formData: FormData) => {
    const newDebt: Debt = {
      id: Date.now().toString(),
      customerName: formData.get("customerName") as string,
      customerEmail: formData.get("customerEmail") as string,
      customerDocument: formData.get("customerDocument") as string,
      originalAmount: Number.parseFloat(formData.get("originalAmount") as string),
      currentAmount: Number.parseFloat(formData.get("currentAmount") as string),
      dueDate: formData.get("dueDate") as string,
      daysOverdue: Math.floor(
        (Date.now() - new Date(formData.get("dueDate") as string).getTime()) / (1000 * 60 * 60 * 24),
      ),
      contractNumber: formData.get("contractNumber") as string,
      description: formData.get("description") as string,
      status: formData.get("status") as Debt["status"],
      classification: formData.get("classification") as Debt["classification"],
      nextAction: "Email de cobrança",
    }

    setDebts((prev) => [...prev, newDebt])
    setIsAddDebtOpen(false)
    toast({
      title: "Dívida adicionada",
      description: `Dívida de ${newDebt.customerName} foi adicionada com sucesso.`,
    })
  }

  const stats = {
    total: debts.length,
    critical: debts.filter((d) => d.classification === "critical").length,
    high: debts.filter((d) => d.classification === "high").length,
    medium: debts.filter((d) => d.classification === "medium").length,
    low: debts.filter((d) => d.classification === "low").length,
    totalAmount: debts.reduce((sum, debt) => sum + debt.currentAmount, 0),
  }

  const tabs = [
    { value: "all", label: "Todas", count: stats.total },
    { value: "critical", label: "Críticas", count: stats.critical },
    { value: "high", label: "Altas", count: stats.high },
    { value: "medium", label: "Médias", count: stats.medium },
    { value: "low", label: "Baixas", count: stats.low },
  ]

  const tableColumns = [
    {
      key: "customerName",
      label: "Cliente",
      mobileLabel: "Cliente",
      render: (value: string, debt: Debt) => (
        <div>
          <p className="font-medium text-sm">{value}</p>
          <p className="text-xs text-muted-foreground">{debt.customerEmail}</p>
        </div>
      ),
    },
    {
      key: "customerDocument",
      label: "Documento",
      mobileLabel: "CPF/CNPJ",
      render: (value: string) => <span className="font-mono text-xs">{value}</span>,
    },
    {
      key: "currentAmount",
      label: "Valor Atual",
      mobileLabel: "Valor",
      render: (value: number) => (
        <span className="font-medium text-sm">R$ {value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: "dueDate",
      label: "Vencimento",
      mobileLabel: "Vencimento",
      render: (value: string) => <span className="text-sm">{new Date(value).toLocaleDateString("pt-BR")}</span>,
      hideOnMobile: true,
    },
    {
      key: "daysOverdue",
      label: "Dias Atraso",
      mobileLabel: "Atraso",
      render: (value: number) => (
        <span
          className={`font-medium text-sm ${
            value > 90
              ? "text-red-600 dark:text-red-400"
              : value > 60
                ? "text-orange-600 dark:text-orange-400"
                : value > 30
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-green-600 dark:text-green-400"
          }`}
        >
          {value} dias
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      mobileLabel: "Status",
      render: (value: Debt["status"]) => getStatusBadge(value),
    },
    {
      key: "classification",
      label: "Classificação",
      mobileLabel: "Risco",
      render: (value: Debt["classification"]) => getClassificationBadge(value),
    },
    {
      key: "nextAction",
      label: "Próxima Ação",
      mobileLabel: "Próxima Ação",
      render: (value: string) => <span className="text-xs text-muted-foreground">{value}</span>,
      hideOnMobile: true,
    },
  ]

  const renderActions = (debt: Debt) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleAction("view", debt.id)}>
          <Eye className="mr-2 h-4 w-4" />
          Ver detalhes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction("edit", debt.id)}>
          <Edit className="mr-2 h-4 w-4" />
          Editar dívida
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction("delete", debt.id)} className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir dívida
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Enviar Cobrança Manual</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleAction("email", debt.id)}>
          <Mail className="mr-2 h-4 w-4" />
          Enviar por Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction("sms", debt.id)}>
          <Phone className="mr-2 h-4 w-4" />
          Enviar por SMS
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction("whatsapp", debt.id)}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Enviar por WhatsApp
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleAction("call", debt.id)}>
          <Phone className="mr-2 h-4 w-4" />
          Registrar ligação
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-hidden">
      {loading && (
        <div className="flex items-center justify-center">
          <p className="text-lg font-medium text-gray-900 dark:text-white">Carregando dívidas...</p>
        </div>
      )}

      {!loading && (
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Gestão de Dívidas</h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
              Visualize, classifique e gerencie todas as dívidas em aberto
            </p>
          </div>
          <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-3">
            <Dialog open={isAddDebtOpen} onOpenChange={setIsAddDebtOpen}>
              <DialogTrigger asChild>
                <Button className="w-full md:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Dívida
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Adicionar Nova Dívida</DialogTitle>
                  <DialogDescription>Preencha os dados da nova dívida para adicionar ao sistema.</DialogDescription>
                </DialogHeader>
                <form action={handleAddDebt}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Nome do Cliente</Label>
                      <Input id="customerName" name="customerName" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerEmail">Email</Label>
                      <Input id="customerEmail" name="customerEmail" type="email" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerDocument">CPF/CNPJ</Label>
                      <Input id="customerDocument" name="customerDocument" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contractNumber">Número do Contrato</Label>
                      <Input id="contractNumber" name="contractNumber" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="originalAmount">Valor Original</Label>
                      <Input id="originalAmount" name="originalAmount" type="number" step="0.01" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentAmount">Valor Atual</Label>
                      <Input id="currentAmount" name="currentAmount" type="number" step="0.01" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Data de Vencimento</Label>
                      <Input id="dueDate" name="dueDate" type="date" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" defaultValue="pending">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="in_collection">Em Cobrança</SelectItem>
                          <SelectItem value="paid">Pago</SelectItem>
                          <SelectItem value="written_off">Baixado</SelectItem>
                          <SelectItem value="in_agreement">Acordo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="classification">Classificação</Label>
                      <Select name="classification" defaultValue="low">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixo</SelectItem>
                          <SelectItem value="medium">Médio</SelectItem>
                          <SelectItem value="high">Alto</SelectItem>
                          <SelectItem value="critical">Crítico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea id="description" name="description" />
                    </div>
                  </div>
                  <DialogFooter className="flex-col space-y-2 md:flex-row md:space-y-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDebtOpen(false)}
                      className="w-full md:w-auto"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="w-full md:w-auto">
                      Adicionar Dívida
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Button
              onClick={handleClassifyAll}
              disabled={isClassifying}
              variant="outline"
              className="w-full md:w-auto bg-transparent"
            >
              {isClassifying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Classificando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reclassificar Todas
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center space-x-2">
                <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg">
                  <Clock className="h-3 w-3 md:h-4 md:w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                  <p className="text-lg md:text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center space-x-2">
                <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-lg">
                  <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Críticas</p>
                  <p className="text-lg md:text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center space-x-2">
                <div className="bg-orange-100 dark:bg-orange-900/20 p-2 rounded-lg">
                  <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Altas</p>
                  <p className="text-lg md:text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.high}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center space-x-2">
                <div className="bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded-lg">
                  <Clock className="h-3 w-3 md:h-4 md:w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Médias</p>
                  <p className="text-lg md:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.medium}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2 md:col-span-1">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center space-x-2">
                <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-lg">
                  <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Baixas</p>
                  <p className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">{stats.low}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isClassifying && (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Classificando dívidas automaticamente baseado em dias de atraso, valor e histórico do cliente...
          </AlertDescription>
        </Alert>
      )}

      {!loading && (
        <ResponsiveTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-col space-y-3 md:flex-row md:items-center md:space-y-0 md:space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar dívidas..."
                  className="pl-10 w-full md:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_collection">Em Cobrança</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="written_off">Baixado</SelectItem>
                  <SelectItem value="in_agreement">Acordo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg md:text-xl">
                {activeTab === "all"
                  ? "Todas as Dívidas"
                  : activeTab === "critical"
                    ? "Dívidas Críticas"
                    : activeTab === "high"
                      ? "Dívidas de Alto Risco"
                      : activeTab === "medium"
                        ? "Dívidas de Médio Risco"
                        : "Dívidas de Baixo Risco"}
              </CardTitle>
              <CardDescription>
                {activeTab === "all" &&
                  `Valor total em aberto: R$ ${stats.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                {activeTab === "critical" && "Dívidas com mais de 90 dias de atraso que requerem ação imediata"}
                {activeTab === "high" && "Dívidas entre 60-90 dias de atraso"}
                {activeTab === "medium" && "Dívidas entre 30-60 dias de atraso"}
                {activeTab === "low" && "Dívidas com menos de 30 dias de atraso"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 md:p-6 md:pt-0">
              <ResponsiveTable
                data={filteredDebts}
                columns={tableColumns}
                actions={renderActions}
                emptyState={
                  <div className="text-center py-8">
                    <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-gray-900 dark:text-white">Nenhuma dívida encontrada</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Não há dívidas que correspondam aos filtros selecionados
                    </p>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </ResponsiveTabs>
      )}
    </div>
  )
}
