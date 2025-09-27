import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { Building2, Users, DollarSign, TrendingUp, Eye, AlertTriangle } from "lucide-react"

interface CompanyCustomerData {
  id: string
  name: string
  cnpj: string
  status: "active" | "inactive" | "suspended"
  totalClients: number
  totalDebt: number
  totalRecovered: number
  totalInNegotiation: number
  recoveryRate: number
  riskLevel: "low" | "medium" | "high" | "critical"
}

export default async function SuperAdminCustomersPage() {
  const supabase = await createClient()

  // Mock data baseado nas empresas existentes com KPIs de cobrança
  const companiesData: CompanyCustomerData[] = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Enel Distribuição São Paulo",
      cnpj: "33.479.023/0001-80",
      status: "active",
      totalClients: 1247,
      totalDebt: 2847392.5,
      totalRecovered: 1234567.89,
      totalInNegotiation: 456789.12,
      recoveryRate: 43.4,
      riskLevel: "medium",
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      name: "Sabesp - Companhia de Saneamento",
      cnpj: "43.776.517/0001-80",
      status: "active",
      totalClients: 892,
      totalDebt: 1654321.75,
      totalRecovered: 876543.21,
      totalInNegotiation: 234567.89,
      recoveryRate: 53.0,
      riskLevel: "low",
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      name: "CPFL Energia",
      cnpj: "02.998.611/0001-04",
      status: "active",
      totalClients: 654,
      totalDebt: 1234567.89,
      totalRecovered: 654321.98,
      totalInNegotiation: 123456.78,
      recoveryRate: 53.0,
      riskLevel: "low",
    },
    {
      id: "44444444-4444-4444-4444-444444444444",
      name: "Cemig Distribuição",
      cnpj: "17.155.730/0001-64",
      status: "suspended",
      totalClients: 543,
      totalDebt: 987654.32,
      totalRecovered: 543210.87,
      totalInNegotiation: 98765.43,
      recoveryRate: 55.0,
      riskLevel: "high",
    },
  ]

  const globalStats = {
    totalCompanies: companiesData.length,
    activeCompanies: companiesData.filter((c) => c.status === "active").length,
    totalClients: companiesData.reduce((sum, company) => sum + company.totalClients, 0),
    totalDebt: companiesData.reduce((sum, company) => sum + company.totalDebt, 0),
    totalRecovered: companiesData.reduce((sum, company) => sum + company.totalRecovered, 0),
    totalInNegotiation: companiesData.reduce((sum, company) => sum + company.totalInNegotiation, 0),
    averageRecoveryRate: companiesData.reduce((sum, company) => sum + company.recoveryRate, 0) / companiesData.length,
  }

  const getRiskBadge = (risk: CompanyCustomerData["riskLevel"]) => {
    switch (risk) {
      case "low":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Baixo</Badge>
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">Médio</Badge>
      case "high":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">Alto</Badge>
      case "critical":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Crítico</Badge>
    }
  }

  const getStatusBadge = (status: CompanyCustomerData["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Ativa</Badge>
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">Inativa</Badge>
      case "suspended":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Suspensa</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Gestão de Clientes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Visão global dos clientes por empresa - Altea Pay
          </p>
        </div>
      </div>

      {/* Global Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">{globalStats.activeCompanies} ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.totalClients.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Todos os devedores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total da Dívida</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {(globalStats.totalDebt / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">Em cobrança</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.averageRecoveryRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Recuperação</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recuperado</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {(globalStats.totalRecovered / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground">
              {((globalStats.totalRecovered / globalStats.totalDebt) * 100).toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Negociação</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              R$ {(globalStats.totalInNegotiation / 1000).toFixed(0)}k
            </div>
            <p className="text-xs text-muted-foreground">
              {((globalStats.totalInNegotiation / globalStats.totalDebt) * 100).toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Companies List */}
      <Card>
        <CardHeader>
          <CardTitle>Empresas Clientes</CardTitle>
          <CardDescription>Clique em uma empresa para ver os detalhes dos clientes devedores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {companiesData.map((company) => (
              <Link key={company.id} href={`/super-admin/customers/${company.id}`} className="block">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
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
                          {getStatusBadge(company.status)}
                          {getRiskBadge(company.riskLevel)}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>CNPJ: {company.cnpj}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>{company.totalClients.toLocaleString()} clientes</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6 mt-4 lg:mt-0">
                    <div className="grid grid-cols-2 sm:flex sm:space-x-6 gap-4 sm:gap-0">
                      <div className="text-center sm:text-right">
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                          R$ {(company.totalDebt / 1000).toFixed(0)}k
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total da Dívida</p>
                      </div>

                      <div className="text-center sm:text-right">
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                          R$ {(company.totalRecovered / 1000).toFixed(0)}k
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Recuperado</p>
                      </div>

                      <div className="text-center sm:text-right">
                        <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                          R$ {(company.totalInNegotiation / 1000).toFixed(0)}k
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Em Negociação</p>
                      </div>

                      <div className="text-center sm:text-right">
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {company.recoveryRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Taxa Recuperação</p>
                      </div>
                    </div>

                    <div className="flex justify-center lg:justify-end">
                      <Button size="sm" variant="outline" className="cursor-pointer bg-transparent">
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Clientes
                      </Button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
