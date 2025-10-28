"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { Users, ArrowLeft, Search, DollarSign, Phone, Mail, AlertTriangle, TrendingUp } from "lucide-react"

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  cpf: string
  totalDebt: number
  overdueDebt: number
  lastPayment: string
  status: "active" | "overdue" | "negotiating" | "paid"
  createdAt: string
  lastContact: string
}

export default function ManageCustomersPage({ params }: { params: { id: string } }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")

  const companyName = "Enel Distribuição São Paulo"

  const [customers] = useState<Customer[]>([
    {
      id: "1",
      name: "João Silva Santos",
      email: "joao.silva@email.com",
      phone: "(11) 99999-1234",
      cpf: "123.456.789-01",
      totalDebt: 2450.5,
      overdueDebt: 1200.0,
      lastPayment: "2024-02-15T10:30:00Z",
      status: "overdue",
      createdAt: "2023-06-15T14:20:00Z",
      lastContact: "2024-03-10T16:45:00Z",
    },
    {
      id: "2",
      name: "Maria Oliveira Costa",
      email: "maria.oliveira@email.com",
      phone: "(11) 98888-5678",
      cpf: "987.654.321-09",
      totalDebt: 890.75,
      overdueDebt: 0,
      lastPayment: "2024-03-12T09:15:00Z",
      status: "active",
      createdAt: "2023-08-22T11:30:00Z",
      lastContact: "2024-03-12T09:15:00Z",
    },
    {
      id: "3",
      name: "Pedro Henrique Lima",
      email: "pedro.lima@email.com",
      phone: "(11) 97777-9012",
      cpf: "456.789.123-45",
      totalDebt: 3200.0,
      overdueDebt: 3200.0,
      lastPayment: "2023-12-20T14:45:00Z",
      status: "negotiating",
      createdAt: "2023-04-10T08:15:00Z",
      lastContact: "2024-03-14T13:20:00Z",
    },
    {
      id: "4",
      name: "Ana Carolina Ferreira",
      email: "ana.ferreira@email.com",
      phone: "(11) 96666-3456",
      cpf: "789.123.456-78",
      totalDebt: 0,
      overdueDebt: 0,
      lastPayment: "2024-03-15T16:30:00Z",
      status: "paid",
      createdAt: "2023-09-05T10:45:00Z",
      lastContact: "2024-03-15T16:30:00Z",
    },
    {
      id: "5",
      name: "Carlos Eduardo Santos",
      email: "carlos.santos@email.com",
      phone: "(11) 95555-7890",
      cpf: "321.654.987-12",
      totalDebt: 1750.25,
      overdueDebt: 850.0,
      lastPayment: "2024-01-28T12:00:00Z",
      status: "overdue",
      createdAt: "2023-07-18T15:30:00Z",
      lastContact: "2024-03-08T11:10:00Z",
    },
  ])

  const filteredCustomers = customers
    .filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.cpf.includes(searchTerm)

      const matchesStatus = statusFilter === "all" || customer.status === statusFilter

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name)
        case "debt":
          return b.totalDebt - a.totalDebt
        case "overdue":
          return b.overdueDebt - a.overdueDebt
        default:
          return 0
      }
    })

  const getStatusLabel = (status: string) => {
    const statuses = {
      active: "Ativo",
      overdue: "Em Atraso",
      negotiating: "Negociando",
      paid: "Quitado",
    }
    return statuses[status as keyof typeof statuses] || status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "overdue":
        return "destructive"
      case "negotiating":
        return "secondary"
      case "paid":
        return "outline"
      default:
        return "default"
    }
  }

  const totalCustomers = customers.length
  const overdueCustomers = customers.filter((c) => c.status === "overdue").length
  const totalDebtAmount = customers.reduce((sum, c) => sum + c.totalDebt, 0)
  const totalOverdueAmount = customers.reduce((sum, c) => sum + c.overdueDebt, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Clientes</h1>
          <p className="text-gray-600 dark:text-gray-400">{companyName}</p>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <Button asChild variant="outline">
            <Link href={`/super-admin/companies/${params.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">{overdueCustomers} em atraso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalDebtAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Em dívidas ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Atraso</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalOverdueAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">{overdueCustomers} clientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Recuperação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67.3%</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, email ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="overdue">Em Atraso</SelectItem>
                  <SelectItem value="negotiating">Negociando</SelectItem>
                  <SelectItem value="paid">Quitado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="debt">Maior Dívida</SelectItem>
                  <SelectItem value="overdue">Maior Atraso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Clientes ({filteredCustomers.length})</span>
          </CardTitle>
          <CardDescription>Lista de clientes inadimplentes da empresa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage
                      src={`/.jpg?key=se7dl&height=40&width=40&query=${customer.name}`}
                    />
                    <AvatarFallback>
                      {customer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-medium">{customer.name}</p>
                      <Badge variant={getStatusColor(customer.status)}>{getStatusLabel(customer.status)}</Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {customer.email}
                      </span>
                      <span className="flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {customer.phone}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <span>CPF: {customer.cpf}</span>
                      <span>•</span>
                      <span>Último contato: {new Date(customer.lastContact).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    R$ {customer.totalDebt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  {customer.overdueDebt > 0 && (
                    <div className="text-sm text-red-600 dark:text-red-400">
                      R$ {customer.overdueDebt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em atraso
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    Último pagamento: {new Date(customer.lastPayment).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </div>
            ))}

            {filteredCustomers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum cliente encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
