"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Mail, MessageSquare, Phone } from "lucide-react"
import { sendCollectionNotification } from "@/app/actions/send-notification"

export const dynamic = "force-dynamic"

interface Debt {
  id: string
  customerName: string
  customerDocument: string
  originalAmount: number
  currentAmount: number
  dueDate: string
  daysOverdue: number
  status: "pending" | "in_collection" | "paid" | "written_off" | "in_agreement"
  classification: "low" | "medium" | "high" | "critical"
  approvalStatus?: string
  riskLevel?: string
  collectionCount?: number
}

type SortField = "name" | "amount" | "days" | "status"
type SortDirection = "asc" | "desc"

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [selectedDebts, setSelectedDebts] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>("days")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { profile } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (profile?.company_id) {
      fetchDebts()
    }
  }, [profile])

  const fetchDebts = async () => {
    if (!profile?.company_id) return

    try {
      setLoading(true)
      const { data: vmaxData, error } = await supabase.from("VMAX").select("*").eq("id_company", profile.company_id)

      if (error) throw error

      const vmaxDebts = (vmaxData || []).map((record) => {
        const diasInadimplencia = record["Dias Inad."] ? Number(record["Dias Inad."]) : 0
        const valorVencido = record.Vencido
          ? Number.parseFloat(
              String(record.Vencido)
                .replace(/[^\d,.-]/g, "")
                .replace(",", "."),
            )
          : 0

        let classification: Debt["classification"] = "low"
        if (diasInadimplencia > 90) classification = "critical"
        else if (diasInadimplencia > 60) classification = "high"
        else if (diasInadimplencia > 30) classification = "medium"

        return {
          id: record.id,
          customerName: record.Cliente || "Cliente VMAX",
          customerDocument: record["CPF/CNPJ"] || "",
          originalAmount: valorVencido,
          currentAmount: valorVencido,
          dueDate: record.Vecto || new Date().toISOString(),
          daysOverdue: diasInadimplencia,
          status: "in_collection" as const,
          classification,
          approvalStatus: record.approval_status || "PENDENTE",
          riskLevel: record.risk_level || "MEDIUM",
          collectionCount: record.collection_count || 0,
        }
      })

      setDebts(vmaxDebts)
    } catch (error) {
      console.error("Erro ao carregar débitos:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as informações.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedDebts = useMemo(() => {
    let filtered = debts

    if (searchTerm) {
      filtered = filtered.filter(
        (debt) =>
          debt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          debt.customerDocument.includes(searchTerm),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((debt) => debt.status === statusFilter)
    }

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case "name":
          comparison = a.customerName.localeCompare(b.customerName)
          break
        case "amount":
          comparison = a.currentAmount - b.currentAmount
          break
        case "days":
          comparison = a.daysOverdue - b.daysOverdue
          break
        case "status":
          comparison = a.status.localeCompare(b.status)
          break
      }

      return sortDirection === "asc" ? comparison : -comparison
    })

    return sorted
  }, [debts, searchTerm, sortField, sortDirection, statusFilter])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const handleSelectDebt = (debtId: string) => {
    setSelectedDebts((prev) => (prev.includes(debtId) ? prev.filter((id) => id !== debtId) : [...prev, debtId]))
  }

  const handleSelectAll = () => {
    if (selectedDebts.length === filteredAndSortedDebts.length) {
      setSelectedDebts([])
    } else {
      setSelectedDebts(filteredAndSortedDebts.map((d) => d.id))
    }
  }

  const handleAction = async (action: "email" | "sms" | "whatsapp", debtId: string) => {
    try {
      const result = await sendCollectionNotification({
        debtId,
        type: action,
      })

      if (result.success) {
        toast({
          title: "Cobrança enviada",
          description: result.message,
        })
        fetchDebts()
      } else {
        toast({
          title: "Erro ao enviar cobrança",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao enviar cobrança. Tente novamente.",
        variant: "destructive",
      })
    }
  }

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

  const totalAmount = filteredAndSortedDebts.reduce((sum, debt) => sum + debt.currentAmount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dívidas</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie todos os status de cobrança</p>
        </div>

        {/* Total Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Todas as Dívidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Valor total em aberto</p>
                <p className="text-xl md:text-2xl font-bold">
                  R$ {totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Button variant="outline" onClick={handleSelectAll} className="w-full sm:w-auto bg-transparent">
                {selectedDebts.length === filteredAndSortedDebts.length ? "Desmarcar Todos" : "Selecionar Todos"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_collection">Em Cobrança</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="in_agreement">Acordo</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={sortField === "name" ? "default" : "outline"}
              onClick={() => toggleSort("name")}
              className="justify-between"
            >
              Nome
              <SortIcon field="name" />
            </Button>

            <Button
              variant={sortField === "amount" ? "default" : "outline"}
              onClick={() => toggleSort("amount")}
              className="justify-between"
            >
              Valor
              <SortIcon field="amount" />
            </Button>

            <Button
              variant={sortField === "days" ? "default" : "outline"}
              onClick={() => toggleSort("days")}
              className="justify-between"
            >
              Dias Atraso
              <SortIcon field="days" />
            </Button>

            <Button
              variant={sortField === "status" ? "default" : "outline"}
              onClick={() => toggleSort("status")}
              className="justify-between"
            >
              Status
              <SortIcon field="status" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filteredAndSortedDebts.map((debt) => (
          <Card key={debt.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedDebts.includes(debt.id)}
                  onCheckedChange={() => handleSelectDebt(debt.id)}
                  className="mt-1"
                />

                <div className="flex-1 min-w-0 space-y-3">
                  {/* Nome e Documento */}
                  <div>
                    <h3 className="font-semibold text-sm md:text-base truncate">{debt.customerName}</h3>
                    <p className="text-xs text-muted-foreground font-mono break-all">{debt.customerDocument}</p>
                  </div>

                  {/* Informações em Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Valor</p>
                      <p className="font-semibold">
                        R$ {debt.currentAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Atraso</p>
                      <Badge variant="destructive">{debt.daysOverdue} dias</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Status</p>
                      {getStatusBadge(debt.status)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Risco</p>
                      {getClassificationBadge(debt.classification)}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction("email", debt.id)}
                      className="flex-1 sm:flex-none"
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      Email
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction("whatsapp", debt.id)}
                      className="flex-1 sm:flex-none"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction("sms", debt.id)}
                      className="flex-1 sm:flex-none"
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      SMS
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAndSortedDebts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "all"
                ? "Nenhuma dívida encontrada com os filtros aplicados"
                : "Nenhuma dívida encontrada"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
