import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { Building2, Users, DollarSign, TrendingUp, Plus, Eye, Edit } from "lucide-react"
import { CompanyFilters } from "@/components/super-admin/company-filters"

interface Company {
  id: string
  name: string
  cnpj: string
  email: string
  phone: string
  status: "active" | "inactive" | "suspended"
  created_at: string
  totalCustomers: number
  totalDebts: number
  totalAmount: number
  recoveredAmount: number
  recoveryRate: number
  admins: number
}

export default async function CompaniesPage() {
  const supabase = await createClient()

  // Mock data for companies
  const companies: Company[] = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Enel Distribuição São Paulo",
      cnpj: "33.479.023/0001-80",
      email: "admin@enel.com.br",
      phone: "(11) 3003-0303",
      status: "active",
      created_at: "2024-01-15T10:00:00Z",
      totalCustomers: 1247,
      totalDebts: 3456,
      totalAmount: 2847392.5,
      recoveredAmount: 1234567.89,
      recoveryRate: 43.4,
      admins: 3,
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      name: "Sabesp - Companhia de Saneamento",
      cnpj: "43.776.517/0001-80",
      email: "admin@sabesp.com.br",
      phone: "(11) 3388-8000",
      status: "active",
      created_at: "2024-02-20T14:30:00Z",
      totalCustomers: 892,
      totalDebts: 2134,
      totalAmount: 1654321.75,
      recoveredAmount: 876543.21,
      recoveryRate: 53.0,
      admins: 2,
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      name: "CPFL Energia",
      cnpj: "02.998.611/0001-04",
      email: "admin@cpfl.com.br",
      phone: "(19) 3756-8000",
      status: "active",
      created_at: "2024-03-10T09:15:00Z",
      totalCustomers: 654,
      totalDebts: 1789,
      totalAmount: 1234567.89,
      recoveredAmount: 654321.98,
      recoveryRate: 53.0,
      admins: 2,
    },
    {
      id: "44444444-4444-4444-4444-444444444444",
      name: "Cemig Distribuição",
      cnpj: "17.155.730/0001-64",
      email: "admin@cemig.com.br",
      phone: "(31) 3506-5024",
      status: "suspended",
      created_at: "2024-01-05T16:45:00Z",
      totalCustomers: 543,
      totalDebts: 1456,
      totalAmount: 987654.32,
      recoveredAmount: 543210.87,
      recoveryRate: 55.0,
      admins: 2,
    },
  ]

  const totalStats = {
    totalCompanies: companies.length,
    activeCompanies: companies.filter((c) => c.status === "active").length,
    totalCustomers: companies.reduce((sum, company) => sum + company.totalCustomers, 0),
    totalAmount: companies.reduce((sum, company) => sum + company.totalAmount, 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Gerenciamento de Empresas</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Gerencie todas as empresas clientes da plataforma Altea Pay.
          </p>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/super-admin/companies/new">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Nova Empresa</span>
              <span className="sm:hidden">Nova</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">{totalStats.activeCompanies} ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Todos os clientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {(totalStats.totalAmount / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">Em cobrança</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">51.1%</div>
            <p className="text-xs text-muted-foreground">Recuperação</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <CompanyFilters />

      {/* Companies List */}
      <Card>
        <CardHeader>
          <CardTitle>Empresas Cadastradas</CardTitle>
          <CardDescription>Lista completa de todas as empresas clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {companies.map((company) => (
              <div
                key={company.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-4 mb-3 lg:mb-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={`/.jpg?height=48&width=48&query=${company.name}`} />
                      <AvatarFallback className="bg-altea-gold/10 text-altea-navy">
                        {company.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">{company.name}</h3>
                        <Badge
                          variant={
                            company.status === "active"
                              ? "default"
                              : company.status === "suspended"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {company.status === "active"
                            ? "Ativa"
                            : company.status === "suspended"
                              ? "Suspensa"
                              : "Inativa"}
                        </Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>CNPJ: {company.cnpj}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{company.email}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{company.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6 mt-4 lg:mt-0">
                  <div className="grid grid-cols-2 sm:flex sm:space-x-6 gap-4 sm:gap-0">
                    <div className="text-center sm:text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {company.totalCustomers.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Clientes</p>
                    </div>

                    <div className="text-center sm:text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        R$ {(company.totalAmount / 1000).toFixed(0)}k
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Volume</p>
                    </div>

                    <div className="text-center sm:text-right">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        {company.recoveryRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Recuperação</p>
                    </div>

                    <div className="text-center sm:text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{company.admins}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Admins</p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/super-admin/companies/${company.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/super-admin/companies/${company.id}/edit`}>
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
