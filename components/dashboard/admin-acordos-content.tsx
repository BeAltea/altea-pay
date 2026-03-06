"use client"

import { useState, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Handshake,
  DollarSign,
  Calendar,
  FileText,
} from "lucide-react"

interface AgreementCustomer {
  id: string
  name: string
  document: string
  totalDebt: number
  daysOverdue: number
  hasNegotiation: boolean
  isPaid: boolean
  isCancelled: boolean
  agreementId: string | null
  agreedAmount: number
  installments: number
  status: string
  paymentStatus: string | null
  asaasStatus: string | null
  createdAt: string | null
  firstDueDate: string | null
}

interface AdminAcordosContentProps {
  customers: AgreementCustomer[]
  stats: {
    totalCount: number
    totalAgreedValue: number
    completedValue: number
    averageInstallments: number
  }
}

type SortField = "name" | "debt" | "agreedAmount" | "dueDate" | "status" | "daysOverdue"
type SortDirection = "asc" | "desc"

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

export function AdminAcordosContent({ customers, stats }: AdminAcordosContentProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(25)

  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = customers

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(term) ||
        c.document?.includes(searchTerm)
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(c => {
        if (statusFilter === "active") return c.status === "active" || c.status === "draft"
        if (statusFilter === "completed") return c.isPaid || c.status === "completed"
        if (statusFilter === "pending") return !c.isPaid && (c.status === "active" || c.status === "draft")
        return true
      })
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "name":
          comparison = (a.name || "").localeCompare(b.name || "")
          break
        case "debt":
          comparison = a.totalDebt - b.totalDebt
          break
        case "agreedAmount":
          comparison = a.agreedAmount - b.agreedAmount
          break
        case "dueDate":
          const dateA = a.firstDueDate ? new Date(a.firstDueDate).getTime() : 0
          const dateB = b.firstDueDate ? new Date(b.firstDueDate).getTime() : 0
          comparison = dateA - dateB
          break
        case "status":
          comparison = a.status.localeCompare(b.status)
          break
        case "daysOverdue":
          comparison = a.daysOverdue - b.daysOverdue
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

    return sorted
  }, [customers, searchTerm, statusFilter, sortField, sortDirection])

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * perPage
    return filteredAndSortedCustomers.slice(start, start + perPage)
  }, [filteredAndSortedCustomers, currentPage, perPage])

  const totalPages = Math.ceil(filteredAndSortedCustomers.length / perPage)

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-50" />
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

  // Get status badge config
  const getStatusBadge = (customer: AgreementCustomer) => {
    if (customer.isPaid || customer.status === "completed") {
      return { label: "Pago", variant: "default" as const, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" }
    }
    if (customer.asaasStatus === "OVERDUE" || customer.paymentStatus === "overdue") {
      return { label: "Vencido", variant: "destructive" as const, className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" }
    }
    if (customer.status === "active" || customer.status === "draft") {
      return { label: "Em Aberto", variant: "secondary" as const, className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" }
    }
    if (customer.isCancelled) {
      return { label: "Cancelado", variant: "outline" as const, className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" }
    }
    return { label: "Pendente", variant: "secondary" as const, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Acordos</h1>
        <p className="text-muted-foreground">Acompanhe os acordos de negociação com seus clientes</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Handshake className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total de Acordos</p>
              <p className="text-2xl font-bold">{stats.totalCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Valor Concluído</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.completedValue)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Média de Parcelas</p>
              <p className="text-2xl font-bold">{Number(stats.averageInstallments || 0).toFixed(1)}x</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Valor Total Acordado</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalAgreedValue)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou documento..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Em Aberto</SelectItem>
            <SelectItem value="completed">Pago</SelectItem>
            <SelectItem value="pending">Aguardando</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    Cliente
                    <SortIcon field="name" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort("debt")}
                >
                  <div className="flex items-center gap-1">
                    Dívida Original
                    <SortIcon field="debt" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort("agreedAmount")}
                >
                  <div className="flex items-center gap-1">
                    Valor Acordado
                    <SortIcon field="agreedAmount" />
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Parcelas
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort("dueDate")}
                >
                  <div className="flex items-center gap-1">
                    Vencimento
                    <SortIcon field="dueDate" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort("daysOverdue")}
                >
                  <div className="flex items-center gap-1">
                    Dias Atraso
                    <SortIcon field="daysOverdue" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort("status")}
                >
                  <div className="flex items-center gap-1">
                    Status
                    <SortIcon field="status" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Handshake className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum acordo encontrado</p>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => {
                  const statusBadge = getStatusBadge(customer)

                  return (
                    <tr key={customer.id} className="hover:bg-muted/50">
                      <td className="px-4 py-4">
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">{customer.document}</div>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {formatCurrency(customer.totalDebt)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-medium text-green-600">
                          {formatCurrency(customer.agreedAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {customer.installments}x
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {customer.firstDueDate ? (
                          new Date(customer.firstDueDate).toLocaleDateString("pt-BR")
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {customer.daysOverdue > 0 ? (
                          <span className="text-red-600">{customer.daysOverdue} dias</span>
                        ) : (
                          <span className="text-green-600">Em dia</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-muted-foreground">
            Mostrando {filteredAndSortedCustomers.length > 0 ? ((currentPage - 1) * perPage) + 1 : 0} - {Math.min(currentPage * perPage, filteredAndSortedCustomers.length)} de {filteredAndSortedCustomers.length} acordos
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 / pág</SelectItem>
                <SelectItem value="50">50 / pág</SelectItem>
                <SelectItem value="100">100 / pág</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm px-2">
              {currentPage} / {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
