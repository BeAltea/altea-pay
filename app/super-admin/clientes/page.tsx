"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Users, Search, Building2, ArrowLeft, Loader2, Eye, MapPin, FileText } from "lucide-react"

interface Cliente {
  id: string
  cliente: string | null
  cpfCnpj: string | null
  cidade: string | null
  primeiraVencida: string | null
  valorTotal: string | null
  quantidadeTitulos: string | null
  maiorAtraso: string | null
  creditScore: string | null
  riskLevel: string | null
  approvalStatus: string | null
  companyId: string | null
  companyName: string | null
}

interface Company {
  id: string
  name: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCompany, setSelectedCompany] = useState<string>("all")
  const [userRole, setUserRole] = useState<string>("user")
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null)

  const isSuperAdmin = userRole === "super_admin"

  const fetchClientes = useCallback(async (companyId?: string) => {
    try {
      const url = companyId && companyId !== "all"
        ? `/api/super-admin/clientes?companyId=${companyId}`
        : "/api/super-admin/clientes"

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setClientes(data.clientes || [])
        setFilteredClientes(data.clientes || [])
        setUserRole(data.userRole || "user")
        setUserCompanyId(data.userCompanyId || null)
      }
    } catch (error) {
      console.error("[Clientes] Error fetching clientes:", error)
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // First fetch clientes to get user role
        const clientesRes = await fetch("/api/super-admin/clientes")
        if (clientesRes.ok) {
          const data = await clientesRes.json()
          setClientes(data.clientes || [])
          setFilteredClientes(data.clientes || [])
          setUserRole(data.userRole || "user")
          setUserCompanyId(data.userCompanyId || null)
        }

        // Only fetch companies if super_admin
        const companiesRes = await fetch("/api/super-admin/companies")
        if (companiesRes.ok) {
          const companiesData = await companiesRes.json()
          setCompanies(companiesData)
        }
      } catch (error) {
        console.error("[Clientes] Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Handle company filter change for super_admin
  useEffect(() => {
    if (isSuperAdmin && selectedCompany !== "all") {
      fetchClientes(selectedCompany)
    } else if (isSuperAdmin && selectedCompany === "all") {
      fetchClientes()
    }
  }, [selectedCompany, isSuperAdmin, fetchClientes])

  // Apply search filter
  useEffect(() => {
    let result = [...clientes]

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(
        (c) =>
          c.cliente?.toLowerCase().includes(search) ||
          c.cpfCnpj?.toLowerCase().includes(search) ||
          c.cidade?.toLowerCase().includes(search)
      )
    }

    setFilteredClientes(result)
  }, [clientes, searchTerm])

  const getRiskBadge = (riskLevel: string | null) => {
    if (!riskLevel) return <Badge variant="outline">N/A</Badge>
    const level = riskLevel.toLowerCase()
    if (level === "alto" || level === "high") {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Alto</Badge>
    }
    if (level === "medio" || level === "medium") {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">Médio</Badge>
    }
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Baixo</Badge>
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Pendente</Badge>
    const s = status.toUpperCase()
    if (s === "ACEITA" || s === "APPROVED") {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Aprovado</Badge>
    }
    if (s === "REJEITA" || s === "REJECTED") {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Rejeitado</Badge>
    }
    return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">Pendente</Badge>
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Clientes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isSuperAdmin
              ? "Gerenciamento de todos os clientes cadastrados no sistema."
              : "Clientes da sua empresa."}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientes.length.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {isSuperAdmin
                ? selectedCompany === "all" ? "Em todas as empresas" : "Na empresa selecionada"
                : "Na sua empresa"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Filtrados</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredClientes.length.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Baseado nos filtros atuais</p>
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
              <p className="text-xs text-muted-foreground">Com clientes cadastrados</p>
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
              ? "Filtre os clientes por empresa ou busque por nome/documento"
              : "Busque por nome ou documento"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, CPF/CNPJ ou cidade..."
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

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            {filteredClientes.length === clientes.length
              ? `Exibindo todos os ${clientes.length.toLocaleString()} clientes`
              : `Exibindo ${filteredClientes.length.toLocaleString()} de ${clientes.length.toLocaleString()} clientes`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredClientes.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum cliente encontrado</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Tente ajustar os filtros para encontrar os clientes desejados.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClientes.slice(0, 50).map((cliente) => (
                <div
                  key={cliente.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2 lg:mb-0">
                      <div className="bg-altea-gold/10 dark:bg-altea-gold/20 p-2 rounded-lg">
                        <Users className="h-4 w-4 text-altea-navy dark:text-altea-gold" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {cliente.cliente || "Nome não informado"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center">
                            <FileText className="h-3 w-3 mr-1" />
                            {cliente.cpfCnpj || "Documento não informado"}
                          </span>
                          {cliente.cidade && (
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {cliente.cidade}
                            </span>
                          )}
                          {isSuperAdmin && cliente.companyName && (
                            <span className="flex items-center">
                              <Building2 className="h-3 w-3 mr-1" />
                              {cliente.companyName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-3 lg:mt-0">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {cliente.valorTotal || "R$ 0,00"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Valor Total</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRiskBadge(cliente.riskLevel)}
                      {getStatusBadge(cliente.approvalStatus)}
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/super-admin/customers/${cliente.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
              {filteredClientes.length > 50 && (
                <div className="text-center py-4 text-sm text-gray-500">
                  Exibindo 50 de {filteredClientes.length.toLocaleString()} resultados. Use os filtros para refinar a busca.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
