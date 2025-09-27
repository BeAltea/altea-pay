import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import {
  ArrowLeft,
  Users,
  DollarSign,
  TrendingUp,
  UserCheck,
  UserX,
  AlertTriangle,
  Eye,
  Mail,
  Phone,
} from "lucide-react"
import { notFound } from "next/navigation"

interface Customer {
  id: string
  name: string
  email: string
  document: string
  phone?: string
  totalDebts: number
  totalAmount: number
  status: "active" | "inactive" | "overdue"
  riskLevel: "low" | "medium" | "high" | "critical"
  lastContact?: string
  registrationDate: string
}

interface CompanyData {
  id: string
  name: string
  cnpj: string
  status: "active" | "inactive" | "suspended"
  totalClients: number
  totalDebt: number
  totalRecovered: number
  totalInNegotiation: number
  recoveryRate: number
}

export default async function CompanyCustomersPage({ params }: { params: { companyId: string } }) {
  const supabase = await createClient()
  const { companyId } = params

  // Mock data das empresas
  const companiesData: { [key: string]: CompanyData } = {
    "11111111-1111-1111-1111-111111111111": {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Enel Distribuição São Paulo",
      cnpj: "33.479.023/0001-80",
      status: "active",
      totalClients: 1247,
      totalDebt: 2847392.5,
      totalRecovered: 1234567.89,
      totalInNegotiation: 456789.12,
      recoveryRate: 43.4,
    },
    "22222222-2222-2222-2222-222222222222": {
      id: "22222222-2222-2222-2222-222222222222",
      name: "Sabesp - Companhia de Saneamento",
      cnpj: "43.776.517/0001-80",
      status: "active",
      totalClients: 892,
      totalDebt: 1654321.75,
      totalRecovered: 876543.21,
      totalInNegotiation: 234567.89,
      recoveryRate: 53.0,
    },
    "33333333-3333-3333-3333-333333333333": {
      id: "33333333-3333-3333-3333-333333333333",
      name: "CPFL Energia",
      cnpj: "02.998.611/0001-04",
      status: "active",
      totalClients: 654,
      totalDebt: 1234567.89,
      totalRecovered: 654321.98,
      totalInNegotiation: 123456.78,
      recoveryRate: 53.0,
    },
    "44444444-4444-4444-4444-444444444444": {
      id: "44444444-4444-4444-4444-444444444444",
      name: "Cemig Distribuição",
      cnpj: "17.155.730/0001-64",
      status: "suspended",
      totalClients: 543,
      totalDebt: 987654.32,
      totalRecovered: 543210.87,
      totalInNegotiation: 98765.43,
      recoveryRate: 55.0,
    },
  }

  const company = companiesData[companyId]
  if (!company) {
    notFound()
  }

  // Mock data dos clientes da empresa específica
  const customers: Customer[] = [
    {
      id: "1",
      name: "João Silva",
      email: "joao@email.com",
      document: "123.456.789-00",
      phone: "(11) 99999-9999",
      totalDebts: 2,
      totalAmount: 2625.5,
      status: "overdue",
      riskLevel: "critical",
      lastContact: "2024-01-15",
      registrationDate: "2023-06-15",
    },
    {
      id: "2",
      name: "Maria Santos",
      email: "maria@email.com",
      document: "987.654.321-00",
      phone: "(11) 88888-8888",
      totalDebts: 1,
      totalAmount: 945.8,
      status: "overdue",
      riskLevel: "high",
      lastContact: "2024-01-10",
      registrationDate: "2023-08-20",
    },
    {
      id: "3",
      name: "Pedro Costa",
      email: "pedro@email.com",
      document: "456.789.123-00",
      phone: "(11) 77777-7777",
      totalDebts: 1,
      totalAmount: 2205.0,
      status: "overdue",
      riskLevel: "medium",
      lastContact: "2024-01-12",
      registrationDate: "2023-09-10",
    },
    {
      id: "4",
      name: "Ana Oliveira",
      email: "ana@email.com",
      document: "789.123.456-00",
      phone: "(11) 66666-6666",
      totalDebts: 1,
      totalAmount: 467.25,
      status: "active",
      riskLevel: "low",
      lastContact: "2024-01-18",
      registrationDate: "2023-11-05",
    },
    {
      id: "5",
      name: "Carlos Ferreira",
      email: "carlos@email.com",
      document: "321.654.987-00",
      totalDebts: 0,
      totalAmount: 0,
      status: "active",
      riskLevel: "low",
      registrationDate: "2024-01-02",
    },
  ]

  const getStatusBadge = (status: Customer["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Ativo</Badge>
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">Inativo</Badge>
      case "overdue":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Em Atraso</Badge>
    }
  }

  const getRiskBadge = (risk: Customer["riskLevel"]) => {
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

  const stats = {
    total: customers.length,
    active: customers.filter((c) => c.status === "active").length,
    overdue: customers.filter((c) => c.status === "overdue").length,
    critical: customers.filter((c) => c.riskLevel === "critical").length,
    totalAmount: customers.reduce((sum, customer) => sum + customer.totalAmount, 0),
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/super-admin/customers">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{company.name}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Gestão de clientes devedores - CNPJ: {company.cnpj}
          </p>
        </div>
      </div>

      {/* Company Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{company.totalClients.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Devedores cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total da Dívida</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">R$ {(company.totalDebt / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">Em cobrança</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recuperado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R$ {(company.totalRecovered / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">{company.recoveryRate.toFixed(1)}% recuperado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Negociação</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              R$ {(company.totalInNegotiation / 1000).toFixed(0)}k
            </div>
            <p className="text-xs text-muted-foreground">Acordos em andamento</p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg">
                <Users className="h-3 w-3 md:h-4 md:w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-lg md:text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-lg">
                <UserCheck className="h-3 w-3 md:h-4 md:w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Ativos</p>
                <p className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-lg">
                <UserX className="h-3 w-3 md:h-4 md:w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Em Atraso</p>
                <p className="text-lg md:text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-orange-100 dark:bg-orange-900/20 p-2 rounded-lg">
                <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Críticos</p>
                <p className="text-lg md:text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-purple-100 dark:bg-purple-900/20 p-2 rounded-lg">
                <span className="text-purple-600 dark:text-purple-400 font-bold text-xs md:text-sm">R$</span>
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Total Dívidas</p>
                <p className="text-sm md:text-lg font-bold">
                  R$ {stats.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes Devedores - {company.name}</CardTitle>
          <CardDescription>Lista completa de clientes com dívidas em aberto</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Dívidas</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Último Contato</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-gray-500">{customer.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{customer.document}</TableCell>
                    <TableCell className="text-sm">{customer.phone || "-"}</TableCell>
                    <TableCell>
                      <span className="font-medium">{customer.totalDebts}</span>
                    </TableCell>
                    <TableCell className="font-medium">
                      R$ {customer.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{getStatusBadge(customer.status)}</TableCell>
                    <TableCell>{getRiskBadge(customer.riskLevel)}</TableCell>
                    <TableCell>
                      {customer.lastContact ? new Date(customer.lastContact).toLocaleDateString("pt-BR") : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
