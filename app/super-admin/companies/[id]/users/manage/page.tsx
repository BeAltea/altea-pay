"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
      case "inativo":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Inativo</Badge>
      case "suspenso":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Suspenso</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getAccessBadge = (level: string) => {
    switch (level) {
      case "critico":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Crítico</Badge>
      case "alto":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Alto</Badge>
      case "medio":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Médio</Badge>
      case "baixo":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Baixo</Badge>
      default:
        return <Badge variant="secondary">{level}</Badge>
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/super-admin/companies/${params.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{companyName}</h1>
        <p className="text-gray-600 dark:text-gray-400">Gestão de usuários do sistema • CNPJ: {companyCNPJ}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total de Usuários</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalUsers}</p>
                <p className="text-sm text-gray-500 mt-1">Usuários cadastrados</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Usuários Ativos</p>
                <p className="text-3xl font-bold text-green-600">{activeUsers}</p>
                <p className="text-sm text-gray-500 mt-1">Com acesso ativo</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Usuários Inativos</p>
                <p className="text-3xl font-bold text-red-600">{inactiveUsers}</p>
                <p className="text-sm text-gray-500 mt-1">Sem acesso ao sistema</p>
              </div>
              <UserX className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Suspensos</p>
                <p className="text-3xl font-bold text-yellow-600">{suspendedUsers}</p>
                <p className="text-sm text-gray-500 mt-1">Acesso temporariamente bloqueado</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</p>
            <p className="text-2xl font-bold">{totalUsers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <UserCheck className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ativos</p>
            <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Inativos</p>
            <p className="text-2xl font-bold text-red-600">{inactiveUsers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Críticos</p>
            <p className="text-2xl font-bold text-yellow-600">{criticalAccess}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 text-purple-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Acessos</p>
            <p className="text-2xl font-bold text-purple-600">{totalUsers}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar empresas, usuários"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Usuários do Sistema - {companyName}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Lista completa de usuários com acesso ao sistema</p>
          </div>

          <div className="overflow-x-auto">
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
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
