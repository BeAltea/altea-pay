"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { DollarSign, Search, Building2, ArrowLeft, Loader2, Eye, Calendar, AlertTriangle, FileText } from "lucide-react"

interface Cobranca {
  id: string
  cliente: string | null
  cpfCnpj: string | null
  primeiraVencida: string | null
  valorTotal: string | null
  quantidadeTitulos: string | null
  maiorAtraso: string | null
  autoCollectionEnabled: boolean | null
  collectionProcessedAt: string | null
  lastCollectionAttempt: string | null
  companyId: string | null
  companyName: string | null
}

interface Company {
  id: string
  name: string
}

export default function CobrancasPage() {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [filteredCobrancas, setFilteredCobrancas] = useState<Cobranca[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCompany, setSelectedCompany] = useState<string>("all")
  const [userRole, setUserRole] = useState<string>("user")
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null)

  const isSuperAdmin = userRole === "super_admin"

  // Helper function to parse Brazilian currency format "R$ 1.234,56" to number
  const parseBrazilianCurrency = (value: string | null | undefined): number => {
    if (!value || typeof value !== "string") return 0
    const cleaned = value.replace(/R\$\s?/g, "").replace(/\./g, "").replace(",", ".")
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }

  const fetchCobrancas = useCallback(async (companyId?: string) => {
    try {
      const url = companyId && companyId !== "all"
        ? `/api/super-admin/cobrancas?companyId=${companyId}`
        : "/api/super-admin/cobrancas"

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setCobrancas(data.cobrancas || [])
        setFilteredCobrancas(data.cobrancas || [])
        setUserRole(data.userRole || "user")
        setUserCompanyId(data.userCompanyId || null)
      }
    } catch (error) {
      console.error("[Cobrancas] Error fetching cobrancas:", error)
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // First fetch cobrancas to get user role
        const cobrancasRes = await fetch("/api/super-admin/cobrancas")
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
        console.error("[Cobrancas] Error fetching data:", error)
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
          c.cliente?.toLowerCase().includes(search) ||
          c.cpfCnpj?.toLowerCase().includes(search)
      )
    }

    setFilteredCobrancas(result)
  }, [cobrancas, searchTerm])

  const totalAmount = filteredCobrancas.reduce(
    (sum, c) => sum + parseBrazilianCurrency(c.valorTotal),
    0
  )

  const overdueCount = filteredCobrancas.filter(
    (c) => c.maiorAtraso && parseInt(c.maiorAtraso) > 0
  ).length

  const getAtrasoBadge = (maiorAtraso: string | null) => {
    if (!maiorAtraso || maiorAtraso === "0") {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Em dia</Badge>
    }
    const dias = parseInt(maiorAtraso)
    if (dias > 90) {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
          {dias} dias em atraso
        </Badge>
      )
    }
    if (dias > 30) {
      return (
        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
          {dias} dias em atraso
        </Badge>
      )
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
        {dias} dias em atraso
      </Badge>
    )
  }

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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Cobranças</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isSuperAdmin
              ? "Visão geral de todas as cobranças e dívidas do sistema."
              : "Cobranças da sua empresa."}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Cobranças</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(totalAmount / 1000).toFixed(2)}k
            </div>
            <p className="text-xs text-muted-foreground">
              {isSuperAdmin
                ? selectedCompany === "all" ? "Valor total de todas as empresas" : "Valor total da empresa selecionada"
                : "Valor total da sua empresa"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Títulos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCobrancas.length.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Cobranças registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Atraso</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Cobranças com atraso</p>
          </CardContent>
        </Card>

        {isSuperAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empresas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{companies.length}</div>
              <p className="text-xs text-muted-foreground">Com cobranças ativas</p>
            </CardContent>
          </Card>
        )}
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
                  placeholder="Buscar por cliente ou CPF/CNPJ..."
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
          <CardTitle>Lista de Cobranças</CardTitle>
          <CardDescription>
            {filteredCobrancas.length === cobrancas.length
              ? `Exibindo todas as ${cobrancas.length.toLocaleString()} cobranças`
              : `Exibindo ${filteredCobrancas.length.toLocaleString()} de ${cobrancas.length.toLocaleString()} cobranças`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCobrancas.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhuma cobrança encontrada</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Tente ajustar os filtros para encontrar as cobranças desejadas.
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
                        <DollarSign className="h-4 w-4 text-altea-navy dark:text-altea-gold" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {cobranca.cliente || "Cliente não informado"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center">
                            <FileText className="h-3 w-3 mr-1" />
                            {cobranca.cpfCnpj || "Documento não informado"}
                          </span>
                          {cobranca.primeiraVencida && (
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Venc: {cobranca.primeiraVencida}
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
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {cobranca.valorTotal || "R$ 0,00"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {cobranca.quantidadeTitulos || "0"} título(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getAtrasoBadge(cobranca.maiorAtraso)}
                      {cobranca.autoCollectionEnabled && (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          Auto
                        </Badge>
                      )}
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/super-admin/customers/${cobranca.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
              {filteredCobrancas.length > 50 && (
                <div className="text-center py-4 text-sm text-gray-500">
                  Exibindo 50 de {filteredCobrancas.length.toLocaleString()} resultados. Use os filtros para refinar a busca.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
