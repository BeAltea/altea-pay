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
  CreditCard,
  Calendar,
  Clock,
  DollarSign,
} from "lucide-react"

interface Divida {
  id: string
  cliente: string
  cpfCnpj: string
  valor: number
  dataVencimento: Date | null
  diasAtraso: number
  status: string
  cidade: string
  uf: string
}

interface AdminDividasContentProps {
  dividas: Divida[]
  company: { id: string; name: string } | null
}

type SortField = "cliente" | "valor" | "diasAtraso" | "dataVencimento"
type SortDirection = "asc" | "desc"

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

function formatDate(date: Date | null): string {
  if (!date) return "—"
  return date.toLocaleDateString("pt-BR")
}

function getDaysColor(days: number): string {
  if (days <= 30) return "var(--admin-green)"
  if (days <= 90) return "var(--admin-orange)"
  return "var(--admin-red)"
}

export function AdminDividasContent({ dividas, company }: AdminDividasContentProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>("diasAtraso")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [valorFilter, setValorFilter] = useState("all")
  const [diasFilter, setDiasFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(50)

  // Stats
  const stats = useMemo(() => {
    const total = dividas.reduce((sum, d) => sum + d.valor, 0)
    const count = dividas.length
    const maxDebt = dividas.length > 0 ? Math.max(...dividas.map(d => d.valor)) : 0
    const avgDays = dividas.length > 0
      ? Math.round(dividas.reduce((sum, d) => sum + d.diasAtraso, 0) / dividas.length)
      : 0

    return { total, count, maxDebt, avgDays }
  }, [dividas])

  const filteredAndSortedDividas = useMemo(() => {
    let filtered = dividas

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(d =>
        d.cliente?.toLowerCase().includes(term) ||
        d.cpfCnpj?.includes(searchTerm)
      )
    }

    // Valor filter
    if (valorFilter !== "all") {
      filtered = filtered.filter(d => {
        if (valorFilter === "under500") return d.valor <= 500
        if (valorFilter === "500-2000") return d.valor > 500 && d.valor <= 2000
        if (valorFilter === "2000-10000") return d.valor > 2000 && d.valor <= 10000
        if (valorFilter === "over10000") return d.valor > 10000
        return true
      })
    }

    // Dias em atraso filter
    if (diasFilter !== "all") {
      filtered = filtered.filter(d => {
        if (diasFilter === "0-30") return d.diasAtraso <= 30
        if (diasFilter === "31-60") return d.diasAtraso > 30 && d.diasAtraso <= 60
        if (diasFilter === "61-90") return d.diasAtraso > 60 && d.diasAtraso <= 90
        if (diasFilter === "91-180") return d.diasAtraso > 90 && d.diasAtraso <= 180
        if (diasFilter === "180+") return d.diasAtraso > 180
        return true
      })
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(d => d.status === statusFilter)
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "cliente":
          comparison = (a.cliente || "").localeCompare(b.cliente || "")
          break
        case "valor":
          comparison = a.valor - b.valor
          break
        case "diasAtraso":
          comparison = a.diasAtraso - b.diasAtraso
          break
        case "dataVencimento":
          const dateA = a.dataVencimento?.getTime() || 0
          const dateB = b.dataVencimento?.getTime() || 0
          comparison = dateA - dateB
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

    return sorted
  }, [dividas, searchTerm, valorFilter, diasFilter, statusFilter, sortField, sortDirection])

  const paginatedDividas = useMemo(() => {
    const start = (currentPage - 1) * perPage
    return filteredAndSortedDividas.slice(start, start + perPage)
  }, [filteredAndSortedDividas, currentPage, perPage])

  const totalPages = Math.ceil(filteredAndSortedDividas.length / perPage)

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

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    em_aberto: { label: "Em aberto", color: "var(--admin-red)", bg: "var(--admin-red-bg)" },
    em_negociacao: { label: "Em negociacao", color: "var(--admin-orange)", bg: "var(--admin-orange-bg)" },
    acordo_firmado: { label: "Acordo firmado", color: "var(--admin-green)", bg: "var(--admin-green-bg)" },
    quitada: { label: "Quitada", color: "var(--admin-green)", bg: "var(--admin-green-bg)" },
  }

  const companyName = company?.name || "Empresa"

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1
          className="text-[26px] font-bold mb-1"
          style={{ fontFamily: "'Playfair Display', serif", color: "var(--admin-text-primary)" }}
        >
          Dividas — {companyName}
        </h1>
        <p style={{ color: "var(--admin-text-secondary)", fontSize: "14px" }}>
          Gerencie as dividas dos clientes da sua empresa
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" style={{ color: "var(--admin-red)" }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
              Divida Total
            </span>
          </div>
          <div className="text-xl font-bold" style={{ color: "var(--admin-text-primary)" }}>
            {formatCurrency(stats.total)}
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4" style={{ color: "var(--admin-blue)" }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
              Quantidade
            </span>
          </div>
          <div className="text-xl font-bold" style={{ color: "var(--admin-text-primary)" }}>
            {stats.count.toLocaleString("pt-BR")}
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" style={{ color: "var(--admin-orange)" }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
              Maior Divida
            </span>
          </div>
          <div className="text-xl font-bold" style={{ color: "var(--admin-text-primary)" }}>
            {formatCurrency(stats.maxDebt)}
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4" style={{ color: "var(--admin-purple)" }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
              Atraso Medio
            </span>
          </div>
          <div className="text-xl font-bold" style={{ color: "var(--admin-text-primary)" }}>
            {stats.avgDays} dias
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

          {/* Valor Filter */}
          <Select value={valorFilter} onValueChange={setValorFilter}>
            <SelectTrigger
              className="w-[160px] border-0"
              style={{ background: "var(--admin-bg-tertiary)", color: "var(--admin-text-secondary)" }}
            >
              <SelectValue placeholder="Faixa de Valor" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="under500">Ate R$ 500</SelectItem>
              <SelectItem value="500-2000">R$ 500-2.000</SelectItem>
              <SelectItem value="2000-10000">R$ 2.000-10.000</SelectItem>
              <SelectItem value="over10000">Acima de R$ 10.000</SelectItem>
            </SelectContent>
          </Select>

          {/* Dias em Atraso Filter */}
          <Select value={diasFilter} onValueChange={setDiasFilter}>
            <SelectTrigger
              className="w-[140px] border-0"
              style={{ background: "var(--admin-bg-tertiary)", color: "var(--admin-text-secondary)" }}
            >
              <SelectValue placeholder="Dias Atraso" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="0-30">0-30 dias</SelectItem>
              <SelectItem value="31-60">31-60 dias</SelectItem>
              <SelectItem value="61-90">61-90 dias</SelectItem>
              <SelectItem value="91-180">91-180 dias</SelectItem>
              <SelectItem value="180+">180+ dias</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger
              className="w-[150px] border-0"
              style={{ background: "var(--admin-bg-tertiary)", color: "var(--admin-text-secondary)" }}
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="em_aberto">Em aberto</SelectItem>
              <SelectItem value="em_negociacao">Em negociacao</SelectItem>
              <SelectItem value="acordo_firmado">Acordo firmado</SelectItem>
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
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                  style={{ color: "var(--admin-text-muted)" }}
                  onClick={() => toggleSort("valor")}
                >
                  <div className="flex items-center gap-1">
                    Valor da Divida
                    <SortIcon field="valor" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                  style={{ color: "var(--admin-text-muted)" }}
                  onClick={() => toggleSort("dataVencimento")}
                >
                  <div className="flex items-center gap-1">
                    Vencimento
                    <SortIcon field="dataVencimento" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                  style={{ color: "var(--admin-text-muted)" }}
                  onClick={() => toggleSort("diasAtraso")}
                >
                  <div className="flex items-center gap-1">
                    Dias em Atraso
                    <SortIcon field="diasAtraso" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: "var(--admin-text-muted)" }}
                >
                  Status
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
              {paginatedDividas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center" style={{ color: "var(--admin-text-muted)" }}>
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Nenhuma divida encontrada
                  </td>
                </tr>
              ) : (
                paginatedDividas.map((divida) => {
                  const status = statusConfig[divida.status] || statusConfig.em_aberto

                  return (
                    <tr
                      key={divida.id}
                      className="transition-colors hover:bg-[var(--admin-bg-tertiary)]"
                      style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}
                    >
                      {/* Cliente */}
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                          {divida.cliente || "—"}
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--admin-text-muted)" }}>
                          {divida.cpfCnpj || "—"}
                        </div>
                      </td>

                      {/* Valor */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold" style={{ color: "var(--admin-text-primary)" }}>
                          {formatCurrency(divida.valor)}
                        </span>
                      </td>

                      {/* Vencimento */}
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                          {formatDate(divida.dataVencimento)}
                        </span>
                      </td>

                      {/* Dias em Atraso */}
                      <td className="px-4 py-3">
                        <span
                          className="text-sm font-bold"
                          style={{ color: getDaysColor(divida.diasAtraso) }}
                        >
                          {divida.diasAtraso} dias
                        </span>
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

                      {/* Acoes */}
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/clientes/${divida.id}`}
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
            Mostrando {((currentPage - 1) * perPage) + 1} - {Math.min(currentPage * perPage, filteredAndSortedDividas.length)} de {filteredAndSortedDividas.length} dividas
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
