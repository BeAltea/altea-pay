"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { ArrowLeft, Users, UserCheck, UserX, Clock, AlertTriangle, Eye, Mail, Phone, Search } from "lucide-react"

interface CompanyUser {
  id: string
  name: string
  email: string
  document: string
  phone: string
  role: string
  status: "ativo" | "inativo" | "suspenso"
  lastLogin: string
  createdAt: string
  accessLevel: "baixo" | "medio" | "alto" | "critico"
}

export default function ManageUsersPage({ params }: { params: { id: string } }) {
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  const companyName = "Enel Distribuição São Paulo"
  const companyCNPJ = "33.479.023/0001-80"

  const users: CompanyUser[] = [
    {
      id: "1",
      name: "João Silva",
      email: "joao@email.com",
      document: "123.456.789-00",
      phone: "(11) 99999-9999",
      role: "Administrador",
      status: "ativo",
      lastLogin: "15/01/2024",
      createdAt: "2024-01-15",
      accessLevel: "critico",
    },
    {
      id: "2",
      name: "Maria Santos",
      email: "maria@email.com",
      document: "987.654.321-00",
      phone: "(11) 88888-8888",
      role: "Supervisor",
      status: "ativo",
      lastLogin: "10/01/2024",
      createdAt: "2024-02-01",
      accessLevel: "alto",
    },
    {
      id: "3",
      name: "Pedro Costa",
      email: "pedro@email.com",
      document: "456.789.123-00",
      phone: "(11) 77777-7777",
      role: "Operador",
      status: "inativo",
      lastLogin: "12/01/2024",
      createdAt: "2024-01-20",
      accessLevel: "medio",
    },
    {
      id: "4",
      name: "Ana Oliveira",
      email: "ana@email.com",
      document: "789.123.456-00",
      phone: "(11) 66666-6666",
      role: "Visualizador",
      status: "ativo",
      lastLogin: "18/01/2024",
      createdAt: "2024-02-15",
      accessLevel: "baixo",
    },
    {
      id: "5",
      name: "Carlos Ferreira",
      email: "carlos@email.com",
      document: "321.654.987-00",
      phone: "-",
      role: "Operador",
      status: "suspenso",
      lastLogin: "-",
      createdAt: "2024-01-10",
      accessLevel: "baixo",
    },
  ]

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleViewUser = (user: CompanyUser) => {
    console.log("[v0] ManageUsers - View user clicked:", user.name)
    toast({
      title: "Visualizar Usuário",
      description: `Abrindo perfil de ${user.name}`,
    })
    // Em uma aplicação real, redirecionaria para a página de detalhes do usuário
  }

  const handleSendEmail = (user: CompanyUser) => {
    console.log("[v0] ManageUsers - Send email clicked:", user.email)
    toast({
      title: "Email Enviado",
      description: `Email enviado para ${user.name} (${user.email})`,
    })
    // Em uma aplicação real, abriria um modal de composição de email ou enviaria um email
  }

  const handleCallUser = (user: CompanyUser) => {
    console.log("[v0] ManageUsers - Call user clicked:", user.phone)
    if (user.phone === "-") {
      toast({
        title: "Telefone não disponível",
        description: `${user.name} não possui telefone cadastrado`,
        variant: "destructive",
      })
      return
    }
    toast({
      title: "Ligação Registrada",
      description: `Ligação para ${user.name} registrada no sistema`,
    })
    // Em uma aplicação real, registraria a ligação no sistema
  }

  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.status === "ativo").length
  const inactiveUsers = users.filter((u) => u.status === "inativo").length
  const suspendedUsers = users.filter((u) => u.status === "suspenso").length
  const criticalAccess = users.filter((u) => u.accessLevel === "critico").length
  const highAccess = users.filter((u) => u.accessLevel === "alto").length
  const mediumAccess = users.filter((u) => u.accessLevel === "medio").length
  const lowAccess = users.filter((u) => u.accessLevel === "baixo").length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ativo":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">Ativo</Badge>
      case "inativo":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs">Inativo</Badge>
      case "suspenso":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">Suspenso</Badge>
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            {status}
          </Badge>
        )
    }
  }

  const getAccessBadge = (level: string) => {
    switch (level) {
      case "critico":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs">Crítico</Badge>
      case "alto":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs">Alto</Badge>
      case "medio":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">Médio</Badge>
      case "baixo":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">Baixo</Badge>
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            {level}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm">
          <Link href={`/super-admin/companies/${params.id}`}>
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Voltar
          </Link>
        </Button>
      </div>

      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
          {companyName}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm lg:text-base">
          Gestão de usuários do sistema • CNPJ: {companyCNPJ}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Total de Usuários
                </p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{totalUsers}</p>
                <p className="text-xs text-gray-500 mt-1">Usuários cadastrados</p>
              </div>
              <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Usuários Ativos</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">{activeUsers}</p>
                <p className="text-xs text-gray-500 mt-1">Com acesso ativo</p>
              </div>
              <UserCheck className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Usuários Inativos
                </p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600">{inactiveUsers}</p>
                <p className="text-xs text-gray-500 mt-1">Sem acesso ao sistema</p>
              </div>
              <UserX className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Suspensos</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-600">{suspendedUsers}</p>
                <p className="text-xs text-gray-500 mt-1">Acesso temporariamente bloqueado</p>
              </div>
              <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 mb-6 sm:mb-8">
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-500 mx-auto mb-1 sm:mb-2" />
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold">{totalUsers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-500 mx-auto mb-1 sm:mb-2" />
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Ativos</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{activeUsers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-red-500 mx-auto mb-1 sm:mb-2" />
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Inativos</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">{inactiveUsers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-yellow-500 mx-auto mb-1 sm:mb-2" />
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Críticos</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">{criticalAccess}</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-3 sm:p-4 text-center">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-purple-500 mx-auto mb-1 sm:mb-2" />
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Acessos</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">{totalUsers}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 sm:mb-6">
        <div className="relative max-w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4" />
          <Input
            placeholder="Buscar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 sm:pl-10 text-xs sm:text-sm"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-3 sm:p-4 lg:p-6 border-b">
            <h3 className="text-base sm:text-lg font-semibold">Usuários do Sistema - {companyName}</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Lista completa de usuários com acesso ao sistema
            </p>
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Função
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nível de Acesso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Último Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.document}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{user.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{user.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(user.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getAccessBadge(user.accessLevel)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.lastLogin}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewUser(user)}
                          title="Visualizar usuário"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleSendEmail(user)} title="Enviar email">
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCallUser(user)}
                          title="Registrar ligação"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden p-3 sm:p-4 space-y-3 sm:space-y-4">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="border border-gray-200 dark:border-gray-700">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                          {user.name}
                        </h4>
                        {getStatusBadge(user.status)}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 mb-1">{user.email}</p>
                      <p className="text-xs sm:text-sm text-gray-500 mb-1">CPF: {user.document}</p>
                      <p className="text-xs sm:text-sm text-gray-500 mb-2">
                        {user.phone !== "-" ? user.phone : "Telefone não informado"}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                        {getAccessBadge(user.accessLevel)}
                      </div>

                      <p className="text-xs text-gray-500">
                        Último login: {user.lastLogin !== "-" ? user.lastLogin : "Nunca"}
                      </p>
                    </div>

                    <div className="flex sm:flex-col gap-1 sm:gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleViewUser(user)}
                        title="Visualizar usuário"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleSendEmail(user)}
                        title="Enviar email"
                      >
                        <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleCallUser(user)}
                        title="Registrar ligação"
                      >
                        <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
