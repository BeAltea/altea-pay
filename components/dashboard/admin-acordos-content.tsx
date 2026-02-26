"use client"

import { useState, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  ChevronLeft,
  ChevronRight,
  Handshake,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  CalendarClock,
} from "lucide-react"

interface Acordo {
  id: string
  customerId: string
  customerName: string | null
  customerCpfCnpj: string | null
  originalAmount: number
  agreedAmount: number
  paidAmount: number
  installments: number
  paidInstallments: number
  status: string
  paymentStatus: string
  createdAt: string
  firstDueDate: string
  daysOverdue: number
}

interface AdminAcordosContentProps {
  acordos: Acordo[]
  company: { id: string; name: string } | null
}

type SortField = "cliente" | "valor" | "status" | "data" | "tempo"
type SortDirection = "asc" | "desc"

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR")
  } catch {
    return "—"
  }
}

function getDebtAgeColor(days: number): { text: string; bg: string } {
  if (days <= 0) return { text: "var(--admin-green)", bg: "var(--admin-green-bg)" }
  if (days <= 30) return { text: "var(--admin-orange)", bg: "var(--admin-orange-bg)" }
  if (days <= 90) return { text: "var(--admin-orange)", bg: "var(--admin-orange-bg)" }
  return { text: "var(--admin-red)", bg: "var(--admin-red-bg)" }
}

function formatDebtAge(days: number): string {
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

export function AdminAcordosContent({ acordos, company }: AdminAcordosContentProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>("data")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [statusFilter, setStatusFilter] = useState("all")
  const [periodoFilter, setPeriodoFilter] = useState("all")
  const [valorFilter, setValorFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(25)

  // Stats - only non-cancelled agreements are passed from server (aligns with Dashboard)
  const stats = useMemo(() => {
    // Recovered = completed or payment received via ASAAS
    const recovered = acordos
      .filter(a => a.status === "completed" || a.paymentStatus === "received" || a.paymentStatus === "confirmed")
      .reduce((sum, a) => sum + a.agreedAmount, 0)

    // Open value = active/draft agreements minus what's been paid
    const openValue = acordos
      .filter(a => a.status === "active" || a.status === "draft")
      .reduce((sum, a) => sum + (a.agreedAmount - a.paidAmount), 0)

    // Total = all non-cancelled agreements (matches Dashboard "Negociações Enviadas")
    const total = acordos.length

    // Open = active or draft status
    const open = acordos.filter(a => a.status === "active" || a.status === "draft").length

    // Completed = agreements marked as completed (paid in full)
    const completed = acordos.filter(a => a.status === "completed").length

    return { recovered, openValue, total, open, completed }
  }, [acordos])

  const filteredAndSortedAcordos = useMemo(() => {
    let filtered = acordos

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(a =>
        a.customerName?.toLowerCase().includes(term) ||
        a.customerCpfCnpj?.includes(searchTerm)
      )
    }

    // Status filter (cancelled agreements are excluded at the server level)
    if (statusFilter !== "all") {
      filtered = filtered.filter(a => {
        if (statusFilter === "open") return a.status === "active" || a.status === "draft"
        if (statusFilter === "completed") return a.status === "completed"
        if (statusFilter === "overdue") return a.status === "breached" || a.status === "defaulted"
        return true
      })
    }

    // Periodo filter
    if (periodoFilter !== "all") {
      const now = new Date()
      filtered = filtered.filter(a => {
        const created = new Date(a.createdAt)
        const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
        if (periodoFilter === "month") return diffDays <= 30
        if (periodoFilter === "3months") return diffDays <= 90
        if (periodoFilter === "6months") return diffDays <= 180
        if (periodoFilter === "year") return diffDays <= 365
        return true
      })
    }

    // Valor filter
    if (valorFilter !== "all") {
      filtered = filtered.filter(a => {
        if (valorFilter === "under1000") return a.agreedAmount <= 1000
        if (valorFilter === "1000-5000") return a.agreedAmount > 1000 && a.agreedAmount <= 5000
        if (valorFilter === "5000-20000") return a.agreedAmount > 5000 && a.agreedAmount <= 20000
        if (valorFilter === "over20000") return a.agreedAmount > 20000
        return true
      })
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "cliente":
          comparison = (a.customerName || "").localeCompare(b.customerName || "")
          break
        case "valor":
          comparison = a.agreedAmount - b.agreedAmount
          break
        case "status":
          comparison = a.status.localeCompare(b.status)
          break
        case "data":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case "tempo":
          comparison = a.daysOverdue - b.daysOverdue
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

    return sorted
  }, [acordos, searchTerm, statusFilter, periodoFilter, valorFilter, sortField, sortDirection])

  const paginatedAcordos = useMemo(() => {
    const start = (currentPage - 1) * perPage
    return filteredAndSortedAcordos.slice(start, start + perPage)
  }, [filteredAndSortedAcordos, currentPage, perPage])

  const totalPages = Math.ceil(filteredAndSortedAcordos.length / perPage)

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

  // Status config for badges (cancelled agreements are excluded at the server level)
  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: "Aberto", color: "var(--admin-blue)", bg: "var(--admin-blue-bg)" },
    active: { label: "Ativo", color: "var(--admin-blue)", bg: "var(--admin-blue-bg)" },
    completed: { label: "Concluido", color: "var(--admin-green)", bg: "var(--admin-green-bg)" },
    breached: { label: "Em atraso", color: "var(--admin-orange)", bg: "var(--admin-orange-bg)" },
    defaulted: { label: "Inadimplente", color: "var(--admin-red)", bg: "var(--admin-red-bg)" },
  }

  const companyName = company?.name || "Empresa"

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
          Acordos — {companyName}
        </h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm lg:text-base">
          Acompanhe as negociacoes e acordos com seus clientes
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" style={{ color: "var(--admin-green)" }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
              Valor Recuperado
            </span>
          </div>
          <div className="text-lg font-bold" style={{ color: "var(--admin-green)" }}>
            {formatCurrency(stats.recovered)}
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" style={{ color: "var(--admin-blue)" }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
              Em Acordos Abertos
            </span>
          </div>
          <div className="text-lg font-bold" style={{ color: "var(--admin-blue)" }}>
            {formatCurrency(stats.openValue)}
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Handshake className="w-4 h-4" style={{ color: "var(--admin-purple)" }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
              Total de Acordos
            </span>
          </div>
          <div className="text-lg font-bold" style={{ color: "var(--admin-text-primary)" }}>
            {stats.total}
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4" style={{ color: "var(--admin-orange)" }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
              Acordos Abertos
            </span>
          </div>
          <div className="text-lg font-bold" style={{ color: "var(--admin-orange)" }}>
            {stats.open}
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4" style={{ color: "var(--admin-green)" }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
              Acordos Concluidos
            </span>
          </div>
          <div className="text-lg font-bold" style={{ color: "var(--admin-green)" }}>
            {stats.completed}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-xl p-4"
        style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
      >
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: "var(--admin-bg-tertiary)", border: "1px solid var(--admin-border)" }}
            >
              <Search className="w-4 h-4" style={{ color: "var(--admin-text-muted)" }} />
              <input
                type="text"
                placeholder="Buscar por nome, CPF/CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full"
                style={{ color: "var(--admin-text-primary)" }}
              />
            </div>
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger
              className="w-[140px] border-0"
              style={{ background: "var(--admin-bg-tertiary)", color: "var(--admin-text-secondary)" }}
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Aberto/Ativo</SelectItem>
              <SelectItem value="completed">Concluido</SelectItem>
              <SelectItem value="overdue">Em atraso</SelectItem>
            </SelectContent>
          </Select>

          {/* Periodo Filter */}
          <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
            <SelectTrigger
              className="w-[140px] border-0"
              style={{ background: "var(--admin-bg-tertiary)", color: "var(--admin-text-secondary)" }}
            >
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="month">Ultimo mes</SelectItem>
              <SelectItem value="3months">Ultimos 3 meses</SelectItem>
              <SelectItem value="6months">Ultimos 6 meses</SelectItem>
              <SelectItem value="year">Ultimo ano</SelectItem>
            </SelectContent>
          </Select>

          {/* Valor Filter */}
          <Select value={valorFilter} onValueChange={setValorFilter}>
            <SelectTrigger
              className="w-[160px] border-0"
              style={{ background: "var(--admin-bg-tertiary)", color: "var(--admin-text-secondary)" }}
            >
              <SelectValue placeholder="Faixa de Valor" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="under1000">Ate R$ 1.000</SelectItem>
              <SelectItem value="1000-5000">R$ 1.000-5.000</SelectItem>
              <SelectItem value="5000-20000">R$ 5.000-20.000</SelectItem>
              <SelectItem value="over20000">Acima de R$ 20.000</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                  style={{ color: "var(--admin-text-muted)" }}
                  onClick={() => toggleSort("cliente")}
                >
                  <div className="flex items-center gap-1">
                    Cliente
                    <SortIcon field="cliente" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: "var(--admin-text-muted)" }}
                >
                  Valor Original
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                  style={{ color: "var(--admin-text-muted)" }}
                  onClick={() => toggleSort("valor")}
                >
                  <div className="flex items-center gap-1">
                    Valor Negociado
                    <SortIcon field="valor" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: "var(--admin-text-muted)" }}
                >
                  Parcelas
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                  style={{ color: "var(--admin-text-muted)" }}
                  onClick={() => toggleSort("tempo")}
                >
                  <div className="flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    Tempo Dívida
                    <SortIcon field="tempo" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                  style={{ color: "var(--admin-text-muted)" }}
                  onClick={() => toggleSort("status")}
                >
                  <div className="flex items-center gap-1">
                    Status
                    <SortIcon field="status" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                  style={{ color: "var(--admin-text-muted)" }}
                  onClick={() => toggleSort("data")}
                >
                  <div className="flex items-center gap-1">
                    Data
                    <SortIcon field="data" />
                  </div>
                </th>
                <th
                  className="text-right px-4 py-3 text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: "var(--admin-text-muted)" }}
                >
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedAcordos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center" style={{ color: "var(--admin-text-muted)" }}>
                    <Handshake className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Nenhum acordo encontrado
                  </td>
                </tr>
              ) : (
                paginatedAcordos.map((acordo) => {
                  const status = statusConfig[acordo.status] || statusConfig.draft
                  const progress = acordo.installments > 0 ? (acordo.paidInstallments / acordo.installments) * 100 : 0

                  return (
                    <tr
                      key={acordo.id}
                      className="transition-colors hover:bg-[var(--admin-bg-tertiary)]"
                      style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}
                    >
                      {/* Cliente */}
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                          {acordo.customerName || "Cliente #" + acordo.customerId?.slice(0, 8)}
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--admin-text-muted)" }}>
                          {acordo.customerCpfCnpj || "—"}
                        </div>
                      </td>

                      {/* Valor Original */}
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                          {formatCurrency(acordo.originalAmount)}
                        </span>
                      </td>

                      {/* Valor Negociado */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold" style={{ color: "var(--admin-text-primary)" }}>
                          {formatCurrency(acordo.agreedAmount)}
                        </span>
                      </td>

                      {/* Parcelas */}
                      <td className="px-4 py-3">
                        <div className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                          {acordo.paidInstallments} de {acordo.installments}
                        </div>
                        <div
                          className="w-16 h-1.5 rounded-full mt-1 overflow-hidden"
                          style={{ background: "var(--admin-border)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${progress}%`,
                              background: progress === 100 ? "var(--admin-green)" : "var(--admin-blue)"
                            }}
                          />
                        </div>
                      </td>

                      {/* Tempo da Dívida */}
                      <td className="px-4 py-3">
                        {(() => {
                          const debtAgeColors = getDebtAgeColor(acordo.daysOverdue)
                          return (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold"
                              style={{ background: debtAgeColors.bg, color: debtAgeColors.text }}
                            >
                              <CalendarClock className="w-3 h-3" />
                              {formatDebtAge(acordo.daysOverdue)}
                            </span>
                          )
                        })()}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-semibold"
                          style={{ background: status.bg, color: status.color }}
                        >
                          {status.label}
                        </span>
                      </td>

                      {/* Data */}
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                          {formatDate(acordo.createdAt)}
                        </span>
                      </td>

                      {/* Acoes */}
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/clientes/${acordo.customerId}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          style={{
                            background: "var(--admin-bg-tertiary)",
                            color: "var(--admin-text-secondary)",
                            border: "1px solid var(--admin-border)"
                          }}
                        >
                          <Eye className="w-3 h-3" />
                          Ver Detalhes
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderTop: "1px solid var(--admin-bg-tertiary)" }}
        >
          <div className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
            Mostrando {filteredAndSortedAcordos.length > 0 ? ((currentPage - 1) * perPage) + 1 : 0} - {Math.min(currentPage * perPage, filteredAndSortedAcordos.length)} de {filteredAndSortedAcordos.length} acordos
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger
                className="w-[100px] h-8 text-xs border-0"
                style={{ background: "var(--admin-bg-tertiary)", color: "var(--admin-text-secondary)" }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}>
                <SelectItem value="25">25 / pag</SelectItem>
                <SelectItem value="50">50 / pag</SelectItem>
                <SelectItem value="100">100 / pag</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
              style={{ background: "var(--admin-bg-tertiary)", color: "var(--admin-text-secondary)" }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm px-2" style={{ color: "var(--admin-text-secondary)" }}>
              {currentPage} / {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
              style={{ background: "var(--admin-bg-tertiary)", color: "var(--admin-text-secondary)" }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
