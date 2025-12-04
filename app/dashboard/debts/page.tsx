"use client"

import type React from "react"

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
  User,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { sendCollectionNotification } from "@/app/actions/send-notification"
import { createDebt } from "@/app/actions/create-debt"
import { updateDebt } from "@/app/actions/update-debt"
import { analyzeCustomerCredit } from "@/app/actions/analyze-customer-credit" // Import analysis action
import { writeOffDebt } from "@/app/actions/write-off-debt" // Import write-off action

export const dynamic = "force-dynamic"

interface Debt {
  id: string
  customerName: string
  customerEmail: string
  customerDocument: string
  customerId: string
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
  // New fields for VMAX integration
  approvalStatus?: string
  riskLevel?: string
  autoCollectionEnabled?: boolean
  collectionCount?: number
  lastAnalysisDate?: string
  lastCollectionAttempt?: string // Added field for tracking last collection attempt
  amount: number // Added for write-off dialog
}

interface Customer {
  id: string
  name: string
  email: string
  document: string
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredDebts, setFilteredDebts] = useState<Debt[]>([])
  const [selectedDebts, setSelectedDebts] = useState<string[]>([])
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false)
  const [bulkActionType, setBulkActionType] = useState<"email" | "sms" | "whatsapp" | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [classificationFilter, setClassificationFilter] = useState<string>("all")
  const [isClassifying, setIsClassifying] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false)
  const [isEditDebtOpen, setIsEditDebtOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isWriteOffOpen, setIsWriteOffOpen] = useState(false)
  const [writeOffData, setWriteOffData] = useState({
    payment_method: "",
    payment_channel: "",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // State for adding new debt
  const [newDebt, setNewDebt] = useState({
    customerId: "",
    amount: "",
    dueDate: "",
    description: "",
    status: "pending" as Debt["status"],
    classification: "low" as Debt["classification"],
  })

  // State for editing existing debt
  const [editDebt, setEditDebt] = useState({
    customerId: "",
    amount: "",
    dueDate: "",
    description: "",
    status: "pending" as Debt["status"],
    classification: "low" as Debt["classification"],
  })

  const { profile, loading: authLoading } = useAuth()
  const supabase = createClient()

  const [collectionStats, setCollectionStats] = useState({
    automaticallyCollected: 0,
    pendingCollection: 0,
    manualCollectionOnly: 0,
  })

  useEffect(() => {
    if (!authLoading && profile) {
      fetchData()
    }
  }, [authLoading, profile])

  const fetchData = async () => {
    if (!profile?.company_id) {
      console.log("[v0] Debts - No company_id, skipping data fetch")
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Fetch customers
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("id, name, email, document")
        .eq("company_id", profile.company_id)
        .order("name")

      if (!customerError && customerData) {
        console.log("[v0] Customers loaded:", customerData.length)
        setCustomers(customerData)
      } else {
        console.error("[v0] Error loading customers:", customerError)
      }

      const { data: vmaxData, error: vmaxError } = await supabase
        .from("VMAX")
        .select("*")
        .eq("id_company", profile.company_id)

      if (vmaxError) {
        console.error("[v0] Error fetching VMAX:", vmaxError)
        throw vmaxError
      }

      console.log("[v0] Fetched VMAX data:", vmaxData?.length || 0)

      if (vmaxData && vmaxData.length > 0) {
        // Calcular estatísticas de cobrança
        const stats = {
          automaticallyCollected: vmaxData.filter((d) => d.auto_collection_enabled && d.collection_count > 0).length,
          pendingCollection: vmaxData.filter(
            (d) => d.approval_status === "ACEITA" && d.auto_collection_enabled && d.collection_count === 0,
          ).length,
          manualCollectionOnly: vmaxData.filter(
            (d) =>
              (d.approval_status === "ACEITA_ESPECIAL" ||
                d.approval_status === "REJEITA" ||
                !d.auto_collection_enabled) &&
              d.collection_count === 0,
          ).length,
        }
        setCollectionStats(stats)

        console.log("[v0] Collection stats:", stats)

        // Converter VMAX para formato Debt
        const vmaxDebts = vmaxData.map((record) => {
          const dueDate = record.Primeira_Vencida ? new Date(record.Primeira_Vencida) : new Date()
          const diasInadimplencia = record.Dias_Inad ? Number(record.Dias_Inad) : 0
          const valorVencido = record.Vencido
            ? Number.parseFloat(
                String(record.Vencido)
                  .replace(/[^\d,.-]/g, "")
                  .replace(",", "."),
              )
            : 0

          // Determinar classificação baseada em dias de inadimplência
          let classification: Debt["classification"] = "low"
          if (diasInadimplencia > 90) classification = "critical"
          else if (diasInadimplencia > 60) classification = "high"
          else if (diasInadimplencia > 30) classification = "medium"

          return {
            id: record.id,
            customerId: record.id, // Assuming VMAX ID can be used as customerId for simplicity
            customerName: record.Cliente || "Cliente VMAX",
            customerEmail: "", // Placeholder, as VMAX data might not have email
            customerDocument: record["CPF/CNPJ"] || "",
            originalAmount: valorVencido,
            currentAmount: valorVencido,
            dueDate: record.Primeira_Vencida || new Date().toISOString(),
            daysOverdue: diasInadimplencia,
            contractNumber: record.Contrato || "", // Assuming 'Contrato' maps to contractNumber
            description: `Empresa: ${record.Empresa || "N/A"} - Cidade: ${record.Cidade || "N/A"} - Dias Inad: ${diasInadimplencia}`,
            status: "in_collection" as const, // Default status for imported debts
            classification,
            lastAction: "Importado da base VMAX",
            nextAction: "Enviar notificação de cobrança",
            // New fields for VMAX integration
            approvalStatus: record.approval_status || "PENDENTE",
            riskLevel: record.risk_level || "MEDIUM",
            autoCollectionEnabled: record.auto_collection_enabled || false,
            collectionCount: record.collection_count || 0,
            lastAnalysisDate: record.last_analysis_date,
            amount: valorVencido, // Added for write-off dialog
          }
        })

        setDebts(vmaxDebts)
        setFilteredDebts(vmaxDebts) // Initialize filtered debts with all debts
      } else {
        // If no VMAX data, fetch from 'debts' table if it exists and is relevant
        // For now, we assume VMAX is the primary source for debts
        setDebts([])
        setFilteredDebts([])
      }
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as informações.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Removed the separate fetchDebts and fetchCustomers useEffects as they are now in fetchData

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
    // In a real scenario, this would trigger an action to re-classify debts based on new rules.
    // For now, it's a placeholder with a timeout.
    setTimeout(() => {
      setIsClassifying(false)
      toast({
        title: "Reclassificação concluída",
        description: "Dívidas foram reclassificadas.",
      })
    }, 3000)
  }

  const handleDeleteDebt = async (debtId: string) => {
    if (!profile?.company_id) return

    if (!confirm("Tem certeza que deseja excluir esta dívida?")) return

    try {
      console.log("[v0] Deleting debt:", debtId)

      // Assuming debts are stored in a 'debts' table, separate from VMAX data
      // If VMAX data represents debts, deletion logic might differ
      const { error } = await supabase.from("debts").delete().eq("id", debtId).eq("company_id", profile.company_id)

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Dívida excluída com sucesso",
      })

      await fetchData() // Refetch data after deletion
    } catch (error) {
      console.error("[v0] Error deleting debt:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir a dívida",
        variant: "destructive",
      })
    }
  }

  const handleEditDebt = (debtId: string) => {
    const debt = debts.find((d) => d.id === debtId)
    if (!debt) return

    setSelectedDebt(debt)
    setEditDebt({
      customerId: debt.customerId,
      amount: debt.currentAmount.toString(),
      dueDate: debt.dueDate,
      description: debt.description || "",
      status: debt.status,
      classification: debt.classification,
    })
    setIsEditDebtOpen(true)
  }

  const handleUpdateDebt = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profile?.company_id || !selectedDebt) {
      toast({
        title: "Erro",
        description: "Empresa ou dívida não identificada",
        variant: "destructive",
      })
      return
    }

    if (!editDebt.customerId || !editDebt.amount || !editDebt.dueDate) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      })
      return
    }

    console.log("[v0] Updating debt:", selectedDebt.id, editDebt)

    const result = await updateDebt({
      debtId: selectedDebt.id,
      customerId: editDebt.customerId,
      amount: Number.parseFloat(editDebt.amount),
      dueDate: editDebt.dueDate,
      description: editDebt.description,
      status: editDebt.status,
      classification: editDebt.classification,
      companyId: profile.company_id,
    })

    if (result.success) {
      toast({
        title: "Sucesso",
        description: result.message,
      })
      setIsEditDebtOpen(false)
      setSelectedDebt(null)
      await fetchData() // Refetch data after update
    } else {
      toast({
        title: "Erro",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  const handleSelectDebt = (debtId: string) => {
    setSelectedDebts((prev) => (prev.includes(debtId) ? prev.filter((id) => id !== debtId) : [...prev, debtId]))
  }

  const handleSelectAll = () => {
    if (selectedDebts.length === filteredDebts.length) {
      setSelectedDebts([])
    } else {
      setSelectedDebts(filteredDebts.map((d) => d.id))
    }
  }

  const handleBulkAction = async (actionType: "email" | "sms" | "whatsapp") => {
    if (selectedDebts.length === 0) {
      toast({
        title: "Nenhuma dívida selecionada",
        description: "Selecione pelo menos uma dívida para enviar em massa",
        variant: "destructive",
      })
      return
    }

    setBulkActionType(actionType)
    setIsBulkActionsOpen(true)
  }

  const confirmBulkAction = async () => {
    if (!bulkActionType) return

    let successCount = 0
    let errorCount = 0

    for (const debtId of selectedDebts) {
      try {
        const result = await sendCollectionNotification({
          debtId,
          type: bulkActionType,
        })

        if (result.success) {
          successCount++
        } else {
          errorCount++
        }
      } catch (error) {
        errorCount++
      }
    }

    toast({
      title: "Envio em massa concluído",
      description: `${successCount} enviadas com sucesso, ${errorCount} falharam`,
    })

    setSelectedDebts([])
    setIsBulkActionsOpen(false)
    setBulkActionType(null)
    fetchData() // Refetch data after bulk action
  }

  const handleWriteOff = async () => {
    if (!selectedDebt) return

    try {
      const result = await writeOffDebt({
        debtId: selectedDebt.id,
        paymentMethod: writeOffData.payment_method,
        paymentChannel: writeOffData.payment_channel,
        paymentDate: writeOffData.payment_date,
        notes: writeOffData.notes,
      })

      if (result.success) {
        toast({
          title: "Dívida baixada com sucesso",
          description: `Dívida de ${selectedDebt.customerName} foi baixada`,
        })
        setIsWriteOffOpen(false)
        setWriteOffData({
          payment_method: "",
          payment_channel: "",
          payment_date: new Date().toISOString().split("T")[0],
          notes: "",
        })
        fetchData() // Refetch data after write-off
      } else {
        toast({
          title: "Erro ao baixar dívida",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao baixar a dívida",
        variant: "destructive",
      })
    }
  }

  const handleAction = async (action: string, debt: Debt) => {
    if (!debt) return

    if (action === "view") {
      setSelectedDebt(debt)
      setIsDetailsOpen(true)
      return
    }

    if (action === "edit") {
      handleEditDebt(debt.id)
      return
    }

    if (action === "delete") {
      handleDeleteDebt(debt.id)
      return
    }

    if (action === "email" || action === "sms" || action === "whatsapp") {
      try {
        const result = await sendCollectionNotification({
          debtId: debt.id, // Corrected: debtId was undeclared, use debt.id
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
              d.id === debt.id
                ? {
                    ...d,
                    lastAction: `Cobrança enviada via ${action}`,
                    nextAction: "Aguardar resposta do cliente",
                    collectionCount: (d.collectionCount || 0) + 1, // Increment collection count
                    lastCollectionAttempt: new Date().toISOString(), // Set last collection attempt timestamp
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
      case "call":
        toast({
          title: "Ligação registrada",
          description: `Ligação para ${debt.customerName} registrada no sistema`,
        })
        setDebts((prev) =>
          prev.map((d) =>
            d.id === debt.id ? { ...d, lastAction: "Ligação realizada", nextAction: "Email de follow-up" } : d,
          ),
        )
        break
      case "analyze_credit":
        handleAnalyzeCredit(debt)
        break
    }
  }

  const handleAnalyzeCredit = async (debt: Debt) => {
    if (!debt.customerDocument || !profile?.company_id) {
      toast({
        title: "Erro",
        description: "Documento do cliente não encontrado ou empresa não definida",
        variant: "destructive",
      })
      return
    }

    try {
      toast({
        title: "Analisando crédito...",
        description: "Aguarde enquanto realizamos a análise de crédito",
      })

      const result = await analyzeCustomerCredit(debt.id, debt.customerDocument, debt.currentAmount)

      if (result.success && result.resultado) {
        toast({
          title: "Análise concluída",
          description: `Decisão: ${result.resultado.decisao} - ${result.resultado.motivo}`,
        })

        // Atualizar o estado local com os novos dados
        setDebts((prev) =>
          prev.map((d) =>
            d.id === debt.id
              ? {
                  ...d,
                  approvalStatus: result.resultado?.decisao,
                  riskLevel: result.resultado?.riskLevel,
                  autoCollectionEnabled: result.resultado?.autoCollectionEnabled,
                  lastAnalysisDate: new Date().toISOString(),
                }
              : d,
          ),
        )

        // Refetch data para garantir sincronização
        await fetchData()
      } else {
        toast({
          title: "Erro na análise",
          description: result.error || "Não foi possível analisar o crédito",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error analyzing credit:", error)
      toast({
        title: "Erro",
        description: "Erro ao analisar crédito. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profile?.company_id) {
      toast({
        title: "Erro",
        description: "Empresa não identificada",
        variant: "destructive",
      })
      return
    }

    if (!newDebt.customerId || !newDebt.amount || !newDebt.dueDate) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      })
      return
    }

    console.log("[v0] Creating debt:", newDebt)

    const result = await createDebt({
      customerId: newDebt.customerId,
      amount: Number.parseFloat(newDebt.amount),
      dueDate: newDebt.dueDate,
      description: newDebt.description,
      status: newDebt.status,
      classification: newDebt.classification,
      companyId: profile.company_id,
    })

    if (result.success) {
      toast({
        title: "Sucesso",
        description: result.message,
      })
      setIsAddDebtOpen(false)
      setNewDebt({
        customerId: "",
        amount: "",
        dueDate: "",
        description: "",
        status: "pending",
        classification: "low",
      })
      await fetchData() // Refetch data after adding
    } else {
      toast({
        title: "Erro",
        description: result.message,
        variant: "destructive",
      })
    }
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
    // Added checkbox for bulk selection
    {
      key: "select",
      label: (
        <input
          type="checkbox"
          checked={selectedDebts.length === filteredDebts.length && filteredDebts.length > 0}
          onChange={handleSelectAll}
          className="w-4 h-4"
        />
      ),
      render: (_: any, debt: Debt) => (
        <input
          type="checkbox"
          checked={selectedDebts.includes(debt.id)}
          onChange={() => handleSelectDebt(debt.id)}
          className="w-4 h-4"
        />
      ),
      width: 50,
    },
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

  const renderActions = (debt: Debt) => {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation()
              console.log("[v0] Dialog trigger clicked for debt:", debt.id)
            }}
          >
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ações da Dívida</DialogTitle>
            <DialogDescription>Escolha uma ação para esta dívida</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="justify-start bg-transparent"
              onClick={(e) => {
                e.stopPropagation()
                console.log("[v0] View details clicked")
                handleAction("view", debt)
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver detalhes
            </Button>

            <Button
              variant="outline"
              className="justify-start bg-transparent"
              onClick={(e) => {
                e.stopPropagation()
                console.log("[v0] Edit clicked")
                handleAction("edit", debt)
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar dívida
            </Button>

            <Button
              variant="outline"
              className="justify-start bg-transparent"
              onClick={(e) => {
                e.stopPropagation()
                console.log("[v0] Analyze Credit clicked")
                handleAction("analyze_credit", debt)
              }}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Analisar Crédito
            </Button>

            <Button
              variant="outline"
              className="justify-start bg-transparent text-green-600"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedDebt(debt)
                setIsWriteOffOpen(true)
              }}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Baixar Dívida
            </Button>

            <div className="border-t my-2" />
            <p className="text-xs font-semibold text-muted-foreground px-2">Enviar Cobrança Manual</p>

            <Button
              variant="outline"
              className="justify-start bg-transparent"
              onClick={(e) => {
                e.stopPropagation()
                console.log("[v0] Email clicked")
                handleAction("email", debt)
              }}
            >
              <Mail className="mr-2 h-4 w-4" />
              Enviar por Email
            </Button>

            <Button
              variant="outline"
              className="justify-start bg-transparent"
              onClick={(e) => {
                e.stopPropagation()
                console.log("[v0] SMS clicked")
                handleAction("sms", debt)
              }}
            >
              <Phone className="mr-2 h-4 w-4" />
              Enviar por SMS
            </Button>

            <Button
              variant="outline"
              className="justify-start bg-transparent"
              onClick={(e) => {
                e.stopPropagation()
                console.log("[v0] WhatsApp clicked")
                handleAction("whatsapp", debt)
              }}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Enviar por WhatsApp
            </Button>

            <div className="border-t my-2" />

            <Button
              variant="outline"
              className="justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 bg-transparent"
              onClick={(e) => {
                e.stopPropagation()
                console.log("[v0] Delete clicked")
                handleAction("delete", debt)
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir dívida
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

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
                <form onSubmit={handleAddDebt}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label htmlFor="customerId">Cliente *</Label>
                      <Select
                        value={newDebt.customerId}
                        onValueChange={(value) => setNewDebt({ ...newDebt, customerId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name} - {customer.document}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">Valor *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={newDebt.amount}
                        onChange={(e) => setNewDebt({ ...newDebt, amount: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Data de Vencimento *</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={newDebt.dueDate}
                        onChange={(e) => setNewDebt({ ...newDebt, dueDate: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={newDebt.status}
                        onValueChange={(value: any) => setNewDebt({ ...newDebt, status: value })}
                      >
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
                      <Select
                        value={newDebt.classification}
                        onValueChange={(value: any) => setNewDebt({ ...newDebt, classification: value })}
                      >
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
                      <Textarea
                        id="description"
                        value={newDebt.description}
                        onChange={(e) => setNewDebt({ ...newDebt, description: e.target.value })}
                      />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Cobrados Automaticamente</p>
                  <p className="text-2xl font-bold text-green-600">{collectionStats.automaticallyCollected}</p>
                  <p className="text-xs text-muted-foreground">Pela régua de cobrança</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded-lg">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Aguardando Cobrança</p>
                  <p className="text-2xl font-bold text-yellow-600">{collectionStats.pendingCollection}</p>
                  <p className="text-xs text-muted-foreground">Entrarão na régua automática</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Cobrança Manual</p>
                  <p className="text-2xl font-bold text-blue-600">{collectionStats.manualCollectionOnly}</p>
                  <p className="text-xs text-muted-foreground">Fora da régua automática</p>
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
            {selectedDebts.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {selectedDebts.length} selecionada(s)
                </Badge>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction("email")}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email em Massa
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction("sms")}>
                  <Phone className="h-4 w-4 mr-2" />
                  SMS em Massa
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction("whatsapp")}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  WhatsApp em Massa
                </Button>
              </div>
            )}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
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
                </div>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedDebts.length === filteredDebts.length ? "Desmarcar Todos" : "Selecionar Todos"}
                </Button>
              </div>
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

      <Dialog open={isBulkActionsOpen} onOpenChange={setIsBulkActionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Envio em Massa</DialogTitle>
            <DialogDescription>
              Você está prestes a enviar {selectedDebts.length} cobrança(s) via{" "}
              {bulkActionType === "email" ? "Email" : bulkActionType === "sms" ? "SMS" : "WhatsApp"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Esta ação enviará cobranças para todos os clientes selecionados. Deseja continuar?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsBulkActionsOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmBulkAction}>Confirmar Envio</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isWriteOffOpen} onOpenChange={setIsWriteOffOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Baixar Dívida</DialogTitle>
            <DialogDescription>
              Registre os detalhes do pagamento para baixar a dívida de {selectedDebt?.customerName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment_method">Método de Pagamento *</Label>
              <Select
                value={writeOffData.payment_method}
                onValueChange={(value) => setWriteOffData({ ...writeOffData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                  <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="bank_slip">Boleto Bancário</SelectItem>
                  <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_channel">Canal de Pagamento *</Label>
              <Select
                value={writeOffData.payment_channel}
                onValueChange={(value) => setWriteOffData({ ...writeOffData, payment_channel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asaas">ASAAS</SelectItem>
                  <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
                  <SelectItem value="pagseguro">PagSeguro</SelectItem>
                  <SelectItem value="bank">Banco</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_date">Data do Pagamento *</Label>
              <Input
                id="payment_date"
                type="date"
                value={writeOffData.payment_date}
                onChange={(e) => setWriteOffData({ ...writeOffData, payment_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Input
                id="notes"
                placeholder="Informações adicionais sobre o pagamento..."
                value={writeOffData.notes}
                onChange={(e) => setWriteOffData({ ...writeOffData, notes: e.target.value })}
              />
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Resumo</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Cliente: {selectedDebt?.customerName}</p>
                <p>Valor: R$ {selectedDebt?.currentAmount.toFixed(2)}</p>
                <p>Vencimento: {selectedDebt?.dueDate}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsWriteOffOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleWriteOff} disabled={!writeOffData.payment_method || !writeOffData.payment_channel}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Baixa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Debt Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Dívida</DialogTitle>
            <DialogDescription>Informações completas sobre a dívida selecionada</DialogDescription>
          </DialogHeader>
          {selectedDebt && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="font-semibold mb-3 text-lg">Informações do Cliente</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{selectedDebt.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Documento</p>
                    <p className="font-medium font-mono">{selectedDebt.customerDocument}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedDebt.customerEmail}</p>
                  </div>
                </div>
              </div>

              {/* Debt Info */}
              <div>
                <h3 className="font-semibold mb-3 text-lg">Informações da Dívida</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Original</p>
                    <p className="font-medium text-lg">
                      R$ {selectedDebt.originalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Atual</p>
                    <p className="font-medium text-lg text-red-600">
                      R$ {selectedDebt.currentAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Vencimento</p>
                    <p className="font-medium">{new Date(selectedDebt.dueDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dias em Atraso</p>
                    <p className="font-medium text-red-600">{selectedDebt.daysOverdue} dias</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedDebt.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Classificação</p>
                    <div className="mt-1">{getClassificationBadge(selectedDebt.classification)}</div>
                  </div>
                  {selectedDebt.description && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Descrição</p>
                      <p className="font-medium">{selectedDebt.description}</p>
                    </div>
                  )}
                  {selectedDebt.approvalStatus && (
                    <div>
                      <p className="text-sm text-muted-foreground">Status Aprovação</p>
                      <p className="font-medium">{selectedDebt.approvalStatus}</p>
                    </div>
                  )}
                  {selectedDebt.riskLevel && (
                    <div>
                      <p className="text-sm text-muted-foreground">Nível de Risco</p>
                      <p className="font-medium">{selectedDebt.riskLevel}</p>
                    </div>
                  )}
                  {selectedDebt.autoCollectionEnabled !== undefined && (
                    <div>
                      <p className="text-sm text-muted-foreground">Cobrança Automática</p>
                      <p className="font-medium">{selectedDebt.autoCollectionEnabled ? "Ativado" : "Desativado"}</p>
                    </div>
                  )}
                  {selectedDebt.collectionCount !== undefined && (
                    <div>
                      <p className="text-sm text-muted-foreground">Contador de Cobrança</p>
                      <p className="font-medium">{selectedDebt.collectionCount}</p>
                    </div>
                  )}
                  {selectedDebt.lastAnalysisDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Data Última Análise</p>
                      <p className="font-medium">
                        {new Date(selectedDebt.lastAnalysisDate).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  )}
                  {selectedDebt.lastCollectionAttempt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Última Tentativa de Cobrança</p>
                      <p className="font-medium">
                        {new Date(selectedDebt.lastCollectionAttempt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions History */}
              {(selectedDebt.lastAction || selectedDebt.nextAction) && (
                <div>
                  <h3 className="font-semibold mb-3 text-lg">Histórico de Ações</h3>
                  <div className="space-y-2">
                    {selectedDebt.lastAction && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Última Ação</p>
                        <p className="font-medium">{selectedDebt.lastAction}</p>
                      </div>
                    )}
                    {selectedDebt.nextAction && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-muted-foreground">Próxima Ação</p>
                        <p className="font-medium">{selectedDebt.nextAction}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={() => {
                setIsDetailsOpen(false)
                if (selectedDebt) handleEditDebt(selectedDebt.id)
              }}
            >
              Editar Dívida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Debt Dialog */}
      <Dialog open={isEditDebtOpen} onOpenChange={setIsEditDebtOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Dívida</DialogTitle>
            <DialogDescription>Atualize os dados da dívida selecionada.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateDebt}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label htmlFor="edit-customerId">Cliente *</Label>
                <Select
                  value={editDebt.customerId}
                  onValueChange={(value) => setEditDebt({ ...editDebt, customerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.document}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-amount">Valor *</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  value={editDebt.amount}
                  onChange={(e) => setEditDebt({ ...editDebt, amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-dueDate">Data de Vencimento *</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={editDebt.dueDate}
                  onChange={(e) => setEditDebt({ ...editDebt, dueDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editDebt.status}
                  onValueChange={(value: any) => setEditDebt({ ...editDebt, status: value })}
                >
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
                <Label htmlFor="edit-classification">Classificação</Label>
                <Select
                  value={editDebt.classification}
                  onValueChange={(value: any) => setEditDebt({ ...editDebt, classification: value })}
                >
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
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea
                  id="edit-description"
                  value={editDebt.description}
                  onChange={(e) => setEditDebt({ ...editDebt, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="flex-col space-y-2 md:flex-row md:space-y-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDebtOpen(false)
                  setSelectedDebt(null)
                }}
                className="w-full md:w-auto"
              >
                Cancelar
              </Button>
              <Button type="submit" className="w-full md:w-auto">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
