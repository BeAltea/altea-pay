"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
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
  analysis_metadata: any
  behavioralData?: any
  restrictive_analysis_logs?: any
  behavioral_analysis_logs?: any
}

interface AdminClientesContentProps {
  clientes: Cliente[]
  company: { id: string; name: string } | null
}

type SortField = "name" | "creditScore" | "recoveryScore" | "negotiation"
type SortDirection = "asc" | "desc"

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1).replace(".", ",")}M`
  } else if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1).replace(".", ",")}k`
  }
  return `R$ ${value.toFixed(2).replace(".", ",")}`
}

function getScoreColor(score: number | null): string {
  if (score === null) return "var(--admin-text-muted)"
  if (score >= 700) return "var(--admin-green)"
  if (score >= 400) return "var(--admin-orange)"
  return "var(--admin-red)"
}

function getScoreBarWidth(score: number | null): number {
  if (score === null) return 0
  return Math.min(100, Math.max(0, score / 10))
}

function getScoreClass(score: number | null): string {
  if (score === null) return "—"
  if (score >= 800) return "A"
  if (score >= 700) return "B"
  if (score >= 600) return "C"
  if (score >= 500) return "D"
  if (score >= 400) return "E"
  return "F"
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
  const [creditScoreFilter, setCreditScoreFilter] = useState("all")
  const [recoveryScoreFilter, setRecoveryScoreFilter] = useState("all")
  const [negotiationFilter, setNegotiationFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(50)

  // Stats - uses ASAAS-backed negotiation status
  const stats = useMemo(() => {
    const withCreditScore = clientes.filter(c =>
      c.credit_score !== null || c.restrictive_analysis_logs
    ).length
    const withRecoveryScore = clientes.filter(c =>
      c.recovery_score !== null || c.behavioral_analysis_logs || c.behavioralData
    ).length
    // Only count clients with REAL ASAAS charges as having negotiations
    const withNegotiation = clientes.filter(c =>
      c.asaasNegotiationStatus === "ATIVA_ASAAS" ||
      c.asaasNegotiationStatus === "PAGO"
    ).length

    return {
      total: clientes.length,
      withCreditScore,
      withRecoveryScore,
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

    // Credit score filter
    if (creditScoreFilter !== "all") {
      filtered = filtered.filter(c => {
        const score = c.credit_score
        if (creditScoreFilter === "with") return score !== null
        if (creditScoreFilter === "without") return score === null
        if (creditScoreFilter === "high") return score !== null && score >= 700
        if (creditScoreFilter === "medium") return score !== null && score >= 400 && score < 700
        if (creditScoreFilter === "low") return score !== null && score < 400
        return true
      })
    }

    // Recovery score filter
    if (recoveryScoreFilter !== "all") {
      filtered = filtered.filter(c => {
        const score = c.recovery_score ?? c.behavioralData?.recovery_score
        if (recoveryScoreFilter === "with") return score !== null && score !== undefined
        if (recoveryScoreFilter === "without") return score === null || score === undefined
        if (recoveryScoreFilter === "high") return score !== null && score >= 700
        if (recoveryScoreFilter === "medium") return score !== null && score >= 400 && score < 700
        if (recoveryScoreFilter === "low") return score !== null && score < 400
        return true
      })
    }

    // Negotiation filter - uses ASAAS-backed status
    if (negotiationFilter !== "all") {
      filtered = filtered.filter(c => {
        // Only consider clients with REAL ASAAS charges as having active negotiations
        const hasActiveNegotiation = c.asaasNegotiationStatus === "ATIVA_ASAAS" || c.asaasNegotiationStatus === "PAGO"
        if (negotiationFilter === "with") return hasActiveNegotiation
        if (negotiationFilter === "without") return !hasActiveNegotiation
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
        case "creditScore":
          comparison = (a.credit_score || 0) - (b.credit_score || 0)
          break
        case "recoveryScore":
          const scoreA = a.recovery_score ?? a.behavioralData?.recovery_score ?? 0
          const scoreB = b.recovery_score ?? b.behavioralData?.recovery_score ?? 0
          comparison = scoreA - scoreB
          break
        case "negotiation":
          comparison = (a.approval_status || "").localeCompare(b.approval_status || "")
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

    return sorted
  }, [clientes, searchTerm, creditScoreFilter, recoveryScoreFilter, negotiationFilter, sortField, sortDirection])

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
          Visualize scores de credito e recuperacao dos seus clientes
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            Com Score de Credito
          </div>
          <div className="text-xl font-bold" style={{ color: "var(--admin-purple)" }}>
            {stats.withCreditScore.toLocaleString("pt-BR")}
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--admin-text-muted)" }}>
            Com Score de Recuperacao
          </div>
          <div className="text-xl font-bold" style={{ color: "var(--admin-blue)" }}>
            {stats.withRecoveryScore.toLocaleString("pt-BR")}
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--admin-text-muted)" }}>
            Com Negociacao Aberta
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

          {/* Score Credito Filter */}
          <Select value={creditScoreFilter} onValueChange={setCreditScoreFilter}>
            <SelectTrigger
              className="w-[160px] border-0"
              style={{ background: "var(--admin-bg-tertiary)", color: "var(--admin-text-secondary)" }}
            >
              <SelectValue placeholder="Score Credito" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}>
              <SelectItem value="all">Todos Scores</SelectItem>
              <SelectItem value="with">Com Score</SelectItem>
              <SelectItem value="without">Sem Score</SelectItem>
              <SelectItem value="high">Alto (700+)</SelectItem>
              <SelectItem value="medium">Medio (400-699)</SelectItem>
              <SelectItem value="low">Baixo (&lt;400)</SelectItem>
            </SelectContent>
          </Select>

          {/* Score Recuperacao Filter */}
          <Select value={recoveryScoreFilter} onValueChange={setRecoveryScoreFilter}>
            <SelectTrigger
              className="w-[180px] border-0"
              style={{ background: "var(--admin-bg-tertiary)", color: "var(--admin-text-secondary)" }}
            >
              <SelectValue placeholder="Score Recuperacao" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="with">Com Score</SelectItem>
              <SelectItem value="without">Sem Score</SelectItem>
              <SelectItem value="high">Alto (700+)</SelectItem>
              <SelectItem value="medium">Medio (400-699)</SelectItem>
              <SelectItem value="low">Baixo (&lt;400)</SelectItem>
            </SelectContent>
          </Select>

          {/* Negotiation Filter */}
          <Select value={negotiationFilter} onValueChange={setNegotiationFilter}>
            <SelectTrigger
              className="w-[160px] border-0"
              style={{ background: "var(--admin-bg-tertiary)", color: "var(--admin-text-secondary)" }}
            >
              <SelectValue placeholder="Negociacao" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="with">Com Negociacao</SelectItem>
              <SelectItem value="without">Sem Negociacao</SelectItem>
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
                  onClick={() => toggleSort("creditScore")}
                >
                  <div className="flex items-center gap-1">
                    Score Credito
                    <SortIcon field="creditScore" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                  style={{ color: "var(--admin-text-muted)" }}
                  onClick={() => toggleSort("recoveryScore")}
                >
                  <div className="flex items-center gap-1">
                    Score Recuperacao
                    <SortIcon field="recoveryScore" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                  style={{ color: "var(--admin-text-muted)" }}
                  onClick={() => toggleSort("negotiation")}
                >
                  <div className="flex items-center gap-1">
                    Negociacao
                    <SortIcon field="negotiation" />
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
              {paginatedClientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center" style={{ color: "var(--admin-text-muted)" }}>
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Nenhum cliente encontrado
                  </td>
                </tr>
              ) : (
                paginatedClientes.map((cliente) => {
                  const creditScore = cliente.credit_score
                  const recoveryScore = cliente.recovery_score ?? cliente.behavioralData?.recovery_score ?? null
                  const recoveryClass = cliente.recovery_class ?? cliente.behavioralData?.recovery_class ?? null

                  // Use ASAAS-backed negotiation status
                  const negotiationStatus = cliente.asaasNegotiationStatus || "NENHUMA"
                  const negotiationConfig: Record<string, { label: string; color: string; bg: string }> = {
                    PAGO: { label: "Pago", color: "var(--admin-green)", bg: "var(--admin-green-bg)" },
                    ATIVA_ASAAS: { label: "Cobranca Enviada", color: "var(--admin-blue)", bg: "var(--admin-blue-bg)" },
                    ATIVA: { label: "Acordo Criado", color: "var(--admin-orange)", bg: "var(--admin-orange-bg)" },
                    DRAFT: { label: "Rascunho", color: "var(--admin-text-muted)", bg: "var(--admin-bg-tertiary)" },
                    NENHUMA: { label: "Nenhuma", color: "var(--admin-text-muted)", bg: "var(--admin-bg-tertiary)" },
                  }
                  const negotiation = negotiationConfig[negotiationStatus] || { label: "Nenhuma", color: "var(--admin-text-muted)", bg: "var(--admin-bg-tertiary)" }

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

                      {/* Score Credito */}
                      <td className="px-4 py-3">
                        {creditScore !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold" style={{ color: getScoreColor(creditScore) }}>
                              {creditScore}
                            </span>
                            <span className="text-xs font-semibold" style={{ color: "var(--admin-text-muted)" }}>
                              {getScoreClass(creditScore)}
                            </span>
                            <div
                              className="w-[50px] h-1.5 rounded-full overflow-hidden"
                              style={{ background: "var(--admin-border)" }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${getScoreBarWidth(creditScore)}%`,
                                  background: getScoreColor(creditScore)
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm" style={{ color: "var(--admin-text-muted)" }}>—</span>
                        )}
                      </td>

                      {/* Score Recuperacao */}
                      <td className="px-4 py-3">
                        {recoveryScore !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold" style={{ color: getScoreColor(recoveryScore) }}>
                              {recoveryScore}
                            </span>
                            <span className="text-xs font-semibold" style={{ color: "var(--admin-text-muted)" }}>
                              {recoveryClass || getScoreClass(recoveryScore)}
                            </span>
                            <div
                              className="w-[50px] h-1.5 rounded-full overflow-hidden"
                              style={{ background: "var(--admin-border)" }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${getScoreBarWidth(recoveryScore)}%`,
                                  background: getScoreColor(recoveryScore)
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm" style={{ color: "var(--admin-text-muted)" }}>—</span>
                        )}
                      </td>

                      {/* Negociacao */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-semibold"
                          style={{ background: negotiation.bg, color: negotiation.color }}
                        >
                          {negotiation.label}
                        </span>
                      </td>

                      {/* Acoes */}
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/clientes/${cliente.id}`}
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
            Mostrando {((currentPage - 1) * perPage) + 1} - {Math.min(currentPage * perPage, filteredAndSortedClientes.length)} de {filteredAndSortedClientes.length} clientes
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
