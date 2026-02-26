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
  DollarSign,
  Clock,
  CreditCard,
  Handshake,
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
  asaasNegotiationStatus?: string
  hasAsaasCharge?: boolean
  hasActiveAgreement?: boolean
  paymentStatus?: string | null // ASAAS payment status: pending, received, confirmed, overdue, etc.
  "Dias Inad.": number
  Vencido: string
  Vecto?: string
  analysis_metadata: any
  behavioralData?: any
  restrictive_analysis_logs?: any
  behavioral_analysis_logs?: any
}

interface AdminClientesContentProps {
  clientes: Cliente[]
  company: { id: string; name: string } | null
}

type SortField = "name" | "debtValue" | "debtDate" | "diasAtraso" | "statusDivida" | "statusNegociacao"
type SortDirection = "asc" | "desc"

// Sort order for status columns (debt status based on ASAAS payment status)
const STATUS_DIVIDA_ORDER: Record<string, number> = {
  em_aberto: 1,    // No negotiation sent
  vencida: 2,      // ASAAS payment is overdue
  aguardando: 3,   // Waiting for payment
  quitada: 4,      // Paid
}

const STATUS_NEGOCIACAO_ORDER: Record<string, number> = {
  ATIVA_ASAAS: 1,  // Em andamento
  PAGO: 2,         // Paga
  em_atraso: 3,    // Em atraso (ATIVA_ASAAS + diasAtraso > 0)
  NENHUMA: 4,      // Nenhuma
  DRAFT: 4,
  ATIVA: 4,
}

function formatCurrency(value: number | string | null): string {
  if (value === null || value === undefined) return "R$ 0,00"

  let numValue: number
  if (typeof value === "string") {
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

  const cleaned = value.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
  return parseFloat(cleaned) || 0
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      const parts = dateStr.split("/")
      if (parts.length === 3) {
        return dateStr
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

function getDiasAtrasoStyle(dias: number): { color: string; fontWeight: string } {
  if (dias <= 0) return { color: "var(--admin-green)", fontWeight: "normal" }
  if (dias <= 30) return { color: "var(--admin-orange)", fontWeight: "normal" }
  if (dias <= 90) return { color: "var(--admin-red)", fontWeight: "normal" }
  return { color: "var(--admin-red)", fontWeight: "bold" }
}

function getDiasAtrasoLabel(dias: number): string {
  if (dias <= 0) return "Em dia"
  return `${dias} dias`
}

export function AdminClientesContent({ clientes, company }: AdminClientesContentProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [debtStatusFilter, setDebtStatusFilter] = useState("all")
  const [diasFilter, setDiasFilter] = useState("all")
  const [negotiationFilter, setNegotiationFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(50)

  // Calculate debt status for each client
  const clientesWithStatus = useMemo(() => {
    return clientes.map(cliente => {
      const debtValue = parseDebtValue(cliente.Vencido)
      // Safely parse diasAtraso - handle null, undefined, NaN, and string values
      const rawDias = cliente["Dias Inad."]
      const diasAtraso = typeof rawDias === "number" && !isNaN(rawDias)
        ? rawDias
        : (typeof rawDias === "string" ? (parseInt(rawDias.replace(/\./g, ""), 10) || 0) : 0)
      const asaasStatus = cliente.asaasNegotiationStatus

      // Determine debt status using ASAAS payment_status as authoritative source
      const paymentStatus = cliente.paymentStatus // pending, received, confirmed, overdue, etc.
      let debtStatus = "em_aberto"
      if (asaasStatus === "PAGO" || paymentStatus === "received" || paymentStatus === "confirmed") {
        debtStatus = "quitada"
      } else if (paymentStatus === "overdue") {
        debtStatus = "vencida"
      } else if (debtValue > 0 && asaasStatus === "ATIVA_ASAAS") {
        debtStatus = "aguardando" // Has active negotiation pending payment
      }

      // Determine negotiation sort key
      let negotiationSortKey = STATUS_NEGOCIACAO_ORDER[asaasStatus || "NENHUMA"] || 4
      // If has ASAAS charge but overdue, use special "em_atraso" order
      if (asaasStatus === "ATIVA_ASAAS" && paymentStatus === "overdue") {
        negotiationSortKey = STATUS_NEGOCIACAO_ORDER["em_atraso"]
      }

      return {
        ...cliente,
        debtValue,
        diasAtraso,
        debtStatus,
        negotiationSortKey,
      }
    })
  }, [clientes])

  // Stats - 5 cards
  const stats = useMemo(() => {
    const activeDebts = clientesWithStatus.filter(c => c.debtStatus !== "quitada")
    const totalDebt = activeDebts.reduce((sum, c) => sum + (c.debtValue || 0), 0)
    const totalClients = clientesWithStatus.length
    const debtValues = clientesWithStatus.map(c => c.debtValue || 0).filter(v => !isNaN(v))
    const maxDebt = debtValues.length > 0 ? Math.max(...debtValues) : 0

    // Average days overdue (only for overdue debts with valid diasAtraso)
    const overdueDays = clientesWithStatus
      .filter(c => typeof c.diasAtraso === "number" && !isNaN(c.diasAtraso) && c.diasAtraso > 0)
      .map(c => c.diasAtraso)
    const avgDays = overdueDays.length > 0
      ? Math.round(overdueDays.reduce((sum, d) => sum + d, 0) / overdueDays.length)
      : 0

    // Negotiations count - MUST MATCH Acordos page (all non-cancelled agreements)
    // Count any client with ATIVA_ASAAS, ATIVA, or PAGO status
    const negotiationsInProgress = clientesWithStatus.filter(c =>
      c.asaasNegotiationStatus === "ATIVA_ASAAS" ||
      c.asaasNegotiationStatus === "ATIVA" ||
      c.asaasNegotiationStatus === "PAGO"
    ).length

    return {
      totalDebt: isNaN(totalDebt) ? 0 : totalDebt,
      totalClients,
      maxDebt: isNaN(maxDebt) ? 0 : maxDebt,
      avgDays: isNaN(avgDays) ? 0 : avgDays,
      negotiationsInProgress,
    }
  }, [clientesWithStatus])

  const filteredAndSortedClientes = useMemo(() => {
    let filtered = clientesWithStatus

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(c =>
        c.Cliente?.toLowerCase().includes(term) ||
        c["CPF/CNPJ"]?.includes(searchTerm)
      )
    }

    // Debt status filter - using ASAAS payment_status as authoritative source
    if (debtStatusFilter !== "all") {
      filtered = filtered.filter(c => {
        const status = c.asaasNegotiationStatus
        const hasCharge = c.hasAsaasCharge
        const paymentStatus = c.paymentStatus // ASAAS payment status

        if (debtStatusFilter === "paga") {
          return status === "PAGO" || paymentStatus === "received" || paymentStatus === "confirmed"
        }
        if (debtStatusFilter === "vencida") {
          // Vencida = ASAAS payment status is overdue
          return paymentStatus === "overdue"
        }
        if (debtStatusFilter === "aguardando") {
          // Aguardando = has charge but not overdue and not paid
          return (status === "ATIVA_ASAAS" || hasCharge) &&
            paymentStatus !== "overdue" &&
            paymentStatus !== "received" &&
            paymentStatus !== "confirmed"
        }
        if (debtStatusFilter === "em_aberto") {
          // Em aberto = no negotiation sent
          return !status || (!hasCharge && status !== "ATIVA_ASAAS" && status !== "PAGO")
        }
        return true
      })
    }

    // Dias em atraso filter
    if (diasFilter !== "all") {
      filtered = filtered.filter(c => {
        const dias = c.diasAtraso
        if (diasFilter === "0-30") return dias >= 0 && dias <= 30
        if (diasFilter === "31-90") return dias > 30 && dias <= 90
        if (diasFilter === "91-180") return dias > 90 && dias <= 180
        if (diasFilter === "180+") return dias > 180
        return true
      })
    }

    // Negotiation filter - matches display logic (Enviada / Sem negociação)
    // MUST MATCH Acordos page: any non-cancelled agreement = Enviada
    if (negotiationFilter !== "all") {
      filtered = filtered.filter(c => {
        const status = c.asaasNegotiationStatus
        if (negotiationFilter === "enviada") {
          // Enviada = has any active agreement status
          return status === "PAGO" || status === "ATIVA_ASAAS" || status === "ATIVA"
        }
        if (negotiationFilter === "sem_negociacao") {
          // Sem negociação = no active agreement
          return !status || status === "NENHUMA"
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
          comparison = (a.debtValue || 0) - (b.debtValue || 0)
          break
        case "debtDate":
          const dateA = a["Vecto"] ? new Date(a["Vecto"]).getTime() : 0
          const dateB = b["Vecto"] ? new Date(b["Vecto"]).getTime() : 0
          comparison = dateA - dateB
          break
        case "diasAtraso":
          comparison = (a.diasAtraso || 0) - (b.diasAtraso || 0)
          break
        case "statusDivida":
          const orderA = STATUS_DIVIDA_ORDER[a.debtStatus] || 99
          const orderB = STATUS_DIVIDA_ORDER[b.debtStatus] || 99
          comparison = orderA - orderB
          break
        case "statusNegociacao":
          comparison = (a.negotiationSortKey || 99) - (b.negotiationSortKey || 99)
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

    return sorted
  }, [clientesWithStatus, searchTerm, debtStatusFilter, diasFilter, negotiationFilter, sortField, sortDirection])

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

  // Status configurations - matching super-admin Negociações page

  // Status Negociação: "Enviada" (green) or "Sem negociação" (gray)
  // MUST MATCH Acordos page: any non-cancelled agreement = "Enviada"
  const getNegotiationDisplay = (cliente: typeof clientesWithStatus[0]) => {
    const status = cliente.asaasNegotiationStatus

    // If has any active agreement status (PAGO, ATIVA_ASAAS, or ATIVA), show "Enviada"
    if (status === "PAGO" || status === "ATIVA_ASAAS" || status === "ATIVA") {
      return { label: "Enviada", color: "var(--admin-green)", bg: "var(--admin-green-bg)" }
    }

    // Otherwise show "Sem negociação"
    return { label: "Sem negociação", color: "var(--admin-text-muted)", bg: "var(--admin-bg-tertiary)" }
  }

  // Status Dívida: "Em aberto" (red), "Aguardando pagamento" (blue), "Paga" (green), "Vencida" (orange)
  // Uses ASAAS payment_status as the authoritative source for status display
  const getDebtStatusDisplay = (cliente: typeof clientesWithStatus[0]) => {
    const negotiationStatus = cliente.asaasNegotiationStatus
    const hasCharge = cliente.hasAsaasCharge
    const paymentStatus = cliente.paymentStatus // ASAAS payment status: pending, received, confirmed, overdue, etc.

    // Paga - if payment received/confirmed via ASAAS or negotiation status is PAGO
    if (negotiationStatus === "PAGO" || paymentStatus === "received" || paymentStatus === "confirmed") {
      return { label: "Paga", color: "var(--admin-green)", bg: "var(--admin-green-bg)" }
    }

    // If has ASAAS charge (negotiation sent)
    if (negotiationStatus === "ATIVA_ASAAS" || hasCharge) {
      // Vencida - if ASAAS payment status is overdue
      if (paymentStatus === "overdue") {
        return { label: "Vencida", color: "var(--admin-orange)", bg: "var(--admin-orange-bg)" }
      }
      // Aguardando pagamento - pending payment (ASAAS pending or no status yet)
      return { label: "Aguardando pagamento", color: "var(--admin-blue)", bg: "var(--admin-blue-bg)" }
    }

    // Em aberto - no negotiation sent
    return { label: "Em aberto", color: "var(--admin-red)", bg: "var(--admin-red-bg)" }
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

      {/* Stats Row - 5 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
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
            {formatCurrency(stats.totalDebt)}
          </div>
        </div>

        <div
          className="rounded-lg p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4" style={{ color: "var(--admin-blue)" }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
              Quantidade
            </span>
          </div>
          <div className="text-xl font-bold" style={{ color: "var(--admin-text-primary)" }}>
            {stats.totalClients.toLocaleString("pt-BR")}
          </div>
        </div>

        <div
          className="rounded-lg p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4" style={{ color: "var(--admin-orange)" }} />
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

        <div
          className="rounded-lg p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Handshake className="w-4 h-4" style={{ color: "var(--admin-green)" }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
              Negociacoes
            </span>
          </div>
          <div className="text-xl font-bold" style={{ color: "var(--admin-green)" }}>
            {stats.negotiationsInProgress.toLocaleString("pt-BR")}
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

          {/* Debt Status Filter */}
          <Select value={debtStatusFilter} onValueChange={setDebtStatusFilter}>
            <SelectTrigger
              className="w-[180px] border-0"
              style={{ background: "var(--admin-bg-tertiary)", color: "var(--admin-text-secondary)" }}
            >
              <SelectValue placeholder="Status Divida" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="em_aberto">Em aberto</SelectItem>
              <SelectItem value="aguardando">Aguardando pagamento</SelectItem>
              <SelectItem value="paga">Paga</SelectItem>
              <SelectItem value="vencida">Vencida</SelectItem>
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
              <SelectItem value="31-90">31-90 dias</SelectItem>
              <SelectItem value="91-180">91-180 dias</SelectItem>
              <SelectItem value="180+">180+ dias</SelectItem>
            </SelectContent>
          </Select>

          {/* Negotiation Filter */}
          <Select value={negotiationFilter} onValueChange={setNegotiationFilter}>
            <SelectTrigger
              className="w-[180px] border-0"
              style={{ background: "var(--admin-bg-tertiary)", color: "var(--admin-text-secondary)" }}
            >
              <SelectValue placeholder="Status Negociacao" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="enviada">Enviada</SelectItem>
              <SelectItem value="sem_negociacao">Sem negociacao</SelectItem>
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
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: "var(--admin-text-muted)" }}
                >
                  Cidade
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                  style={{ color: "var(--admin-text-muted)" }}
                  onClick={() => toggleSort("debtValue")}
                >
                  <div className="flex items-center gap-1">
                    Divida
                    <SortIcon field="debtValue" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                  style={{ color: "var(--admin-text-muted)" }}
                  onClick={() => toggleSort("diasAtraso")}
                >
                  <div className="flex items-center gap-1">
                    Tempo Divida
                    <SortIcon field="diasAtraso" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                  style={{ color: "var(--admin-text-muted)" }}
                  onClick={() => toggleSort("statusNegociacao")}
                >
                  <div className="flex items-center gap-1">
                    Status Negociacao
                    <SortIcon field="statusNegociacao" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                  style={{ color: "var(--admin-text-muted)" }}
                  onClick={() => toggleSort("statusDivida")}
                >
                  <div className="flex items-center gap-1">
                    Status Divida
                    <SortIcon field="statusDivida" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedClientes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center" style={{ color: "var(--admin-text-muted)" }}>
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Nenhum cliente encontrado
                  </td>
                </tr>
              ) : (
                paginatedClientes.map((cliente) => {
                  const debtStatus = getDebtStatusDisplay(cliente)
                  const negotiation = getNegotiationDisplay(cliente)
                  const diasStyle = getDiasAtrasoStyle(cliente.diasAtraso)

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

                      {/* Cidade */}
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                          {cliente.Cidade || "—"}
                        </span>
                      </td>

                      {/* Divida */}
                      <td className="px-4 py-3">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: cliente.debtValue > 0 ? "var(--admin-text-primary)" : "var(--admin-text-muted)" }}
                        >
                          {cliente.debtValue > 0 ? formatCurrency(cliente.debtValue) : "—"}
                        </span>
                      </td>

                      {/* Tempo Divida */}
                      <td className="px-4 py-3">
                        <span
                          className="text-sm"
                          style={{ color: diasStyle.color, fontWeight: diasStyle.fontWeight }}
                        >
                          {getDiasAtrasoLabel(cliente.diasAtraso)}
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

                      {/* Status Divida */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-semibold"
                          style={{ background: debtStatus.bg, color: debtStatus.color }}
                        >
                          {debtStatus.label}
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
