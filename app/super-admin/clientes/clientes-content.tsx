"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import {
  Users,
  DollarSign,
  AlertTriangle,
  Search,
  ArrowUpDown,
  Building2,
  CheckCircle,
  Clock,
  Handshake,
} from "lucide-react"

type Cliente = {
  id: string
  name: string
  document: string
  email: string
  phone: string
  city: string
  state: string
  companyId: string
  totalDebt: number
  daysOverdue: number
  negotiationStatus: string
  hasAsaasCharge: boolean
  recoveryScore?: number
  recoveryClass?: string
  approvalStatus?: string
}

type Company = {
  id: string
  name: string
}

interface Props {
  clientes: Cliente[]
  companies: Company[]
}

export function SuperAdminClientesContent({ clientes, companies }: Props) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCompany, setSelectedCompany] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"name" | "debt" | "days">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [negotiationFilter, setNegotiationFilter] = useState<string>("all")
  const [displayLimit, setDisplayLimit] = useState(100)

  const companyMap = useMemo(() => {
    const map = new Map<string, string>()
    companies.forEach((c) => map.set(c.id, c.name))
    return map
  }, [companies])

  const stats = useMemo(() => {
    const filtered = selectedCompany === "all"
      ? clientes
      : clientes.filter(c => c.companyId === selectedCompany)

    return {
      total: filtered.length,
      withDebt: filtered.filter(c => c.daysOverdue > 0).length,
      totalDebt: filtered.reduce((sum, c) => sum + c.totalDebt, 0),
      paid: filtered.filter(c => c.negotiationStatus === "PAGO").length,
      inNegotiation: filtered.filter(c => ["ATIVA", "ATIVA_ASAAS", "DRAFT"].includes(c.negotiationStatus)).length,
    }
  }, [clientes, selectedCompany])

  const filteredClientes = useMemo(() => {
    let result = clientes

    // Company filter
    if (selectedCompany !== "all") {
      result = result.filter(c => c.companyId === selectedCompany)
    }

    // Negotiation filter
    if (negotiationFilter !== "all") {
      result = result.filter(c => c.negotiationStatus === negotiationFilter)
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.document.includes(term) ||
        c.email?.toLowerCase().includes(term)
      )
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0
      if (sortBy === "name") {
        cmp = a.name.localeCompare(b.name)
      } else if (sortBy === "debt") {
        cmp = a.totalDebt - b.totalDebt
      } else if (sortBy === "days") {
        cmp = a.daysOverdue - b.daysOverdue
      }
      return sortOrder === "asc" ? cmp : -cmp
    })

    return result
  }, [clientes, selectedCompany, negotiationFilter, searchTerm, sortBy, sortOrder])

  const displayedClientes = filteredClientes.slice(0, displayLimit)

  const toggleSort = (field: "name" | "debt" | "days") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const negotiationConfig: Record<string, { label: string; color: string; bg: string }> = {
    PAGO: { label: "Pago", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/20" },
    ATIVA_ASAAS: { label: "Cobranca Enviada", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/20" },
    ATIVA: { label: "Acordo Criado", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/20" },
    DRAFT: { label: "Rascunho", color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-700" },
    NENHUMA: { label: "Nenhuma", color: "text-gray-500 dark:text-gray-500", bg: "bg-gray-50 dark:bg-gray-800" },
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Clientes
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Visualizacao global de todos os clientes da plataforma
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, CPF/CNPJ ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Todas as Empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Empresas</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={negotiationFilter} onValueChange={setNegotiationFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Handshake className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Negociacao" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="PAGO">Pago</SelectItem>
                <SelectItem value="ATIVA_ASAAS">Cobranca Enviada</SelectItem>
                <SelectItem value="ATIVA">Acordo Criado</SelectItem>
                <SelectItem value="DRAFT">Rascunho</SelectItem>
                <SelectItem value="NENHUMA">Sem Negociacao</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total de Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Com Divida
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.withDebt.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Valor Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(stats.totalDebt / 1000).toFixed(1)}k
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Em Negociacao
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inNegotiation}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Pagos
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Lista de Clientes ({filteredClientes.length.toLocaleString()})
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSort("name")}
              className={sortBy === "name" ? "bg-gray-100 dark:bg-gray-700" : ""}
            >
              Nome
              <ArrowUpDown className="ml-1 h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSort("debt")}
              className={sortBy === "debt" ? "bg-gray-100 dark:bg-gray-700" : ""}
            >
              Divida
              <ArrowUpDown className="ml-1 h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSort("days")}
              className={sortBy === "days" ? "bg-gray-100 dark:bg-gray-700" : ""}
            >
              Dias
              <ArrowUpDown className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {displayedClientes.map((cliente) => (
              <div
                key={cliente.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/super-admin/customers/${cliente.id}`}
                        className="font-medium text-gray-900 dark:text-white hover:underline truncate block"
                      >
                        {cliente.name}
                      </Link>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {cliente.document} • {cliente.city}, {cliente.state}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {companyMap.get(cliente.companyId) || "Empresa desconhecida"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">
                      R$ {cliente.totalDebt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className={`text-sm ${cliente.daysOverdue > 90 ? "text-red-500" : cliente.daysOverdue > 30 ? "text-orange-500" : "text-gray-500"}`}>
                      {cliente.daysOverdue > 0 ? `${cliente.daysOverdue} dias` : "Em dia"}
                    </p>
                  </div>
                  <Badge
                    className={`${negotiationConfig[cliente.negotiationStatus]?.bg} ${negotiationConfig[cliente.negotiationStatus]?.color} border-0`}
                  >
                    {negotiationConfig[cliente.negotiationStatus]?.label || cliente.negotiationStatus}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {filteredClientes.length > displayLimit && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => setDisplayLimit(displayLimit + 100)}
              >
                Carregar mais ({filteredClientes.length - displayLimit} restantes)
              </Button>
            </div>
          )}

          {filteredClientes.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum cliente encontrado com os filtros selecionados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
