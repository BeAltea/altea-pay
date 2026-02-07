"use client"

import { useState, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react"

interface Cliente {
  id: string
  Cliente: string
  "CPF/CNPJ": string
  Cidade: string
  UF: string
  credit_score: number | null
  recovery_score: number | null
  recovery_class: string | null
  approval_status: string
  asaasNegotiationStatus?: string  // Real ASAAS-backed status
  hasAsaasCharge?: boolean
  "Dias Inad.": number
  Vencido: string
  "Dt. Vcto"?: string  // Data de vencimento
  analysis_metadata: any
  behavioralData?: any
  restrictive_analysis_logs?: any
  behavioral_analysis_logs?: any
}

interface AdminClientesContentProps {
  clientes: Cliente[]
  company: { id: string; name: string } | null
}

type SortField = "name" | "debtValue" | "debtDate"
type SortDirection = "asc" | "desc"

function formatCurrency(value: number | string | null): string {
  if (value === null || value === undefined) return "R$ 0,00"

  let numValue: number
  if (typeof value === "string") {
    // Parse Brazilian currency format: "R$ 1.234,56" or "1234.56"
    const cleaned = value.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
    numValue = parseFloat(cleaned) || 0
  } else {
    numValue = value
  }

  return numValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  })
}

function parseDebtValue(value: string | number | null): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value

  // Parse Brazilian currency format: "R$ 1.234,56" or "1.234,56"
  const cleaned = value.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
  return parseFloat(cleaned) || 0
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  try {
    // Handle various date formats
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      // Try parsing Brazilian format DD/MM/YYYY
      const parts = dateStr.split("/")
      if (parts.length === 3) {
        return dateStr // Already in correct format
      }
      return "—"
    }
    return date.toLocaleDateString("pt-BR")
  } catch {
    return "—"
  }
}

function maskDocument(doc: string | null): string {
  if (!doc) return "—"
  const clean = doc.replace(/[^\d]/g, "")
  if (clean.length === 11) {
    return `***.${clean.substring(3, 6)}.${clean.substring(6, 9)}-**`
  } else if (clean.length === 14) {
    return `**.${clean.substring(2, 5)}.${clean.substring(5, 8)}/****-**`
  }
  return doc
}

export function AdminClientesContent({ clientes, company }: AdminClientesContentProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [negotiationFilter, setNegotiationFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(50)

  // Stats
  const stats = useMemo(() => {
    // Only count clients with REAL ASAAS charges as having negotiations
    const withNegotiation = clientes.filter(c =>
      c.asaasNegotiationStatus === "ATIVA_ASAAS" ||
      c.asaasNegotiationStatus === "PAGO"
    ).length

    return {
      total: clientes.length,
      withNegotiation
    }
  }, [clientes])

  const filteredAndSortedClientes = useMemo(() => {
    let filtered = clientes

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(c =>
        c.Cliente?.toLowerCase().includes(term) ||
        c["CPF/CNPJ"]?.includes(searchTerm)
      )
    }

    // Negotiation filter - uses ASAAS-backed status
    if (negotiationFilter !== "all") {
      filtered = filtered.filter(c => {
        const status = c.asaasNegotiationStatus
        if (negotiationFilter === "em_andamento") {
          return status === "ATIVA_ASAAS"
        }
        if (negotiationFilter === "paga") {
          return status === "PAGO"
        }
        if (negotiationFilter === "em_atraso") {
          // Em atraso: has ASAAS charge but overdue
          return status === "ATIVA_ASAAS" && (c["Dias Inad."] || 0) > 0
        }
        if (negotiationFilter === "nenhuma") {
          return !status || status === "NENHUMA" || status === "DRAFT" || status === "ATIVA"
        }
        return true
      })
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "name":
          comparison = (a.Cliente || "").localeCompare(b.Cliente || "")
          break
        case "debtValue":
          const valueA = parseDebtValue(a.Vencido)
          const valueB = parseDebtValue(b.Vencido)
          comparison = valueA - valueB
          break
        case "debtDate":
          const dateA = a["Dt. Vcto"] ? new Date(a["Dt. Vcto"]).getTime() : 0
          const dateB = b["Dt. Vcto"] ? new Date(b["Dt. Vcto"]).getTime() : 0
          comparison = dateA - dateB
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

    return sorted
  }, [clientes, searchTerm, negotiationFilter, sortField, sortDirection])

  const paginatedClientes = useMemo(() => {
    const start = (currentPage - 1) * perPage
    return filteredAndSortedClientes.slice(start, start + perPage)
  }, [filteredAndSortedClientes, currentPage, perPage])

  const totalPages = Math.ceil(filteredAndSortedClientes.length / perPage)

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-50" />
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

  const companyName = company?.name || "Empresa"

  // Negotiation status configuration based on ASAAS data
  const getNegotiationDisplay = (cliente: Cliente) => {
    const status = cliente.asaasNegotiationStatus
    const diasInad = cliente["Dias Inad."] || 0

    // Check if overdue with active negotiation
    if (status === "ATIVA_ASAAS" && diasInad > 0) {
      return { label: "Em atraso", color: "var(--admin-orange)", bg: "var(--admin-orange-bg)" }
    }

    const config: Record<string, { label: string; color: string; bg: string }> = {
      PAGO: { label: "Paga", color: "var(--admin-green)", bg: "var(--admin-green-bg)" },
      ATIVA_ASAAS: { label: "Em andamento", color: "var(--admin-blue)", bg: "var(--admin-blue-bg)" },
      ATIVA: { label: "Nenhuma", color: "var(--admin-text-muted)", bg: "var(--admin-bg-tertiary)" },
      DRAFT: { label: "Nenhuma", color: "var(--admin-text-muted)", bg: "var(--admin-bg-tertiary)" },
      NENHUMA: { label: "Nenhuma", color: "var(--admin-text-muted)", bg: "var(--admin-bg-tertiary)" },
    }

    return config[status || "NENHUMA"] || { label: "Nenhuma", color: "var(--admin-text-muted)", bg: "var(--admin-bg-tertiary)" }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1
          className="text-[26px] font-bold mb-1"
          style={{ fontFamily: "'Playfair Display', serif", color: "var(--admin-text-primary)" }}
        >
          Clientes — {companyName}
        </h1>
        <p style={{ color: "var(--admin-text-secondary)", fontSize: "14px" }}>
          Visualize dividas e status de negociacao dos seus clientes
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--admin-text-muted)" }}>
            Total de Clientes
          </div>
          <div className="text-xl font-bold" style={{ color: "var(--admin-text-primary)" }}>
            {stats.total.toLocaleString("pt-BR")}
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--admin-text-muted)" }}>
            Com Negociacao
          </div>
          <div className="text-xl font-bold" style={{ color: "var(--admin-green)" }}>
            {stats.withNegotiation.toLocaleString("pt-BR")}
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

          {/* Negotiation Filter */}
          <Select value={negotiationFilter} onValueChange={setNegotiationFilter}>
            <SelectTrigger
              className="w-[180px] border-0"
              style={{ background: "var(--admin-bg-tertiary)", color: "var(--admin-text-secondary)" }}
            >
              <SelectValue placeholder="Negociacao" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="paga">Paga</SelectItem>
              <SelectItem value="nenhuma">Nenhuma</SelectItem>
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
                  onClick={() => toggleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    Cliente
                    <SortIcon field="name" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                  style={{ color: "var(--admin-text-muted)" }}
                  onClick={() => toggleSort("debtValue")}
                >
                  <div className="flex items-center gap-1">
                    Valor da Divida
                    <SortIcon field="debtValue" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                  style={{ color: "var(--admin-text-muted)" }}
                  onClick={() => toggleSort("debtDate")}
                >
                  <div className="flex items-center gap-1">
                    Data da Divida
                    <SortIcon field="debtDate" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: "var(--admin-text-muted)" }}
                >
                  Status Negociacao
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedClientes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center" style={{ color: "var(--admin-text-muted)" }}>
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Nenhum cliente encontrado
                  </td>
                </tr>
              ) : (
                paginatedClientes.map((cliente) => {
                  const negotiation = getNegotiationDisplay(cliente)
                  const debtValue = parseDebtValue(cliente.Vencido)

                  const initials = (cliente.Cliente || "?")
                    .split(" ")
                    .slice(0, 2)
                    .map(n => n[0])
                    .join("")
                    .toUpperCase()

                  return (
                    <tr
                      key={cliente.id}
                      className="transition-colors hover:bg-[var(--admin-bg-tertiary)]"
                      style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}
                    >
                      {/* Cliente */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold"
                            style={{ background: "var(--admin-border)", color: "var(--admin-gold-400)" }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                              {cliente.Cliente || "—"}
                            </div>
                            <div className="text-[11px]" style={{ color: "var(--admin-text-muted)" }}>
                              {maskDocument(cliente["CPF/CNPJ"])}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Valor da Divida */}
                      <td className="px-4 py-3">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: debtValue > 0 ? "var(--admin-text-primary)" : "var(--admin-text-muted)" }}
                        >
                          {debtValue > 0 ? formatCurrency(debtValue) : "—"}
                        </span>
                      </td>

                      {/* Data da Divida */}
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                          {formatDate(cliente["Dt. Vcto"])}
                        </span>
                      </td>

                      {/* Status Negociacao */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-semibold"
                          style={{ background: negotiation.bg, color: negotiation.color }}
                        >
                          {negotiation.label}
                        </span>
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
            Mostrando {filteredAndSortedClientes.length > 0 ? ((currentPage - 1) * perPage) + 1 : 0} - {Math.min(currentPage * perPage, filteredAndSortedClientes.length)} de {filteredAndSortedClientes.length} clientes
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
