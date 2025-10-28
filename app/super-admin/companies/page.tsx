import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { Building2, Users, DollarSign, TrendingUp, Plus, Eye, Edit } from "lucide-react"
import { CompanyFilters } from "@/components/super-admin/company-filters"
import { DeleteCompanyButton } from "@/components/super-admin/delete-company-button"

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

  const { data: companiesData, error: companiesError } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false })

  if (companiesError) {
    console.error("[v0] Error fetching companies:", companiesError)
  }

  // Fetch customers count per company
  const { data: customersData } = await supabase.from("customers").select("company_id")

  // Fetch debts data per company
  const { data: debtsData } = await supabase.from("debts").select("company_id, amount, status")

  // Fetch payments data per company
  const { data: paymentsData } = await supabase.from("payments").select("company_id, amount")

  // Fetch admins count per company
  const { data: adminsData } = await supabase.from("profiles").select("company_id, role").eq("role", "admin")

  // Calculate stats for each company
  const companies: Company[] = (companiesData || []).map((company) => {
    const companyCustomers = customersData?.filter((c) => c.company_id === company.id) || []
    const companyDebts = debtsData?.filter((d) => d.company_id === company.id) || []
    const companyPayments = paymentsData?.filter((p) => p.company_id === company.id) || []
    const companyAdmins = adminsData?.filter((a) => a.company_id === company.id) || []

    const totalAmount = companyDebts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
    const recoveredAmount = companyPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const recoveryRate = totalAmount > 0 ? (recoveredAmount / totalAmount) * 100 : 0

    return {
      id: company.id,
      name: company.name,
      cnpj: company.cnpj || "N/A",
      email: company.email || "N/A",
      phone: company.phone || "N/A",
      status: company.status || "active",
      created_at: company.created_at,
      totalCustomers: companyCustomers.length,
      totalDebts: companyDebts.length,
      totalAmount,
      recoveredAmount,
      recoveryRate,
      admins: companyAdmins.length,
    }
  })

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
            <div className="text-2xl font-bold">
              {companies.length > 0
                ? (companies.reduce((sum, c) => sum + c.recoveryRate, 0) / companies.length).toFixed(1)
                : "0.0"}
              %
            </div>
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
          {companies.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-white">Nenhuma empresa cadastrada</p>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Comece adicionando sua primeira empresa</p>
              <Button asChild>
                <Link href="/super-admin/companies/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Empresa
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-4 mb-3 lg:mb-0">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={`/.jpg?key=z6qmr&height=48&width=48&query=${encodeURIComponent(company.name)}`}
                        />
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
                        <DeleteCompanyButton companyId={company.id} companyName={company.name} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
