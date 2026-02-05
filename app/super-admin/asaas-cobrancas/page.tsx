"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import {
  CreditCard,
  Search,
  Building2,
  ArrowLeft,
  Loader2,
  Eye,
  Calendar,
  Mail,
  MessageSquare,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  DollarSign,
} from "lucide-react"

interface AsaasCobranca {
  id: string
  customerName: string | null
  customerDocument: string | null
  customerEmail: string | null
  customerPhone: string | null
  companyId: string | null
  companyName: string | null
  originalAmount: string | null
  negotiatedAmount: string | null
  discountPercentage: string | null
  installments: number | null
  installmentAmount: string | null
  paymentMethod: string | null
  status: string | null
  paymentProvider: string | null
  paymentLink: string | null
  dueDate: string | null
  startDate: string | null
  proposalSent: boolean
  dateSent: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string | null
  updatedAt: string | null
}

interface Company {
  id: string
  name: string
}

export default function AsaasCobrancasPage() {
  const [cobrancas, setCobrancas] = useState<AsaasCobranca[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [filteredCobrancas, setFilteredCobrancas] = useState<AsaasCobranca[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCompany, setSelectedCompany] = useState<string>("all")
  const [userRole, setUserRole] = useState<string>("user")
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null)

  const isSuperAdmin = userRole === "super_admin"

  const fetchCobrancas = useCallback(async (companyId?: string) => {
    try {
      const url = companyId && companyId !== "all"
        ? `/api/super-admin/asaas-cobrancas?companyId=${companyId}`
        : "/api/super-admin/asaas-cobrancas"

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setCobrancas(data.cobrancas || [])
        setFilteredCobrancas(data.cobrancas || [])
        setUserRole(data.userRole || "user")
        setUserCompanyId(data.userCompanyId || null)
      }
    } catch (error) {
      console.error("[ASAAS Cobrancas] Error fetching cobrancas:", error)
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // First fetch cobrancas to get user role
        const cobrancasRes = await fetch("/api/super-admin/asaas-cobrancas")
        if (cobrancasRes.ok) {
          const data = await cobrancasRes.json()
          setCobrancas(data.cobrancas || [])
          setFilteredCobrancas(data.cobrancas || [])
          setUserRole(data.userRole || "user")
          setUserCompanyId(data.userCompanyId || null)
        }

        // Fetch companies for super_admin filter
        const companiesRes = await fetch("/api/super-admin/companies")
        if (companiesRes.ok) {
          const companiesData = await companiesRes.json()
          setCompanies(companiesData)
        }
      } catch (error) {
        console.error("[ASAAS Cobrancas] Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Handle company filter change for super_admin
  useEffect(() => {
    if (isSuperAdmin && selectedCompany !== "all") {
      fetchCobrancas(selectedCompany)
    } else if (isSuperAdmin && selectedCompany === "all") {
      fetchCobrancas()
    }
  }, [selectedCompany, isSuperAdmin, fetchCobrancas])

  // Apply search filter
  useEffect(() => {
    let result = [...cobrancas]

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(
        (c) =>
          c.customerName?.toLowerCase().includes(search) ||
          c.customerDocument?.toLowerCase().includes(search) ||
          c.customerEmail?.toLowerCase().includes(search)
      )
    }

    setFilteredCobrancas(result)
  }, [cobrancas, searchTerm])

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Pendente</Badge>
    const s = status.toLowerCase()
    if (s === "paid" || s === "confirmed" || s === "pago") {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle className="h-3 w-3 mr-1" />
          Pago
        </Badge>
      )
    }
    if (s === "pending" || s === "pendente") {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
          <Clock className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      )
    }
    if (s === "overdue" || s === "vencido") {
      return (
        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
          <Clock className="h-3 w-3 mr-1" />
          Vencido
        </Badge>
      )
    }
    if (s === "failed" || s === "cancelled" || s === "canceled" || s === "falhou") {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
          <XCircle className="h-3 w-3 mr-1" />
          Falhou
        </Badge>
      )
    }
    return <Badge variant="outline">{status}</Badge>
  }

  const getMethodBadge = (method: string | null) => {
    if (!method) return <Badge variant="outline">N/A</Badge>
    const m = method.toLowerCase()
    if (m === "pix") {
      return <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400">PIX</Badge>
    }
    if (m === "boleto") {
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">Boleto</Badge>
    }
    if (m === "credit_card" || m === "cartao") {
      return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">Cartão</Badge>
    }
    return <Badge variant="outline">{method}</Badge>
  }

  const formatCurrency = (value: string | null | undefined): string => {
    if (!value) return "R$ 0,00"
    const num = parseFloat(value)
    if (isNaN(num)) return "R$ 0,00"
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "-"
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString("pt-BR")
    } catch {
      return dateStr
    }
  }

  const pendingCount = filteredCobrancas.filter(
    (c) => c.status?.toLowerCase() === "pending" || c.status?.toLowerCase() === "pendente"
  ).length

  const paidCount = filteredCobrancas.filter(
    (c) => c.status?.toLowerCase() === "paid" || c.status?.toLowerCase() === "pago"
  ).length

  const totalAmount = filteredCobrancas.reduce((sum, c) => {
    const amount = parseFloat(c.negotiatedAmount || c.originalAmount || "0")
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/super-admin">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Cobranças ASAAS</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isSuperAdmin
              ? "Gerenciamento de cobranças enviadas via integração ASAAS."
              : "Cobranças ASAAS da sua empresa."}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cobranças</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCobrancas.length}</div>
            <p className="text-xs text-muted-foreground">Acordos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Aguardando pagamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidCount}</div>
            <p className="text-xs text-muted-foreground">Pagamentos confirmados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount.toString())}</div>
            <p className="text-xs text-muted-foreground">Em cobranças</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            {isSuperAdmin
              ? "Filtre as cobranças por empresa ou busque por cliente"
              : "Busque por cliente"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por cliente, documento ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {/* Empresa filter - only visible for super_admin */}
            {isSuperAdmin && (
              <div className="w-full sm:w-64">
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por empresa" />
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
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cobrancas List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Cobranças ASAAS</CardTitle>
          <CardDescription>
            {filteredCobrancas.length === cobrancas.length
              ? `Exibindo todas as ${cobrancas.length} cobranças`
              : `Exibindo ${filteredCobrancas.length} de ${cobrancas.length} cobranças`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCobrancas.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhuma cobrança encontrada</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Ainda não há cobranças ASAAS registradas ou os filtros não retornaram resultados.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCobrancas.slice(0, 50).map((cobranca) => (
                <div
                  key={cobranca.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2 lg:mb-0">
                      <div className="bg-altea-gold/10 dark:bg-altea-gold/20 p-2 rounded-lg">
                        <CreditCard className="h-4 w-4 text-altea-navy dark:text-altea-gold" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {cobranca.customerName || "Cliente não informado"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          {cobranca.customerDocument && (
                            <span>{cobranca.customerDocument}</span>
                          )}
                          {cobranca.customerEmail && (
                            <span className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {cobranca.customerEmail}
                            </span>
                          )}
                          {isSuperAdmin && cobranca.companyName && (
                            <span className="flex items-center">
                              <Building2 className="h-3 w-3 mr-1" />
                              {cobranca.companyName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-3 lg:mt-0">
                    {/* Proposal sent indicator */}
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Proposta</p>
                      {cobranca.proposalSent ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Enviada
                        </Badge>
                      ) : (
                        <Badge variant="outline">Não enviada</Badge>
                      )}
                    </div>

                    {/* Date sent */}
                    {cobranca.dateSent && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Data Envio</p>
                        <p className="text-sm font-medium">{formatDate(cobranca.dateSent)}</p>
                      </div>
                    )}

                    {/* Payment Method */}
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Método</p>
                      {getMethodBadge(cobranca.paymentMethod)}
                    </div>

                    {/* Status */}
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                      {getStatusBadge(cobranca.status)}
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(cobranca.negotiatedAmount || cobranca.originalAmount)}
                      </p>
                      {cobranca.installments && cobranca.installments > 1 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {cobranca.installments}x de {formatCurrency(cobranca.installmentAmount)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {cobranca.paymentLink && (
                        <Button asChild size="sm" variant="outline">
                          <a href={cobranca.paymentLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Link
                          </a>
                        </Button>
                      )}
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/super-admin/customers/${cobranca.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredCobrancas.length > 50 && (
                <div className="text-center py-4 text-sm text-gray-500">
                  Exibindo 50 de {filteredCobrancas.length} resultados. Use os filtros para refinar a busca.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
